//! Vault primitives: KDF, DEK envelope, and field encryption.
//!
//! These functions are pure (they take the keychain `master_key` as input) so
//! they can be unit-tested without touching the OS keychain.

use argon2::{Algorithm, Argon2, Params, Version};
use chacha20poly1305::aead::{Aead, KeyInit};
use chacha20poly1305::{XChaCha20Poly1305, XNonce};
use hkdf::Hkdf;
use sha2::Sha256;
use zeroize::Zeroizing;

use crate::error::AppError;

pub const KEY_LEN: usize = 32;
pub const NONCE_LEN: usize = 24;
pub const SALT_LEN: usize = 16;

const HKDF_INFO: &[u8] = b"pendrake-kek-v1";

// Argon2id parameters (stored per-vault so they can evolve over time).
//
// Tuned down for UX (2026-06-04). The previous "max brute-force resistance"
// profile was 64 MiB x 3 iterations — see WORKLOG (Sesión 4) to restore it.
// 32 MiB x 2 is still well above the OWASP minimum (19 MiB x 2).
pub const ARGON2_MEM_KIB: u32 = 32 * 1024; // 32 MiB
pub const ARGON2_ITERS: u32 = 2;
pub const ARGON2_PARALLELISM: u32 = 1;

/// 32-byte data-encryption key; wiped from memory on drop.
pub struct Dek(Zeroizing<[u8; KEY_LEN]>);

/// Crypto material persisted in the `vault_meta` table (one row).
#[derive(Clone)]
pub struct VaultMeta {
    pub wrapped_dek: Vec<u8>,
    pub wrap_nonce: Vec<u8>,
    pub kdf_salt: Vec<u8>,
    pub kdf_mem_kib: u32,
    pub kdf_iterations: u32,
    pub kdf_parallelism: u32,
}

fn random(buf: &mut [u8]) -> Result<(), AppError> {
    getrandom::getrandom(buf).map_err(|e| AppError::new("rng", e.to_string()))
}

fn cipher(key: &[u8]) -> Result<XChaCha20Poly1305, AppError> {
    XChaCha20Poly1305::new_from_slice(key).map_err(|e| AppError::new("crypto", e.to_string()))
}

fn nonce_from(bytes: &[u8]) -> Result<&XNonce, AppError> {
    if bytes.len() != NONCE_LEN {
        return Err(AppError::new("crypto", "invalid nonce length"));
    }
    Ok(XNonce::from_slice(bytes))
}

/// Derive the KEK from the keychain master key + the user password.
fn derive_kek(
    master_key: &[u8; KEY_LEN],
    password: &str,
    salt: &[u8],
    mem_kib: u32,
    iters: u32,
    parallelism: u32,
) -> Result<Zeroizing<[u8; KEY_LEN]>, AppError> {
    let params = Params::new(mem_kib, iters, parallelism, Some(KEY_LEN))
        .map_err(|e| AppError::new("kdf", e.to_string()))?;
    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);

    let mut pw_key = Zeroizing::new([0u8; KEY_LEN]);
    argon2
        .hash_password_into(password.as_bytes(), salt, &mut pw_key[..])
        .map_err(|e| AppError::new("kdf", e.to_string()))?;

    // ikm = master_key (keychain), salt = pw_key (password): both required.
    let hk = Hkdf::<Sha256>::new(Some(&pw_key[..]), &master_key[..]);
    let mut kek = Zeroizing::new([0u8; KEY_LEN]);
    hk.expand(HKDF_INFO, &mut kek[..])
        .map_err(|_| AppError::new("kdf", "hkdf expand failed"))?;
    Ok(kek)
}

fn build_meta(
    master_key: &[u8; KEY_LEN],
    password: &str,
    dek: &[u8; KEY_LEN],
) -> Result<VaultMeta, AppError> {
    let mut salt = [0u8; SALT_LEN];
    random(&mut salt)?;
    let kek = derive_kek(
        master_key,
        password,
        &salt,
        ARGON2_MEM_KIB,
        ARGON2_ITERS,
        ARGON2_PARALLELISM,
    )?;
    let mut wrap_nonce = [0u8; NONCE_LEN];
    random(&mut wrap_nonce)?;
    let wrapped = cipher(&kek[..])?
        .encrypt(XNonce::from_slice(&wrap_nonce), &dek[..])
        .map_err(|e| AppError::new("crypto", e.to_string()))?;
    Ok(VaultMeta {
        wrapped_dek: wrapped,
        wrap_nonce: wrap_nonce.to_vec(),
        kdf_salt: salt.to_vec(),
        kdf_mem_kib: ARGON2_MEM_KIB,
        kdf_iterations: ARGON2_ITERS,
        kdf_parallelism: ARGON2_PARALLELISM,
    })
}

