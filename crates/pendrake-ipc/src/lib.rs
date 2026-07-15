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

/// `skip_serializing_if` predicate for `bool` fields that default to false, so a
/// false flag stays off the wire and absent reads as false on the GUI side.
fn is_false(b: &bool) -> bool {
    !*b
}

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
    Regtest,
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
    /// True when the daemon holds the session passphrase in memory. Lets onboarding
    /// tell a post-Replace empty-but-unlocked daemon from a cold one and skip Set
    /// Password (docs/adr/0004).
    pub session_held: bool,
    /// The current Wallet's fingerprint, the value that seeds its LifeHash. `None`
    /// for a wallet imported before fingerprints were persisted, or when no wallet
    /// exists.
    pub fingerprint: Option<String>,
    pub import_type: ImportType,
    pub view_mode: ViewMode,
    pub network: Network,
    pub birthday_height: u32,
    /// The Indexer this Wallet syncs against, editable from Settings (AUZ-47).
    /// Empty when no wallet exists.
    pub indexer_uri: String,
    /// Whether transaction and scan-complete notifications fire. Toggled from
    /// Settings; the "Indexer unreachable" alert is independent of this.
    pub notifications_enabled: bool,
    /// Whether fiat (USD) price display is enabled. Off until the user consents to the
    /// third-party price egress via the toggle's modal (docs/adr/0008). Gates the price
    /// refresh loop, so nothing is fetched while false.
    #[serde(default)]
    pub fiat_enabled: bool,
    /// Whether Discreet mode is on. The GUI masks sensitive values; the daemon redacts
    /// new-transaction notification text (docs/adr/0009).
    #[serde(default)]
    pub discreet: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WalletAddress {
    pub ua: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transparent: Option<String>,
}

/// The network a UFVK declares. Distinct from [`Network`]: a key can be testnet,
/// which Pendrake rejects, so the decode result carries only the two it accepts.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum UfvkNetwork {
    Mainnet,
    Regtest,
}

/// A value pool a UFVK can view, in the glossary's vocabulary. Unknown and
/// experimental typecodes are dropped rather than surfaced.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Pool {
    Orchard,
    Sapling,
    Transparent,
}

/// What a successful UFVK decode tells the GUI: the network it is bound to, a
/// stable fingerprint that seeds its LifeHash, and the pools it can watch.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct UfvkIdentity {
    pub network: UfvkNetwork,
    pub fingerprint: String,
    pub pools: Vec<Pool>,
}

/// The verdict of a `parseUfvk` request. A testnet or malformed key is a decode
/// outcome the GUI renders inline, not a transport failure, so it rides back as
/// an `ok` result tagged by `kind` rather than a daemon error.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub enum ParseUfvkResult {
    Valid(UfvkIdentity),
    Testnet,
    Malformed { reason: String },
}

/// How the user chose a Wallet's Birthday at import. The daemon's resolver is the
/// single source of truth that turns this into a starting block height, so the GUI
/// sends the raw choice and never pre-resolves (AUZ-95). `Date` is mainnet only and
/// carries unix seconds for midnight UTC of the picked day; `Default` is blank.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "kind", content = "value", rename_all = "lowercase")]
pub enum BirthdayInput {
    Height(u32),
    Date(i64),
    Default,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportUfvkArgs {
    pub ufvk: String,
    pub birthday: BirthdayInput,
    pub indexer_uri: String,
    pub network: Network,
    /// Global passphrase that encrypts the wallet at rest (docs/adr/0003). It is
    /// never persisted, the Argon2 verifier lives in the wallet file's header.
    /// Omitted on a post-Replace import, where the daemon reuses the session
    /// passphrase it held across the wipe (docs/adr/0004).
    #[serde(default)]
    pub passphrase: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetIndexerArgs {
    pub indexer_uri: String,
}

#[derive(Debug, Deserialize)]
pub struct SetNotificationsArgs {
    pub enabled: bool,
}

#[derive(Debug, Deserialize)]
pub struct SetFiatEnabledArgs {
    pub enabled: bool,
}

#[derive(Debug, Deserialize)]
pub struct SetDiscreetArgs {
    pub enabled: bool,
}

/// How much a reconciled price can be trusted. `High` means two or more providers agreed
/// on the point; `Low` means it came from a single source (e.g. the bundled pre-2020 tail).
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Confidence {
    High,
    Low,
}

/// One reconciled daily price mark in USD, keyed by UTC date. `diverged` is set when the
/// contributing sources spread beyond the reconciliation threshold, so the UI can flag it.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PricePoint {
    /// UTC `YYYY-MM-DD`.
    pub date: String,
    pub usd_per_zec: f64,
    pub confidence: Confidence,
    #[serde(default, skip_serializing_if = "is_false")]
    pub diverged: bool,
}

/// The current reconciled spot price. `fetched_at` (unix seconds) lets the GUI show
/// staleness; `stale` is set when it's serving a last-known value after a failed refresh.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PriceSpot {
    pub usd_per_zec: f64,
    pub fetched_at: u64,
    /// Which providers contributed to this reconciled value.
    pub sources: Vec<String>,
    #[serde(default, skip_serializing_if = "is_false")]
    pub stale: bool,
    #[serde(default, skip_serializing_if = "is_false")]
    pub diverged: bool,
}

#[derive(Debug, Deserialize)]
pub struct UnlockArgs {
    pub passphrase: String,
}

