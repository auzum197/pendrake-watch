//! View-only wallet sync (Zcash core, Fase 3).
//!
//! Builds the wallet store, imports a Unified FVK as a **view-only** account with a
//! real `AccountBirthday` (from the server's `GetTreeState`), and runs the reference
//! sync state machine (`zcash_client_backend::sync::run`).
//!
//! Store choice: `zcash_client_sqlite::WalletDb` over an **in-memory** SQLite
//! (`":memory:"`). `zcash_client_memory::MemoryWalletDb` was tried first but is
//! incomplete (v0.0.0, `todo!()` in reorg/transparent paths → panics during sync);
//! `WalletDb` is the complete, production-grade store. Held in RAM (no plaintext file
//! on disk); encrypted persistence with the vault is sub-phase 3c. The block cache is
//! the (complete) in-memory `MemBlockCache`.
//!
//! Strictly view-only: only `import_account_ufvk` with `AccountPurpose::ViewOnly` is
//! ever used — no spending keys.
//!
//! Self-contained for now (build + import + sync in one call) so the concrete
//! `WalletDb<…>` type need not cross a module boundary; wiring it into long-lived app
//! state + commands is sub-phase 3b-2.
//!
//! Not yet called from commands → allow dead_code until 3b-2 wires it in.
#![allow(dead_code)]

use rand_chacha::rand_core::SeedableRng;
use rand_chacha::ChaChaRng;
use zcash_client_backend::data_api::{AccountBirthday, AccountPurpose, BirthdayError, WalletWrite};
use zcash_client_backend::proto::service::TreeState;
use zcash_keys::keys::UnifiedFullViewingKey;
use zcash_protocol::consensus::Network;

use zcash_client_memory::MemBlockCache;
use zcash_client_sqlite::util::SystemClock;
use zcash_client_sqlite::wallet::init::init_wallet_db;
use zcash_client_sqlite::WalletDb;

use crate::lightwalletd::EndpointConfig;

/// Default account label for the single view-only account of the MVP.
const ACCOUNT_NAME: &str = "Account 0";

/// Import a view-only account and synchronize it against `cfg`.
///
/// Steps: build an in-memory `WalletDb` → `import_account_ufvk(ViewOnly)` anchored at
/// `birthday_treestate` → `sync::run` (download compact blocks, client-side
/// trial-decrypt, commitment-tree + reorg handling, balance refresh). `batch_size` =
/// blocks scanned per batch.
pub async fn sync_view_only(
    network: Network,
    ufvk: &UnifiedFullViewingKey,
    birthday_treestate: TreeState,
    cfg: &EndpointConfig,
    batch_size: u32,
) -> Result<(), String> {
    // BirthdayError implements neither Debug nor Display; match its variants.
    let birthday =
        AccountBirthday::from_treestate(birthday_treestate, None).map_err(|e| match e {
            BirthdayError::HeightInvalid(e) => format!("invalid birthday height: {e}"),
            BirthdayError::Decode(e) => format!("birthday treestate decode error: {e}"),
        })?;

    // RngCore param required by WalletDb (used for address diversifier selection).
    // Seeded from OS entropy. View-only never derives spending material.
    let mut seed = [0u8; 32];
    getrandom::getrandom(&mut seed).map_err(|e| format!("rng seed: {e}"))?;
    let rng = ChaChaRng::from_seed(seed);

    let mut db = WalletDb::for_path(":memory:", network, SystemClock, rng)
        .map_err(|e| format!("open wallet db: {e}"))?;
    init_wallet_db(&mut db, None).map_err(|e| format!("init wallet db: {e:?}"))?;

    db.import_account_ufvk(
        ACCOUNT_NAME,
        ufvk,
        &birthday,
        AccountPurpose::ViewOnly,
        None,
    )
    .map_err(|e| format!("import_account_ufvk failed: {e}"))?;

    let mut client = crate::grpc::connect(cfg).await?;
    let cache = MemBlockCache::new();
    zcash_client_backend::sync::run(&mut client, &network, &cache, &mut db, batch_size)
        .await
        .map_err(|e| format!("sync failed: {e}"))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    const VALID_UFVK: &str = "uview1tg6rpjgju2s2j37gkgjq79qrh5lvzr6e0ed3n4sf4hu5qd35vmsh7avl80xa6mx7ryqce9hztwaqwrdthetpy4pc0kce25x453hwcmax02p80pg5savlg865sft9reat07c5vlactr6l2pxtlqtqunt2j9gmvr8spcuzf07af80h5qmut38h0gvcfa9k4rwujacwwca9vu8jev7wq6c725huv8qjmhss3hdj2vh8cfxhpqcm2qzc34msyrfxk5u6dqttt4vv2mr0aajreww5yufpk0gn4xkfm888467k7v6fmw7syqq6cceu078yw8xja502jxr0jgum43lhvpzmf7eu5dmnn6cr6f7p43yw8znzgxg598mllewnx076hljlvynhzwn5es94yrv65tdg3utuz2u3sras0wfcq4adxwdvlk387d22g3q98t5z74quw2fa4wed32escx8dwh4mw35t4jwf35xyfxnu83mk5s4kw2glkgsshmxk";

    // Live test — imports a real UFVK at a recent birthday and actually syncs that
    // range against zec.rocks via the full reference pipeline. Completing without
    // error proves download → trial-decrypt → tree update → balance refresh.
    // Ignored by default (network); run with:
    //   cargo test --lib wallet::tests::live -- --ignored --nocapture
    #[ignore]
    #[tokio::test]
    async fn live_sync_view_only() {
        let cfg = EndpointConfig {
            host: "zec.rocks".into(),
            port: 443,
            use_tls: true,
        };
        let tip = crate::grpc::get_latest_block_height(&cfg).await.unwrap();
        let birthday_height = tip.saturating_sub(300);
        let treestate = crate::grpc::get_tree_state(&cfg, birthday_height)
            .await
            .expect("treestate");
        let ufvk = UnifiedFullViewingKey::decode(&Network::MainNetwork, VALID_UFVK).unwrap();

        sync_view_only(Network::MainNetwork, &ufvk, treestate, &cfg, 1_000)
            .await
            .expect("sync_view_only");

        println!("synced ~300 blocks from height {birthday_height} (sqlite :memory: store)");
    }
}
