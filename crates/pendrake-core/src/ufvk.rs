//! UFVK decoding for the identity slice.
//!
//! Decodes a pasted UFVK into the network it binds to, the pools it can watch,
//! and a stable fingerprint, the moment the key validates. Testnet keys are
//! rejected (Pendrake is mainnet and regtest only) and a malformed string gets a
//! specific reason. This is the Rust-side derivation ADR-0002 calls for: the
//! service and the GUI read the network from the key, not from a client field.

use std::fmt::{self, Write};

use sha2::{Digest, Sha256};
use zcash_address::unified::{Container, Encoding, Fvk, Ufvk};
use zcash_protocol::consensus::NetworkType;

use pendrake_ipc::{Pool, UfvkIdentity, UfvkNetwork};

/// Why a UFVK can't become a Wallet. Testnet is valid-but-unsupported, so it is
/// kept distinct from a malformed key the user likely mistyped.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum UfvkError {
    Testnet,
    Malformed(String),
}

impl fmt::Display for UfvkError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            UfvkError::Testnet => {
                f.write_str("This is a testnet key. Pendrake supports mainnet and regtest only.")
            }
            UfvkError::Malformed(reason) => write!(f, "Not a valid UFVK: {reason}"),
        }
    }
}

impl std::error::Error for UfvkError {}

/// Decode a UFVK into its identity, or explain why it can't be used.
pub fn parse_ufvk(input: &str) -> Result<UfvkIdentity, UfvkError> {
    let (net, ufvk) =
        Ufvk::decode(input.trim()).map_err(|e| UfvkError::Malformed(e.to_string()))?;

    let network = match net {
        NetworkType::Main => UfvkNetwork::Mainnet,
        NetworkType::Regtest => UfvkNetwork::Regtest,
        NetworkType::Test => return Err(UfvkError::Testnet),
    };

    let pools = ufvk
        .items()
        .into_iter()
        .filter_map(|item| match item {
            Fvk::Orchard(_) => Some(Pool::Orchard),
            Fvk::Sapling(_) => Some(Pool::Sapling),
            Fvk::P2pkh(_) => Some(Pool::Transparent),
            Fvk::Unknown { .. } => None,
        })
        .collect();

    Ok(UfvkIdentity {
        network,
        fingerprint: fingerprint(&ufvk.encode(&net)),
        pools,
    })
}

/// A stable id from the canonical encoding: the first 16 bytes of its SHA-256,
/// lower-hex. The canonical form is independent of the pasted casing and
/// whitespace, so a key always yields the same fingerprint and LifeHash.
fn fingerprint(canonical: &str) -> String {
    let digest = Sha256::digest(canonical.as_bytes());
    let mut hex = String::with_capacity(32);
    for byte in &digest[..16] {
        let _ = write!(hex, "{byte:02x}");
    }
    hex
}

#[cfg(test)]
mod tests {
    use super::*;

    // Round-trip a fresh container per network. `decode` checks structure, not
    // curve points, so all-zero FVK bytes give valid per-network vectors without
    // shipping fixtures.
    fn sample_ufvk(net: NetworkType) -> String {
        Ufvk::try_from_items(vec![Fvk::Sapling([0u8; 128]), Fvk::Orchard([0u8; 96])])
            .expect("valid container")
            .encode(&net)
    }

    #[test]
    fn decodes_mainnet_with_pools_and_fingerprint() {
        let id = parse_ufvk(&sample_ufvk(NetworkType::Main)).unwrap();
        assert_eq!(id.network, UfvkNetwork::Mainnet);
        assert_eq!(id.pools, vec![Pool::Orchard, Pool::Sapling]);
        assert_eq!(id.fingerprint.len(), 32);
        assert!(id.fingerprint.bytes().all(|b| b.is_ascii_hexdigit()));
    }

    #[test]
    fn decodes_regtest_with_pools() {
        let id = parse_ufvk(&sample_ufvk(NetworkType::Regtest)).unwrap();
        assert_eq!(id.network, UfvkNetwork::Regtest);
        assert_eq!(id.pools, vec![Pool::Orchard, Pool::Sapling]);
    }

    #[test]
    fn rejects_testnet_with_its_own_error() {
        assert_eq!(
            parse_ufvk(&sample_ufvk(NetworkType::Test)),
            Err(UfvkError::Testnet)
        );
    }

    #[test]
    fn rejects_malformed_input() {
        assert!(matches!(
            parse_ufvk("definitely not a ufvk"),
            Err(UfvkError::Malformed(_))
        ));
    }

    #[test]
    fn fingerprint_is_stable_and_network_bound() {
        let main = parse_ufvk(&sample_ufvk(NetworkType::Main))
            .unwrap()
            .fingerprint;
        let again = parse_ufvk(&sample_ufvk(NetworkType::Main))
            .unwrap()
            .fingerprint;
        let regtest = parse_ufvk(&sample_ufvk(NetworkType::Regtest))
            .unwrap()
            .fingerprint;
        assert_eq!(main, again);
        assert_ne!(main, regtest);
    }
}