#[derive(Debug, Deserialize)]
pub struct VerifyPassphraseArgs {
    pub passphrase: String,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoveArgs {
    /// Keep the in-memory session passphrase across the wipe. Replace sets this so
    /// onboarding can skip Set Password; Start over leaves it false and drops the
    /// passphrase (docs/adr/0004).
    #[serde(default)]
    pub keep_session: bool,
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
    /// Set only when the failure was a connectivity failure to the Indexer, so the
    /// GUI can offer "Change server". Off (and absent from the wire) otherwise.
    #[serde(default, skip_serializing_if = "is_false")]
    pub unreachable: bool,
    /// Set only when the Indexer is serving a chain that doesn't carry this Wallet's
    /// Anchor (docs/adr/0010). Mutually exclusive with `unreachable`: a verdict
    /// exists only when the server answered.
    #[serde(default, skip_serializing_if = "is_false")]
    pub wrong_chain: bool,
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
            unreachable: false,
            wrong_chain: false,
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
// `rename_all` covers the variant tags only; `rename_all_fields` makes the fields
// inside struct variants camelCase too (`valueZat`, `wrongChain`), which is what
// the GUI's SyncEvent type has always read.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase", rename_all_fields = "camelCase", tag = "event")]
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
    /// `unreachable` is set only for a connectivity failure to the Indexer, gating
    /// the "Change server" CTA (AUZ-47).
    Error {
        message: String,
        #[serde(default, skip_serializing_if = "is_false")]
        unreachable: bool,
        /// Set when the Indexer is serving a chain without this Wallet's Anchor
        /// (docs/adr/0010); mutually exclusive with `unreachable`.
        #[serde(default, skip_serializing_if = "is_false")]
        wrong_chain: bool,
    },
    /// A refreshed spot price, pushed so the live balance figures and the chart tip move
    /// without the GUI polling. Only sent while fiat is enabled.
    PriceUpdate { spot: PriceSpot },
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

/// Which side of a transaction an output sits on. A Sent transaction still
/// produces a Received change note, so one transaction can carry both.
#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum NoteDirection {
    Received,
    Sent,
}

/// One output within a transaction: a shielded Note or a transparent UTXO,
/// reusing [`Pool`] to say which. Identified within its transaction by `pool` and
/// `output_index`, since there is no per-note id upstream. Only shielded notes
/// carry a `memo`; only Sent outputs carry a `recipient`.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Note {
    pub pool: Pool,
    pub direction: NoteDirection,
    pub output_index: u32,
    pub value_zat: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub memo: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub recipient: Option<String>,
}

/// The lifecycle of one of the Wallet's own received outputs, for the notes debug
/// view. `Pending` is a note still in an unconfirmed transaction. `Spent` is one
/// whose spend has been seen (confirmed or in flight). `Unspent` is a confirmed,
/// still-spendable note.
#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum NoteStatus {
    Unspent,
    Spent,
    Pending,
}

/// One received output the Wallet controls, flattened across pools with its spend
/// state resolved, for the notes debug view. Where [`Note`] is an output within a
/// single transaction's detail, this is a wallet-wide row: it carries the
/// confirming `height`, the `txid` it landed in, whether it's `change`, and the
/// height it was spent at when that spend is confirmed. `height` and `spentHeight`
/// are null when unknown (an unconfirmed note, or an in-flight spend). Values are
/// zatoshi strings, matching the rest of the wire.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WalletNote {
    pub idx: u32,
    pub pool: Pool,
    pub value_zat: String,
    pub status: NoteStatus,
    pub height: Option<u32>,
    pub txid: String,
    pub change: bool,
    pub spent_height: Option<u32>,
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
    /// Signed net balance change in zatoshis (received +, sent/shield/self −).
    /// Distinct from `value_zat`, which is the display amount.
    pub net_zat: String,
    pub status: TxStatus,
    /// The transaction's outputs the Wallet can see, both directions, carried so
    /// the GUI can show per-note Pool/value/memo and the has-memo indicator.
    pub notes: Vec<Note>,
}

#[cfg(test)]
mod tests {
    use super::*;

    // The wire shape the GUI's BirthdayInput and the Tauri passthrough produce. A
    // drift here breaks import silently, so pin all three arms.
    #[test]
    fn birthday_input_wire_shape() {
        let cases = [
            (
                BirthdayInput::Height(12345),
                r#"{"kind":"height","value":12345}"#,
            ),
            (
                BirthdayInput::Date(1_700_000_000),
                r#"{"kind":"date","value":1700000000}"#,
            ),
            (BirthdayInput::Default, r#"{"kind":"default"}"#),
        ];
        for (value, json) in cases {
            assert_eq!(serde_json::to_string(&value).unwrap(), json);
            assert_eq!(serde_json::from_str::<BirthdayInput>(json).unwrap(), value);
        }
    }

    #[test]
    fn import_args_carry_tagged_birthday() {
        let json = r#"{
            "ufvk": "uview1...",
            "birthday": { "kind": "date", "value": 1700000000 },
            "indexerUri": "https://zec.rocks:443",
            "network": "mainnet"
        }"#;
        let args: ImportUfvkArgs = serde_json::from_str(json).unwrap();
        assert_eq!(args.birthday, BirthdayInput::Date(1_700_000_000));
        assert!(args.passphrase.is_none());
    }
}
