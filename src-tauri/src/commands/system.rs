//! System / diagnostics commands.

/// Liveness probe to verify the JS -> Rust -> JS IPC round-trip works.
/// Frontend calls `invoke("ping")` and should receive `"pong"`.
#[tauri::command]
pub fn ping() -> String {
    "pong".to_string()
}
