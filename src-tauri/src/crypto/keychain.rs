//! OS keychain integration for the master key (PW-006).
//!
//! The 32-byte master key lives in the platform secret store via the `keyring`
//! crate (Windows Credential Manager / macOS Keychain / Linux Secret Service).
//! It is never written to the database — that is what makes a copied `.db` file
//! useless.
//!
//! Linux caveat: `keyring` uses the Secret Service (gnome-keyring/KWallet); on a
//! headless box without one, these calls fail. Tracked for the Linux packaging
//! card (PW-045).

use keyring::Entry;
use zeroize::Zeroizing;

use crate::crypto::vault::KEY_LEN;
use crate::error::AppError;

const SERVICE: &str = "com.auzum197.pendrake-watch";
const ACCOUNT: &str = "vault-master-key";

fn entry() -> Result<Entry, AppError> {
    Entry::new(SERVICE, ACCOUNT).map_err(AppError::from)
}

fn from_bytes(bytes: &[u8]) -> Result<Zeroizing<[u8; KEY_LEN]>, AppError> {
    if bytes.len() != KEY_LEN {
        return Err(AppError::new("keychain", "stored master key has wrong length"));
    }
    let mut k = Zeroizing::new([0u8; KEY_LEN]);
    k.copy_from_slice(bytes);
    Ok(k)
}

/// Load the master key, creating and storing a fresh random one if none exists.
/// Used during first-time setup.
pub fn get_or_create_master_key() -> Result<Zeroizing<[u8; KEY_LEN]>, AppError> {
    let entry = entry()?;
    match entry.get_secret() {
        Ok(bytes) => from_bytes(&bytes),
        Err(keyring::Error::NoEntry) => {
            let mut k = Zeroizing::new([0u8; KEY_LEN]);
            getrandom::getrandom(&mut k[..]).map_err(|e| AppError::new("rng", e.to_string()))?;
            entry.set_secret(&k[..]).map_err(AppError::from)?;
            Ok(k)
        }
        Err(err) => Err(AppError::from(err)),
    }
}

/// Load an existing master key. Fails if none is stored (e.g. wrong machine).
pub fn load_master_key() -> Result<Zeroizing<[u8; KEY_LEN]>, AppError> {
    let bytes = entry()?.get_secret().map_err(AppError::from)?;
    from_bytes(&bytes)
}

/// Crypto-erase: removing the keychain entry makes the DB permanently
/// undecryptable. Idempotent (no-op if already absent).
pub fn delete_master_key() -> Result<(), AppError> {
    match entry()?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(err) => Err(AppError::from(err)),
    }
}
