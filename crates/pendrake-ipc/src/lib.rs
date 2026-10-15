//! Wire protocol between the Pendrake daemon and its clients (docs/adr/0014).
//!
//! The protocol is JSON-RPC 2.0 with one message per line. It runs on a stream
//! transport: the local Unix socket or Windows named pipe, or the optional
//! loopback TCP listener. A client sends one [`Request`] per line and receives
//! one [`Response`] per line, matched by `id`. After `subscribeEvents` the daemon
//! also sends one [`Notification`] per [`SyncEvent`] on the same connection. A
//! reply has an `id` and a notification has none.
//!
//! Domain types use camelCase so they map field-for-field onto the GUI's
//! TypeScript contract.

use serde::de::Error as _;
use serde::{Deserialize, Serialize};
use serde_json::Value;

/// `skip_serializing_if` predicate for `bool` fields that default to false, so a
/// false flag stays off the wire and absent reads as false on the GUI side.
fn is_false(b: &bool) -> bool {
    !*b
}

/// `serde(default)` for flags that are on unless a payload says otherwise.
fn enabled() -> bool {
    true
}

/// The `jsonrpc` member. It is always `"2.0"`.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct Version;

impl Serialize for Version {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str("2.0")
    }
}

impl<'de> Deserialize<'de> for Version {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let version = String::deserialize(deserializer)?;
        if version == "2.0" {
            Ok(Version)
        } else {
            Err(D::Error::custom(format!(
                "unsupported jsonrpc version {version:?}"
            )))
        }
    }
}

/// A request id. JSON-RPC allows a number or a string.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(untagged)]
pub enum Id {
    Number(u64),
    Text(String),
}

impl From<u64> for Id {
    fn from(n: u64) -> Self {
        Id::Number(n)
    }
}

/// One request line. `call` is flattened into `method` and `params`.
#[derive(Debug, Serialize, Deserialize)]
pub struct Request {
    pub jsonrpc: Version,
    pub id: Id,
    #[serde(flatten)]
    pub call: Call,
}

impl Request {
    pub fn new(id: impl Into<Id>, call: Call) -> Self {
        Self {
            jsonrpc: Version,
            id: id.into(),
            call,
        }
    }

    /// Parses one line. On failure the error includes the request's `id` when it
    /// could be read. The codes are `-32700` for invalid JSON, `-32600` for a
    /// malformed request, `-32601` for an unknown method and `-32602` for invalid
    /// params.
    pub fn parse(line: &str) -> Result<Self, (Option<Id>, RpcError)> {
        #[derive(Deserialize)]
        struct Envelope {
            #[allow(dead_code)]
            jsonrpc: Version,
            id: Id,
            method: String,
            #[serde(default)]
            params: Value,
        }
        let raw: Value = serde_json::from_str(line).map_err(|e| {
            (
                None,
                RpcError::new(RpcError::PARSE, format!("parse error: {e}")),
            )
        })?;
        let id = raw
            .get("id")
            .and_then(|id| serde_json::from_value(id.clone()).ok());
        let envelope: Envelope = serde_json::from_value(raw).map_err(|e| {
            (
                id.clone(),
                RpcError::new(RpcError::INVALID_REQUEST, format!("invalid request: {e}")),
            )
        })?;
        let call = serde_json::from_value(serde_json::json!({
            "method": envelope.method,
            "params": envelope.params,
        }))
        .map_err(|e: serde_json::Error| {
            let error = if e.to_string().starts_with("unknown variant") {
                RpcError::new(RpcError::METHOD_NOT_FOUND, "method not found")
            } else {
                RpcError::new(RpcError::INVALID_PARAMS, format!("invalid params: {e}"))
            };
            (Some(envelope.id.clone()), error)
        })?;
        Ok(Self {
            jsonrpc: Version,
            id: envelope.id,
            call,
        })
    }
}

/// Every method the daemon answers, with its typed parameters. Adding a variant
/// forces a decision in [`Call::may_spawn`] and [`Call::allowed_while_locked`],
/// and the daemon's dispatcher, all exhaustive. On the wire a unit variant sends
/// `"params": null` or omits it.
#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "method", content = "params", rename_all = "camelCase")]
pub enum Call {
    GetWalletState(GetWalletStateArgs),
    GetSyncStatus(WalletArgs),
    ListWallets,
    SetWalletLabel(SetWalletLabelArgs),
    GetBalance(WalletArgs),
    GetTransactions(WalletArgs),
    GetTransaction(GetTransactionArgs),
    GetNotes(WalletArgs),
    GetAddresses(WalletArgs),
    ParseUfvk(ParseUfvkArgs),
    ImportUfvk(ImportUfvkArgs),
    SetIndexer(SetIndexerArgs),
    SetNotifications(SetNotificationsArgs),
    ExportUfvk(ExportUfvkArgs),
    RescanWallet(RescanArgs),
    SetFiatEnabled(SetFiatEnabledArgs),
    SetDiscreet(SetDiscreetArgs),
    GetSpotPrice,
    GetPriceHistory,
    Unlock(UnlockArgs),
    Lock,
    VerifyPassphrase(VerifyPassphraseArgs),
    RemoveWallet(RemoveArgs),
    StartOver,
    SubscribeEvents,
    Authenticate(AuthenticateArgs),
    Shutdown,
}

