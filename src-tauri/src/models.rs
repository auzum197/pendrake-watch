//! Shared data models for the wallet, serialized across the Tauri IPC boundary.
//!
//! NOTE ON AMOUNTS: Zcash amounts are measured in *zatoshis* (1 ZEC = 100_000_000
//! zatoshis). The total supply (~21M ZEC) in zatoshis is ~2.1e15, which is below
//! JS `Number.MAX_SAFE_INTEGER` (~9.007e15) — but individual u64 fields could in
//! theory exceed it. To stay safe on the JS side we serialize every amount as a
//! decimal **string** and parse it with `BigInt` in the frontend (`src/lib/zec.ts`).

use serde::Serialize;

/// The three Zcash value pools the wallet can read from.
#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Pool {
    Transparent,
    Sapling,
    Orchard,
}

/// Aggregated balance, broken down by pool. Amounts are zatoshis-as-string.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WalletBalance {
    pub total_zatoshis: String,
    pub transparent: String,
    pub sapling: String,
    pub orchard: String,
}

/// High-level state of the sync engine.
#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum SyncState {
    Idle,
    Syncing,
    Synced,
    Error,
}

/// Progress of the chain sync against a lightwalletd server.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncStatus {
    pub state: SyncState,
    pub synced_blocks: u32,
    pub total_blocks: u32,
    pub tip_height: u32,
}

/// Whether a transaction credited or debited the wallet.
#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum TxDirection {
    Received,
    Sent,
}

/// A single transaction as seen by a view-only wallet.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TransactionRecord {
    pub txid: String,
    pub block_height: u32,
    /// Unix timestamp (seconds).
    pub timestamp: i64,
    pub direction: TxDirection,
    pub pool: Pool,
    pub value_zatoshis: String,
    pub confirmations: u32,
}

/// An address derived from the account's viewing key.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WalletAddress {
    pub address: String,
    pub pool: Pool,
}

/// A wallet account. The MVP is single-account, but the model is plural-ready.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Account {
    pub id: u32,
    pub label: String,
    pub addresses: Vec<WalletAddress>,
}
