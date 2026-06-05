//! Data-access functions. Sensitive values are encrypted/decrypted here via the
//! vault DEK so callers never see ciphertext.

use rusqlite::{params, Connection, OptionalExtension};

use crate::crypto::vault::{self, Dek, VaultMeta};
use crate::error::AppError;

use super::models::{Account, NewAccount};

// --- accounts ---------------------------------------------------------------

pub fn insert_account(conn: &Connection, account: &NewAccount) -> Result<i64, AppError> {
    conn.execute(
        "INSERT INTO accounts (name, ufvk_fingerprint, birthday_height)
         VALUES (?1, ?2, ?3)",
        params![
            account.name,
            account.ufvk_fingerprint,
            account.birthday_height
        ],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn get_account(conn: &Connection, id: i64) -> Result<Option<Account>, AppError> {
    let account = conn
        .query_row(
            "SELECT id, name, ufvk_fingerprint, birthday_height, created_at
             FROM accounts WHERE id = ?1",
            [id],
            |row| {
                Ok(Account {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    ufvk_fingerprint: row.get(2)?,
                    birthday_height: row.get(3)?,
                    created_at: row.get(4)?,
                })
            },
        )
        .optional()?;
    Ok(account)
}

// --- vault_meta -------------------------------------------------------------

pub fn save_vault_meta(conn: &Connection, meta: &VaultMeta) -> Result<(), AppError> {
    conn.execute(
        "INSERT OR REPLACE INTO vault_meta
            (id, wrapped_dek, wrap_nonce, kdf_salt, kdf_mem_kib, kdf_iterations, kdf_parallelism, password_enabled)
         VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6, 1)",
        params![
            meta.wrapped_dek,
            meta.wrap_nonce,
            meta.kdf_salt,
            meta.kdf_mem_kib,
            meta.kdf_iterations,
            meta.kdf_parallelism
        ],
    )?;
    Ok(())
}

pub fn load_vault_meta(conn: &Connection) -> Result<Option<VaultMeta>, AppError> {
    conn.query_row(
        "SELECT wrapped_dek, wrap_nonce, kdf_salt, kdf_mem_kib, kdf_iterations, kdf_parallelism
         FROM vault_meta WHERE id = 1",
        [],
        |row| {
            Ok(VaultMeta {
                wrapped_dek: row.get(0)?,
                wrap_nonce: row.get(1)?,
                kdf_salt: row.get(2)?,
                kdf_mem_kib: row.get(3)?,
                kdf_iterations: row.get(4)?,
                kdf_parallelism: row.get(5)?,
            })
        },
    )
    .optional()
    .map_err(AppError::from)
}

// --- viewing key (encrypted FVK) --------------------------------------------

pub fn store_fvk(
    conn: &Connection,
    dek: &Dek,
    account_id: i64,
    ufvk: &str,
) -> Result<(), AppError> {
    let (ciphertext, nonce) = vault::encrypt(dek, ufvk.as_bytes())?;
    conn.execute(
        "INSERT OR REPLACE INTO viewing_keys (account_id, encrypted_fvk, encryption_nonce)
         VALUES (?1, ?2, ?3)",
        params![account_id, ciphertext, nonce],
    )?;
    Ok(())
}

pub fn load_fvk(conn: &Connection, dek: &Dek, account_id: i64) -> Result<Option<String>, AppError> {
    let row = conn
        .query_row(
            "SELECT encrypted_fvk, encryption_nonce FROM viewing_keys WHERE account_id = ?1",
            [account_id],
            |row| Ok((row.get::<_, Vec<u8>>(0)?, row.get::<_, Vec<u8>>(1)?)),
        )
        .optional()?;

    match row {
        Some((ciphertext, nonce)) => {
            let plaintext = vault::decrypt(dek, &ciphertext, &nonce)?;
            let ufvk = String::from_utf8(plaintext)
                .map_err(|_| AppError::new("decode", "stored FVK is not valid UTF-8"))?;
            Ok(Some(ufvk))
        }
        None => Ok(None),
    }
}

// --- sync_state -------------------------------------------------------------

pub fn init_sync_state(
    conn: &Connection,
    account_id: i64,
    birthday_height: i64,
) -> Result<(), AppError> {
    conn.execute(
        "INSERT OR IGNORE INTO sync_state (account_id, last_scanned_height, status)
         VALUES (?1, ?2, 'idle')",
        params![account_id, birthday_height],
    )?;
    Ok(())
}

// --- settings ---------------------------------------------------------------

pub fn set_setting(conn: &Connection, key: &str, value: &str) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO settings (key, value, updated_at)
         VALUES (?1, ?2, unixepoch())
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
        params![key, value],
    )?;
    Ok(())
}

pub fn get_setting(conn: &Connection, key: &str) -> Result<Option<String>, AppError> {
    conn.query_row("SELECT value FROM settings WHERE key = ?1", [key], |row| {
        row.get(0)
    })
    .optional()
    .map_err(AppError::from)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::crypto::vault;
    use crate::db::models::NewAccount;

    fn master() -> [u8; 32] {
        let mut k = [0u8; 32];
        getrandom::getrandom(&mut k).unwrap();
        k
    }

    #[test]
    fn account_and_encrypted_fvk_roundtrip() {
        let conn = crate::db::open_in_memory().unwrap();
        let mk = master();
        let (dek, meta) = vault::setup(&mk, "pw").unwrap();
        save_vault_meta(&conn, &meta).unwrap();

        let id = insert_account(
            &conn,
            &NewAccount {
                name: "Account 0".into(),
                ufvk_fingerprint: None,
                birthday_height: 419_200,
            },
        )
        .unwrap();

        store_fvk(&conn, &dek, id, "uview1exampleufvk").unwrap();
        init_sync_state(&conn, id, 419_200).unwrap();

        // Re-derive the DEK from a fresh unlock (as a real login would) and read.
        let meta2 = load_vault_meta(&conn).unwrap().unwrap();
        let dek2 = vault::unlock(&mk, "pw", &meta2).unwrap();
        assert_eq!(
            load_fvk(&conn, &dek2, id).unwrap().as_deref(),
            Some("uview1exampleufvk")
        );

        assert_eq!(get_account(&conn, id).unwrap().unwrap().name, "Account 0");
    }

    #[test]
    fn settings_upsert() {
        let conn = crate::db::open_in_memory().unwrap();
        set_setting(&conn, "lightwalletd_url", "https://zec.rocks").unwrap();
        set_setting(
            &conn,
            "lightwalletd_url",
            "https://mainnet.lightwalletd.com",
        )
        .unwrap();
        assert_eq!(
            get_setting(&conn, "lightwalletd_url").unwrap().as_deref(),
            Some("https://mainnet.lightwalletd.com")
        );
    }
}