impl Call {
    /// The wire name of this method. It is available without serializing the
    /// params. The params may contain the passphrase or the cookie.
    pub fn method_name(&self) -> &'static str {
        match self {
            Call::GetWalletState(_) => "getWalletState",
            Call::GetSyncStatus(_) => "getSyncStatus",
            Call::ListWallets => "listWallets",
            Call::SetWalletLabel(_) => "setWalletLabel",
            Call::GetBalance(_) => "getBalance",
            Call::GetTransactions(_) => "getTransactions",
            Call::GetTransaction(_) => "getTransaction",
            Call::GetNotes(_) => "getNotes",
            Call::GetAddresses(_) => "getAddresses",
            Call::ParseUfvk(_) => "parseUfvk",
            Call::ImportUfvk(_) => "importUfvk",
            Call::SetIndexer(_) => "setIndexer",
            Call::SetNotifications(_) => "setNotifications",
            Call::ExportUfvk(_) => "exportUfvk",
            Call::RescanWallet(_) => "rescanWallet",
            Call::SetFiatEnabled(_) => "setFiatEnabled",
            Call::SetDiscreet(_) => "setDiscreet",
            Call::GetSpotPrice => "getSpotPrice",
            Call::GetPriceHistory => "getPriceHistory",
            Call::Unlock(_) => "unlock",
            Call::Lock => "lock",
            Call::VerifyPassphrase(_) => "verifyPassphrase",
            Call::RemoveWallet(_) => "removeWallet",
            Call::StartOver => "startOver",
            Call::SubscribeEvents => "subscribeEvents",
            Call::Authenticate(_) => "authenticate",
            Call::Shutdown => "shutdown",
        }
    }

    /// Whether a GUI client should start the daemon to make this call. Reads that
    /// must see on-disk wallets after a stop-on-close quit, and every lifecycle
    /// method, qualify. Wallet reads do not: the GUI opening is not a reason to
    /// begin background work.
    pub fn may_spawn(&self) -> bool {
        match self {
            Call::GetWalletState(_)
            | Call::ListWallets
            | Call::GetSyncStatus(_)
            | Call::ParseUfvk(_)
            | Call::ImportUfvk(_)
            | Call::Unlock(_)
            | Call::RemoveWallet(_)
            | Call::StartOver
            | Call::SetIndexer(_)
            | Call::SetNotifications(_)
            | Call::SetFiatEnabled(_)
            | Call::SetDiscreet(_)
            | Call::SetWalletLabel(_)
            | Call::RescanWallet(_)
            | Call::Shutdown => true,
            Call::GetBalance(_)
            | Call::GetTransactions(_)
            | Call::GetTransaction(_)
            | Call::GetNotes(_)
            | Call::GetAddresses(_)
            | Call::ExportUfvk(_)
            | Call::GetSpotPrice
            | Call::GetPriceHistory
            | Call::Lock
            | Call::VerifyPassphrase(_)
            | Call::Authenticate(_)
            | Call::SubscribeEvents => false,
        }
    }

    /// Whether the daemon answers this on a locked session. Only lifecycle and
    /// authentication go through. Anything that would reveal a balance, a key, or
    /// history waits for `unlock`.
    pub fn allowed_while_locked(&self) -> bool {
        match self {
            Call::GetWalletState(_)
            | Call::ParseUfvk(_)
            | Call::ImportUfvk(_)
            | Call::Unlock(_)
            | Call::Lock
            | Call::VerifyPassphrase(_)
            | Call::StartOver
            | Call::SubscribeEvents
            | Call::Authenticate(_)
            | Call::ListWallets
            | Call::Shutdown => true,
            Call::SetWalletLabel(_)
            | Call::GetBalance(_)
            | Call::GetSyncStatus(_)
            | Call::GetTransactions(_)
            | Call::GetTransaction(_)
            | Call::GetNotes(_)
            | Call::GetAddresses(_)
            | Call::SetIndexer(_)
            | Call::SetNotifications(_)
            | Call::ExportUfvk(_)
            | Call::RescanWallet(_)
            | Call::SetFiatEnabled(_)
            | Call::SetDiscreet(_)
            | Call::GetSpotPrice
            | Call::GetPriceHistory
            | Call::RemoveWallet(_) => false,
        }
    }
}

/// One reply line. Exactly one of `result` and `error` is set. `id` is `None`
/// when the request's id could not be read.
#[derive(Debug, Serialize, Deserialize)]
pub struct Response {
    pub jsonrpc: Version,
    pub id: Option<Id>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub result: Option<Value>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error: Option<RpcError>,
}

impl Response {
    pub fn ok(id: Id, result: Value) -> Self {
        Self {
            jsonrpc: Version,
            id: Some(id),
            result: Some(result),
            error: None,
        }
    }

    pub fn err(id: Option<Id>, error: RpcError) -> Self {
        Self {
            jsonrpc: Version,
            id,
            result: None,
            error: Some(error),
        }
    }

    /// The result, or the error.
    pub fn into_result(self) -> Result<Value, RpcError> {
        match self.error {
            Some(error) => Err(error),
            None => Ok(self.result.unwrap_or(Value::Null)),
        }
    }
}

/// A JSON-RPC error object. Codes below `-32000` are reserved by the spec. The
/// daemon's own codes are in the `-32000..-32099` range.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RpcError {
    pub code: i64,
    pub message: String,
}

impl RpcError {
    pub const PARSE: i64 = -32700;
    pub const INVALID_REQUEST: i64 = -32600;
    pub const METHOD_NOT_FOUND: i64 = -32601;
    pub const INVALID_PARAMS: i64 = -32602;
    /// The method ran and failed. The message says why.
    pub const CALL_FAILED: i64 = -32000;
    /// The session is locked and the method reads wallet data.
    pub const LOCKED: i64 = -32001;
    /// The TCP session has not presented a valid cookie.
    pub const UNAUTHENTICATED: i64 = -32002;

