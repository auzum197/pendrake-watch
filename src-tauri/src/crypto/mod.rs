//! Encryption-at-rest for the wallet (PW-006).
//!
//! Key hierarchy (pure Rust, no OpenSSL/SQLCipher):
//!
//! ```text
//! OS keychain ── master_key (32B random)        <- never in the DB
//! password ──Argon2id(salt)──► pw_key (32B)
//! HKDF-SHA256(ikm=master_key, salt=pw_key) ──► KEK (32B)
//! KEK unwraps wrapped_dek (vault_meta) ──► DEK (32B)
//! DEK + per-field nonce ──XChaCha20-Poly1305──► encrypted FVK / amounts
//! ```
//!
//! Copying the `.db` file is useless without the keychain `master_key`: the KEK
//! cannot be formed, so the DEK never unwraps. Deleting the keychain entry is an
//! instant crypto-erase. See [`vault`] for the primitives and [`keychain`] for
//! the OS keychain integration.
//!
//! NOTE: items here are wired into Tauri commands in PW-012/PW-014; until then
//! they're exercised by unit tests only, hence the module-level dead_code allow.
#![allow(dead_code)]

pub mod keychain;
pub mod vault;
