//! UFVK decoding for the identity slice.
//!
//! Decodes a pasted UFVK into the network it binds to, the pools it can watch,
//! and a stable fingerprint, the moment the key validates. A malformed string
//! gets a specific reason. This is the Rust-side derivation ADR-0002 calls for:
//! the service and the GUI read the network from the key, not from a client
//! field.

use std::fmt::{self, Write};

use sha2::{Digest, Sha256};
use zcash_address::unified::{Container, Encoding, Fvk, Ufvk};
use zcash_protocol::consensus::NetworkType;

use pendrake_ipc::{Pool, UfvkIdentity, UfvkNetwork};

/// Why a UFVK can't become a Wallet.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum UfvkError {
    Malformed(String),
}

impl fmt::Display for UfvkError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
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
        NetworkType::Test => UfvkNetwork::Testnet,
        NetworkType::Regtest => UfvkNetwork::Regtest,
    };

    // Ironwood reuses the Orchard FVK (no separate typecode). Any key that can
    // view Orchard can also view the post-NU6.3 Ironwood pool.
    let mut pools = Vec::new();
    for item in ufvk.items() {
        match item {
            Fvk::Orchard(_) => {
                pools.push(Pool::Orchard);
                pools.push(Pool::Ironwood);
            }
            Fvk::Sapling(_) => pools.push(Pool::Sapling),
            Fvk::P2pkh(_) => pools.push(Pool::Transparent),
            Fvk::Unknown { .. } => {}
        }
    }

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

    fn assert_shielded_pools(pools: &[Pool]) {
        assert!(pools.contains(&Pool::Orchard));
        assert!(pools.contains(&Pool::Ironwood));
        assert!(pools.contains(&Pool::Sapling));
        assert_eq!(pools.len(), 3);
    }

    #[test]
    fn decodes_mainnet_with_pools_and_fingerprint() {
        let id = parse_ufvk(&sample_ufvk(NetworkType::Main)).unwrap();
        assert_eq!(id.network, UfvkNetwork::Mainnet);
        assert_shielded_pools(&id.pools);
        assert_eq!(id.fingerprint.len(), 32);
        assert!(id.fingerprint.bytes().all(|b| b.is_ascii_hexdigit()));
    }

    #[test]
    fn decodes_regtest_with_pools() {
        let id = parse_ufvk(&sample_ufvk(NetworkType::Regtest)).unwrap();
        assert_eq!(id.network, UfvkNetwork::Regtest);
        assert_shielded_pools(&id.pools);
    }

    #[test]
    fn decodes_testnet_with_pools() {
        let id = parse_ufvk(&sample_ufvk(NetworkType::Test)).unwrap();
        assert_eq!(id.network, UfvkNetwork::Testnet);
        assert_shielded_pools(&id.pools);
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
        let testnet = parse_ufvk(&sample_ufvk(NetworkType::Test))
            .unwrap()
            .fingerprint;
        assert_eq!(main, again);
        assert_ne!(main, regtest);
        assert_ne!(main, testnet);
    }
}