    pub fn new(code: i64, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
        }
    }

    pub fn call_failed(message: impl Into<String>) -> Self {
        Self::new(Self::CALL_FAILED, message)
    }

    pub fn locked() -> Self {
        Self::new(Self::LOCKED, "wallet is locked")
    }

    pub fn unauthenticated(message: impl Into<String>) -> Self {
        Self::new(Self::UNAUTHENTICATED, message)
    }
}

impl std::fmt::Display for RpcError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.message)
    }
}

impl std::error::Error for RpcError {}

/// The method prefix of every pushed event, for example `event.transaction`.
pub const EVENT_METHOD_PREFIX: &str = "event.";

/// A server-to-client push. In JSON-RPC this is a request with a `method` and no
/// `id`. The daemon sends one per [`SyncEvent`] to every subscribed session.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Notification {
    pub jsonrpc: Version,
    pub method: String,
    pub params: Value,
}

impl Notification {
    /// The notification for an event. The method is the event's tag under
    /// [`EVENT_METHOD_PREFIX`]. The `params` are the event's fields.
    pub fn from_event(event: &SyncEvent) -> Self {
        let mut fields = match serde_json::to_value(event) {
            Ok(Value::Object(fields)) => fields,
            _ => serde_json::Map::new(),
        };
        let tag = match fields.remove("event") {
            Some(Value::String(tag)) => tag,
            _ => String::new(),
        };
        Self {
            jsonrpc: Version,
            method: format!("{EVENT_METHOD_PREFIX}{tag}"),
            params: Value::Object(fields),
        }
    }

    /// The tagged object the GUI reads, for an `event.*` notification. `None` for
    /// any other method.
    pub fn into_event_value(self) -> Option<Value> {
        let tag = self.method.strip_prefix(EVENT_METHOD_PREFIX)?;
        let Value::Object(mut fields) = self.params else {
            return None;
        };
        fields.insert("event".into(), Value::String(tag.into()));
        Some(Value::Object(fields))
    }
}

#[cfg_attr(feature = "bindings", derive(ts_rs::TS))]
#[cfg_attr(feature = "bindings", ts(export, export_to = "wire.ts"))]
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Network {
    Mainnet,
    Regtest,
}

#[cfg_attr(feature = "bindings", derive(ts_rs::TS))]
#[cfg_attr(feature = "bindings", ts(export, export_to = "wire.ts"))]
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ImportType {
    Ufvk,
    Seed,
}

#[cfg_attr(feature = "bindings", derive(ts_rs::TS))]
#[cfg_attr(feature = "bindings", ts(export, export_to = "wire.ts"))]
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum ViewMode {
    Full,
    IncomingOnly,
}

#[cfg_attr(feature = "bindings", derive(ts_rs::TS))]
#[cfg_attr(feature = "bindings", ts(export, export_to = "wire.ts"))]
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WalletState {
    /// Whether any Wallet exists.
    pub exists: bool,
    /// Whether the asking session is locked (docs/adr/0014).
    pub locked: bool,
    /// True when the daemon holds the session passphrase in memory. Lets onboarding
    /// tell a post-Replace empty-but-unlocked daemon from a cold one and skip Set
    /// Password (docs/adr/0004).
    pub session_held: bool,
    /// The Wallet's id under `wallets/<id>/`. `None` when no id was asked for or no
    /// Wallet exists.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "bindings", ts(optional))]
    pub wallet_id: Option<String>,
    /// Optional user-facing name. `None` when unset (GUI falls back to short fingerprint).
    /// Masked in the UI when Discreet mode is on.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "bindings", ts(optional))]
    pub label: Option<String>,
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
    /// refresh loop, so nothing is fetched while false. Off stays off the wire.
    #[serde(default, skip_serializing_if = "is_false")]
    pub fiat_enabled: bool,
    /// Whether Discreet mode is on. The GUI masks sensitive values; the daemon redacts
    /// new-transaction notification text (docs/adr/0009). Off stays off the wire.
    #[serde(default, skip_serializing_if = "is_false")]
    pub discreet: bool,
    /// Why this Wallet's file could not be opened, when it could not.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "bindings", ts(optional))]
    pub unavailable: Option<String>,
}

#[cfg_attr(feature = "bindings", derive(ts_rs::TS))]
#[cfg_attr(feature = "bindings", ts(export, export_to = "wire.ts"))]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WalletSummary {
    pub id: String,
    /// Resolved display name: custom label, or short fingerprint when unset.
    pub label: String,
    pub fingerprint: Option<String>,
    pub network: Network,
    pub birthday_height: u32,
    /// Last-synced confirmed balance in zatoshis (stringified), or `None` for a Wallet
    /// that has not synced since this was tracked. Refreshed after every round, so
    /// the switcher shows a live figure for an open Wallet and the last known one for
    /// a Wallet that is locked or Unavailable. A locked asking session reads `None`,
    /// since a balance waits for `unlock`.
    pub last_balance: Option<String>,
    /// This Wallet's own sync status while it is open, `None` while it waits for the
    /// Passphrase, is Unavailable, or the asking session is locked.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "bindings", ts(optional, as = "Option<SyncStatusWire>"))]
    pub sync: Option<SyncStatus>,
    /// Why the wallet file could not be opened, when it could not.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "bindings", ts(optional))]
    pub unavailable: Option<String>,
    /// Whether this Wallet's transaction and scan-complete toasts fire, mirroring its
    /// `Meta`. Per-Wallet, so the switcher's Settings row reads it without selecting
    /// the Wallet first. A payload predating it reads as on.
    #[serde(default = "enabled")]
    pub notifications_enabled: bool,
    /// The Indexer this Wallet syncs against. Per-Wallet, like the notification flag.
    #[serde(default)]
    pub indexer_uri: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
