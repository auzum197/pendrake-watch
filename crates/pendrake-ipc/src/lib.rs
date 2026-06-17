//! Wire protocol between the Pendrake daemon and the GUI client.
//!
//! Transport is a Unix-domain socket carrying newline-delimited JSON: one
//! [`Request`] per line from the client, one [`Response`] per line back, matched
//! by `id`. After a client sends `subscribeEvents`, the daemon also pushes
//! [`SyncEvent`] lines down that same connection as the wallet scans. A pushed
//! event carries `event`; a reply carries `ok`/`id`, so a reader tells them apart
//! without a wrapper frame. The SPEC's eventual length-prefixed bincode codec and
//! auth-token handshake land in later milestones.
//!
//! Domain types use camelCase so they map field-for-field onto the GUI's
//! TypeScript contract.

use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Deserialize)]
pub struct Request {
    pub id: u64,
    pub method: String,
    #[serde(default)]
    pub params: Value,
}

#[derive(Debug, Serialize)]
pub struct Response {
    pub id: u64,
    pub ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

impl Response {
    pub fn ok(id: u64, result: Value) -> Self {
        Self {
            id,
            ok: true,
            result: Some(result),
            error: None,
        }
    }

    pub fn err(id: u64, error: impl Into<String>) -> Self {
        Self {
            id,
            ok: false,
            result: None,
            error: Some(error.into()),
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Network {
    Mainnet,
    Testnet,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ImportType {
    Ufvk,
    Seed,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum ViewMode {
    Full,
    IncomingOnly,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WalletState {
    pub exists: bool,
    /// True when the wallet file is encrypted and the daemon hasn't been given the
    /// passphrase yet, so the GUI must collect it via `unlock` before anything works.
    pub locked: bool,
    pub import_type: ImportType,
    pub view_mode: ViewMode,
    pub network: Network,
    pub birthday_height: u32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WalletAddress {
    pub ua: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transparent: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportUfvkArgs {
    pub ufvk: String,
    pub birthday: u32,
    pub indexer_uri: String,
    pub network: Network,
    /// Global passphrase that encrypts the wallet at rest (docs/adr/0003). It is
    /// never persisted, the Argon2 verifier lives in the wallet file's header.
    pub passphrase: String,
}

#[derive(Debug, Deserialize)]
pub struct UnlockArgs {
    pub passphrase: String,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum SyncState {
    Idle,
    Syncing,
    Error,
}

/// What the scanner is doing right now, derived from the latest batch lifecycle
/// event. Drives the progress label; `None` until the first event arrives.
#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum SyncPhase {
    Scanning,
    Committing,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncStatus {
    pub state: SyncState,
    pub synced_height: u32,
    pub chain_tip: u32,
    pub percent: u8,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub phase: Option<SyncPhase>,
    /// Sapling+orchard notes scanned in the sync window (progress numerator).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scanned_outputs: Option<u64>,
    /// Total notes to scan in the window (progress denominator).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub total_outputs: Option<u64>,
    /// Estimated seconds to completion from the observed scan rate.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub eta_seconds: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_synced_at: Option<u64>,
}

impl Default for SyncStatus {
    fn default() -> Self {
        Self {
            state: SyncState::Idle,
            synced_height: 0,
            chain_tip: 0,
            percent: 0,
            phase: None,
            scanned_outputs: None,
            total_outputs: None,
            eta_seconds: None,
            error: None,
            last_synced_at: None,
        }
    }
}

/// Where a single scan range is in its lifecycle: decrypting (`Scanning`), queued
/// behind the serialized commit stage (`Waiting`), or holding the wallet lock and
/// writing (`Committing`).
#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum BatchPhase {
    Scanning,
    Waiting,
    Committing,
}

/// One in-flight scan range. The GUI keys on `id` and animates the active bar
/// from `phase_started_at_ms` against `expected_secs`, so it advances smoothly
/// between pushes.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchProgress {
    pub id: String,
    pub start: u32,
    pub end: u32,
    pub priority: String,
    pub outputs: u64,
    pub phase: BatchPhase,
    pub phase_started_at_ms: u64,
    /// Estimated duration of the active phase from measured throughput; `None`
    /// while waiting, where no work is progressing.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expected_secs: Option<f64>,
}

/// The commit phase split into its sub-phases, in seconds. Mirrors pepper-sync's
/// `CommitTiming` for the full per-batch diagnostic.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitBreakdown {
    pub checkpoints: f64,
    pub frontiers: f64,
    pub insert_tree: f64,
    pub spend_fetch: f64,
    pub spend_cpu: f64,
    pub cleanup: f64,
    pub other: f64,
}

/// Measured wall-clock cost of a committed batch, in seconds.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchTiming {
    pub total_secs: f64,
    pub wait_secs: f64,
    pub fetch_secs: f64,
    pub decryption_secs: f64,
    pub tree_secs: f64,
    pub commit_secs: f64,
    pub commit: CommitBreakdown,
}

/// A finished scan range with its measured timing, for the recent-batches log.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchSummary {
    pub id: String,
    pub start: u32,
    pub end: u32,
    pub priority: String,
    pub outputs: u64,
    pub timing: BatchTiming,
}

/// A line the daemon pushes to a subscribed client as the wallet scans. Tagged by
/// `event`, so a reader distinguishes it from a request [`Response`] (which carries
/// `ok`/`id`) on the shared connection.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase", tag = "event")]
pub enum SyncEvent {
    /// A fresh snapshot: the overall bar/phase/counts/ETA plus the active batches.
    Progress {
        status: SyncStatus,
        batches: Vec<BatchProgress>,
    },
    /// A scan range committed; the GUI appends it to the recent-batches log.
    BatchDone { batch: BatchSummary },
    /// A newly committed transaction the GUI should fold into balance and history.
    Transaction {
        txid: String,
        kind: TxKind,
        value_zat: String,
        received: bool,
    },
    /// The round reached the chain tip; `status` is the terminal idle snapshot.
    Finished { status: SyncStatus },
    /// The round failed; the GUI shows the message and waits for the next round.
    Error { message: String },
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PoolBalance {
    pub confirmed: String,
    pub total: String,
}

#[derive(Debug, Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Balance {
    pub orchard: Option<PoolBalance>,
    pub sapling: Option<PoolBalance>,
    pub transparent: Option<PoolBalance>,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum TxKind {
    Received,
    Sent,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum TxStatus {
    Confirmed,
    Pending,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Tx {
    pub txid: String,
    /// Unix seconds.
    pub datetime: u64,
    pub block_height: Option<u32>,
    pub kind: TxKind,
    pub value_zat: String,
    pub status: TxStatus,
}
