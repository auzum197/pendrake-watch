//! Wallet read commands.
//!
//! These currently return **mock** data so the frontend can be built end-to-end
//! before the real Zcash light-client (zingolib / librustzcash) is wired in.
//! Each function returns `CommandResult<T>` so the error-handling path exists
//! from day one — swapping the mock body for real logic won't change the API.

use crate::error::CommandResult;
use crate::models::{
    Account, Pool, SyncState, SyncStatus, TransactionRecord, TxDirection, WalletAddress,
    WalletBalance,
};

/// Returns the wallet's balance, broken down by pool.
#[tauri::command]
pub fn get_balance() -> CommandResult<WalletBalance> {
    // Mock: 1.5 ZEC transparent, 12.25 shielded Sapling, 8.0 Orchard.
    let transparent: u64 = 150_000_000;
    let sapling: u64 = 1_225_000_000;
    let orchard: u64 = 800_000_000;
    let total = transparent + sapling + orchard;

    Ok(WalletBalance {
        total_zatoshis: total.to_string(),
        transparent: transparent.to_string(),
        sapling: sapling.to_string(),
        orchard: orchard.to_string(),
    })
}

/// Returns the current sync progress against the configured lightwalletd server.
#[tauri::command]
pub fn get_sync_status() -> CommandResult<SyncStatus> {
    Ok(SyncStatus {
        state: SyncState::Synced,
        synced_blocks: 2_450_000,
        total_blocks: 2_450_000,
        tip_height: 2_450_000,
    })
}

/// Returns recent transactions for the active account.
#[tauri::command]
pub fn get_transactions() -> CommandResult<Vec<TransactionRecord>> {
    Ok(vec![
        TransactionRecord {
            txid: "f3a1c0de00000000000000000000000000000000000000000000000000000001".into(),
            block_height: 2_449_980,
            timestamp: 1_733_270_400,
            direction: TxDirection::Received,
            pool: Pool::Orchard,
            value_zatoshis: "500000000".into(),
            confirmations: 20,
        },
        TransactionRecord {
            txid: "f3a1c0de00000000000000000000000000000000000000000000000000000002".into(),
            block_height: 2_449_500,
            timestamp: 1_733_184_000,
            direction: TxDirection::Received,
            pool: Pool::Sapling,
            value_zatoshis: "725000000".into(),
            confirmations: 500,
        },
        TransactionRecord {
            txid: "f3a1c0de00000000000000000000000000000000000000000000000000000003".into(),
            block_height: 2_448_000,
            timestamp: 1_732_924_800,
            direction: TxDirection::Sent,
            pool: Pool::Transparent,
            value_zatoshis: "100000000".into(),
            confirmations: 2_000,
        },
    ])
}

/// Returns the wallet's accounts and their addresses.
#[tauri::command]
pub fn get_accounts() -> CommandResult<Vec<Account>> {
    Ok(vec![Account {
        id: 0,
        label: "Account 0".into(),
        addresses: vec![
            WalletAddress {
                address: "u1exampleunifiedaddress00000000000000000000000000000000000".into(),
                pool: Pool::Orchard,
            },
            WalletAddress {
                address: "zs1exampleshieldedsaplingaddress000000000000000000000000000".into(),
                pool: Pool::Sapling,
            },
            WalletAddress {
                address: "t1exampletransparentaddress000000000".into(),
                pool: Pool::Transparent,
            },
        ],
    }])
}