/// The Wallet a wallet-scoped method addresses, by Fingerprint (docs/adr/0014).
pub struct WalletArgs {
    pub id: String,
}

/// The optional id of `getWalletState`. With an id the result is that Wallet's
/// state. Without one it is the session-level state.
#[derive(Debug, Default, Serialize, Deserialize)]
pub struct GetWalletStateArgs {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetWalletLabelArgs {
    pub id: String,
    /// Empty string clears the custom name (back to short fingerprint).
    pub label: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetTransactionArgs {
    pub id: String,
    pub txid: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParseUfvkArgs {
    pub ufvk: String,
}

#[cfg_attr(feature = "bindings", derive(ts_rs::TS))]
#[cfg_attr(feature = "bindings", ts(export, export_to = "wire.ts"))]
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WalletAddress {
    pub ua: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "bindings", ts(optional))]
    pub transparent: Option<String>,
}

/// The network a UFVK declares. Distinct from [`Network`]: a key can be testnet,
/// which Pendrake rejects, so the decode result carries only the two it accepts.
#[cfg_attr(feature = "bindings", derive(ts_rs::TS))]
#[cfg_attr(feature = "bindings", ts(export, export_to = "wire.ts"))]
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum UfvkNetwork {
    Mainnet,
    Regtest,
}

/// A value pool a UFVK can view, in the glossary's vocabulary. Unknown and
/// experimental typecodes are dropped rather than surfaced. Ironwood is the
/// post-NU6.3 shielded pool; the same Orchard FVK views it.
#[cfg_attr(feature = "bindings", derive(ts_rs::TS))]
#[cfg_attr(feature = "bindings", ts(export, export_to = "wire.ts"))]
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Pool {
    Orchard,
    Sapling,
    Transparent,
    Ironwood,
}

/// What a successful UFVK decode tells the GUI: the network it is bound to, a
/// stable fingerprint that seeds its LifeHash, and the pools it can watch.
#[cfg_attr(feature = "bindings", derive(ts_rs::TS))]
#[cfg_attr(feature = "bindings", ts(export, export_to = "wire.ts"))]
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
#[cfg_attr(feature = "bindings", derive(ts_rs::TS))]
#[cfg_attr(feature = "bindings", ts(export, export_to = "wire.ts"))]
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
#[cfg_attr(feature = "bindings", derive(ts_rs::TS))]
#[cfg_attr(feature = "bindings", ts(export, export_to = "wire.ts"))]
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "kind", content = "value", rename_all = "lowercase")]
pub enum BirthdayInput {
    Height(u32),
    Date(i64),
    Default,
}

#[cfg_attr(feature = "bindings", derive(ts_rs::TS))]
#[cfg_attr(feature = "bindings", ts(export, export_to = "wire.ts"))]
#[derive(Debug, Serialize, Deserialize)]
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
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "bindings", ts(optional))]
    pub passphrase: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetIndexerArgs {
    pub id: String,
    pub indexer_uri: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetNotificationsArgs {
    pub id: String,
    pub enabled: bool,
}

/// Drop one Wallet's scanned history and scan again from its Birthday. Settings
/// addresses any Wallet by id, so the Selected one need not change.
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RescanArgs {
    pub id: String,
}

/// Release a Wallet's UFVK, gated on the session Passphrase. The GUI shows it once
/// and never stores it, so there is no matching read method.
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportUfvkArgs {
    pub id: String,
    pub passphrase: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SetFiatEnabledArgs {
    pub id: String,
    pub enabled: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SetDiscreetArgs {
    pub enabled: bool,
}

/// How much a reconciled price can be trusted. `High` means two or more providers agreed
/// on the point; `Low` means it came from a single source (e.g. the bundled pre-2020 tail).
#[cfg_attr(feature = "bindings", derive(ts_rs::TS))]
#[cfg_attr(feature = "bindings", ts(export, export_to = "wire.ts"))]
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Confidence {
    High,
    Low,
}

/// One reconciled daily price mark in USD, keyed by UTC date. `diverged` is set when the
/// contributing sources spread beyond the reconciliation threshold, so the UI can flag it.
#[cfg_attr(feature = "bindings", derive(ts_rs::TS))]
#[cfg_attr(feature = "bindings", ts(export, export_to = "wire.ts"))]
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
#[cfg_attr(feature = "bindings", derive(ts_rs::TS))]
#[cfg_attr(feature = "bindings", ts(export, export_to = "wire.ts"))]
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

#[derive(Debug, Serialize, Deserialize)]
pub struct UnlockArgs {
    pub passphrase: String,
}

/// The cookie a TCP session presents before any other call (docs/adr/0014). The
/// daemon writes it to `rpc.cookie` in the data dir at startup.
#[derive(Debug, Serialize, Deserialize)]
pub struct AuthenticateArgs {
    pub cookie: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VerifyPassphraseArgs {
    pub passphrase: String,
}

/// Remove one Wallet. The session passphrase is kept, so a later Add wallet skips
/// Set Password (docs/adr/0004). `select` names the Wallet to show next when the
/// removed one was Selected: the GUI passes its most recently used other Wallet,
/// and the daemon falls back to the first remaining one. `passphrase` is verified
/// against the held one before anything is deleted, so the call carries its own
/// proof and not just an earlier unlock.
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoveArgs {
    pub id: String,
    pub passphrase: String,
}

/// The `state` tag on the wire, and what the GUI switches on. The daemon works
/// with [`SyncState`], which carries each state's own data.
#[cfg_attr(feature = "bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "bindings",
    ts(export, export_to = "wire.ts", rename = "SyncState")
)]
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum SyncStateTag {
    Idle,
    Syncing,
    Error,
}

/// What the scanner is doing right now, derived from the latest batch lifecycle
/// event. Drives the progress label; `None` until the first event arrives.
#[cfg_attr(feature = "bindings", derive(ts_rs::TS))]
#[cfg_attr(feature = "bindings", ts(export, export_to = "wire.ts"))]
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum SyncPhase {
    Scanning,
    Committing,
}

/// Why a round failed, when it is a cause the GUI acts on. `Unreachable` gates
/// "Change server"; `WrongChain` is the docs/adr/0010 verdict. One or the other:
/// a verdict exists only when the server answered.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SyncFault {
    Unreachable,
    WrongChain,
}

/// Where a Wallet's sync loop is. Each variant carries only what holds in that
/// state: an idle status cannot carry an error, a phase cannot outlive its
/// round, and a fault cannot exist without a message.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SyncState {
    Idle,
    Syncing {
        phase: Option<SyncPhase>,
        eta_seconds: Option<u64>,
    },
    Error {
        message: String,
        fault: Option<SyncFault>,
    },
}

