//! View-only wallet store (Zcash core, Fase 3a).
//!
//! Builds an in-memory wallet (`zcash_client_memory::MemoryWalletDb`) and imports a
//! Unified FVK as a **view-only** account, with a real `AccountBirthday` derived
//! from the server's `GetTreeState`. This replaces the `birthday_height = 0`
//! placeholder used at setup time.
//!
//! Strictly view-only: only `import_account_ufvk` with `AccountPurpose::ViewOnly`
//! is ever used — no spending keys.
//!
//! Kept Tauri-free so it can move into dorianvp's `wallet-daemon`. NOT yet wired into
//! the app state / commands (that, plus the `sync::run` loop and the encrypted
//! snapshot, are the next sub-phases 3b/3c).
//!
//! Not yet called from commands → allow dead_code until 3b wires it in.
#![allow(dead_code)]

use zcash_client_backend::data_api::{AccountBirthday, AccountPurpose, BirthdayError, WalletWrite};
use zcash_client_backend::proto::service::TreeState;
use zcash_keys::keys::UnifiedFullViewingKey;
use zcash_protocol::consensus::Network;

use zcash_client_memory::MemoryWalletDb;

/// How many commitment-tree checkpoints the in-memory store keeps (bounds memory;
/// enough to handle reorgs of typical depth).
const MAX_CHECKPOINTS: usize = 100;

/// Default account label for the single view-only account of the MVP.
const ACCOUNT_NAME: &str = "Account 0";

/// Build an in-memory wallet and import `ufvk` as a view-only account, anchored at
/// the birthday described by `birthday_treestate` (a `GetTreeState` response from
/// the chosen height). The account will be scanned from that height onward.
pub fn build_view_only_wallet(
    network: Network,
    ufvk: &UnifiedFullViewingKey,
    birthday_treestate: TreeState,
) -> Result<MemoryWalletDb<Network>, String> {
    // BirthdayError implements neither Debug nor Display, so match its variants
    // (which carry types that do).
    let birthday =
        AccountBirthday::from_treestate(birthday_treestate, None).map_err(|e| match e {
            BirthdayError::HeightInvalid(e) => format!("invalid birthday height: {e}"),
            BirthdayError::Decode(e) => format!("birthday treestate decode error: {e}"),
        })?;

    let mut db = MemoryWalletDb::new(network, MAX_CHECKPOINTS);
    db.import_account_ufvk(
        ACCOUNT_NAME,
        ufvk,
        &birthday,
        AccountPurpose::ViewOnly,
        None,
    )
    .map_err(|e| format!("import_account_ufvk failed: {e:?}"))?;

    Ok(db)
}

#[cfg(test)]
mod tests {
    use super::*;
    use zcash_client_backend::data_api::WalletRead;

    const VALID_UFVK: &str = "uview1tg6rpjgju2s2j37gkgjq79qrh5lvzr6e0ed3n4sf4hu5qd35vmsh7avl80xa6mx7ryqce9hztwaqwrdthetpy4pc0kce25x453hwcmax02p80pg5savlg865sft9reat07c5vlactr6l2pxtlqtqunt2j9gmvr8spcuzf07af80h5qmut38h0gvcfa9k4rwujacwwca9vu8jev7wq6c725huv8qjmhss3hdj2vh8cfxhpqcm2qzc34msyrfxk5u6dqttt4vv2mr0aajreww5yufpk0gn4xkfm888467k7v6fmw7syqq6cceu078yw8xja502jxr0jgum43lhvpzmf7eu5dmnn6cr6f7p43yw8znzgxg598mllewnx076hljlvynhzwn5es94yrv65tdg3utuz2u3sras0wfcq4adxwdvlk387d22g3q98t5z74quw2fa4wed32escx8dwh4mw35t4jwf35xyfxnu83mk5s4kw2glkgsshmxk";

    // Live test — fetches a real treestate from zec.rocks and imports a real UFVK.
    // Ignored by default (network); run with:
    //   cargo test --lib wallet::tests::live -- --ignored --nocapture
    #[ignore]
    #[tokio::test]
    async fn live_import_view_only_account() {
        let cfg = crate::lightwalletd::EndpointConfig {
            host: "zec.rocks".into(),
            port: 443,
            use_tls: true,
        };
        let tip = crate::grpc::get_latest_block_height(&cfg).await.unwrap();
        // Use a recent birthday so we don't anchor at the very tip edge.
        let birthday_height = tip.saturating_sub(1_000);
        let treestate = crate::grpc::get_tree_state(&cfg, birthday_height)
            .await
            .expect("treestate");

        let ufvk = UnifiedFullViewingKey::decode(&Network::MainNetwork, VALID_UFVK).unwrap();
        let db = build_view_only_wallet(Network::MainNetwork, &ufvk, treestate).expect("import");

        let accounts = db.get_account_ids().expect("account ids");
        assert_eq!(accounts.len(), 1, "exactly one view-only account imported");
        println!("imported view-only account, birthday height={birthday_height}");
    }
}
