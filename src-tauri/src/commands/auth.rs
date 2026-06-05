//! Wallet authentication commands (PW-012/014/016/017).
//!
//! These wire the encrypted vault (PW-006) into the frontend:
//! - [`setup_wallet`]  — first-run: store an encrypted viewing key + password
//! - [`unlock_wallet`] — login: derive the DEK from the password
//! - [`lock_wallet`]   — logout: drop the DEK from memory
//! - [`change_password`] — re-wrap the DEK under a new password
//! - [`wallet_status`] — is the wallet initialized / unlocked?

use serde::Serialize;
use tauri::State;

use crate::crypto::{keychain, vault};
use crate::db::models::NewAccount;
use crate::db::repo;
use crate::error::{AppError, CommandResult};
use crate::state::AppState;

const MIN_PASSWORD_LEN: usize = 8;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WalletStatus {
    pub initialized: bool,
    pub unlocked: bool,
}

/// Lightweight viewing-key format check. Full cryptographic validation against
/// the network arrives with the zingolib/librustzcash integration (PW-009/010);
/// here we only reject obviously-wrong input before persisting it.
fn validate_viewing_key(vk: &str) -> CommandResult<()> {
    let v = vk.trim();
    let recognized = v.starts_with("uview")        // unified FVK (mainnet/testnet)
        || v.starts_with("zxviews")                // sapling extended FVK (mainnet)
        || v.starts_with("zxviewtestsapling"); // sapling extended FVK (testnet)
    if recognized && v.len() >= 20 {
        Ok(())
    } else {
        Err(AppError::new(
            "invalid_viewing_key",
            "Unrecognized viewing key format",
        ))
    }
}

#[tauri::command]
pub fn wallet_status(state: State<'_, AppState>) -> CommandResult<WalletStatus> {
    let guard = state
        .inner
        .lock()
        .map_err(|_| AppError::new("state", "state lock poisoned"))?;
    Ok(WalletStatus {
        initialized: repo::load_vault_meta(&guard.db)?.is_some(),
        unlocked: guard.session.is_some(),
    })
}

#[tauri::command]
pub fn setup_wallet(
    state: State<'_, AppState>,
    viewing_key: String,
    password: String,
) -> CommandResult<()> {
    validate_viewing_key(&viewing_key)?;
    if password.len() < MIN_PASSWORD_LEN {
        return Err(AppError::new(
            "weak_password",
            "Password must be at least 8 characters",
        ));
    }

    let mut guard = state
        .inner
        .lock()
        .map_err(|_| AppError::new("state", "state lock poisoned"))?;

    if repo::load_vault_meta(&guard.db)?.is_some() {
        return Err(AppError::new(
            "already_initialized",
            "A wallet is already set up on this device",
        ));
    }

    // Master key lives in the OS keychain; the DB never sees it.
    let master_key = keychain::get_or_create_master_key()?;
    let (dek, meta) = vault::setup(&master_key, &password)?;

    repo::save_vault_meta(&guard.db, &meta)?;
    // birthday_height 0 = scan from activation; refined once the VK is parsed by
    // librustzcash (PW-009).
    let account_id = repo::insert_account(
        &guard.db,
        &NewAccount {
            name: "Account 0".into(),
            ufvk_fingerprint: None,
            birthday_height: 0,
        },
    )?;
    repo::store_fvk(&guard.db, &dek, account_id, viewing_key.trim())?;
    repo::init_sync_state(&guard.db, account_id, 0)?;

    guard.session = Some(dek);
    Ok(())
}

#[tauri::command]
pub fn unlock_wallet(state: State<'_, AppState>, password: String) -> CommandResult<()> {
    let mut guard = state
        .inner
        .lock()
        .map_err(|_| AppError::new("state", "state lock poisoned"))?;

    let meta = repo::load_vault_meta(&guard.db)?
        .ok_or_else(|| AppError::new("not_initialized", "No wallet is set up"))?;
    let master_key = keychain::load_master_key()?;
    // Wrong password or missing keychain entry -> AppError { code: "bad_credentials" }.
    let dek = vault::unlock(&master_key, &password, &meta)?;

    guard.session = Some(dek);
    Ok(())
}

#[tauri::command]
pub fn lock_wallet(state: State<'_, AppState>) -> CommandResult<()> {
    let mut guard = state
        .inner
        .lock()
        .map_err(|_| AppError::new("state", "state lock poisoned"))?;
    guard.session = None; // Dek is zeroized on drop
    Ok(())
}

#[tauri::command]
pub fn change_password(
    state: State<'_, AppState>,
    old_password: String,
    new_password: String,
) -> CommandResult<()> {
    if new_password.len() < MIN_PASSWORD_LEN {
        return Err(AppError::new(
            "weak_password",
            "Password must be at least 8 characters",
        ));
    }

    let mut guard = state
        .inner
        .lock()
        .map_err(|_| AppError::new("state", "state lock poisoned"))?;

    let meta = repo::load_vault_meta(&guard.db)?
        .ok_or_else(|| AppError::new("not_initialized", "No wallet is set up"))?;
    let master_key = keychain::load_master_key()?;
    // Verifies the old password by unlocking, then re-wraps the same DEK.
    let dek = vault::unlock(&master_key, &old_password, &meta)?;
    let new_meta = vault::rewrap(&master_key, &new_password, &dek)?;
    repo::save_vault_meta(&guard.db, &new_meta)?;

    guard.session = Some(dek);
    Ok(())
}
