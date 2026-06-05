//! Minimal forward-only migrations keyed off SQLite's `PRAGMA user_version`.
//! Avoids an extra crate while keeping versioned, reviewable `.sql` files.

use rusqlite::Connection;

use crate::error::AppError;

const LATEST_VERSION: i64 = 1;

/// Apply any pending migrations. Idempotent.
pub fn run(conn: &Connection) -> Result<(), AppError> {
    let version: i64 = conn.pragma_query_value(None, "user_version", |row| row.get(0))?;

    if version < 1 {
        conn.execute_batch(include_str!("../../migrations/001_initial.up.sql"))?;
    }

    conn.pragma_update(None, "user_version", LATEST_VERSION)?;
    Ok(())
}