impl SyncState {
    /// A round that has begun but not yet reported: no phase, no estimate.
    pub const STARTING: SyncState = SyncState::Syncing {
        phase: None,
        eta_seconds: None,
    };
}

/// A Wallet's sync status: the state it is in, plus the figures that outlive a
/// round (heights, percent, output counts, when it last completed). Percent is
/// kept across the two-second tip-follow rounds so the ring never flickers. On
/// the wire it flattens to [`SyncStatusWire`], the shape the GUI has always read.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(into = "SyncStatusWire", from = "SyncStatusWire")]
pub struct SyncStatus {
    pub state: SyncState,
    pub synced_height: u32,
    pub chain_tip: u32,
    pub percent: u8,
    /// Shielded notes scanned in the sync window (progress numerator).
    pub scanned_outputs: Option<u64>,
    /// Total notes to scan in the window (progress denominator).
    pub total_outputs: Option<u64>,
    pub last_synced_at: Option<u64>,
}

impl Default for SyncStatus {
    fn default() -> Self {
        Self {
            state: SyncState::Idle,
            synced_height: 0,
            chain_tip: 0,
            percent: 0,
            scanned_outputs: None,
            total_outputs: None,
            last_synced_at: None,
        }
    }
}

/// The flat wire form of [`SyncStatus`]: a `state` tag beside every field, with
/// the fields of the other states absent. Exported to the GUI under the name
/// `SyncStatus`, since it is the only form that crosses the socket.
#[cfg_attr(feature = "bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "bindings",
    ts(export, export_to = "wire.ts", rename = "SyncStatus")
)]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncStatusWire {
    pub state: SyncStateTag,
    pub synced_height: u32,
    pub chain_tip: u32,
    pub percent: u8,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "bindings", ts(optional))]
    pub phase: Option<SyncPhase>,
    /// Shielded notes scanned in the sync window (progress numerator).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "bindings", ts(optional))]
    pub scanned_outputs: Option<u64>,
    /// Total notes to scan in the window (progress denominator).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "bindings", ts(optional))]
    pub total_outputs: Option<u64>,
    /// Estimated seconds to completion from the observed scan rate.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "bindings", ts(optional))]
    pub eta_seconds: Option<u64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "bindings", ts(optional))]
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
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "bindings", ts(optional))]
    pub last_synced_at: Option<u64>,
}

impl From<SyncStatus> for SyncStatusWire {
    fn from(status: SyncStatus) -> Self {
        let (state, phase, eta_seconds, error, fault) = match status.state {
            SyncState::Idle => (SyncStateTag::Idle, None, None, None, None),
            SyncState::Syncing { phase, eta_seconds } => {
                (SyncStateTag::Syncing, phase, eta_seconds, None, None)
            }
            SyncState::Error { message, fault } => {
                (SyncStateTag::Error, None, None, Some(message), fault)
            }
        };
        Self {
            state,
            synced_height: status.synced_height,
            chain_tip: status.chain_tip,
            percent: status.percent,
            phase,
            scanned_outputs: status.scanned_outputs,
            total_outputs: status.total_outputs,
            eta_seconds,
            error,
            unreachable: fault == Some(SyncFault::Unreachable),
            wrong_chain: fault == Some(SyncFault::WrongChain),
            last_synced_at: status.last_synced_at,
        }
    }
}

impl From<SyncStatusWire> for SyncStatus {
    fn from(wire: SyncStatusWire) -> Self {
        let state = match wire.state {
            SyncStateTag::Idle => SyncState::Idle,
            SyncStateTag::Syncing => SyncState::Syncing {
                phase: wire.phase,
                eta_seconds: wire.eta_seconds,
            },
            SyncStateTag::Error => SyncState::Error {
                message: wire.error.unwrap_or_default(),
                fault: if wire.unreachable {
                    Some(SyncFault::Unreachable)
                } else if wire.wrong_chain {
                    Some(SyncFault::WrongChain)
                } else {
                    None
                },
            },
        };
        Self {
            state,
            synced_height: wire.synced_height,
            chain_tip: wire.chain_tip,
            percent: wire.percent,
            scanned_outputs: wire.scanned_outputs,
            total_outputs: wire.total_outputs,
            last_synced_at: wire.last_synced_at,
        }
    }
}

