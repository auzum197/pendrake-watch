//! Settings commands (PW-038) + endpoint selection (PW-037).
//!
//! App configuration is persisted in the (non-sensitive, plaintext) `settings`
//! key-value table, so it is readable without unlocking the vault — important
//! for the theme on the login/setup screens. A typed `AppSettings` struct with
//! sensible defaults is exposed instead of raw strings.

use serde::Serialize;
use tauri::State;

use crate::db::repo;
use crate::error::{AppError, CommandResult};
use crate::lightwalletd::{default_endpoints, validate_endpoint, EndpointConfig, NamedEndpoint};
use crate::state::AppState;

const KEY_ENDPOINT: &str = "selected_endpoint";
const KEY_THEME: &str = "theme";
const KEY_CURRENCY: &str = "currency";
const KEY_SELECTED_ACCOUNT: &str = "selected_account_id";
const KEY_AUTO_SYNC: &str = "auto_sync_on_startup";

/// Keys settable via the generic `set_setting` command (the endpoint has its own
/// validated command).
const SETTABLE_KEYS: [&str; 4] = [KEY_THEME, KEY_CURRENCY, KEY_SELECTED_ACCOUNT, KEY_AUTO_SYNC];

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub endpoint: EndpointConfig,
    pub theme: String,
    pub currency: String,
    pub selected_account_id: Option<i64>,
    pub auto_sync_on_startup: bool,
}

fn default_endpoint() -> EndpointConfig {
    default_endpoints()
        .into_iter()
        .next()
        .expect("default_endpoints is non-empty")
        .config
}

#[tauri::command]
pub fn get_app_settings(state: State<'_, AppState>) -> CommandResult<AppSettings> {
    let guard = state
        .inner
        .lock()
        .map_err(|_| AppError::new("state", "state lock poisoned"))?;
    let db = &guard.db;

    let endpoint = match repo::get_setting(db, KEY_ENDPOINT)? {
        Some(json) => serde_json::from_str(&json).unwrap_or_else(|_| default_endpoint()),
        None => default_endpoint(),
    };

    Ok(AppSettings {
        endpoint,
        theme: repo::get_setting(db, KEY_THEME)?.unwrap_or_else(|| "system".into()),
        currency: repo::get_setting(db, KEY_CURRENCY)?.unwrap_or_else(|| "USD".into()),
        selected_account_id: repo::get_setting(db, KEY_SELECTED_ACCOUNT)?
            .and_then(|s| s.parse::<i64>().ok()),
        auto_sync_on_startup: repo::get_setting(db, KEY_AUTO_SYNC)?
            .map(|s| s == "true")
            .unwrap_or(true),
    })
}

#[tauri::command]
pub fn set_setting(state: State<'_, AppState>, key: String, value: String) -> CommandResult<()> {
    if !SETTABLE_KEYS.contains(&key.as_str()) {
        return Err(AppError::new(
            "unknown_setting",
            format!("Unknown setting: {key}"),
        ));
    }
    let guard = state
        .inner
        .lock()
        .map_err(|_| AppError::new("state", "state lock poisoned"))?;
    repo::set_setting(&guard.db, &key, &value)?;
    Ok(())
}

#[tauri::command]
pub fn set_endpoint(state: State<'_, AppState>, endpoint: EndpointConfig) -> CommandResult<()> {
    validate_endpoint(&endpoint)?;
    let json =
        serde_json::to_string(&endpoint).map_err(|e| AppError::new("serialize", e.to_string()))?;
    let guard = state
        .inner
        .lock()
        .map_err(|_| AppError::new("state", "state lock poisoned"))?;
    repo::set_setting(&guard.db, KEY_ENDPOINT, &json)?;
    Ok(())
}

#[tauri::command]
pub fn list_default_endpoints() -> CommandResult<Vec<NamedEndpoint>> {
    Ok(default_endpoints())
}
