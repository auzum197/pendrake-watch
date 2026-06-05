//! Tauri command handlers, grouped by domain.
//!
//! Each submodule exposes `#[tauri::command]` functions that are registered in
//! `lib.rs` via `tauri::generate_handler!`. Keep commands thin: validate input,
//! delegate to domain logic, map errors to `AppError`.

pub mod auth;
pub mod system;
pub mod wallet;