/// Where a single scan range is in its lifecycle: decrypting (`Scanning`), queued
/// behind the serialized commit stage (`Waiting`), or holding the wallet lock and
/// writing (`Committing`).
#[cfg_attr(feature = "bindings", derive(ts_rs::TS))]
#[cfg_attr(feature = "bindings", ts(export, export_to = "wire.ts"))]
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
#[cfg_attr(feature = "bindings", derive(ts_rs::TS))]
#[cfg_attr(feature = "bindings", ts(export, export_to = "wire.ts"))]
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
    #[cfg_attr(feature = "bindings", ts(optional))]
    pub expected_secs: Option<f64>,
}

/// The commit phase split into its sub-phases, in seconds. Mirrors pepper-sync's
/// `CommitTiming` for the full per-batch diagnostic.
#[cfg_attr(feature = "bindings", derive(ts_rs::TS))]
#[cfg_attr(feature = "bindings", ts(export, export_to = "wire.ts"))]
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
#[cfg_attr(feature = "bindings", derive(ts_rs::TS))]
#[cfg_attr(feature = "bindings", ts(export, export_to = "wire.ts"))]
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
#[cfg_attr(feature = "bindings", derive(ts_rs::TS))]
#[cfg_attr(feature = "bindings", ts(export, export_to = "wire.ts"))]
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

/// A line the daemon pushes to a subscribed client as the Wallets scan. Tagged by
/// `event`, so a reader distinguishes it from a request [`Response`] (which carries
/// `ok`/`id`) on the shared connection. Every Wallet syncs at once, so each
/// wallet-bearing variant names the Wallet it belongs to by `wallet_id`; the GUI
/// folds the Selected Wallet's events into the screen and the rest into the switcher.
// `rename_all` covers the variant tags only; `rename_all_fields` makes the fields
// inside struct variants camelCase too (`valueZat`, `wrongChain`), which is what
// the GUI's SyncEvent type has always read.
#[cfg_attr(feature = "bindings", derive(ts_rs::TS))]
#[cfg_attr(feature = "bindings", ts(export, export_to = "wire.ts"))]
#[derive(Debug, Clone, Serialize)]
#[serde(
    rename_all = "camelCase",
    rename_all_fields = "camelCase",
    tag = "event"
)]
pub enum SyncEvent {
    /// A fresh snapshot: the overall bar/phase/counts/ETA plus the active batches.
    Progress {
        wallet_id: String,
        #[cfg_attr(feature = "bindings", ts(as = "SyncStatusWire"))]
        status: SyncStatus,
        batches: Vec<BatchProgress>,
    },
    /// A scan range committed; the GUI appends it to the recent-batches log.
    BatchDone {
        wallet_id: String,
        batch: BatchSummary,
    },
    /// A newly committed transaction the GUI should fold into balance and history.
    Transaction {
        wallet_id: String,
        txid: String,
        kind: TxKind,
        value_zat: String,
        received: bool,
    },
    /// The round reached the chain tip; `status` is the terminal idle snapshot.
    Finished {
        wallet_id: String,
        #[cfg_attr(feature = "bindings", ts(as = "SyncStatusWire"))]
        status: SyncStatus,
    },
    /// The round failed; the GUI shows the message and waits for the next round.
    /// `unreachable` is set only for a connectivity failure to the Indexer, gating
    /// the "Change server" CTA (AUZ-47).
    Error {
        wallet_id: String,
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

#[cfg_attr(feature = "bindings", derive(ts_rs::TS))]
#[cfg_attr(feature = "bindings", ts(export, export_to = "wire.ts"))]
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PoolBalance {
    pub confirmed: String,
    pub total: String,
}

#[cfg_attr(feature = "bindings", derive(ts_rs::TS))]
#[cfg_attr(feature = "bindings", ts(export, export_to = "wire.ts"))]
#[derive(Debug, Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Balance {
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "bindings", ts(optional))]
    pub orchard: Option<PoolBalance>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "bindings", ts(optional))]
    pub sapling: Option<PoolBalance>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "bindings", ts(optional))]
    pub transparent: Option<PoolBalance>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "bindings", ts(optional))]
    pub ironwood: Option<PoolBalance>,
}

#[cfg_attr(feature = "bindings", derive(ts_rs::TS))]
#[cfg_attr(feature = "bindings", ts(export, export_to = "wire.ts"))]
#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum TxKind {
    Received,
    Sent,
}

#[cfg_attr(feature = "bindings", derive(ts_rs::TS))]
#[cfg_attr(feature = "bindings", ts(export, export_to = "wire.ts"))]
#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum TxStatus {
    Confirmed,
    Pending,
}

/// Which side of a transaction an output sits on. A Sent transaction still
/// produces a Received change note, so one transaction can carry both.
#[cfg_attr(feature = "bindings", derive(ts_rs::TS))]
#[cfg_attr(feature = "bindings", ts(export, export_to = "wire.ts"))]
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
#[cfg_attr(feature = "bindings", derive(ts_rs::TS))]
#[cfg_attr(feature = "bindings", ts(export, export_to = "wire.ts"))]
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Note {
    pub pool: Pool,
    pub direction: NoteDirection,
    pub output_index: u32,
    pub value_zat: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "bindings", ts(optional))]
    pub memo: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "bindings", ts(optional))]
    pub recipient: Option<String>,
}

