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
use zcash_keys::keys::{UnifiedFullViewingKey, UnifiedIncomingViewingKey};
use zcash_protocol::consensus::Network;

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

/// Real cryptographic validation of a Unified viewing key (PW-009/010).
///
/// Backed by `zcash_keys` from the `librustzcash` core: the key must actually
/// decode as a Unified Full Viewing Key (`uview…`) or Unified Incoming Viewing
/// Key (`uivk…`) on mainnet or testnet. This rejects malformed/garbage input and
/// confirms the encoded payload is a structurally valid view-only key — not just
/// the prefix/length heuristic the mock used.
///
/// View-only by construction: we only ever decode *viewing* keys here; spending
/// keys (USK) are never parsed or accepted.
///
/// Returns the network the key belongs to, for later use by sync/account setup.
fn validate_viewing_key(vk: &str) -> CommandResult<Network> {
    let v = vk.trim();
    // The HRP encodes the network, so we try both and let `decode` reject a
    // mismatch. A UFVK is the modern standard; a UIVK is also view-only valid.
    for net in [Network::MainNetwork, Network::TestNetwork] {
        if UnifiedFullViewingKey::decode(&net, v).is_ok()
            || UnifiedIncomingViewingKey::decode(&net, v).is_ok()
        {
            return Ok(net);
        }
    }
    Err(AppError::new(
        "invalid_viewing_key",
        "Not a valid Unified viewing key (expected uview… or uivk…)",
    ))
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
    // Real crypto validation (PW-009/010). The detected network will drive sync
    // and account setup in a later phase; for now we only gate on validity.
    let _network = validate_viewing_key(&viewing_key)?;
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

#[cfg(test)]
mod tests {
    use super::*;

    // Real mainnet test vectors from `zcash_keys`' own suite.
    const VALID_UFVK: &str = "uview1tg6rpjgju2s2j37gkgjq79qrh5lvzr6e0ed3n4sf4hu5qd35vmsh7avl80xa6mx7ryqce9hztwaqwrdthetpy4pc0kce25x453hwcmax02p80pg5savlg865sft9reat07c5vlactr6l2pxtlqtqunt2j9gmvr8spcuzf07af80h5qmut38h0gvcfa9k4rwujacwwca9vu8jev7wq6c725huv8qjmhss3hdj2vh8cfxhpqcm2qzc34msyrfxk5u6dqttt4vv2mr0aajreww5yufpk0gn4xkfm888467k7v6fmw7syqq6cceu078yw8xja502jxr0jgum43lhvpzmf7eu5dmnn6cr6f7p43yw8znzgxg598mllewnx076hljlvynhzwn5es94yrv65tdg3utuz2u3sras0wfcq4adxwdvlk387d22g3q98t5z74quw2fa4wed32escx8dwh4mw35t4jwf35xyfxnu83mk5s4kw2glkgsshmxk";
    const VALID_UIVK: &str = "uivk1z28yg638vjwusmf0zc9ad2j0mpv6s42wc5kqt004aaqfu5xxxgu7mdcydn9qf723fnryt34s6jyxyw0jt7spq04c3v9ze6qe9gjjc5aglz8zv5pqtw58czd0actynww5n85z3052kzgy6cu0fyjafyp4sr4kppyrrwhwev2rr0awq6m8d66esvk6fgacggqnswg5g9gkv6t6fj9ajhyd0gmel4yzscprpzduncc0e2lywufup6fvzf6y8cefez2r99pgge5yyfuus0r60khgu895pln5e7nn77q6s9kh2uwf6lrfu06ma2kd7r05jjvl4hn6nupge8fajh0cazd7mkmz23t79w";

    #[test]
    fn accepts_a_real_unified_fvk() {
        assert_eq!(
            validate_viewing_key(VALID_UFVK).unwrap(),
            Network::MainNetwork
        );
    }

    #[test]
    fn accepts_a_real_unified_ivk() {
        assert_eq!(
            validate_viewing_key(VALID_UIVK).unwrap(),
            Network::MainNetwork
        );
    }

    #[test]
    fn trims_surrounding_whitespace() {
        let padded = format!("  {VALID_UFVK}\n");
        assert!(validate_viewing_key(&padded).is_ok());
    }

    #[test]
    fn rejects_garbage_that_passed_the_old_prefix_check() {
        // The mock accepted any "uview…" ≥20 chars; real decoding rejects this.
        let err = validate_viewing_key("uview1thisisnotarealviewingkey").unwrap_err();
        assert_eq!(err.code, "invalid_viewing_key");
    }

    #[test]
    fn rejects_non_unified_and_empty() {
        assert!(validate_viewing_key("").is_err());
        assert!(validate_viewing_key("zxviews1qqqqqqq").is_err());
        assert!(validate_viewing_key("not a key").is_err());
    }
}
