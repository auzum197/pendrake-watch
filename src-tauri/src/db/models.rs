//! Row structs mapping the SQLite schema. Sensitive amounts are not represented
//! here as plaintext — they live encrypted and are decrypted on demand via the
//! repo functions.

/// A row in `accounts`.
pub struct Account {
    pub id: i64,
    pub name: String,
    pub ufvk_fingerprint: Option<Vec<u8>>,
    pub birthday_height: i64,
    pub created_at: i64,
}

/// Insert payload for a new account.
pub struct NewAccount {
    pub name: String,
    pub ufvk_fingerprint: Option<Vec<u8>>,
    pub birthday_height: i64,
}

/// A row in `sync_state`.
pub struct SyncStateRow {
    pub account_id: i64,
    pub last_scanned_height: i64,
    pub last_sync_at: Option<i64>,
    pub status: String,
    pub error_message: Option<String>,
}