/// First-time setup: generate a fresh DEK and wrap it under password + master key.
pub fn setup(master_key: &[u8; KEY_LEN], password: &str) -> Result<(Dek, VaultMeta), AppError> {
    let mut dek = Zeroizing::new([0u8; KEY_LEN]);
    random(&mut dek[..])?;
    let meta = build_meta(master_key, password, &dek)?;
    Ok((Dek(dek), meta))
}

/// Unlock: re-derive the KEK and decrypt the wrapped DEK. The AEAD auth tag *is*
/// the password/keychain verifier — a wrong password or missing keychain entry
/// makes this fail, so no separate password hash is stored.
pub fn unlock(
    master_key: &[u8; KEY_LEN],
    password: &str,
    meta: &VaultMeta,
) -> Result<Dek, AppError> {
    let kek = derive_kek(
        master_key,
        password,
        &meta.kdf_salt,
        meta.kdf_mem_kib,
        meta.kdf_iterations,
        meta.kdf_parallelism,
    )?;
    let nonce = nonce_from(&meta.wrap_nonce)?;
    let pt = cipher(&kek[..])?
        .decrypt(nonce, meta.wrapped_dek.as_ref())
        .map_err(|_| {
            AppError::new(
                "bad_credentials",
                "incorrect password or missing keychain entry",
            )
        })?;
    if pt.len() != KEY_LEN {
        return Err(AppError::new("crypto", "unexpected DEK length"));
    }
    let mut dek = Zeroizing::new([0u8; KEY_LEN]);
    dek.copy_from_slice(&pt);
    Ok(Dek(dek))
}

/// Re-wrap the SAME DEK under a new password (PW-016). O(1): no field data is
/// re-encrypted, only the small wrapped-DEK blob changes.
pub fn rewrap(
    master_key: &[u8; KEY_LEN],
    new_password: &str,
    dek: &Dek,
) -> Result<VaultMeta, AppError> {
    build_meta(master_key, new_password, &dek.0)
}

/// Encrypt sensitive bytes (FVK, amounts...) with the DEK. Returns (ciphertext, nonce).
pub fn encrypt(dek: &Dek, plaintext: &[u8]) -> Result<(Vec<u8>, Vec<u8>), AppError> {
    let mut nonce = [0u8; NONCE_LEN];
    random(&mut nonce)?;
    let ct = cipher(&dek.0[..])?
        .encrypt(XNonce::from_slice(&nonce), plaintext)
        .map_err(|e| AppError::new("crypto", e.to_string()))?;
    Ok((ct, nonce.to_vec()))
}

/// Decrypt sensitive bytes previously produced by [`encrypt`] with the same DEK.
pub fn decrypt(dek: &Dek, ciphertext: &[u8], nonce: &[u8]) -> Result<Vec<u8>, AppError> {
    let nonce = nonce_from(nonce)?;
    cipher(&dek.0[..])?
        .decrypt(nonce, ciphertext)
        .map_err(|_| AppError::new("decrypt", "decryption failed (tampered or wrong key)"))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn master() -> [u8; KEY_LEN] {
        let mut k = [0u8; KEY_LEN];
        getrandom::getrandom(&mut k).unwrap();
        k
    }

    #[test]
    fn fvk_roundtrip_after_unlock() {
        let mk = master();
        let (dek, meta) = setup(&mk, "correct horse battery staple").unwrap();
        let fvk = b"uview1exampleunifiedfullviewingkey";
        let (ct, nonce) = encrypt(&dek, fvk).unwrap();

        let dek2 = unlock(&mk, "correct horse battery staple", &meta).unwrap();
        assert_eq!(decrypt(&dek2, &ct, &nonce).unwrap(), fvk);
    }

    #[test]
    fn wrong_password_fails() {
        let mk = master();
        let (_dek, meta) = setup(&mk, "right").unwrap();
        assert!(unlock(&mk, "wrong", &meta).is_err());
    }

    #[test]
    fn wrong_master_key_fails() {
        // "DB useless if copied without the keychain entry".
        let (_dek, meta) = setup(&master(), "pw").unwrap();
        assert!(unlock(&master(), "pw", &meta).is_err());
    }

    #[test]
    fn rewrap_changes_password_but_keeps_dek() {
        let mk = master();
        let (dek, _meta) = setup(&mk, "old").unwrap();
        let (ct, nonce) = encrypt(&dek, b"secret-note").unwrap();

        let meta2 = rewrap(&mk, "new", &dek).unwrap();
        assert!(unlock(&mk, "old", &meta2).is_err());

        let dek2 = unlock(&mk, "new", &meta2).unwrap();
        assert_eq!(decrypt(&dek2, &ct, &nonce).unwrap(), b"secret-note");
    }

    #[test]
    fn tampered_ciphertext_is_rejected() {
        let mk = master();
        let (dek, _meta) = setup(&mk, "pw").unwrap();
        let (mut ct, nonce) = encrypt(&dek, b"amount").unwrap();
        ct[0] ^= 0xFF;
        assert!(decrypt(&dek, &ct, &nonce).is_err());
    }
}
