//! A serializable error type for Tauri commands.
//!
//! Tauri commands that return `Result<T, E>` require `E: Serialize`. Returning a
//! structured error (rather than a bare `String`) lets the frontend branch on a
//! stable `code` while still showing a human `message`.

use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppError {
    /// Stable machine-readable code, e.g. "sync_failed", "not_configured".
    pub code: String,
    /// Human-readable message for display/logging.
    pub message: String,
}

impl AppError {
    pub fn new(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
        }
    }
}

/// Convenience alias for command results.
pub type CommandResult<T> = Result<T, AppError>;
