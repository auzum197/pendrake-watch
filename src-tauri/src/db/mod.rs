//! Local SQLite persistence (PW-006).
//!
//! Plain `bundled` SQLite — confidentiality comes from encrypting sensitive
//! columns with the DEK (see [`crate::crypto`]), not from the file format. This
//! keeps the build toolchain-free (no SQLCipher/OpenSSL).
//!
//! Items are wired into Tauri commands in PW-012/PW-014; until then they're used
//! by unit tests, hence the module-level dead_code allow.
#![allow(dead_code)]

pub mod migrations;
pub mod models;
pub mod repo;

use std::path::Path;

use rusqlite::Connection;

use crate::error::AppError;

/// Open (or create) the wallet database at `path`, apply PRAGMAs and migrations.
pub fn open(path: &Path) -> Result<Connection, AppError> {
    let conn = Connection::open(path)?;
    configure(&conn)?;
    migrations::run(&conn)?;
    Ok(conn)
}

fn configure(conn: &Connection) -> Result<(), AppError> {
    conn.pragma_update(None, "journal_mode", "WAL")?;
    conn.pragma_update(None, "foreign_keys", "ON")?;
    conn.pragma_update(None, "synchronous", "NORMAL")?;
    Ok(())
}

#[cfg(test)]
pub fn open_in_memory() -> Result<Connection, AppError> {
    let conn = Connection::open_in_memory()?;
    conn.pragma_update(None, "foreign_keys", "ON")?;
    migrations::run(&conn)?;
    Ok(conn)
}