/// The lifecycle of one of the Wallet's own received outputs, for the notes debug
/// view. `Pending` is a note still in an unconfirmed transaction. `Spent` is one
/// whose spend has been seen (confirmed or in flight). `Unspent` is a confirmed,
/// still-spendable note.
#[cfg_attr(feature = "bindings", derive(ts_rs::TS))]
#[cfg_attr(feature = "bindings", ts(export, export_to = "wire.ts"))]
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
/// are null when unknown (an unconfirmed note, or an in-flight spend), and `time`
/// and `spentTime` are the matching block times in Unix seconds, null under the
/// same conditions, so the GUI can show either column as a local time. Values are
/// zatoshi strings, matching the rest of the wire.
#[cfg_attr(feature = "bindings", derive(ts_rs::TS))]
#[cfg_attr(feature = "bindings", ts(export, export_to = "wire.ts"))]
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WalletNote {
    pub idx: u32,
    pub pool: Pool,
    pub value_zat: String,
    pub status: NoteStatus,
    pub height: Option<u32>,
    pub time: Option<u64>,
    pub txid: String,
    pub change: bool,
    pub spent_height: Option<u32>,
    pub spent_time: Option<u64>,
}

#[cfg_attr(feature = "bindings", derive(ts_rs::TS))]
#[cfg_attr(feature = "bindings", ts(export, export_to = "wire.ts"))]
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Tx {
    pub txid: String,
    /// Unix seconds.
    pub datetime: u64,
    /// Absent while the transaction is unconfirmed.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "bindings", ts(optional))]
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

    // The request line the GUI host and the debug client write. A unit method may
    // send `params: null` or leave it out; a typo is refused at parse time.
    #[test]
    fn request_wire_shape() {
        let req: Request = serde_json::from_str(
            r#"{"jsonrpc":"2.0","id":7,"method":"getWalletState","params":{}}"#,
        )
        .unwrap();
        assert_eq!(req.id, Id::Number(7));
        assert!(matches!(
            req.call,
            Call::GetWalletState(GetWalletStateArgs { id: None })
        ));

        let req: Request =
            serde_json::from_str(r#"{"jsonrpc":"2.0","id":1,"method":"lock"}"#).unwrap();
        assert!(matches!(req.call, Call::Lock));

        let req: Request = serde_json::from_str(
            r#"{"jsonrpc":"2.0","id":2,"method":"exportUfvk","params":{"id":"w1","passphrase":"pw"}}"#,
        )
        .unwrap();
        assert!(matches!(req.call, Call::ExportUfvk(ExportUfvkArgs { ref id, .. }) if id == "w1"));

        assert!(serde_json::from_str::<Request>(
            r#"{"jsonrpc":"2.0","id":3,"method":"getBalanec","params":{"id":"w1"}}"#
        )
        .is_err());
        assert!(serde_json::from_str::<Request>(
            r#"{"id":3,"method":"getBalance","params":{"id":"w1"}}"#
        )
        .is_err());

        let line = serde_json::to_string(&Request::new(
            4,
            Call::RemoveWallet(RemoveArgs {
                id: "w1".into(),
                passphrase: "pw".into(),
            }),
        ))
        .unwrap();
        assert_eq!(
            line,
            r#"{"jsonrpc":"2.0","id":4,"method":"removeWallet","params":{"id":"w1","passphrase":"pw"}}"#
        );

        let line = serde_json::to_string(&Request::new(5, Call::SubscribeEvents)).unwrap();
        assert_eq!(
            line,
            r#"{"jsonrpc":"2.0","id":5,"method":"subscribeEvents"}"#
        );
    }

    fn call(method: &str) -> Call {
        let params = match method {
            "parseUfvk" => serde_json::json!({ "ufvk": "uview1..." }),
            "importUfvk" => serde_json::json!({
                "ufvk": "uview1...",
                "birthday": { "kind": "default" },
                "indexerUri": "https://zec.rocks:443",
                "network": "mainnet",
            }),
            "unlock" | "verifyPassphrase" => serde_json::json!({ "passphrase": "pw" }),
            "getTransaction" => serde_json::json!({ "id": "w1", "txid": "ab" }),
            "setIndexer" => {
                serde_json::json!({ "id": "w1", "indexerUri": "https://zec.rocks:443" })
            }
            "getWalletState" => serde_json::json!({}),
            "getSyncStatus" | "getBalance" | "getTransactions" | "getAddresses" | "getNotes"
            | "removeWallet" => serde_json::json!({ "id": "w1", "passphrase": "pw" }),
            | "rescanWallet" => serde_json::json!({ "id": "w1" }),
            "exportUfvk" => serde_json::json!({ "id": "w1", "passphrase": "pw" }),
            _ => Value::Null,
        };
        serde_json::from_value(serde_json::json!({ "method": method, "params": params })).unwrap()
    }

    #[test]
    fn method_name_matches_the_serde_tag_for_every_variant() {
        for m in [
            "getWalletState",
            "getSyncStatus",
            "listWallets",
            "getBalance",
            "getTransactions",
            "getTransaction",
            "getNotes",
            "getAddresses",
            "parseUfvk",
            "importUfvk",
            "setIndexer",
            "exportUfvk",
            "rescanWallet",
            "getSpotPrice",
            "getPriceHistory",
            "unlock",
            "lock",
            "verifyPassphrase",
            "removeWallet",
            "startOver",
            "subscribeEvents",
            "shutdown",
        ] {
            let c = call(m);
            let tag = serde_json::to_value(&c).unwrap()["method"]
                .as_str()
                .unwrap()
                .to_owned();
            assert_eq!(c.method_name(), tag, "{m}");
        }
    }

    #[test]
    fn allowlist_permits_lifecycle_and_denies_wallet_reads() {
        for m in [
            "getWalletState",
            "parseUfvk",
            "importUfvk",
            "unlock",
            "lock",
            "verifyPassphrase",
            "startOver",
            "subscribeEvents",
            "listWallets",
            "shutdown",
        ] {
            assert!(
                call(m).allowed_while_locked(),
                "{m} should be allowed while locked"
            );
        }
        for m in [
            "getBalance",
            "getTransactions",
            "getAddresses",
            "getTransaction",
            "getSyncStatus",
            "setIndexer",
            "removeWallet",
            "exportUfvk",
            "rescanWallet",
        ] {
            assert!(
                !call(m).allowed_while_locked(),
                "{m} should be gated while locked"
            );
        }
    }

    // The flat shape the GUI reads, from each state. An idle status carries no
    // error keys, an error carries no phase, and the fault maps to one flag.
    #[test]
    fn sync_status_flattens_and_round_trips() {
        let idle = SyncStatus {
            state: SyncState::Idle,
            synced_height: 10,
            chain_tip: 10,
            percent: 100,
            scanned_outputs: None,
            total_outputs: None,
            last_synced_at: Some(1),
        };
        let json = serde_json::to_string(&idle).unwrap();
        assert_eq!(
            json,
            r#"{"state":"idle","syncedHeight":10,"chainTip":10,"percent":100,"lastSyncedAt":1}"#
        );
        assert_eq!(serde_json::from_str::<SyncStatus>(&json).unwrap(), idle);

        let failed = SyncStatus {
            state: SyncState::Error {
                message: "refused".into(),
                fault: Some(SyncFault::Unreachable),
            },
            ..SyncStatus::default()
        };
        let json = serde_json::to_string(&failed).unwrap();
        assert_eq!(
            json,
            r#"{"state":"error","syncedHeight":0,"chainTip":0,"percent":0,"error":"refused","unreachable":true}"#
        );
        assert_eq!(serde_json::from_str::<SyncStatus>(&json).unwrap(), failed);

        let scanning = SyncStatus {
            state: SyncState::Syncing {
                phase: Some(SyncPhase::Scanning),
                eta_seconds: Some(7),
            },
            percent: 42,
            ..SyncStatus::default()
        };
        let json = serde_json::to_string(&scanning).unwrap();
        assert!(json.contains(r#""phase":"scanning""#));
        assert!(json.contains(r#""etaSeconds":7"#));
        assert!(!json.contains("error"));
        assert_eq!(serde_json::from_str::<SyncStatus>(&json).unwrap(), scanning);
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

    #[test]
    fn a_request_round_trips_through_the_jsonrpc_envelope() {
        let req = Request::new(
            7,
            Call::GetTransaction(GetTransactionArgs {
                id: "w1".into(),
                txid: "ab".into(),
            }),
        );
        let json = serde_json::to_string(&req).unwrap();
        assert_eq!(
            json,
            r#"{"jsonrpc":"2.0","id":7,"method":"getTransaction","params":{"id":"w1","txid":"ab"}}"#
        );
        let parsed = Request::parse(&json).unwrap();
        assert_eq!(parsed.id, Id::Number(7));
        assert!(matches!(parsed.call, Call::GetTransaction(_)));

        let unit = Request::parse(r#"{"jsonrpc":"2.0","id":"a","method":"lock"}"#).unwrap();
        assert_eq!(unit.id, Id::Text("a".into()));
        assert!(matches!(unit.call, Call::Lock));
    }

    #[test]
    fn parse_failures_carry_the_spec_codes_and_the_request_id() {
        let (id, err) = Request::parse("{nope").unwrap_err();
        assert_eq!((id, err.code), (None, RpcError::PARSE));

        let (id, err) = Request::parse(r#"{"id":3,"method":"lock"}"#).unwrap_err();
        assert_eq!(
            (id, err.code),
            (Some(Id::Number(3)), RpcError::INVALID_REQUEST)
        );

        let (id, err) = Request::parse(r#"{"jsonrpc":"2.0","id":4,"method":"fly"}"#).unwrap_err();
        assert_eq!(
            (id, err.code),
            (Some(Id::Number(4)), RpcError::METHOD_NOT_FOUND)
        );

        let (id, err) = Request::parse(r#"{"jsonrpc":"2.0","id":5,"method":"unlock","params":{}}"#)
            .unwrap_err();
        assert_eq!(
            (id, err.code),
            (Some(Id::Number(5)), RpcError::INVALID_PARAMS)
        );
    }

    #[test]
    fn responses_carry_exactly_one_of_result_and_error() {
        let ok =
            serde_json::to_string(&Response::ok(1.into(), serde_json::json!({"a": 1}))).unwrap();
        assert_eq!(ok, r#"{"jsonrpc":"2.0","id":1,"result":{"a":1}}"#);
        let err = serde_json::to_string(&Response::err(None, RpcError::locked())).unwrap();
        assert_eq!(
            err,
            r#"{"jsonrpc":"2.0","id":null,"error":{"code":-32001,"message":"wallet is locked"}}"#
        );
        let parsed: Response = serde_json::from_str(&err).unwrap();
        assert_eq!(parsed.into_result().unwrap_err().code, RpcError::LOCKED);
    }

    #[test]
    fn an_event_becomes_a_notification_and_folds_back() {
        let event = SyncEvent::Transaction {
            wallet_id: "w1".into(),
            txid: "ab".into(),
            kind: TxKind::Received,
            value_zat: "5".into(),
            received: true,
        };
        let note = Notification::from_event(&event);
        assert_eq!(note.method, "event.transaction");
        assert_eq!(
            serde_json::to_string(&note).unwrap(),
            r#"{"jsonrpc":"2.0","method":"event.transaction","params":{"kind":"received","received":true,"txid":"ab","valueZat":"5","walletId":"w1"}}"#
        );
        let folded = note.into_event_value().unwrap();
        assert_eq!(folded, serde_json::to_value(&event).unwrap());

        let other = Notification {
            jsonrpc: Version,
            method: "ping".into(),
            params: Value::Null,
        };
        assert!(other.into_event_value().is_none());
    }
}
