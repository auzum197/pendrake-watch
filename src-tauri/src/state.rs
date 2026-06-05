//! Application state shared across Tauri commands.
//!
//! Holds the single SQLite connection and the in-memory session: the `Dek` is
//! present only while the wallet is unlocked, and is zeroized on drop when the
//! wallet is locked (PW-017).

use std::sync::Mutex;

use rusqlite::Connection;

use crate::crypto::vault::Dek;

pub struct AppState {
    pub inner: Mutex<Inner>,
}

pub struct Inner {
    pub db: Connection,
    /// `Some` while unlocked; `None` when locked.
    pub session: Option<Dek>,
}

impl AppState {
    pub fn new(db: Connection) -> Self {
        Self {
            inner: Mutex::new(Inner { db, session: None }),
        }
    }
}
