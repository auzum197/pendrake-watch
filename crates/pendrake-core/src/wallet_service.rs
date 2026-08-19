//! The wallet service: sole owner of the zingolib wallet file.
//!
//! It builds a watch-only wallet from a UFVK, persists it, and runs a sync loop
//! driven by pepper-sync's event stream. Each scanned batch advances a live
//! progress snapshot and each discovered transaction feeds the [`Notifier`] and a
//! pushed event, so the GUI sees progress and history update as blocks land
//! rather than on a poll timer.

use std::collections::{HashMap, VecDeque};
use std::ops::Range;
use std::sync::atomic::{AtomicBool, AtomicU64, AtomicUsize, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};

use anyhow::{anyhow, Result};
use pendrake_ipc::{
    Balance, BatchPhase, BatchProgress, BatchSummary, BatchTiming, CommitBreakdown, ImportType,
    ImportUfvkArgs, Network, Note, NoteDirection, NoteStatus, ParseUfvkResult, Pool, PoolBalance,
    PricePoint, PriceSpot, RemoveArgs, SelectWalletArgs, SetWalletLabelArgs, SetDiscreetArgs, SetFiatEnabledArgs,
    SetIndexerArgs, SetNotificationsArgs, SyncEvent, SyncPhase, SyncState, SyncStatus,
    SyncWalletArgs, Tx, TxKind, TxStatus, UfvkNetwork, UnlockArgs, VerifyPassphraseArgs,
    ViewMode, WalletAddress, WalletNote, WalletState, WalletSummary,
};
use tokio::sync::broadcast::{self, error::RecvError};
use tokio::sync::{Mutex, Notify, RwLock};

use pepper_sync::config::{PerformanceLevel, SyncConfig, TransparentAddressDiscovery};
use pepper_sync::events::{ScanTiming, SequencedSyncEvent, SyncEvent as LibSyncEvent};
use zcash_primitives::transaction::TxId;
use zcash_protocol::consensus::BlockHeight;
use zcash_protocol::value::Zatoshis;

use zingolib::config::{ChainType, ClientConfig, WalletConfig, DEFAULT_INDEXER_URI};
use zingolib::data::PollReport;
use zingolib::lightclient::LightClient;
use zingolib::wallet::balance::AccountBalance;
use zingolib::wallet::encryption::EncryptionConfig;
use pepper_sync::wallet::{IronwoodNote, OrchardNote, SaplingNote};
use pepper_sync::keys::transparent::TransparentScope;
use zingolib::wallet::output::SpendStatus;
use zingolib::wallet::summary::data::{
    Scope, TransactionKind, TransactionSummaries, TransactionSummary,
};
use zingolib::wallet::WalletSettings;
use zingolib::ActivationHeights;
use zip32::AccountId;

use crate::birthday::resolve_birthday;
use crate::notify::Notifier;
use crate::notify_policy::{Disposition, NotificationPolicy};
use crate::paths::{Meta, Paths};
use crate::price::{today, PriceCache, PriceFetcher};
use crate::ufvk::{parse_ufvk, UfvkError};

/// Gap between sync rounds once a round has finished cleanly. Kept short so a
/// newly mined transaction is picked up within roughly this window.
const IDLE_INTERVAL: Duration = Duration::from_secs(2);
/// How often the price loop refreshes the spot while fiat is enabled (AUZ-83). Balanced
/// against provider rate limits; daily history is fetched at most once per UTC day.
const SPOT_INTERVAL: Duration = Duration::from_secs(600);
/// A spot older than this is shown greyed with an "updated Xh ago" marker.
const SPOT_STALE_AFTER: Duration = Duration::from_secs(3600);
/// Reconnect backoff bounds after a failed round.
const BACKOFF_MIN: Duration = Duration::from_secs(3);
const BACKOFF_MAX: Duration = Duration::from_secs(120);
/// How often to check the background sync task for completion. The event stream
/// drives progress, so this only watches for the round finishing.
const POLL_INTERVAL: Duration = Duration::from_secs(1);
/// How often to push a coalesced progress snapshot. A fast scan emits batch
/// lifecycle events far quicker than the GUI can paint, so the snapshot is
/// rate-limited to this cadence. Discrete events (batch done, transactions) still
/// go out immediately.
const PROGRESS_FLUSH: Duration = Duration::from_millis(120);
/// Committed batches kept for the measured throughput windows.
const TIMING_WINDOW: usize = 12;
/// Fan-out buffer for pushed events. Sized so a briefly-stalled IPC client lags
/// rather than blocks the sync loop.
const EVENT_CAPACITY: usize = 256;
/// How long to wait on the GetLightdInfo probe when changing the Indexer, before
/// treating a candidate server as unreachable.
const INDEXER_PROBE_TIMEOUT: Duration = Duration::from_secs(15);
/// How long a getNotes request waits on the wallet lock before serving the cached
/// list. pepper-sync can hold the write lock for long stretches mid-round (on
/// regtest the striped chain mines constantly, so a round is nearly always live),
/// and the GUI invoke has no timeout of its own; this bound is what keeps the
/// Notes view painting instead of showing skeletons forever. Two seconds spans a
/// couple of POLL_INTERVAL ticks: the RwLock is fair, so a queued read normally
/// lands between writer critical sections well inside it.
const NOTES_READ_TIMEOUT: Duration = Duration::from_secs(2);

pub struct WalletService {
    paths: Paths,
    notifier: Arc<dyn Notifier>,
    client: Mutex<Option<LightClient>>,
    meta: RwLock<Option<Meta>>,
    sync: RwLock<SyncStatus>,
    /// Pushed to every subscribed IPC connection as the wallet scans.
    events: broadcast::Sender<SyncEvent>,
    /// Cached wallet reads served to clients without touching the `client` lock,
    /// so queries never queue behind the sync loop or a commit's wallet write-lock.
    /// Refreshed at low-contention points and kept live on transaction discovery.
    txs: RwLock<Vec<Tx>>,
    balance: RwLock<Option<Balance>>,
    addresses: RwLock<Vec<WalletAddress>>,
    /// The last successfully built notes list, served when the wallet lock can't
    /// be taken within NOTES_READ_TIMEOUT (see `collect_notes`). Warmed by
    /// `refresh_snapshot` and cleared on remove alongside the other read caches.
    notes: RwLock<Vec<WalletNote>>,
    /// The notification policy (ADR-0006): the seen-set, the silent Initial scan,
    /// and the one-time "scan finished" crossing.
    notify: NotificationPolicy,
    /// Set once the "Indexer unreachable" notification has fired for the current
    /// outage, so a multi-round backoff notifies once. Cleared when a round
    /// succeeds, the Indexer changes, or a fresh sync loop starts.
    unreachable_notified: AtomicBool,
    /// Same once-per-episode latch for the "Wrong chain detected" notification
    /// (docs/adr/0010): the loop re-emits the error every backoff round, the user
    /// hears about it once. Cleared where `unreachable_notified` clears.
    wrong_chain_notified: AtomicBool,
    /// Whether transaction and scan-complete toasts fire, mirroring
    /// `Meta::notifications_enabled` for the hot notify path. Toggled from Settings.
    /// The "Indexer unreachable" alert ignores this.
    notifications_enabled: AtomicBool,
    /// Whether fiat price display is enabled, mirroring `Meta::fiat_enabled`. Gates the
    /// price refresh loop: while false nothing is fetched, so a wallet stays private to
    /// the price providers until the user consents (docs/adr/0008).
    fiat_enabled: AtomicBool,
    /// Whether Discreet mode is on, mirroring `Meta::discreet` for the hot notify
    /// path. While true, new-transaction notifications carry no amount or direction
    /// (docs/adr/0009).
    discreet: AtomicBool,
    /// Reconciled spot + daily series, served to the GUI and persisted to
    /// `price_cache.json`. Seeded from the bundled pre-2020 tail on load.
    price_cache: RwLock<PriceCache>,
    /// Wakes the price loop to fetch immediately, used when the user enables fiat so the
    /// first value lands without waiting out the interval.
    price_restart: Notify,
    /// Bumped on every (re)import and remove so a stale sync loop retires itself.
    generation: AtomicU64,
    /// Wakes the sync loop out of its idle/backoff wait to start a fresh round at
    /// once. Used when the Indexer changes, so the switch takes effect immediately
    /// instead of after the current wait elapses.
    restart: Notify,
    /// The GUI session lock. True means a fresh GUI session must re-authenticate
    /// before the daemon answers wallet reads, independent of whether the wallet is
    /// open: the `client` and sync loop keep running while locked, so background
    /// notifications survive a Sign Out or a GUI quit (docs/adr/0003). Cleared only
    /// by a verified `unlock`; armed at startup for an encrypted wallet, by `lock`,
    /// and when the last GUI subscriber leaves.
    session_locked: AtomicBool,
    /// Whether the wallet on disk is encrypted. Plaintext (legacy) wallets have no
    /// passphrase to verify, so they are never session-locked.
    encrypted: AtomicBool,
    /// Live GUI event subscribers. The lock re-arms when this falls to zero, so
    /// quitting the app (the last subscriber drops) relocks without stopping sync.
    subscribers: AtomicUsize,
    /// The global passphrase for the session, held in memory once a wallet is
    /// imported or unlocked. Replace keeps it across the wipe so the new Wallet
    /// inherits it and onboarding skips Set Password; Start over drops it
    /// (docs/adr/0004). Never persisted.
    session_passphrase: Mutex<Option<String>>,
    /// Armed by `run` so a `shutdown` IPC request can wake the host process.
    /// Taken on first use; subsequent calls are no-ops.
    shutdown_tx: std::sync::Mutex<Option<std::sync::mpsc::Sender<()>>>,
}

/// One in-flight scan range, walked through its lifecycle by the batch events.
struct Batch {
    range: Range<u32>,
    priority: String,
    outputs: u64,
    phase: BatchPhase,
    /// When the current phase began: as an `Instant` for elapsed math, and as
    /// epoch millis so the GUI can animate the bar against the same clock.
    phase_since: Instant,
    phase_started_ms: u64,
    /// How long the batch waited behind the commit stage, captured on commit.
    waited: Duration,
}

/// The whole round folded from the event stream: the overall tally, the active
/// batches, and the measured throughput windows the example computes its
/// estimates from. Ported from `sync_events.rs`'s `View`, minus terminal drawing.
#[derive(Default)]
struct RoundView {
    scanned_outputs: u64,
    total_outputs: u64,
    synced_height: u32,
    chain_tip: u32,
    in_flight: Vec<Batch>,
    /// Recent committed batches as (outputs, timing), for the scan/commit rates.
    timing_log: VecDeque<(u64, ScanTiming)>,
    /// Recent commits as (time, cumulative outputs), for the overall ETA rate.
    aggregate_log: VecDeque<(Instant, u64)>,
}

impl RoundView {
    fn percent(&self) -> u8 {
        if self.total_outputs == 0 {
            return 0;
        }
        let frac = self.scanned_outputs as f64 / self.total_outputs as f64 * 100.0;
        frac.clamp(0.0, 100.0).round() as u8
    }

    /// The overall phase label, taken from the furthest-along active batch so the
    /// headline reflects commit pressure when scanning has run ahead.
    fn phase(&self) -> Option<SyncPhase> {
        if self.in_flight.is_empty() {
            return None;
        }
        let committing = self
            .in_flight
            .iter()
            .any(|b| matches!(b.phase, BatchPhase::Committing));
        Some(if committing {
            SyncPhase::Committing
        } else {
            SyncPhase::Scanning
        })
    }

    /// Outputs per second over the timing window for a phase's duration.
    fn rate(&self, phase: impl Fn(&ScanTiming) -> Duration) -> Option<f64> {
        let outputs: u64 = self.timing_log.iter().map(|(o, _)| o).sum();
        let seconds: f64 = self
            .timing_log
            .iter()
            .map(|(_, t)| phase(t).as_secs_f64())
            .sum();
        (seconds > 0.0 && outputs > 0).then(|| outputs as f64 / seconds)
    }

    fn scan_rate(&self) -> Option<f64> {
        self.rate(|t| t.fetch + t.decryption + t.tree)
    }

    fn commit_rate(&self) -> Option<f64> {
        self.rate(|t| t.commit.total())
    }

    /// The wall-clock rate at which scanned outputs accumulate, for the overall
    /// ETA. Immune to how the work parallelises or serialises.
    fn aggregate_rate(&self) -> Option<f64> {
        let (first_at, first_outputs) = self.aggregate_log.front()?;
        let (last_at, last_outputs) = self.aggregate_log.back()?;
        let span = last_at.duration_since(*first_at).as_secs_f64();
        (span > 0.5 && last_outputs > first_outputs)
            .then(|| (last_outputs - first_outputs) as f64 / span)
    }

    fn eta_seconds(&self) -> Option<u64> {
        let rate = self.aggregate_rate()?;
        if rate <= 0.0 || self.scanned_outputs >= self.total_outputs {
            return None;
        }
        let remaining = (self.total_outputs - self.scanned_outputs) as f64;
        Some((remaining / rate).ceil() as u64)
    }

    /// Estimated duration of a batch's active phase from measured throughput.
    fn expected_secs(&self, batch: &Batch) -> Option<f64> {
        let rate = match batch.phase {
            BatchPhase::Scanning => self.scan_rate(),
            BatchPhase::Committing => self.commit_rate(),
            BatchPhase::Waiting => return None,
        }?;
        (rate > 0.0 && batch.outputs > 0).then(|| batch.outputs as f64 / rate)
    }

    fn status(&self, state: SyncState) -> SyncStatus {
        SyncStatus {
            state,
            synced_height: self.synced_height,
            chain_tip: self.chain_tip.max(self.synced_height),
            percent: self.percent(),
            phase: self.phase(),
            scanned_outputs: Some(self.scanned_outputs),
            total_outputs: Some(self.total_outputs),
            eta_seconds: self.eta_seconds(),
            error: None,
            unreachable: false,
            wrong_chain: false,
            last_synced_at: None,
        }
    }

    fn batch_snapshot(&self) -> Vec<BatchProgress> {
        self.in_flight
            .iter()
            .map(|b| BatchProgress {
                id: range_id(&b.range),
                start: b.range.start,
                end: b.range.end,
                priority: b.priority.clone(),
                outputs: b.outputs,
                phase: b.phase,
                phase_started_at_ms: b.phase_started_ms,
                expected_secs: self.expected_secs(b),
            })
            .collect()
    }

    fn live_batch(&mut self, range: &Range<u32>) -> Option<&mut Batch> {
        self.in_flight.iter_mut().find(|b| b.range == *range)
    }
}

/// A failed sync round: the message the GUI shows, plus whether the cause was the
/// Indexer being unreachable. Only the connectivity case drives the "Change server"
/// CTA (AUZ-47), so the verdict travels with the error rather than being re-derived.
struct RoundError {
    message: String,
    unreachable: bool,
    /// The pre-round identity check found the Indexer on a different chain
    /// (docs/adr/0010). Only that guard sets it; mid-round pepper-sync failures
    /// never do.
    wrong_chain: bool,
}

impl From<anyhow::Error> for RoundError {
    fn from(e: anyhow::Error) -> Self {
        // Everything that reaches this path (no wallet, sync start, missing task) is a
        // local/state error, never a poll-time transport failure.
        Self {
            message: e.to_string(),
            unreachable: false,
            wrong_chain: false,
        }
    }
}

/// True when a sync failure is the Indexer being unreachable: a connection or
/// transport failure (`RequestFailed`), as opposed to a scan, consensus, bad-data,
/// or wallet error. Kept narrow so the "Change server" CTA never shows for a failure
/// that changing the server wouldn't fix.
fn is_unreachable<E: std::fmt::Debug + std::fmt::Display>(
    err: &pepper_sync::error::SyncError<E>,
) -> bool {
    use pepper_sync::error::{ServerError, SyncError};
    matches!(err, SyncError::ServerError(ServerError::RequestFailed(_)))
}

/// What the Indexer reported when asked who it is: its tip, and the hash of the
/// block at the Wallet's anchor height (`None` when unanchored, or when the tip
/// doesn't cover that height).
struct ChainObservation {
    tip: u32,
    anchor_block_hash: Option<String>,
}

/// For a Wallet without an Anchor, how far the server tip may sit below the
/// Wallet's Initial-scan target before it reads as a swapped chain rather than
/// server lag. A genuinely lagging indexer trails by a handful of blocks; tonight's
/// incident trailed by 3.1M.
const WRONG_CHAIN_TIP_MARGIN: u32 = 100;

/// The chain-identity verdict for one observation (docs/adr/0010).
#[derive(Debug, PartialEq)]
enum ChainVerdict {
    Match,
    WrongChain { detail: String },
    /// No Anchor recorded and no evidence of a swap: sync proceeds, and the loop
    /// adopts an Anchor after its next good round.
    Unanchored,
}

/// Pure verdict: does the observed chain carry the Wallet's Anchor? With no Anchor
/// (a wallet imported before ADR-0010), fall back to the tip heuristic: a tip far
/// below the Initial-scan target means the chain the Wallet synced is gone, not
/// that the server is catching up.
fn chain_verdict(
    anchor_height: u32,
    anchor_hash: Option<&str>,
    scan_target_height: u32,
    obs: &ChainObservation,
) -> ChainVerdict {
    let Some(expected) = anchor_hash else {
        return if obs.tip + WRONG_CHAIN_TIP_MARGIN < scan_target_height {
            ChainVerdict::WrongChain {
                detail: format!(
                    "the server's chain ends at block {}, far below the {} this Wallet synced",
                    obs.tip, scan_target_height
                ),
            }
        } else {
            ChainVerdict::Unanchored
        };
    };
    if obs.tip < anchor_height {
        return ChainVerdict::WrongChain {
            detail: format!(
                "the server's chain ends at block {}, below this Wallet's anchor at {}",
                obs.tip, anchor_height
            ),
        };
    }
    match obs.anchor_block_hash.as_deref() {
        Some(found) if found == expected => ChainVerdict::Match,
        Some(_) => ChainVerdict::WrongChain {
            detail: format!("block {anchor_height} doesn't match the one this Wallet synced"),
        },
        None => ChainVerdict::WrongChain {
            detail: format!("the server has no block at height {anchor_height}"),
        },
    }
}

/// Lower-hex of raw bytes, for block hashes. Recorded and verified through this
/// same fold, so the byte order is self-consistent whatever the server's convention.
fn hex_lower(bytes: &[u8]) -> String {
    use std::fmt::Write;
    let mut hex = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        let _ = write!(hex, "{byte:02x}");
    }
    hex
}

/// The chain tip the Indexer reports, via a real `GetLightdInfo` request. It also
/// serves as the reachability check: a plain HTTPS server accepts the connection but
/// can't answer this, so the gRPC call proves the endpoint is a Zcash indexer before
/// a Wallet points at it. The tip is pinned at import as the Initial-scan boundary N
/// (ADR-0006).
async fn indexer_tip(uri: &http::Uri) -> Result<u32> {
    use zingo_netutils::Indexer;
    let mut indexer = zingo_netutils::GrpcIndexer::new(uri.clone())
        .await
        .map_err(|e| anyhow!("could not connect to indexer: {e}"))?;
    let info = indexer
        .get_lightd_info(INDEXER_PROBE_TIMEOUT)
        .await
        .map_err(|e| indexer_probe_error(&e))?;
    Ok(info.block_height as u32)
}

/// Turn a GetLightdInfo probe failure into a message the user can act on, keeping the
/// tonic/OS internals out of the UI. The gRPC connection is lazy, so a bad address
/// surfaces here as a connect failure rather than at construction. Tell that apart from
/// an endpoint that answers but isn't an indexer. The raw error is logged for debugging.
fn indexer_probe_error<E: std::fmt::Display>(err: &E) -> anyhow::Error {
    let raw = err.to_string();
    tracing::debug!("indexer probe failed: {raw}");
    let lower = raw.to_lowercase();
    let unreachable = ["unavailable", "connect", "refused", "dns", "timed out", "timeout", "deadline"]
        .iter()
        .any(|sig| lower.contains(sig));
    if unreachable {
        anyhow!("couldn't reach that server. Check the address and that the server is running.")
    } else {
        anyhow!("that server answered but isn't a Zcash indexer.")
    }
}

/// The hash of the block at `height` on the Indexer's chain, lower-hex. `Ok(None)`
/// means the server answered but has no such block: implementations disagree on the
/// status code for that (NotFound, OutOfRange, InvalidArgument, Unknown), so the
/// plausible ones all map to `None` and callers judge "chain too short" from the tip
/// first, never from these codes alone. Anything else is a real probe failure.
async fn fetch_block_hash(uri: &http::Uri, height: u32) -> Result<Option<String>> {
    use tonic::Code;
    use zingo_netutils::{lightwallet_protocol::BlockId, Indexer};
    let mut indexer = zingo_netutils::GrpcIndexer::new(uri.clone())
        .await
        .map_err(|e| anyhow!("could not connect to indexer: {e}"))?;
    let block_id = BlockId {
        height: u64::from(height),
        hash: vec![],
    };
    match indexer.get_block(block_id, INDEXER_PROBE_TIMEOUT).await {
        Ok(block) => Ok(Some(hex_lower(&block.hash))),
        Err(status)
            if matches!(
                status.code(),
                Code::NotFound | Code::OutOfRange | Code::InvalidArgument | Code::Unknown
            ) =>
        {
            tracing::debug!("get_block({height}) has no block: {status}");
            Ok(None)
        }
        Err(status) => Err(indexer_probe_error(&status)),
    }
}

/// One look at who the Indexer is: its tip, plus the block hash at the Wallet's
/// anchor height when there is one and the reported chain covers it. An `Err` is an
/// outage (the server didn't answer), never a chain verdict.
async fn observe_chain(uri: &http::Uri, anchor_height: Option<u32>) -> Result<ChainObservation> {
    let tip = indexer_tip(uri).await?;
    let anchor_block_hash = match anchor_height {
        Some(height) if tip >= height => fetch_block_hash(uri, height).await?,
        _ => None,
    };
    Ok(ChainObservation {
        tip,
        anchor_block_hash,
    })
}

/// Methods the daemon answers while the GUI session is locked: lifecycle, auth, and
/// the event subscription. Everything else (wallet reads, indexer changes) is refused
/// until `unlock`. An allowlist, so a newly added method defaults to gated.
fn allowed_while_locked(method: &str) -> bool {
    matches!(
        method,
        "getWalletState"
            | "getSyncStatus"
            | "parseUfvk"
            | "importUfvk"
            | "unlock"
            | "lock"
            | "verifyPassphrase"
            | "removeWallet"
            | "subscribeEvents"
            | "listWallets"
            | "shutdown"
    )
}

impl WalletService {
    /// Arm the one-shot sender that wakes the host when `shutdown` is received.
    pub fn arm_shutdown(&self, tx: std::sync::mpsc::Sender<()>) {
        *self
            .shutdown_tx
            .lock()
            .unwrap_or_else(|e| e.into_inner()) = Some(tx);
    }

    /// Root `Paths` scoped to the active wallet id, if any. Disk layout is
    /// multi-wallet ready (`wallets/<id>/`); the service still drives a single
    /// active wallet at a time.
    fn scoped_paths(&self) -> Paths {
        match self.paths.read_active_id().ok().flatten() {
            Some(id) => self.paths.for_wallet(&id),
            None => self.paths.clone(),
        }
    }

    async fn clear_read_caches(&self) {
        *self.txs.write().await = Vec::new();
        *self.balance.write().await = None;
        *self.addresses.write().await = Vec::new();
        *self.notes.write().await = Vec::new();
    }

    /// Build the service, loading and resuming sync for an existing wallet.
    pub async fn load(paths: Paths, notifier: Arc<dyn Notifier>) -> Result<Arc<Self>> {
        paths.ensure_dirs()?;
        if let Err(e) = paths.migrate_legacy_if_needed() {
            tracing::warn!("legacy wallet migration failed: {e:#}");
        }
        let active_paths = match paths.read_active_id()? {
            Some(id) => paths.for_wallet(&id),
            None => paths.clone(),
        };
        let notify = NotificationPolicy::load(active_paths.notified_file.clone());
        let (events, _) = broadcast::channel(EVENT_CAPACITY);
        let mut price_cache = PriceCache::load(&paths.price_cache_file);
        price_cache.seed_tail();
        let service = Arc::new(Self {
            notifier,
            client: Mutex::new(None),
            meta: RwLock::new(None),
            sync: RwLock::new(SyncStatus::default()),
            events,
            txs: RwLock::new(Vec::new()),
            balance: RwLock::new(None),
            addresses: RwLock::new(Vec::new()),
            notes: RwLock::new(Vec::new()),
            notify,
            unreachable_notified: AtomicBool::new(false),
            wrong_chain_notified: AtomicBool::new(false),
            notifications_enabled: AtomicBool::new(true),
            fiat_enabled: AtomicBool::new(false),
            discreet: AtomicBool::new(false),
            price_cache: RwLock::new(price_cache),
            price_restart: Notify::new(),
            generation: AtomicU64::new(0),
            restart: Notify::new(),
            session_locked: AtomicBool::new(false),
            encrypted: AtomicBool::new(false),
            subscribers: AtomicUsize::new(0),
            session_passphrase: Mutex::new(None),
            shutdown_tx: std::sync::Mutex::new(None),
            paths,
        });

        if let Some(meta) = Meta::load(&active_paths.meta_file)? {
            service.encrypted.store(meta.encrypted, Ordering::SeqCst);
            service
                .notifications_enabled
                .store(meta.notifications_enabled, Ordering::SeqCst);
            service
                .fiat_enabled
                .store(meta.fiat_enabled, Ordering::SeqCst);
            service.discreet.store(meta.discreet, Ordering::SeqCst);
            if meta.encrypted {
                // An encrypted wallet starts the session locked: hold the meta but
                // open no client until the GUI sends the passphrase via `unlock`,
                // which loads the client and starts sync.
                tracing::info!("encrypted wallet on disk, waiting for unlock");
                service.session_locked.store(true, Ordering::SeqCst);
                *service.meta.write().await = Some(meta);
            } else {
                let config = service.client_config(
                    chain_of(meta.network),
                    &meta.indexer_uri,
                    WalletConfig::Read,
                );
                match LightClient::new(config, false, None).await {
                    Ok(mut client) => {
                        tracing::info!("loaded existing wallet from disk");
                        // Persist scanned data as sync advances, so a restart resumes
                        // from the saved height instead of rescanning from birthday.
                        client.save_task().await;
                        *service.client.lock().await = Some(client);
                        *service.meta.write().await = Some(meta);
                        // Prime the read cache before the sync loop starts contending
                        // for the wallet, so the GUI's opening queries are instant.
                        service.refresh_snapshot().await;
                        // Multi-wallet Phase 1: load snapshot only; sync starts on
                        // explicit syncWallet from the GUI.
                        service.sync.write().await.state = SyncState::Idle;
                    }
                    Err(e) => tracing::warn!("meta present but wallet load failed: {e}"),
                }
            }
        }
        service.spawn_price_loop();
        Ok(service)
    }

    pub async fn list_wallets(&self) -> Result<Vec<WalletSummary>> {
    let active = self.paths.read_active_id()?;
    let mut out = Vec::new();
    for id in self.paths.list_wallet_ids()? {
        let p = self.paths.for_wallet(&id);
        let Some(meta) = Meta::load(&p.meta_file)? else {
            continue;
        };
        let label = meta
            .label
            .as_ref()
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
            .map(|s| s.to_string())
            .or_else(|| {
                meta.fingerprint
                    .as_ref()
                    .map(|f| f.chars().take(8).collect::<String>())
            })
            .unwrap_or_else(|| id.chars().take(8).collect());
        out.push(WalletSummary {
            id: id.clone(),
            label,
            fingerprint: meta.fingerprint.clone(),
            network: meta.network,
            birthday_height: meta.birthday_height,
            active: active.as_deref() == Some(id.as_str()),
        });
    }
    Ok(out)
}

    /// Switch the active wallet. Loads client + disk snapshot; does not start
    /// network sync until [`Self::sync_wallet`].
    pub async fn select_wallet(self: &Arc<Self>, id: &str) -> Result<WalletState> {
        let p = self.paths.for_wallet(id);
        let meta = Meta::load(&p.meta_file)?
            .ok_or_else(|| anyhow!("no wallet with id {id}"))?;

        self.generation.fetch_add(1, Ordering::SeqCst);
        *self.client.lock().await = None;
        self.clear_read_caches().await;

        self.paths.write_active_id(id)?;
        self.encrypted.store(meta.encrypted, Ordering::SeqCst);
        self.notifications_enabled
            .store(meta.notifications_enabled, Ordering::SeqCst);
        self.fiat_enabled
            .store(meta.fiat_enabled, Ordering::SeqCst);
        self.discreet.store(meta.discreet, Ordering::SeqCst);
        self.unreachable_notified.store(false, Ordering::SeqCst);
        self.wrong_chain_notified.store(false, Ordering::SeqCst);

        *self.sync.write().await = SyncStatus {
            state: SyncState::Idle,
            ..SyncStatus::default()
        };

        if meta.encrypted {
            self.session_locked.store(true, Ordering::SeqCst);
            *self.meta.write().await = Some(meta);
        } else {
            self.session_locked.store(false, Ordering::SeqCst);
            let config = self.client_config(
                chain_of(meta.network),
                &meta.indexer_uri,
                WalletConfig::Read,
            );
            let mut client = LightClient::new(config, false, None)
                .await
                .map_err(|e| anyhow!("failed to open wallet {id}: {e}"))?;
            client.save_task().await;
            *self.client.lock().await = Some(client);
            *self.meta.write().await = Some(meta);
            self.refresh_snapshot().await;
        }

        Ok(self.wallet_state().await)
    }

    /// Start tip-follow sync for the active wallet (user-triggered).
    pub async fn sync_wallet(self: &Arc<Self>) -> Result<SyncStatus> {
        if self.client.lock().await.is_none() {
            return Err(anyhow!("wallet is locked or not loaded"));
        }
        self.generation.fetch_add(1, Ordering::SeqCst);
        self.unreachable_notified.store(false, Ordering::SeqCst);
        self.wrong_chain_notified.store(false, Ordering::SeqCst);
        self.sync.write().await.state = SyncState::Syncing;
        self.spawn_sync_loop();
        self.restart.notify_waiters();
        Ok(self.sync.read().await.clone())
    }

    pub async fn handle(
        self: &Arc<Self>,
        method: &str,
        params: serde_json::Value,
    ) -> Result<serde_json::Value> {
        use serde_json::to_value;
        // While the GUI session is locked the daemon answers only lifecycle and auth
        // methods. Wallet reads are refused, so a locked screen (or any other peer on
        // the socket) can't see balances or history while the session key is still
        // held for background sync.
        if self.session_locked.load(Ordering::SeqCst) && !allowed_while_locked(method) {
            return Err(anyhow!("wallet is locked"));
        }
        match method {
            "getWalletState" => Ok(to_value(self.wallet_state().await)?),
            "getSyncStatus" => Ok(to_value(self.sync.read().await.clone())?),
            "setWalletLabel" => {
		    let args: SetWalletLabelArgs = serde_json::from_value(params)?;
		    Ok(to_value(self.set_wallet_label(&args.id, &args.label).await?)?)
		}
            "listWallets" => Ok(to_value(self.list_wallets().await?)?),
		"selectWallet" => {
		    let args: SelectWalletArgs = serde_json::from_value(params)?;
		    Ok(to_value(self.select_wallet(&args.id).await?)?)
		}
		"syncWallet" => {
		    let _args: SyncWalletArgs = serde_json::from_value(
			if params.is_null() {
			    serde_json::json!({})
			} else {
			    params
			},
		    )?;
		    Ok(to_value(self.sync_wallet().await?)?)
		}
            // Wallet reads are served from the snapshot cache, never the `client`
            // lock, so they don't queue behind the sync loop.
            "getBalance" => Ok(to_value(
                self.balance.read().await.clone().unwrap_or_default(),
            )?),
            "getTransactions" => Ok(to_value(self.txs.read().await.clone())?),
            "getNotes" => Ok(to_value(self.collect_notes().await)?),
            "getAddresses" => Ok(to_value(self.addresses.read().await.clone())?),
            "getTransaction" => {
                let txid = params
                    .get("txid")
                    .and_then(|v| v.as_str())
                    .ok_or_else(|| anyhow!("getTransaction needs a txid"))?;
                let found = self
                    .txs
                    .read()
                    .await
                    .iter()
                    .find(|tx| tx.txid == txid)
                    .cloned();
                Ok(to_value(found)?)
            }
            "parseUfvk" => {
                let ufvk = params
                    .get("ufvk")
                    .and_then(|v| v.as_str())
                    .ok_or_else(|| anyhow!("parseUfvk needs a ufvk"))?;
                Ok(to_value(parse_ufvk_result(ufvk))?)
            }
            "importUfvk" => {
                let args: ImportUfvkArgs = serde_json::from_value(params)?;
                Ok(to_value(self.import_ufvk(args).await?)?)
            }
            "setIndexer" => {
                let args: SetIndexerArgs = serde_json::from_value(params)?;
                Ok(to_value(self.set_indexer(args.indexer_uri).await?)?)
            }
            "setNotifications" => {
                let args: SetNotificationsArgs = serde_json::from_value(params)?;
                Ok(to_value(self.set_notifications(args.enabled).await?)?)
            }
            "setFiatEnabled" => {
                let args: SetFiatEnabledArgs = serde_json::from_value(params)?;
                Ok(to_value(self.set_fiat_enabled(args.enabled).await?)?)
            }
            "setDiscreet" => {
                let args: SetDiscreetArgs = serde_json::from_value(params)?;
                Ok(to_value(self.set_discreet(args.enabled).await?)?)
            }
            "getSpotPrice" => Ok(to_value(self.spot_price().await)?),
            "getPriceHistory" => Ok(to_value(self.price_history().await)?),
            "unlock" => {
                let args: UnlockArgs = serde_json::from_value(params)?;
                Ok(to_value(self.unlock(args.passphrase).await?)?)
            }
            "lock" => {
                self.lock_session();
                Ok(serde_json::Value::Null)
            }
            "verifyPassphrase" => {
                let args: VerifyPassphraseArgs = serde_json::from_value(params)?;
                Ok(to_value(self.verify_passphrase(&args.passphrase).await)?)
            }
            "removeWallet" => {
                // Tolerate a null/absent body (an older client, or Start over) as the
                // default: drop the session passphrase.
                let args: RemoveArgs = serde_json::from_value(params).unwrap_or_default();
                self.remove(args.keep_session).await?;
                Ok(serde_json::Value::Null)
            }
            // The push stream is wired up by the IPC layer, so the service just acks.
            "subscribeEvents" => Ok(serde_json::Value::Null),
            "shutdown" => {
                if let Ok(mut guard) = self.shutdown_tx.lock() {
                    if let Some(tx) = guard.take() {
                        let _ = tx.send(());
                    }
                }
                Ok(serde_json::Value::Null)
            }
            other => Err(anyhow!("unknown method: {other}")),
        }
    }

    /// A receiver for the pushed sync-event stream, one per subscribed connection.
    pub fn subscribe(&self) -> broadcast::Receiver<SyncEvent> {
        self.events.subscribe()
    }

    fn client_config(
        &self,
        chain: ChainType,
        indexer_uri: &str,
        wallet: WalletConfig,
    ) -> ClientConfig {
        let uri: http::Uri = indexer_uri
            .parse()
            .unwrap_or_else(|_| DEFAULT_INDEXER_URI.parse().expect("valid default uri"));
        ClientConfig::builder()
            .set_chain_type(chain)
            .set_indexer_uri(uri)
            .set_wallet_dir(self.scoped_paths().wallet_dir.clone())
            .set_wallet_config(wallet)
            .build()
    }

    async fn wallet_state(&self) -> WalletState {
        let locked = self.session_locked.load(Ordering::SeqCst);
        let session_held = self.session_passphrase.lock().await.is_some();
        match &*self.meta.read().await {
            Some(m) => WalletState {
                exists: true,
                locked,
                session_held,
                wallet_id: self.paths.read_active_id().ok().flatten(),
                label: m.label.clone(),
                fingerprint: m.fingerprint.clone(),
                import_type: m.import_type,
                view_mode: m.view_mode,
                network: m.network,
                birthday_height: m.birthday_height,
                indexer_uri: m.indexer_uri.clone(),
                notifications_enabled: m.notifications_enabled,
                fiat_enabled: m.fiat_enabled,
                discreet: m.discreet,
            },
            None => WalletState {
                exists: false,
                locked: false,
                session_held,
                wallet_id: None,
                label: None,
                fingerprint: None,
                import_type: ImportType::Ufvk,
                view_mode: ViewMode::Full,
                network: Network::Mainnet,
                birthday_height: 0,
                indexer_uri: String::new(),
                notifications_enabled: true,
                fiat_enabled: false,
                discreet: false,
            },
        }
    }

    /// Enumerate every received output the Wallet controls, across pools, with its
    /// spend state resolved. Served live off the wallet when its lock frees within
    /// NOTES_READ_TIMEOUT, and from the last-built list otherwise: mid-round
    /// pepper-sync holds the write lock for long stretches, and the GUI request
    /// landing here has no timeout of its own, so an unbounded wait paints as
    /// skeletons forever. Returns empty when no wallet is open. Note `idx` is
    /// assigned over the returned order, so it is a stable row number for the
    /// default sort, not a wallet-internal id.
    async fn collect_notes(&self) -> Vec<WalletNote> {
        // Clone the wallet handle out from under the client Mutex before any
        // wallet await: the sync loop's poll arm takes the same Mutex every
        // second, so holding it while queued behind the wallet lock would stall
        // the round too.
        let wallet = {
            let guard = self.client.lock().await;
            match guard.as_ref() {
                Some(client) => Arc::clone(client.wallet()),
                None => return Vec::new(),
            }
        };

        let Ok(wallet) = tokio::time::timeout(NOTES_READ_TIMEOUT, wallet.read()).await else {
            tracing::debug!("wallet lock busy past the notes deadline, serving the cached list");
            return self.notes.read().await.clone();
        };

        // Authoritative txid -> confirmed height, so a note spent by transaction X can
        // report the block X landed in. An in-flight spend's transaction isn't
        // confirmed yet, so it's absent here and the note's spent height stays null.
        let heights: HashMap<String, u32> = wallet
            .wallet_transactions
            .values()
            .filter_map(|tx| {
                tx.status()
                    .get_confirmed_height()
                    .map(|h| (tx.txid().to_string(), u32::from(h)))
            })
            .collect();

        let mut notes = Vec::new();
        let mut push = |pool, value, confirmed, height, spend_status, txid: &TxId, change| {
            notes.push(map_wallet_note(
                notes.len() as u32,
                pool,
                value,
                confirmed,
                height,
                spend_status,
                txid,
                change,
                &heights,
            ));
        };
        for n in wallet.note_summaries::<IronwoodNote>(true).iter() {
            push(
                Pool::Ironwood,
                n.value,
                n.status.is_confirmed(),
                u32::from(n.block_height),
                n.spend_status,
                &n.txid,
                matches!(n.scope, Scope::Internal),
            );
        }
        for n in wallet.note_summaries::<OrchardNote>(true).iter() {
            push(
                Pool::Orchard,
                n.value,
                n.status.is_confirmed(),
                u32::from(n.block_height),
                n.spend_status,
                &n.txid,
                matches!(n.scope, Scope::Internal),
            );
        }
        for n in wallet.note_summaries::<SaplingNote>(true).iter() {
            push(
                Pool::Sapling,
                n.value,
                n.status.is_confirmed(),
                u32::from(n.block_height),
                n.spend_status,
                &n.txid,
                matches!(n.scope, Scope::Internal),
            );
        }
        for c in wallet.coin_summaries(true) {
            push(
                Pool::Transparent,
                c.value,
                c.status.is_confirmed(),
                u32::from(c.block_height),
                c.spend_status,
                &c.txid,
                matches!(c.scope, TransparentScope::Internal),
            );
        }
        drop(wallet);

        *self.notes.write().await = notes.clone();
        notes
    }

    /// Rebuild the read caches (transactions, balance, addresses, notes) from the
    /// wallet in one client-lock acquisition. Best-effort: a transient read failure
    /// leaves the previous snapshot in place. Called at low-contention points (load,
    /// import, unlock, end of a sync round), never on a client request path.
    async fn refresh_snapshot(&self) {
        let guard = self.client.lock().await;
        let Some(client) = guard.as_ref() else { return };

        if let Ok(summaries) = client.transaction_summaries(true).await {
            let spent_by = spent_value_by_tx(&summaries);
            *self.txs.write().await =
                summaries.iter().map(|s| map_tx(s, &spent_by)).collect();
        }
        if let Ok(bal) = client.account_balance(AccountId::ZERO).await {
            *self.balance.write().await = Some(map_balance(&bal));
        }

        let unified = client.unified_addresses_json().await;
        let transparent = client.transparent_addresses_json().await;
        let first_t = transparent[0]["encoded_address"]
            .as_str()
            .map(str::to_string);
        let addrs = unified
            .members()
            .enumerate()
            .filter_map(|(i, entry)| {
                entry["encoded_address"].as_str().map(|ua| WalletAddress {
                    ua: ua.to_string(),
                    transparent: if i == 0 { first_t.clone() } else { None },
                })
            })
            .collect();
        *self.addresses.write().await = addrs;
        drop(guard);

        // Warm the notes cache in the same low-contention window, so a later
        // getNotes that times out behind a sync round serves this snapshot's list
        // rather than an older wallet's. After the guard drops: collect_notes
        // takes the client lock itself.
        self.collect_notes().await;
    }


    pub async fn set_wallet_label(&self, id: &str, label: &str) -> Result<WalletState> {
    let p = self.paths.for_wallet(id);
    let mut meta = Meta::load(&p.meta_file)?
        .ok_or_else(|| anyhow!("no wallet with id {id}"))?;
    let trimmed = label.trim();
    meta.label = if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.chars().take(64).collect())
    };
    meta.save(&p.meta_file)?;

    // Keep the in-memory meta used by wallet_state() in sync for the active wallet.
    if self.paths.read_active_id()?.as_deref() == Some(id) {
        *self.meta.write().await = Some(meta);
    }

    Ok(self.wallet_state().await)
}



    async fn import_ufvk(self: &Arc<Self>, args: ImportUfvkArgs) -> Result<WalletState> {
        // ADR-0002: the network is derived from the key, never trusted from the
        // client. Reject testnet and malformed keys, and any disagreement between
        // the key and the requested network, before touching disk.
        let identity = parse_ufvk(&args.ufvk).map_err(|e| anyhow!("{e}"))?;
        let key_network = match identity.network {
            UfvkNetwork::Mainnet => Network::Mainnet,
            UfvkNetwork::Regtest => Network::Regtest,
        };
        if key_network != args.network {
            return Err(anyhow!(
                "the key is {:?} but the import requested {:?}",
                identity.network,
                args.network
            ));
        }

        // A first onboarding sends the passphrase; a post-Replace import omits it and
        // reuses the one the daemon held across the wipe (docs/adr/0004).
        let passphrase = match args.passphrase {
            Some(p) => p,
            None => self
                .session_passphrase
                .lock()
                .await
                .clone()
                .ok_or_else(|| anyhow!("no session passphrase held for this import"))?,
        };

        let chain = chain_of(args.network);
        let birthday = resolve_birthday(&args.birthday, &chain);
        tracing::debug!(resolved_birthday = birthday, "resolved wallet birthday");
        // Pin the Initial-scan boundary at the current chain tip (ADR-0006). This
        // GetLightdInfo also fails fast on an unreachable or wrong Indexer, before the
        // wallet file is written.
        let indexer_uri: http::Uri = args
            .indexer_uri
            .parse()
            .map_err(|_| anyhow!("invalid indexer uri"))?;
        let scan_target_height = indexer_tip(&indexer_uri).await?;
        // Record the Anchor (docs/adr/0010): the hash of the block at the birthday
        // (or the tip, for a birthday in the future), clamped to ≥1 since block 0
        // isn't served. Every later sync round verifies it, so a swapped chain is
        // refused instead of ground through. Still before any disk write.
        let anchor_height = birthday.min(scan_target_height).max(1);
        let anchor_hash = fetch_block_hash(&indexer_uri, anchor_height)
            .await?
            .ok_or_else(|| anyhow!("that server has no block at height {anchor_height}"))?;
        let meta = Meta {
            network: args.network,
            indexer_uri: args.indexer_uri.clone(),
            import_type: ImportType::Ufvk,
            view_mode: ViewMode::Full,
            birthday_height: birthday,
            scan_target_height,
            encrypted: true,
            fingerprint: Some(identity.fingerprint.clone()),
            label: None,
            notifications_enabled: true,
            fiat_enabled: false,
            discreet: false,
            anchor_height,
            anchor_hash: Some(anchor_hash),
        };

        // Each UFVK lands under wallets/<fingerprint>/ (multi-wallet layout).
        let id = identity.fingerprint.clone();
        let wallet_paths = self.paths.for_wallet(&id);
        // Re-import of the same key overwrites that wallet dir.
        let _ = std::fs::remove_dir_all(&wallet_paths.wallet_dir);
        wallet_paths.ensure_dirs()?;
        self.paths.write_active_id(&id)?;

        let wallet = WalletConfig::Ufvk {
            ufvk: args.ufvk,
            birthday,
            wallet_settings: wallet_settings(),
        };
        // client_config reads scoped_paths() which follows active_wallet_id.
        let config = self.client_config(chain, &meta.indexer_uri, wallet);
        let mut client = LightClient::new(
            config,
            true,
            Some(EncryptionConfig::new(passphrase.clone())),
        )
        .await
        .map_err(|e| anyhow!("client creation failed: {e:?}"))?;

        // Flush the freshly-built wallet to disk and block until the file lands,
        // so a caller can rely on the wallet existing the moment import returns.
        client.save_task().await;
        client.wait_for_save().await;

        meta.save(&self.scoped_paths().meta_file)?;
        *self.meta.write().await = Some(meta);
        *self.client.lock().await = Some(client);
        *self.session_passphrase.lock().await = Some(passphrase);
        self.encrypted.store(true, Ordering::SeqCst);
        self.notifications_enabled.store(true, Ordering::SeqCst);
        // A fresh Wallet starts private: fiat stays off until the user consents anew, so a
        // prior wallet's choice doesn't carry over the import.
        self.fiat_enabled.store(false, Ordering::SeqCst);
        self.discreet.store(false, Ordering::SeqCst);
        self.session_locked.store(false, Ordering::SeqCst);
        *self.sync.write().await = SyncStatus::default();
        self.notify.reset();
        // Prime the cache (empty history, fixed addresses, zero balance) so the
        // GUI's post-import queries don't block on the starting sync.
        self.refresh_snapshot().await;

        self.generation.fetch_add(1, Ordering::SeqCst);
        *self.sync.write().await = SyncStatus {
            state: SyncState::Idle,
            ..SyncStatus::default()
        };

        Ok(self.wallet_state().await)
    }

    /// Clear the GUI session lock once the passphrase checks out, then make sure the
    /// wallet is open and syncing. Two paths: a warm re-entry when the wallet is
    /// already open (a Sign Out or a GUI quit left the client in memory), verified
    /// offline against the held session passphrase; and a cold open after a restart,
    /// which decrypts the file. A wrong passphrase is rejected in both.
    async fn unlock(self: &Arc<Self>, passphrase: String) -> Result<WalletState> {
        // Warm: the wallet is already open and syncing, so the session just needs to
        // re-authenticate. Verify against the passphrase that decrypted it instead of
        // waving any input through. The constant-time match needs no server, so it
        // works offline. A plaintext wallet has no passphrase to check.
        if self.client.lock().await.is_some() {
            let encrypted = self.meta.read().await.as_ref().is_some_and(|m| m.encrypted);
            if !encrypted || self.verify_passphrase(&passphrase).await {
                self.session_locked.store(false, Ordering::SeqCst);
                return Ok(self.wallet_state().await);
            }
            return Err(anyhow!("incorrect passphrase"));
        }
        let config = {
            let guard = self.meta.read().await;
            let meta = guard
                .as_ref()
                .ok_or_else(|| anyhow!("no wallet to unlock"))?;
            self.client_config(
                chain_of(meta.network),
                &meta.indexer_uri,
                WalletConfig::Read,
            )
        };
        let mut client = LightClient::new(
            config,
            false,
            Some(EncryptionConfig::new(passphrase.clone())),
        )
        .await
        .map_err(|e| anyhow!("unlock failed: {e:?}"))?;
        client.save_task().await;
        *self.client.lock().await = Some(client);
        *self.session_passphrase.lock().await = Some(passphrase);
        self.session_locked.store(false, Ordering::SeqCst);
        // Nudge the price loop: if fiat was enabled, it was parked while locked.
        self.price_restart.notify_one();
        self.refresh_snapshot().await;
        self.sync.write().await.state = SyncState::Idle;
        self.generation.fetch_add(1, Ordering::SeqCst);
        Ok(self.wallet_state().await)
    }

    /// Point the running Wallet at a different Indexer (AUZ-47). The candidate is
    /// validated with real `GetLightdInfo`/`GetBlock` calls first (see
    /// [`observe_chain`]): a reachable-but-not-an-indexer endpoint, and one serving a
    /// chain without this Wallet's Anchor (docs/adr/0010), are both rejected before
    /// anything changes. Only then is the gRPC client swapped in place, so the wallet
    /// file is never reopened and in-flight scanned data and the autosave task
    /// survive. The saved value is left untouched on any failure.
    ///
    /// The switch is handed to the running sync loop rather than spawning a second
    /// one: `stop_sync` ends the current round (bound to the old Indexer) and a restart
    /// signal wakes the loop to begin a fresh round against the new Indexer at once.
    /// Keeping a single loop means the sync task is reaped normally, avoiding the stuck
    /// `SyncAlreadyRunning` a second loop would hit.
    async fn set_indexer(&self, indexer_uri: String) -> Result<WalletState> {
        if self.meta.read().await.is_none() {
            return Err(anyhow!("no wallet to set the indexer for"));
        }
        if self.session_locked.load(Ordering::SeqCst) {
            return Err(anyhow!(
                "wallet is locked; unlock before changing the indexer"
            ));
        }
        let uri: http::Uri = indexer_uri
            .parse()
            .map_err(|_| anyhow!("invalid indexer uri"))?;

        // Probe outside the client lock: a fresh connection plus one GetLightdInfo
        // and one GetBlock, so a slow or dead candidate doesn't block reads on the
        // live client. A candidate on a different chain is rejected inline; the
        // current Indexer keeps running.
        let (anchor_height, anchor_hash, scan_target_height) = {
            let guard = self.meta.read().await;
            let meta = guard
                .as_ref()
                .ok_or_else(|| anyhow!("no wallet to set the indexer for"))?;
            (
                meta.anchor_height,
                meta.anchor_hash.clone(),
                meta.scan_target_height,
            )
        };
        let obs = observe_chain(&uri, anchor_hash.as_ref().map(|_| anchor_height)).await?;
        if let ChainVerdict::WrongChain { detail } = chain_verdict(
            anchor_height,
            anchor_hash.as_deref(),
            scan_target_height,
            &obs,
        ) {
            return Err(anyhow!(
                "that server is serving a different chain than this Wallet synced: {detail}."
            ));
        }

        {
            let mut guard = self.client.lock().await;
            let client = guard
                .as_mut()
                .ok_or_else(|| anyhow!("no wallet to set the indexer for"))?;
            client
                .set_indexer_uri(uri)
                .await
                .map_err(|e| anyhow!("could not connect to indexer: {e}"))?;
            // End the in-flight round (it's bound to the old Indexer) so the loop's
            // next round picks up the new one. The same loop reaps the task normally.
            let _ = client.stop_sync();
        }

        // Persist only once the new Indexer connected, so a rejected URI never sticks.
        {
            let mut guard = self.meta.write().await;
            if let Some(meta) = guard.as_mut() {
                meta.indexer_uri = indexer_uri;
                meta.save(&self.scoped_paths().meta_file)?;
            }
        }

        self.set_sync(|s| {
            s.state = SyncState::Syncing;
            s.error = None;
            s.unreachable = false;
            s.wrong_chain = false;
        })
        .await;
        // A switch starts a fresh episode, so a dead or wrong new Indexer notifies too.
        self.unreachable_notified.store(false, Ordering::SeqCst);
        self.wrong_chain_notified.store(false, Ordering::SeqCst);
        // Cut short any idle/backoff wait so the new round starts now.
        self.restart.notify_one();

        Ok(self.wallet_state().await)
    }

    /// Toggle whether transaction and scan-complete toasts fire. The in-memory atomic
    /// gates the hot notify path; the meta flag persists the choice. The
    /// "Indexer unreachable" alert is independent and keeps firing either way.
    async fn set_notifications(&self, enabled: bool) -> Result<WalletState> {
        let mut guard = self.meta.write().await;
        let meta = guard
            .as_mut()
            .ok_or_else(|| anyhow!("no wallet to set notifications for"))?;
        meta.notifications_enabled = enabled;
        meta.save(&self.scoped_paths().meta_file)?;
        drop(guard);
        self.notifications_enabled.store(enabled, Ordering::SeqCst);
        Ok(self.wallet_state().await)
    }

    /// Turn fiat price display on or off. Enabling records the user's consent to the
    /// price egress (docs/adr/0008) and wakes the price loop so the first value lands
    /// promptly; disabling parks the loop, stopping all price requests.
    async fn set_fiat_enabled(&self, enabled: bool) -> Result<WalletState> {
        let mut guard = self.meta.write().await;
        let meta = guard
            .as_mut()
            .ok_or_else(|| anyhow!("no wallet to set fiat display for"))?;
        meta.fiat_enabled = enabled;
        meta.save(&self.scoped_paths().meta_file)?;
        drop(guard);
        self.fiat_enabled.store(enabled, Ordering::SeqCst);
        if enabled {
            self.price_restart.notify_one();
        }
        Ok(self.wallet_state().await)
    }

    /// Turn Discreet mode on or off (docs/adr/0009). The GUI does its own masking off
    /// the returned state; the daemon's side of the deal is redacting notification text.
    async fn set_discreet(&self, enabled: bool) -> Result<WalletState> {
        let mut guard = self.meta.write().await;
        let meta = guard
            .as_mut()
            .ok_or_else(|| anyhow!("no wallet to set discreet mode for"))?;
        meta.discreet = enabled;
        meta.save(&self.scoped_paths().meta_file)?;
        drop(guard);
        self.discreet.store(enabled, Ordering::SeqCst);
        Ok(self.wallet_state().await)
    }

    /// The current reconciled spot, or `None` if nothing has been fetched yet. Stamps
    /// `stale` when the last fetch is older than [`SPOT_STALE_AFTER`] so the GUI can grey it.
    async fn spot_price(&self) -> Option<PriceSpot> {
        let mut spot = self.price_cache.read().await.spot.clone()?;
        let age = now_secs().saturating_sub(spot.fetched_at);
        spot.stale = age > SPOT_STALE_AFTER.as_secs();
        Some(spot)
    }

    /// The full reconciled daily series, oldest first. The GUI clips it to the selected
    /// Span and multiplies each day by the balance held then.
    async fn price_history(&self) -> Vec<PricePoint> {
        self.price_cache
            .read()
            .await
            .daily
            .values()
            .cloned()
            .collect()
    }

    /// Wipe the current Wallet. `keep_session` retains the in-memory passphrase so a
    /// Replace lands in onboarding without re-collecting it; Start over passes false
    /// and the passphrase is dropped (docs/adr/0004).
    async fn remove(&self, keep_session: bool) -> Result<()> {
        self.generation.fetch_add(1, Ordering::SeqCst);
        self.session_locked.store(false, Ordering::SeqCst);
        self.encrypted.store(false, Ordering::SeqCst);
        // Park the price loop; the reconciled prices themselves are public ZEC/USD data,
        // not wallet-specific, so the cache file is kept to avoid re-fetching after Replace.
        self.fiat_enabled.store(false, Ordering::SeqCst);
        self.discreet.store(false, Ordering::SeqCst);
        *self.client.lock().await = None;
        *self.meta.write().await = None;
        if !keep_session {
            *self.session_passphrase.lock().await = None;
        }
        *self.sync.write().await = SyncStatus::default();
        self.txs.write().await.clear();
        *self.balance.write().await = None;
        self.addresses.write().await.clear();
        self.notes.write().await.clear();
        self.notify.reset();
        let scoped = self.scoped_paths();
        let _ = std::fs::remove_file(&scoped.meta_file);
        let _ = std::fs::remove_dir_all(&scoped.wallet_dir);
        // Drop the wallets/<id> directory when empty-ish, and clear active pointer.
        if let Some(id) = self.paths.read_active_id().ok().flatten() {
            let wallet_root = self.paths.wallets_dir.join(&id);
            let _ = std::fs::remove_dir_all(&wallet_root);
            let _ = std::fs::remove_file(&self.paths.active_id_file);
        }
        self.paths.ensure_dirs()?;
        Ok(())
    }

    /// Re-authenticate a passphrase against the held session passphrase, the one
    /// that opened the current Wallet. Used by the Replace modal before it wipes
    /// anything (docs/adr/0004). False when nothing is held.
    async fn verify_passphrase(&self, passphrase: &str) -> bool {
        match &*self.session_passphrase.lock().await {
            Some(held) => ct_eq(held.as_bytes(), passphrase.as_bytes()),
            None => false,
        }
    }

    /// Arm the GUI session lock without disturbing the open wallet. Sign Out calls
    /// this: the client and sync loop keep running so notifications survive, but the
    /// next GUI session must re-authenticate before any wallet read.
    fn lock_session(&self) {
        self.session_locked.store(true, Ordering::SeqCst);
    }

    /// Whether the GUI session is locked. Read by the IPC layer to gate pushed events.
    pub fn session_locked(&self) -> bool {
        self.session_locked.load(Ordering::SeqCst)
    }

    /// A GUI event subscriber connected.
    pub fn subscriber_joined(&self) {
        self.subscribers.fetch_add(1, Ordering::SeqCst);
    }

    /// A GUI event subscriber disconnected. When the last one leaves, an encrypted
    /// wallet re-arms the session lock so the next GUI session re-authenticates. The
    /// wallet stays open and syncing. Plaintext wallets hold no passphrase, so they
    /// don't relock.
    pub fn subscriber_left(&self) {
        if self.subscribers.fetch_sub(1, Ordering::SeqCst) == 1
            && self.encrypted.load(Ordering::SeqCst)
        {
            self.session_locked.store(true, Ordering::SeqCst);
        }
    }

    fn spawn_sync_loop(self: &Arc<Self>) {
        let service = Arc::clone(self);
        let generation = service.generation.load(Ordering::SeqCst);
        tokio::spawn(async move { service.run_sync_loop(generation).await });
    }

    /// One long-lived task per daemon. It parks while fiat is off or no wallet is loaded,
    /// so nothing is fetched without the user's consent, and wakes to refresh the spot on
    /// [`SPOT_INTERVAL`] once enabled. The daily series is fetched at most once per UTC day.
    fn spawn_price_loop(self: &Arc<Self>) {
        let service = Arc::clone(self);
        tokio::spawn(async move { service.run_price_loop().await });
    }

    async fn run_price_loop(self: Arc<Self>) {
        let fetcher = match PriceFetcher::new() {
            Ok(f) => f,
            Err(e) => {
                tracing::warn!("price fetcher unavailable, fiat display disabled: {e}");
                return;
            }
        };
        let mut last_daily: Option<String> = None;
        loop {
            // No price egress while the session is locked: there's no fiat UI to feed, and
            // the wallet should stay quiet to the price providers until the GUI is unlocked.
            let active = self.fiat_enabled.load(Ordering::SeqCst)
                && !self.session_locked.load(Ordering::SeqCst)
                && self.meta.read().await.is_some();
            if !active {
                tokio::select! {
                    _ = self.price_restart.notified() => {}
                    _ = tokio::time::sleep(SPOT_INTERVAL) => {}
                }
                continue;
            }

            self.refresh_spot(&fetcher).await;
            let today = today();
            if last_daily.as_deref() != Some(today.as_str()) && self.refresh_daily(&fetcher).await {
                last_daily = Some(today);
            }

            tokio::select! {
                _ = tokio::time::sleep(SPOT_INTERVAL) => {}
                _ = self.price_restart.notified() => {}
            }
        }
    }

    async fn refresh_spot(&self, fetcher: &PriceFetcher) {
        match fetcher.spot().await {
            Ok(spot) => {
                {
                    let mut cache = self.price_cache.write().await;
                    cache.spot = Some(spot.clone());
                    if let Err(e) = cache.save(&self.paths.price_cache_file) {
                        tracing::warn!("persisting price cache failed: {e}");
                    }
                }
                let _ = self.events.send(SyncEvent::PriceUpdate { spot });
            }
            Err(e) => tracing::warn!("spot refresh failed, keeping last known: {e}"),
        }
    }

    /// Merge freshly fetched daily marks into the cache, keeping existing days immutable.
    /// Returns whether anything came back, so a failed fetch retries next tick rather than
    /// marking the day done.
    async fn refresh_daily(&self, fetcher: &PriceFetcher) -> bool {
        // Once the deep history is cached, fetch only from the newest cached day forward, so
        // the daily refresh stops re-paging Coinbase back to 2020 every day (docs/adr/0008).
        let since = self.price_cache.read().await.daily_since();
        let fresh = fetcher.daily(since.as_deref()).await;
        if fresh.is_empty() {
            return false;
        }
        let mut cache = self.price_cache.write().await;
        for (date, point) in fresh {
            cache.daily.entry(date).or_insert(point);
        }
        if let Err(e) = cache.save(&self.paths.price_cache_file) {
            tracing::warn!("persisting price cache failed: {e}");
        }
        true
    }

    async fn run_sync_loop(self: Arc<Self>, generation: u64) {
        let mut backoff = BACKOFF_MIN;
        loop {
            if self.generation.load(Ordering::SeqCst) != generation {
                tracing::debug!("sync loop {generation} retiring");
                return;
            }
            match self.sync_round(generation).await {
                Ok(()) => {
                    backoff = BACKOFF_MIN;
                    // A round got through, so the episode (if any) is over: a later one notifies again.
                    self.unreachable_notified.store(false, Ordering::SeqCst);
                    self.wrong_chain_notified.store(false, Ordering::SeqCst);
                    self.adopt_anchor_if_missing().await;
                    // A restart signal (e.g. an Indexer change) cuts the idle wait short.
                    tokio::select! {
                        _ = tokio::time::sleep(IDLE_INTERVAL) => {}
                        _ = self.restart.notified() => {}
                    }
                }
                Err(e) => {
                    tracing::warn!(
                        "sync round failed: {}; unreachable={}; wrong_chain={}; backing off {backoff:?}",
                        e.message,
                        e.unreachable,
                        e.wrong_chain,
                    );
                    self.note_round_failure(e).await;
                    // A restart signal cuts the backoff short and resets it, so switching
                    // to a working Indexer recovers at once instead of after the backoff.
                    tokio::select! {
                        _ = tokio::time::sleep(backoff) => {
                            backoff = (backoff * 2).min(BACKOFF_MAX);
                        }
                        _ = self.restart.notified() => {
                            backoff = BACKOFF_MIN;
                        }
                    }
                }
            }
        }
    }

    /// Publish a failed round to the status snapshot, the event stream, and (for the
    /// actionable causes) a desktop notification. Each cause notifies once per
    /// episode; recovery, an Indexer change, or a fresh loop re-arms it. Both alerts
    /// bypass `notifications_enabled`: that gate covers movement toasts, and a wallet
    /// that has silently stopped syncing is worse than an unwanted notification.
    async fn note_round_failure(&self, err: RoundError) {
        let RoundError {
            message,
            unreachable,
            wrong_chain,
        } = err;
        self.set_sync(|s| {
            s.state = SyncState::Error;
            s.error = Some(message.clone());
            s.unreachable = unreachable;
            s.wrong_chain = wrong_chain;
        })
        .await;
        let _ = self.events.send(SyncEvent::Error {
            message,
            unreachable,
            wrong_chain,
        });
        if unreachable && !self.unreachable_notified.swap(true, Ordering::SeqCst) {
            let host = self
                .meta
                .read()
                .await
                .as_ref()
                .and_then(|m| m.indexer_uri.parse::<http::Uri>().ok())
                .and_then(|u| u.host().map(str::to_owned));
            let body = format!(
                "Pendrake can't reach {}. Open to choose another server.",
                host.as_deref().unwrap_or("your Indexer"),
            );
            let _ = self.notifier.notify(
                "Can't reach your Indexer",
                &body,
                "pendrake://settings/indexer",
            );
        }
        if wrong_chain && !self.wrong_chain_notified.swap(true, Ordering::SeqCst) {
            let _ = self.notifier.notify(
                "Wrong chain detected",
                "Your Indexer is serving a different chain than this Wallet synced. Open to review.",
                "pendrake://settings/indexer",
            );
        }
    }

    /// The pre-round identity check (docs/adr/0010): ask the Indexer for its tip and
    /// the block at the Wallet's anchor height, and refuse the round on a mismatch.
    /// A server that doesn't answer is an outage, never a chain verdict.
    async fn verify_chain_identity(&self) -> Result<(), RoundError> {
        let (indexer_uri, anchor_height, anchor_hash, scan_target_height) = {
            let guard = self.meta.read().await;
            let meta = guard.as_ref().ok_or_else(|| anyhow!("no wallet"))?;
            (
                meta.indexer_uri.clone(),
                meta.anchor_height,
                meta.anchor_hash.clone(),
                meta.scan_target_height,
            )
        };
        let uri: http::Uri = indexer_uri
            .parse()
            .map_err(|_| anyhow!("invalid indexer uri"))?;
        let obs = observe_chain(&uri, anchor_hash.as_ref().map(|_| anchor_height))
            .await
            .map_err(|e| RoundError {
                message: e.to_string(),
                unreachable: true,
                wrong_chain: false,
            })?;
        match chain_verdict(
            anchor_height,
            anchor_hash.as_deref(),
            scan_target_height,
            &obs,
        ) {
            ChainVerdict::WrongChain { detail } => Err(RoundError {
                message: format!(
                    "your Indexer is serving a different chain than this Wallet synced: {detail}"
                ),
                unreachable: false,
                wrong_chain: true,
            }),
            ChainVerdict::Match | ChainVerdict::Unanchored => Ok(()),
        }
    }

    /// TOFU for a wallet imported before Anchors existed (docs/adr/0010): after a
    /// good round, record the chain it just synced against as the one to hold to.
    /// Every failure just retries on a later round; adoption never fails the loop.
    async fn adopt_anchor_if_missing(&self) {
        let (uri, birthday) = {
            let guard = self.meta.read().await;
            let Some(meta) = guard.as_ref() else { return };
            if meta.anchor_hash.is_some() {
                return;
            }
            (meta.indexer_uri.clone(), meta.birthday_height)
        };
        let Ok(uri) = uri.parse::<http::Uri>() else {
            return;
        };
        let tip = match indexer_tip(&uri).await {
            Ok(tip) => tip,
            Err(e) => {
                tracing::debug!("anchor adoption skipped: {e}");
                return;
            }
        };
        let height = birthday.min(tip).max(1);
        let hash = match fetch_block_hash(&uri, height).await {
            Ok(Some(hash)) => hash,
            Ok(None) => {
                tracing::debug!("anchor adoption skipped: no block at {height}");
                return;
            }
            Err(e) => {
                tracing::debug!("anchor adoption skipped: {e}");
                return;
            }
        };
        // Re-check under the write lock: an import may have raced in its own anchor.
        let mut guard = self.meta.write().await;
        if let Some(meta) = guard.as_mut() {
            if meta.anchor_hash.is_none() {
                meta.anchor_height = height;
                meta.anchor_hash = Some(hash);
                if let Err(e) = meta.save(&self.paths.meta_file) {
                    tracing::warn!("could not persist the adopted anchor: {e}");
                }
                tracing::info!("adopted chain anchor at height {height}");
            }
        }
    }

    async fn sync_round(&self, generation: u64) -> Result<(), RoundError> {
        self.set_sync(|s| {
            s.state = SyncState::Syncing;
            s.error = None;
            s.unreachable = false;
            s.wrong_chain = false;
        })
        .await;

        // Refuse the round before the wallet is touched if the Indexer is on a
        // different chain (docs/adr/0010). Aborting here never takes the client
        // lock, so the wallet file stays frozen and unlock stays responsive.
        self.verify_chain_identity().await?;

        // Subscribe before kicking the sync task off so the SessionStarted event,
        // which carries the progress denominator, is never missed.
        let mut events = {
            let mut guard = self.client.lock().await;
            let client = guard.as_mut().ok_or_else(|| anyhow!("no wallet"))?;
            let rx = client.subscribe_sync_events();
            client
                .sync()
                .await
                .map_err(|e| anyhow!("sync start failed: {e:?}"))?;
            rx
        };

        let mut view = RoundView::default();
        let mut poll = tokio::time::interval(POLL_INTERVAL);
        poll.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
        let mut flush = tokio::time::interval(PROGRESS_FLUSH);
        flush.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
        let mut dirty = false;
        let mut stream_open = true;

        let result = loop {
            // A (re)import or remove bumps the generation, retiring this round.
            if self.generation.load(Ordering::SeqCst) != generation {
                return Ok(());
            }

            tokio::select! {
                event = events.recv(), if stream_open => match event {
                    Ok(event) => {
                        self.on_event(event, &mut view).await;
                        dirty = true;
                    }
                    Err(RecvError::Lagged(_)) => {
                        self.reconcile(&mut view).await;
                        dirty = true;
                    }
                    // The sender drops when the sync task ends, and the poll arm
                    // then collects the result.
                    Err(RecvError::Closed) => stream_open = false,
                },

                // Coalesce the firehose of batch events into one snapshot per tick.
                _ = flush.tick() => {
                    if dirty {
                        self.publish_progress(&view).await;
                        dirty = false;
                    }
                }

                _ = poll.tick() => {
                    let report = {
                        let mut guard = self.client.lock().await;
                        match guard.as_mut() {
                            Some(client) => client.poll_sync(),
                            None => return Ok(()),
                        }
                    };
                    match report {
                        PollReport::NotReady => {}
                        PollReport::NoHandle => return Err(anyhow!("sync task missing").into()),
                        PollReport::Ready(res) => match res {
                            Ok(result) => break result,
                            Err(e) => {
                                // Mid-round failures are transport or scan trouble;
                                // chain identity was already verified this round.
                                return Err(RoundError {
                                    message: format!("sync error: {e}"),
                                    unreachable: is_unreachable(&e),
                                    wrong_chain: false,
                                })
                            }
                        },
                    }
                }
            }
        };

        let status = self.finalize(u32::from(result.sync_end_height)).await;
        // The round is done, so the wallet lock is free: rebuild the cache before
        // the GUI reacts to `Finished` and refetches.
        self.refresh_snapshot().await;
        let _ = self.events.send(SyncEvent::Finished { status });
        Ok(())
    }

    /// Fold one library event into the round view. Batch lifecycle events move the
    /// active list along. A committed range also emits a `BatchDone`, and a
    /// discovered transaction is looked up and forwarded. The coalesced `Progress`
    /// snapshot is pushed by the flush ticker, not here.
    async fn on_event(&self, event: SequencedSyncEvent, view: &mut RoundView) {
        match event.event {
            LibSyncEvent::SessionStarted {
                sync_start_height,
                tip,
                total_sapling_outputs,
                total_orchard_outputs,
                total_ironwood_outputs,
                already_scanned_sapling_outputs,
                already_scanned_orchard_outputs,
                already_scanned_ironwood_outputs,
                ..
            } => {
                view.total_outputs = u64::from(
                    total_sapling_outputs + total_orchard_outputs + total_ironwood_outputs,
                );
                view.scanned_outputs = u64::from(
                    already_scanned_sapling_outputs
                        + already_scanned_orchard_outputs
                        + already_scanned_ironwood_outputs,
                );
                view.synced_height = u32::from(sync_start_height);
                view.chain_tip = u32::from(tip);
                // Arm the live edge from the round's true start, before any tip-first
                // batch can push synced_height past N. The crossing then fires only
                // when the scan reaches the tip at finalize, not mid-round.
                let target = self.scan_target().await;
                self.notify.seed_live(u32::from(sync_start_height), target);
                view.in_flight.clear();
                view.timing_log.clear();
                view.aggregate_log.clear();
                view.aggregate_log
                    .push_back((Instant::now(), view.scanned_outputs));
            }
            LibSyncEvent::BatchScanStarted {
                range,
                priority,
                sapling_outputs,
                orchard_outputs,
                ironwood_outputs,
            } => {
                let range = height_range(&range);
                view.in_flight.retain(|b| b.range != range);
                view.in_flight.push(Batch {
                    range,
                    priority: format!("{priority:?}"),
                    outputs: u64::from(sapling_outputs + orchard_outputs + ironwood_outputs),
                    phase: BatchPhase::Scanning,
                    phase_since: Instant::now(),
                    phase_started_ms: now_ms(),
                    waited: Duration::ZERO,
                });
            }
            LibSyncEvent::BatchScanCompleted { range } => {
                if let Some(batch) = view.live_batch(&height_range(&range)) {
                    batch.phase = BatchPhase::Waiting;
                    batch.phase_since = Instant::now();
                    batch.phase_started_ms = now_ms();
                }
            }
            LibSyncEvent::BatchCommitStarted { range } => {
                if let Some(batch) = view.live_batch(&height_range(&range)) {
                    batch.waited = batch.phase_since.elapsed();
                    batch.phase = BatchPhase::Committing;
                    batch.phase_since = Instant::now();
                    batch.phase_started_ms = now_ms();
                }
            }
            LibSyncEvent::RangeScanned {
                range,
                priority,
                sapling_outputs,
                orchard_outputs,
                ironwood_outputs,
                timing,
            } => {
                let range = height_range(&range);
                let outputs = u64::from(sapling_outputs + orchard_outputs + ironwood_outputs);
                view.scanned_outputs += outputs;
                view.synced_height = view.synced_height.max(range.end);
                view.timing_log.push_back((outputs, timing));
                if view.timing_log.len() > TIMING_WINDOW {
                    view.timing_log.pop_front();
                }
                view.aggregate_log
                    .push_back((Instant::now(), view.scanned_outputs));
                if view.aggregate_log.len() > TIMING_WINDOW {
                    view.aggregate_log.pop_front();
                }

                let waited = match view.live_batch(&range) {
                    Some(b) if matches!(b.phase, BatchPhase::Committing) => b.waited,
                    Some(b) if matches!(b.phase, BatchPhase::Waiting) => b.phase_since.elapsed(),
                    _ => Duration::ZERO,
                };
                view.in_flight.retain(|b| b.range != range);
                let _ = self.events.send(SyncEvent::BatchDone {
                    batch: BatchSummary {
                        id: range_id(&range),
                        start: range.start,
                        end: range.end,
                        priority: format!("{priority:?}"),
                        outputs,
                        timing: to_batch_timing(&timing, waited),
                    },
                });
            }
            LibSyncEvent::TxDiscovered { txid, .. } => self.on_tx_discovered(txid).await,
            LibSyncEvent::Reorg { reverted_to } => {
                // A reverted batch never commits, so drop any unpaired starts.
                view.in_flight.clear();
                view.synced_height = view.synced_height.min(u32::from(reverted_to));
            }
            LibSyncEvent::TipMoved { to } => {
                view.chain_tip = view.chain_tip.max(u32::from(to));
            }
        }
    }

    /// Look up a freshly discovered transaction, push it to the GUI, and notify
    /// the user the first time it is seen. The persisted seen-set keeps a later
    /// round or a restart from re-notifying the same txid.
    async fn on_tx_discovered(&self, txid: TxId) {
        // Fetch the summary and refreshed balance under one client lock. Funds
        // changed, so the cached balance is updated alongside.
        let (summary, bal) = {
            let guard = self.client.lock().await;
            let Some(client) = guard.as_ref() else { return };
            let summary = client.transaction_summary(txid).await.ok().flatten();
            let bal = client.account_balance(AccountId::ZERO).await.ok();
            (summary, bal)
        };
        if let Some(bal) = bal {
            *self.balance.write().await = Some(map_balance(&bal));
        }
        // The event is a hint. If the summary hasn't committed yet, a later event
        // or the GUI's own refetch picks it up.
        let Some(summary) = summary else { return };

        self.on_tx_summary(txid, &summary).await;
    }

    /// Handle an already-fetched summary: kind detection, cache upsert, event
    /// broadcast, and the per-transaction toast. Split from `on_tx_discovered` so the
    /// field extraction and downstream wiring run without a live client (the caller
    /// owns fetching the summary and refreshing the balance).
    async fn on_tx_summary(&self, txid: TxId, summary: &TransactionSummary) {
        let txid = txid.to_string();
        let received = matches!(summary.kind, TransactionKind::Received);
        let kind = if received {
            TxKind::Received
        } else {
            TxKind::Sent
        };

        // Upsert into the cache so this tx's detail view resolves instantly, even
        // mid-first-sync before any snapshot refresh has run.
        {
            // A single live summary can't see which earlier notes this tx spent (that
            // needs the full set), so the exact gained − lost isn't available yet. Use
            // the fork's own per-tx delta as the interim: it keeps sends negative, so the
            // chart's backward reconstruction doesn't collapse the early history to zero
            // mid-scan the way a gained-only delta would. refresh_snapshot recomputes the
            // exact value (gained − lost, which also credits self-authored income) at the
            // end of the round. Falls back to gained-only when the fee is unknown.
            let mut tx = map_tx(summary, &HashMap::new());
            if let Some(delta) = summary.balance_delta() {
                tx.net_zat = delta.to_string();
            }
            let mut txs = self.txs.write().await;
            match txs.iter_mut().find(|t| t.txid == txid) {
                Some(slot) => *slot = tx,
                None => txs.insert(0, tx),
            }
        }

        let _ = self.events.send(SyncEvent::Transaction {
            txid: txid.clone(),
            kind,
            value_zat: summary.value.to_string(),
            received,
        });

        self.notify_tx(
            &txid,
            received,
            summary.value,
            summary.status.is_confirmed(),
            u32::from(summary.blockheight),
        )
        .await;
    }

    /// Decide and deliver the per-transaction toast (ADR-0006). Split from
    /// `on_tx_discovered` so the policy and delivery run without a live client (the
    /// caller owns fetching the summary). `height` is unused for an unconfirmed
    /// transaction, which always counts as live.
    ///
    /// A transaction inside the pinned Initial-scan range [birthday, N] is historical
    /// and stays silent; one at or past N, or still in the mempool, is post-import
    /// activity and notifies. Gating on the transaction's own height rather than
    /// `synced_height` is robust to pepper-sync's tip-first scan, which pushes
    /// `synced_height` past N before the older blocks are walked, so a stale
    /// transaction found after the jump would otherwise notify.
    async fn notify_tx(&self, txid: &str, received: bool, value: u64, confirmed: bool, height: u32) {
        let target = self.scan_target().await;
        let live = if confirmed { height >= target } else { true };
        if let Disposition::Notify = self.notify.classify(txid, live) {
            // Notifications off: record the txid as seen so re-enabling later doesn't
            // replay it as new, then deliver nothing.
            if !self.notifications_enabled.load(Ordering::SeqCst) {
                self.notify.mark_notified(txid);
                return;
            }
            // Discreet mode redacts the text (docs/adr/0009): a notification pops over
            // whatever is on screen, so it carries neither amount nor direction. The
            // deep link and delivery flow are unchanged.
            let (title, body) = if self.discreet.load(Ordering::SeqCst) {
                (
                    "New transaction detected",
                    "Open Pendrake to view details.".to_string(),
                )
            } else {
                let amount = format_amount(value);
                if received {
                    ("Funds received", format!("{amount} arrived in your wallet."))
                } else {
                    ("Funds sent", format!("{amount} sent from your wallet."))
                }
            };
            tracing::info!("new tx {txid} ({value} zat, received={received}), notifying");
            // Record the txid as notified only after delivery succeeds. A failure leaves
            // it out of the set, so a later rediscovery (at the latest, the next restart's
            // catch-up sync) tries again rather than losing it.
            match self
                .notifier
                .notify(title, &body, &format!("pendrake://tx?txid={txid}"))
            {
                Ok(()) => self.notify.mark_notified(txid),
                Err(e) => {
                    tracing::warn!("notification for {txid} failed, will retry on rediscovery: {e}")
                }
            }
        }
    }

    /// On a lagged stream, rebuild the scanned count from wallet state and reset
    /// the throughput windows, since the skipped batches left no samples.
    async fn reconcile(&self, view: &mut RoundView) {
        let guard = self.client.lock().await;
        if let Some(client) = guard.as_ref() {
            let wallet = client.wallet().read().await;
            if let Ok(status) = pepper_sync::sync_status(&*wallet).await {
                view.scanned_outputs = u64::from(
                    status.total_sapling_outputs_scanned
                        + status.total_orchard_outputs_scanned
                        + status.total_ironwood_outputs_scanned,
                );
                view.timing_log.clear();
                view.aggregate_log.clear();
                view.aggregate_log
                    .push_back((Instant::now(), view.scanned_outputs));
            }
        }
    }

    /// Write the overall tally into the shared status and push it with the active
    /// batch list, preserving `last_synced_at` from the previous round.
    async fn publish_progress(&self, view: &RoundView) {
        let status = {
            let mut guard = self.sync.write().await;
            let next = view.status(SyncState::Syncing);
            guard.state = next.state;
            guard.synced_height = next.synced_height;
            guard.chain_tip = next.chain_tip;
            guard.percent = next.percent;
            guard.phase = next.phase;
            guard.scanned_outputs = next.scanned_outputs;
            guard.total_outputs = next.total_outputs;
            guard.eta_seconds = next.eta_seconds;
            guard.error = None;
            guard.unreachable = false;
            guard.clone()
        };
        let _ = self.events.send(SyncEvent::Progress {
            status,
            batches: view.batch_snapshot(),
        });
    }

    /// Mark the round complete at the chain tip, preserving `last_synced_at`.
    async fn finalize(&self, synced_height: u32) -> SyncStatus {
        let status = {
            let mut guard = self.sync.write().await;
            guard.state = SyncState::Idle;
            guard.synced_height = synced_height;
            guard.chain_tip = guard.chain_tip.max(synced_height);
            guard.percent = 100;
            guard.phase = None;
            guard.eta_seconds = None;
            guard.error = None;
            guard.unreachable = false;
            guard.last_synced_at = Some(now_secs());
            guard.clone()
        };
        self.announce_scan_complete(synced_height).await;
        status
    }

    /// The import-pinned Initial-scan boundary N (ADR-0006). A legacy wallet predating
    /// the pin has no target, so N = 0 and the wallet reads as always live.
    async fn scan_target(&self) -> u32 {
        self.meta
            .read()
            .await
            .as_ref()
            .map_or(0, |m| m.scan_target_height)
    }

    /// Emit the one-time "scan finished" toast. Called at the end of a round with the
    /// height the scan actually reached, after [`NotificationPolicy::seed_live`] armed
    /// the edge at round start. Driving it off the seeded start and the true end height
    /// keeps a tip-first scan that races `synced_height` past N mid-round from firing
    /// early. A wallet that began at or past N was seeded live and never fires.
    async fn announce_scan_complete(&self, synced_height: u32) {
        let target = self.scan_target().await;
        // Advance the live edge regardless, so the crossing only ever fires once even
        // if notifications were off when the scan finished.
        if self.notify.crossed_to_live(synced_height, target)
            && self.notifications_enabled.load(Ordering::SeqCst)
        {
            let _ = self.notifier.notify(
                "Wallet ready",
                "Pendrake finished scanning. You'll be notified of new activity.",
                "pendrake://wallet",
            );
        }
    }

    async fn set_sync(&self, f: impl FnOnce(&mut SyncStatus)) {
        let mut guard = self.sync.write().await;
        f(&mut guard);
    }
}

fn wallet_settings() -> WalletSettings {
    WalletSettings {
        sync_config: SyncConfig {
            transparent_address_discovery: TransparentAddressDiscovery::minimal(),
            performance_level: PerformanceLevel::Medium,
            ..SyncConfig::default()
        },
        min_confirmations: std::num::NonZeroU32::new(1).unwrap(),
    }
}

fn height_range(range: &Range<BlockHeight>) -> Range<u32> {
    u32::from(range.start)..u32::from(range.end)
}

fn range_id(range: &Range<u32>) -> String {
    format!("{}-{}", range.start, range.end)
}

fn now_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn to_batch_timing(timing: &ScanTiming, waited: Duration) -> BatchTiming {
    let commit = &timing.commit;
    BatchTiming {
        total_secs: (waited + timing.total()).as_secs_f64(),
        wait_secs: waited.as_secs_f64(),
        fetch_secs: timing.fetch.as_secs_f64(),
        decryption_secs: timing.decryption.as_secs_f64(),
        tree_secs: timing.tree.as_secs_f64(),
        commit_secs: commit.total().as_secs_f64(),
        commit: CommitBreakdown {
            checkpoints: commit.checkpoints.as_secs_f64(),
            frontiers: commit.frontiers.as_secs_f64(),
            insert_tree: commit.insert_tree.as_secs_f64(),
            spend_fetch: commit.spend_fetch.as_secs_f64(),
            spend_cpu: commit.spend_cpu.as_secs_f64(),
            cleanup: commit.cleanup.as_secs_f64(),
            other: commit.other.as_secs_f64(),
        },
    }
}

/// A user-facing amount. ZEC reads naturally for most values, but sub-0.001 ZEC
/// dust turns into a wall of leading zeros, so those show as plain zatoshis.
fn format_amount(zat: u64) -> String {
    const DUST: u64 = 100_000; // 0.001 ZEC
    if zat != 0 && zat < DUST {
        format!("{zat} zatoshis")
    } else {
        format!("{} ZEC", format_zec(zat))
    }
}

fn format_zec(zat: u64) -> String {
    let whole = zat / 100_000_000;
    let frac = zat % 100_000_000;
    if frac == 0 {
        whole.to_string()
    } else {
        format!("{whole}.{frac:08}")
            .trim_end_matches('0')
            .to_string()
    }
}

/// Fold the decoder's `Result` into the wire verdict the GUI renders inline. A
/// testnet or malformed key is an `ok` result tagged by `kind`, not a daemon error.
fn parse_ufvk_result(input: &str) -> ParseUfvkResult {
    match parse_ufvk(input) {
        Ok(identity) => ParseUfvkResult::Valid(identity),
        Err(UfvkError::Testnet) => ParseUfvkResult::Testnet,
        Err(UfvkError::Malformed(reason)) => ParseUfvkResult::Malformed { reason },
    }
}

fn chain_of(network: Network) -> ChainType {
    match network {
        Network::Mainnet => ChainType::Mainnet,
        Network::Regtest => ChainType::Regtest(ActivationHeights::default()),
    }
}

fn now_secs() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

/// Constant-time byte comparison, so re-auth doesn't leak the passphrase through
/// early-exit timing. Differing lengths short-circuit, which only reveals length.
fn ct_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    a.iter().zip(b).fold(0u8, |acc, (x, y)| acc | (x ^ y)) == 0
}

fn pool_balance(confirmed: Option<Zatoshis>, total: Option<Zatoshis>) -> Option<PoolBalance> {
    match (confirmed, total) {
        (None, None) => None,
        _ => Some(PoolBalance {
            confirmed: confirmed.map(Zatoshis::into_u64).unwrap_or(0).to_string(),
            total: total.map(Zatoshis::into_u64).unwrap_or(0).to_string(),
        }),
    }
}

/// Attribute every confirmed-spent received note (across all summaries) to the
/// transaction that spent it, keyed by spending txid. `map_tx` subtracts a
/// transaction's entry here from the value it gained to get the true net balance delta.
fn spent_value_by_tx(summaries: &TransactionSummaries) -> HashMap<String, u64> {
    let mut spent_by: HashMap<String, u64> = HashMap::new();
    for s in summaries.iter() {
        let outputs = s
            .ironwood_notes
            .iter()
            .map(|n| (n.spend_status, n.value))
            .chain(s.orchard_notes.iter().map(|n| (n.spend_status, n.value)))
            .chain(s.sapling_notes.iter().map(|n| (n.spend_status, n.value)))
            .chain(s.transparent_coins.iter().map(|c| (c.spend_summary, c.value)));
        for (status, value) in outputs {
            if let SpendStatus::Spent(txid) = status {
                *spent_by.entry(txid.to_string()).or_insert(0) += value;
            }
        }
    }
    spent_by
}

fn map_tx(s: &TransactionSummary, spent_by: &HashMap<String, u64>) -> Tx {
    let confirmed = s.status.is_confirmed();
    // The net change to the wallet's balance: the value of the notes this transaction
    // creates for the wallet, minus the value of the notes it spends. Unlike `value`
    // (a display amount that nets self-transfers to ~the fee), this credits income that
    // first enters through a wallet-authored output — coinbase to self, or funds
    // shielded from an unscanned transparent input — so the reconstructed history sums
    // to the balance. Spent inputs come from each received note's spend-status,
    // attributed by `spent_by` to the transaction that spent them.
    let gained: u64 = s
        .ironwood_notes
        .iter()
        .map(|n| n.value)
        .chain(s.orchard_notes.iter().map(|n| n.value))
        .chain(s.sapling_notes.iter().map(|n| n.value))
        .chain(s.transparent_coins.iter().map(|c| c.value))
        .sum();
    let lost = spent_by.get(&s.txid.to_string()).copied().unwrap_or(0);
    let net = gained as i64 - lost as i64;
    Tx {
        txid: s.txid.to_string(),
        datetime: s.datetime as u64,
        block_height: confirmed.then(|| u32::from(s.blockheight)),
        kind: match s.kind {
            TransactionKind::Received => TxKind::Received,
            TransactionKind::Sent(_) => TxKind::Sent,
        },
        value_zat: s.value.to_string(),
        net_zat: net.to_string(),
        status: if confirmed {
            TxStatus::Confirmed
        } else {
            TxStatus::Pending
        },
        notes: map_notes(s),
    }
}

/// Treat a memo that is absent or blank as no memo, so the GUI's has-memo
/// indicator and detail view never trip on an empty Note. The original text is
/// kept intact when present, since real memos can be large formatted blocks.
fn clean_memo(memo: &Option<String>) -> Option<String> {
    memo.as_deref()
        .filter(|m| !m.trim().is_empty())
        .map(str::to_owned)
}

/// Flatten a transaction's shielded notes and transparent coins into one list the
/// GUI groups by direction. zingolib exposes memos per Note (not per transaction)
/// across four shielded vectors; transparent coins carry value but no memo. Sent
/// outputs keep their recipient address, preferring the unified address the user
/// sent to over the per-pool receiver.
fn map_notes(s: &TransactionSummary) -> Vec<Note> {
    let mut notes = Vec::new();

    for (pool, vec) in [
        (Pool::Ironwood, &s.ironwood_notes),
        (Pool::Orchard, &s.orchard_notes),
        (Pool::Sapling, &s.sapling_notes),
    ] {
        for n in vec {
            notes.push(Note {
                pool,
                direction: NoteDirection::Received,
                output_index: n.output_index,
                value_zat: n.value.to_string(),
                memo: clean_memo(&n.memo),
                recipient: None,
            });
        }
    }
    for c in &s.transparent_coins {
        notes.push(Note {
            pool: Pool::Transparent,
            direction: NoteDirection::Received,
            output_index: c.output_index,
            value_zat: c.value.to_string(),
            memo: None,
            recipient: None,
        });
    }

    for (pool, vec) in [
        (Pool::Ironwood, &s.outgoing_ironwood_notes),
        (Pool::Orchard, &s.outgoing_orchard_notes),
        (Pool::Sapling, &s.outgoing_sapling_notes),
    ] {
        for n in vec {
            notes.push(Note {
                pool,
                direction: NoteDirection::Sent,
                output_index: n.output_index,
                value_zat: n.value.to_string(),
                memo: clean_memo(&n.memo),
                recipient: Some(
                    n.recipient_unified_address
                        .clone()
                        .unwrap_or_else(|| n.recipient.clone()),
                ),
            });
        }
    }
    for c in &s.outgoing_transparent_coins {
        notes.push(Note {
            pool: Pool::Transparent,
            direction: NoteDirection::Sent,
            output_index: c.output_index,
            value_zat: c.value.to_string(),
            memo: None,
            recipient: Some(c.recipient.clone()),
        });
    }

    notes
}

/// The transaction that consumes a note, across every stage of a spend (proposed,
/// transmitted, in the mempool, or confirmed). `None` for an unspent note.
fn spending_txid(status: SpendStatus) -> Option<TxId> {
    match status {
        SpendStatus::Unspent => None,
        SpendStatus::CalculatedSpent(txid)
        | SpendStatus::TransmittedSpent(txid)
        | SpendStatus::MempoolSpent(txid)
        | SpendStatus::Spent(txid) => Some(txid),
    }
}

#[allow(clippy::too_many_arguments)]
fn map_wallet_note(
    idx: u32,
    pool: Pool,
    value: u64,
    confirmed: bool,
    height: u32,
    spend_status: SpendStatus,
    txid: &TxId,
    change: bool,
    heights: &HashMap<String, u32>,
) -> WalletNote {
    // A note in an unconfirmed transaction reads as pending whatever its spend
    // state. Only a confirmed note is either spent or spendable.
    let status = if !confirmed {
        NoteStatus::Pending
    } else if matches!(spend_status, SpendStatus::Unspent) {
        NoteStatus::Unspent
    } else {
        NoteStatus::Spent
    };
    let spent_height =
        spending_txid(spend_status).and_then(|spender| heights.get(&spender.to_string()).copied());
    WalletNote {
        idx,
        pool,
        value_zat: value.to_string(),
        status,
        height: confirmed.then_some(height),
        txid: txid.to_string(),
        change,
        spent_height,
    }
}

fn map_balance(bal: &AccountBalance) -> Balance {
    Balance {
        orchard: pool_balance(bal.confirmed_orchard_balance, bal.total_orchard_balance),
        sapling: pool_balance(bal.confirmed_sapling_balance, bal.total_sapling_balance),
        transparent: pool_balance(
            bal.confirmed_transparent_balance,
            bal.total_transparent_balance,
        ),
        ironwood: pool_balance(
            bal.confirmed_ironwood_balance,
            bal.total_ironwood_balance,
        ),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::notify::NullNotifier;
    use serde_json::Value;

    // An isolated data root under the temp dir, wiped first so a rerun starts clean.
    fn test_paths(name: &str) -> Paths {
        let root = std::env::temp_dir().join(format!("pendrake-test-{name}"));
        let _ = std::fs::remove_dir_all(&root);
        Paths::with_root(root)
    }

    // Records every delivery so a test can assert which toasts were raised.
    struct SpyNotifier(std::sync::Mutex<Vec<(String, String, String)>>);

    impl SpyNotifier {
        fn new() -> Self {
            Self(std::sync::Mutex::new(Vec::new()))
        }
        fn calls(&self) -> Vec<(String, String, String)> {
            self.0.lock().unwrap().clone()
        }
    }

    impl Notifier for SpyNotifier {
        fn notify(&self, title: &str, body: &str, deep_link: &str) -> anyhow::Result<()> {
            self.0
                .lock()
                .unwrap()
                .push((title.to_owned(), body.to_owned(), deep_link.to_owned()));
            Ok(())
        }
    }

    // A service backed by the spy, with a wallet meta pinning the Initial-scan boundary
    // at `target`, so `notify_tx` runs the real policy without a live client.
    async fn service_with_spy(name: &str, spy: Arc<SpyNotifier>, target: u32) -> Arc<WalletService> {
        let service = WalletService::load(test_paths(name), spy).await.unwrap();
        *service.meta.write().await = Some(Meta {
            network: Network::Mainnet,
            indexer_uri: String::new(),
            import_type: ImportType::Ufvk,
            view_mode: ViewMode::Full,
            birthday_height: 0,
            scan_target_height: target,
            encrypted: false,
            fingerprint: None,
            notifications_enabled: true,
            fiat_enabled: false,
            discreet: false,
            anchor_height: 0,
            anchor_hash: None,
        });
        service
    }

    #[tokio::test]
    async fn a_live_transaction_raises_a_movement_toast() {
        let spy = Arc::new(SpyNotifier::new());
        let service = service_with_spy("notify-live", spy.clone(), 100).await;
        // Confirmed at or past the import tip N=100: post-import activity, so it notifies.
        service.notify_tx("txlive", true, 42_000_000, true, 120).await;
        let calls = spy.calls();
        assert_eq!(calls.len(), 1);
        assert_eq!(calls[0].0, "Funds received");
        assert_eq!(calls[0].2, "pendrake://tx?txid=txlive");
    }

    #[tokio::test]
    async fn a_historical_transaction_stays_silent() {
        let spy = Arc::new(SpyNotifier::new());
        let service = service_with_spy("notify-historical", spy.clone(), 100).await;
        // Confirmed below N: Initial-scan history, recorded silently with no toast.
        service.notify_tx("txold", true, 42_000_000, true, 50).await;
        assert!(spy.calls().is_empty());
    }

    #[tokio::test]
    async fn an_unconfirmed_transaction_is_live() {
        let spy = Arc::new(SpyNotifier::new());
        let service = service_with_spy("notify-mempool", spy.clone(), 100).await;
        // Mempool is live regardless of height, so a send notifies right away.
        service.notify_tx("txmempool", false, 10_000_000, false, 0).await;
        let calls = spy.calls();
        assert_eq!(calls.len(), 1);
        assert_eq!(calls[0].0, "Funds sent");
    }

    #[tokio::test]
    async fn the_same_live_transaction_notifies_once() {
        let spy = Arc::new(SpyNotifier::new());
        let service = service_with_spy("notify-once", spy.clone(), 100).await;
        service.notify_tx("txdup", true, 42_000_000, true, 120).await;
        service.notify_tx("txdup", true, 42_000_000, true, 120).await;
        assert_eq!(spy.calls().len(), 1);
    }

    #[tokio::test]
    async fn notifications_off_silences_a_live_transaction() {
        let spy = Arc::new(SpyNotifier::new());
        let service = service_with_spy("notify-off", spy.clone(), 100).await;
        service.notifications_enabled.store(false, Ordering::SeqCst);
        service.notify_tx("txoff", true, 42_000_000, true, 120).await;
        assert!(spy.calls().is_empty());
    }

    #[tokio::test]
    async fn discreet_redacts_the_live_transaction_notification() {
        let spy = Arc::new(SpyNotifier::new());
        let service = service_with_spy("notify-discreet", spy.clone(), 100).await;
        service.discreet.store(true, Ordering::SeqCst);
        service.notify_tx("txhush", true, 42_000_000, true, 120).await;
        let calls = spy.calls();
        assert_eq!(calls.len(), 1);
        // Neither amount nor direction leaks; the deep link still opens the tx.
        assert_eq!(calls[0].0, "New transaction detected");
        assert!(!calls[0].1.contains("ZEC"));
        assert!(!calls[0].1.contains("arrived"));
        assert!(!calls[0].1.contains("sent"));
        assert_eq!(calls[0].2, "pendrake://tx?txid=txhush");
    }

    #[tokio::test]
    async fn set_discreet_persists_to_meta() {
        let spy = Arc::new(SpyNotifier::new());
        let service = service_with_spy("discreet-persist", spy, 100).await;
        service.paths.ensure_dirs().unwrap();

        let state = service.set_discreet(true).await.unwrap();
        assert!(state.discreet);
        // The choice survives a restart: it's on disk, not just in the atomics.
        let meta = Meta::load(&service.paths.meta_file).unwrap().unwrap();
        assert!(meta.discreet);
    }

    #[test]
    fn meta_without_discreet_defaults_off() {
        // A meta.json written before the field existed must load unchanged.
        let json = serde_json::json!({
            "network": "mainnet",
            "indexer_uri": "",
            "import_type": "ufvk",
            "view_mode": "full",
            "birthday_height": 0,
        });
        let meta: Meta = serde_json::from_value(json).unwrap();
        assert!(!meta.discreet);
    }

    // `summary()` pins height 1; override it so a summary can sit above or below the
    // Initial-scan target and exercise the live-vs-historical extraction.
    fn summary_at(
        txid_byte: u8,
        kind: TransactionKind,
        value: u64,
        height: u32,
    ) -> TransactionSummary {
        let mut s = summary(txid_byte, kind, value, vec![]);
        s.status = ConfirmationStatus::Confirmed(BlockHeight::from_u32(height));
        s.blockheight = BlockHeight::from_u32(height);
        s
    }

    #[tokio::test]
    async fn a_received_summary_feeds_toast_cache_and_event() {
        let spy = Arc::new(SpyNotifier::new());
        let service = service_with_spy("summary-received", spy.clone(), 100).await;
        let mut events = service.events.subscribe();
        let id = txid(0x11);

        service
            .on_tx_summary(id, &summary_at(0x11, TransactionKind::Received, 42_000_000, 120))
            .await;

        // The summary's kind, value and height flow to the movement toast.
        let calls = spy.calls();
        assert_eq!(calls.len(), 1);
        assert_eq!(calls[0].0, "Funds received");
        assert_eq!(calls[0].2, format!("pendrake://tx?txid={id}"));
        // ...and to the cache the GUI reads.
        assert!(service.txs.read().await.iter().any(|t| t.txid == id.to_string()));
        // ...and to the broadcast the GUI folds in.
        match events.try_recv().unwrap() {
            SyncEvent::Transaction { txid, kind, value_zat, received } => {
                assert_eq!(txid, id.to_string());
                assert_eq!(kind, TxKind::Received);
                assert_eq!(value_zat, "42000000");
                assert!(received);
            }
            other => panic!("expected a Transaction event, got {other:?}"),
        }
    }

    #[tokio::test]
    async fn a_sent_summary_reads_as_sent() {
        let spy = Arc::new(SpyNotifier::new());
        let service = service_with_spy("summary-sent", spy.clone(), 100).await;
        let mut events = service.events.subscribe();

        service
            .on_tx_summary(
                txid(0x22),
                &summary_at(0x22, TransactionKind::Sent(SendType::Send), 7_000_000, 120),
            )
            .await;

        assert_eq!(spy.calls()[0].0, "Funds sent");
        match events.try_recv().unwrap() {
            SyncEvent::Transaction { kind, received, .. } => {
                assert_eq!(kind, TxKind::Sent);
                assert!(!received);
            }
            other => panic!("expected a Transaction event, got {other:?}"),
        }
    }

    #[tokio::test]
    async fn a_historical_summary_updates_cache_but_stays_silent() {
        let spy = Arc::new(SpyNotifier::new());
        let service = service_with_spy("summary-historical", spy.clone(), 100).await;
        let mut events = service.events.subscribe();
        let id = txid(0x33);

        // Confirmed below the target: the extracted height drives the policy's silent
        // path, yet the cache and event still update so the GUI stays consistent.
        service
            .on_tx_summary(id, &summary_at(0x33, TransactionKind::Received, 42_000_000, 50))
            .await;

        assert!(spy.calls().is_empty());
        assert!(service.txs.read().await.iter().any(|t| t.txid == id.to_string()));
        assert!(matches!(
            events.try_recv().unwrap(),
            SyncEvent::Transaction { .. }
        ));
    }

    use pepper_sync::error::{ServerError, SyncError};

    // The error type is generic over the wallet error; String stands in for it here,
    // since the classifier only matches on the ServerError variant.
    type TestSyncError = SyncError<String>;

    #[test]
    fn request_failed_is_unreachable() {
        let unavailable: TestSyncError =
            ServerError::RequestFailed(tonic::Status::unavailable("down")).into();
        assert!(is_unreachable(&unavailable));

        let timeout: TestSyncError =
            ServerError::RequestFailed(tonic::Status::deadline_exceeded("timeout")).into();
        assert!(is_unreachable(&timeout));
    }

    #[test]
    fn non_connectivity_errors_are_not_unreachable() {
        // Bad data from a reachable server: the connection worked, so changing it
        // wouldn't help.
        let bad_data: TestSyncError = ServerError::InvalidSubtreeRoot.into();
        assert!(!is_unreachable(&bad_data));

        // An internal channel drop, not a transport failure to the Indexer.
        let dropped: TestSyncError = ServerError::FetcherDropped.into();
        assert!(!is_unreachable(&dropped));

        // A consensus/state error has nothing to do with reachability.
        let chain: TestSyncError = SyncError::ChainError(100, 50, 50);
        assert!(!is_unreachable(&chain));
    }

    #[tokio::test]
    async fn a_wrong_chain_round_notifies_once_and_marks_the_status() {
        let spy = Arc::new(SpyNotifier::new());
        let service = service_with_spy("wrong-chain-notify", spy.clone(), 100).await;
        let failure = || RoundError {
            message: "chain mismatch".to_string(),
            unreachable: false,
            wrong_chain: true,
        };

        service.note_round_failure(failure()).await;
        // The backoff loop re-reports the same episode; the user hears it once.
        service.note_round_failure(failure()).await;

        let calls = spy.calls();
        assert_eq!(calls.len(), 1);
        assert_eq!(calls[0].0, "Wrong chain detected");
        assert_eq!(calls[0].2, "pendrake://settings/indexer");

        let sync = service.sync.read().await;
        assert_eq!(sync.state, SyncState::Error);
        assert!(sync.wrong_chain);
        assert!(!sync.unreachable);
    }

    #[tokio::test]
    async fn an_unreachable_round_never_raises_the_wrong_chain_alert() {
        let spy = Arc::new(SpyNotifier::new());
        let service = service_with_spy("unreachable-not-wrong-chain", spy.clone(), 100).await;

        service
            .note_round_failure(RoundError {
                message: "connection refused".to_string(),
                unreachable: true,
                wrong_chain: false,
            })
            .await;

        let calls = spy.calls();
        assert_eq!(calls.len(), 1);
        assert_eq!(calls[0].0, "Can't reach your Indexer");
        let sync = service.sync.read().await;
        assert!(sync.unreachable);
        assert!(!sync.wrong_chain);
    }

    const ANCHOR: &str = "aa11";

    fn observed(tip: u32, hash: Option<&str>) -> ChainObservation {
        ChainObservation {
            tip,
            anchor_block_hash: hash.map(str::to_string),
        }
    }

    #[test]
    fn matching_anchor_is_a_match() {
        assert_eq!(
            chain_verdict(500, Some(ANCHOR), 1000, &observed(2000, Some(ANCHOR))),
            ChainVerdict::Match
        );
    }

    #[test]
    fn a_different_hash_at_the_anchor_is_a_wrong_chain() {
        assert!(matches!(
            chain_verdict(500, Some(ANCHOR), 1000, &observed(2000, Some("bb22"))),
            ChainVerdict::WrongChain { .. }
        ));
    }

    #[test]
    fn a_chain_shorter_than_the_anchor_is_wrong() {
        // The tip decides before any hash: no need to ask for a block the server
        // can't have.
        assert!(matches!(
            chain_verdict(500, Some(ANCHOR), 1000, &observed(400, None)),
            ChainVerdict::WrongChain { .. }
        ));
    }

    #[test]
    fn a_missing_anchor_block_on_a_covering_chain_is_wrong() {
        assert!(matches!(
            chain_verdict(500, Some(ANCHOR), 1000, &observed(2000, None)),
            ChainVerdict::WrongChain { .. }
        ));
    }

    #[test]
    fn an_anchorless_wallet_within_the_margin_is_unanchored() {
        // The server trails the scan target by less than the margin: ordinary lag,
        // sync proceeds and TOFU adopts an anchor after the round.
        assert_eq!(
            chain_verdict(0, None, 1000, &observed(950, None)),
            ChainVerdict::Unanchored
        );
    }

    #[test]
    fn an_anchorless_wallet_far_behind_the_scan_target_is_wrong() {
        // Tonight's incident: the wallet synced a 3.4M-block incarnation, the
        // regenerated chain reports 251k.
        assert!(matches!(
            chain_verdict(0, None, 3_400_000, &observed(251_000, None)),
            ChainVerdict::WrongChain { .. }
        ));
    }

    #[test]
    fn the_tip_margin_boundary_is_exact() {
        // tip + MARGIN == target sits on the boundary and still passes; one block
        // further behind flips it.
        let target = 1000;
        let at_margin = target - WRONG_CHAIN_TIP_MARGIN;
        assert_eq!(
            chain_verdict(0, None, target, &observed(at_margin, None)),
            ChainVerdict::Unanchored
        );
        assert!(matches!(
            chain_verdict(0, None, target, &observed(at_margin - 1, None)),
            ChainVerdict::WrongChain { .. }
        ));
    }

    #[test]
    fn hex_lower_is_stable_lowercase() {
        assert_eq!(hex_lower(&[0x00, 0xab, 0xff, 0x01]), "00abff01");
        assert_eq!(hex_lower(&[]), "");
    }

    #[test]
    fn meta_without_anchor_fields_defaults_unanchored() {
        // A meta.json written before ADR-0010 must load unchanged.
        let json = serde_json::json!({
            "network": "mainnet",
            "indexer_uri": "",
            "import_type": "ufvk",
            "view_mode": "full",
            "birthday_height": 0,
        });
        let meta: Meta = serde_json::from_value(json).unwrap();
        assert_eq!(meta.anchor_height, 0);
        assert_eq!(meta.anchor_hash, None);
    }

    #[test]
    fn ct_eq_matches_only_identical_bytes() {
        assert!(ct_eq(b"correct horse", b"correct horse"));
        assert!(ct_eq(b"", b""));
        assert!(!ct_eq(b"correct horse", b"correct mouse"));
        // Differing lengths are unequal, never a panic or a prefix match.
        assert!(!ct_eq(b"horse", b"horses"));
    }

    #[tokio::test]
    async fn verify_passphrase_checks_the_held_session_passphrase() {
        let service = WalletService::load(test_paths("verify"), Arc::new(NullNotifier))
            .await
            .unwrap();
        // Nothing held (cold daemon): every guess is rejected.
        assert!(!service.verify_passphrase("anything").await);

        *service.session_passphrase.lock().await = Some("correct horse".into());
        assert!(service.verify_passphrase("correct horse").await);
        assert!(!service.verify_passphrase("wrong").await);
    }

    fn cached_note() -> WalletNote {
        WalletNote {
            idx: 0,
            pool: Pool::Orchard,
            value_zat: "5000".into(),
            status: NoteStatus::Unspent,
            height: Some(10),
            txid: "aa".into(),
            change: false,
            spent_height: None,
        }
    }

    #[tokio::test]
    async fn notes_without_a_wallet_are_empty_not_stale() {
        let service = WalletService::load(test_paths("notes-no-wallet"), Arc::new(NullNotifier))
            .await
            .unwrap();
        // A leftover cached row must not leak through the no-wallet path.
        service.notes.write().await.push(cached_note());
        assert!(service.collect_notes().await.is_empty());
    }

    #[tokio::test]
    async fn remove_clears_the_notes_cache() {
        let service = WalletService::load(test_paths("notes-remove"), Arc::new(NullNotifier))
            .await
            .unwrap();
        service.notes.write().await.push(cached_note());
        service.remove(false).await.unwrap();
        assert!(service.notes.read().await.is_empty());
    }

    #[tokio::test]
    async fn get_notes_answers_an_empty_array_on_a_fresh_service() {
        let service = WalletService::load(test_paths("notes-fresh"), Arc::new(NullNotifier))
            .await
            .unwrap();
        let result = service.handle("getNotes", Value::Null).await.unwrap();
        assert_eq!(result, serde_json::json!([]));
    }

    #[tokio::test]
    async fn remove_keeps_the_session_passphrase_only_for_replace() {
        let service = WalletService::load(test_paths("remove"), Arc::new(NullNotifier))
            .await
            .unwrap();

        // Replace (keep_session) retains it, so onboarding can skip Set Password.
        *service.session_passphrase.lock().await = Some("pw".into());
        service.remove(true).await.unwrap();
        assert_eq!(
            service.session_passphrase.lock().await.as_deref(),
            Some("pw")
        );
        assert!(service.verify_passphrase("pw").await);

        // Start over drops it, so onboarding asks for a new passphrase.
        service.remove(false).await.unwrap();
        assert!(service.session_passphrase.lock().await.is_none());
    }

    #[test]
    fn allowlist_permits_lifecycle_and_denies_wallet_reads() {
        for m in [
            "getWalletState",
            "getSyncStatus",
            "parseUfvk",
            "importUfvk",
            "unlock",
            "lock",
            "verifyPassphrase",
            "removeWallet",
            "subscribeEvents",
            "listWallets",
            "shutdown",
        ] {
            assert!(
                allowed_while_locked(m),
                "{m} should be allowed while locked"
            );
        }
        for m in [
            "getBalance",
            "getTransactions",
            "getAddresses",
            "getTransaction",
            "setIndexer",
        ] {
            assert!(!allowed_while_locked(m), "{m} should be gated while locked");
        }
    }

    #[tokio::test]
    async fn lock_session_arms_gate_but_keeps_the_session_key() {
        let service = WalletService::load(test_paths("lock-session"), Arc::new(NullNotifier))
            .await
            .unwrap();
        *service.session_passphrase.lock().await = Some("pw".into());
        service.session_locked.store(false, Ordering::SeqCst);

        service.lock_session();

        assert!(service.session_locked());
        // The key is retained so background sync survives the lock.
        assert!(service.session_passphrase.lock().await.is_some());
    }

    #[tokio::test]
    async fn handle_gates_wallet_reads_while_locked() {
        let service = WalletService::load(test_paths("gate"), Arc::new(NullNotifier))
            .await
            .unwrap();
        service.session_locked.store(true, Ordering::SeqCst);

        // Lifecycle and auth stay available so the GUI can route and re-authenticate.
        assert!(service.handle("getWalletState", Value::Null).await.is_ok());
        assert!(service.handle("lock", Value::Null).await.is_ok());

        // Wallet reads are refused while the session is locked.
        assert!(service.handle("getBalance", Value::Null).await.is_err());
        assert!(service
            .handle("getTransactions", Value::Null)
            .await
            .is_err());
        assert!(service.handle("getAddresses", Value::Null).await.is_err());
    }

    #[tokio::test]
    async fn last_subscriber_relocks_an_encrypted_session_only() {
        let service = WalletService::load(test_paths("relock-enc"), Arc::new(NullNotifier))
            .await
            .unwrap();
        service.encrypted.store(true, Ordering::SeqCst);
        service.session_locked.store(false, Ordering::SeqCst);

        // Two feeds: the first to leave is not the last, so it must not relock.
        service.subscriber_joined();
        service.subscriber_joined();
        service.subscriber_left();
        assert!(!service.session_locked());
        // The last one out relocks, so the next GUI session re-authenticates.
        service.subscriber_left();
        assert!(service.session_locked());
    }

    #[tokio::test]
    async fn last_subscriber_does_not_relock_a_plaintext_session() {
        let service = WalletService::load(test_paths("relock-plain"), Arc::new(NullNotifier))
            .await
            .unwrap();
        service.encrypted.store(false, Ordering::SeqCst);
        service.session_locked.store(false, Ordering::SeqCst);

        service.subscriber_joined();
        service.subscriber_left();
        // A plaintext wallet has no passphrase to demand, so it stays open.
        assert!(!service.session_locked());
    }

    use zingo_status::confirmation_status::ConfirmationStatus;
    use zingolib::wallet::summary::data::{BasicNoteSummary, SendType};

    fn txid(byte: u8) -> TxId {
        TxId::from_bytes([byte; 32])
    }

    // A confirmed transaction carrying `received` orchard notes, each (value,
    // spend-status). `display` is the fork's `value` field, the signed amount the net
    // delta deliberately ignores in favour of the note flows.
    fn summary(
        txid_byte: u8,
        kind: TransactionKind,
        display: u64,
        received: Vec<(u64, SpendStatus)>,
    ) -> TransactionSummary {
        TransactionSummary {
            txid: txid(txid_byte),
            datetime: 0,
            status: ConfirmationStatus::Confirmed(BlockHeight::from_u32(1)),
            blockheight: BlockHeight::from_u32(1),
            kind,
            value: display,
            fee: None,
            zec_price: None,
            ironwood_notes: vec![],
            orchard_notes: received
                .into_iter()
                .enumerate()
                .map(|(i, (value, status))| {
                    BasicNoteSummary::from_parts(value, status, i as u32, None)
                })
                .collect(),
            sapling_notes: vec![],
            transparent_coins: vec![],
            outgoing_ironwood_notes: vec![],
            outgoing_orchard_notes: vec![],
            outgoing_sapling_notes: vec![],
            outgoing_transparent_coins: vec![],
        }
    }

    fn net_of(s: &TransactionSummary, spent_by: &HashMap<String, u64>) -> i64 {
        map_tx(s, spent_by).net_zat.parse().unwrap()
    }

    // The invariant the balance chart leans on: summed over the whole history, each
    // transaction's net delta equals the confirmed balance (the value of every unspent
    // received note). When it holds, the reconstructed curve ends on the headline and
    // walks back to zero.
    #[test]
    fn net_deltas_sum_to_the_unspent_balance() {
        // A receives 100, later spent by B; B keeps 30 as change and sends the rest
        // out. The only unspent note left is B's 30.
        let a = summary(
            0xAA,
            TransactionKind::Received,
            100,
            vec![(100, SpendStatus::Spent(txid(0xBB)))],
        );
        let b = summary(
            0xBB,
            TransactionKind::Sent(SendType::Send),
            70,
            vec![(30, SpendStatus::Unspent)],
        );
        let history = TransactionSummaries::new(vec![a, b]);

        let spent_by = spent_value_by_tx(&history);
        let total: i64 = history.iter().map(|s| net_of(s, &spent_by)).sum();
        assert_eq!(total, 30);
    }

    // A plain external receive credits the full received value: nothing of the wallet's
    // is spent, so the delta is exactly what arrived.
    #[test]
    fn external_receive_credits_the_full_value() {
        let s = summary(
            0x01,
            TransactionKind::Received,
            500,
            vec![(500, SpendStatus::Unspent)],
        );
        assert_eq!(net_of(&s, &HashMap::new()), 500);
    }

    // A send debits the spent inputs and credits only the change that returns, so its
    // delta is the negative of what left the wallet (the external payment plus fee),
    // regardless of the larger signed `display` amount.
    #[test]
    fn send_nets_change_minus_spent_inputs() {
        let funding = summary(
            0x02,
            TransactionKind::Received,
            100,
            vec![(100, SpendStatus::Spent(txid(0x03)))],
        );
        let send = summary(
            0x03,
            TransactionKind::Sent(SendType::Send),
            70,
            vec![(30, SpendStatus::Unspent)],
        );
        let history = TransactionSummaries::new(vec![funding, send.clone()]);
        let spent_by = spent_value_by_tx(&history);
        assert_eq!(net_of(&send, &spent_by), 30 - 100);
    }

    // The bug this delta exists to fix: income that first enters through a
    // wallet-authored output. A shield from an unscanned transparent input (or a
    // coinbase paid to the wallet's own shielded address) creates a received note with
    // no matching spent note, and the fork's signed `display` nets it to roughly the
    // fee. The note-flow delta credits the full value instead of zeroing it out.
    #[test]
    fn self_authored_inflow_is_credited_not_zeroed() {
        let shield = summary(
            0x04,
            TransactionKind::Sent(SendType::Shield),
            0,
            vec![(500, SpendStatus::Unspent)],
        );
        assert_eq!(net_of(&shield, &HashMap::new()), 500);
    }

    // The notes debug view's status rule: an unconfirmed note reads pending whatever
    // its spend state, a confirmed one is spent or spendable.
    #[test]
    fn unconfirmed_note_is_pending_with_no_height() {
        let note = map_wallet_note(
            0,
            Pool::Orchard,
            100,
            false,
            0,
            SpendStatus::Unspent,
            &txid(0x01),
            false,
            &HashMap::new(),
        );
        assert_eq!(note.status, NoteStatus::Pending);
        assert_eq!(note.height, None);
    }

    #[test]
    fn confirmed_unspent_note_is_spendable_at_its_height() {
        let note = map_wallet_note(
            0,
            Pool::Sapling,
            100,
            true,
            42,
            SpendStatus::Unspent,
            &txid(0x01),
            false,
            &HashMap::new(),
        );
        assert_eq!(note.status, NoteStatus::Unspent);
        assert_eq!(note.height, Some(42));
        assert_eq!(note.spent_height, None);
    }

    #[test]
    fn a_confirmed_spend_resolves_the_spending_block() {
        let heights = HashMap::from([(txid(0x02).to_string(), 99u32)]);
        let note = map_wallet_note(
            0,
            Pool::Orchard,
            100,
            true,
            42,
            SpendStatus::Spent(txid(0x02)),
            &txid(0x01),
            false,
            &heights,
        );
        assert_eq!(note.status, NoteStatus::Spent);
        assert_eq!(note.spent_height, Some(99));
    }

    // An in-flight spend (transmitted, mempool, or just calculated) marks the note
    // spent, but its spending transaction isn't confirmed, so no height is known.
    #[test]
    fn an_in_flight_spend_has_no_confirmed_height() {
        let note = map_wallet_note(
            0,
            Pool::Orchard,
            100,
            true,
            42,
            SpendStatus::MempoolSpent(txid(0x02)),
            &txid(0x01),
            false,
            &HashMap::new(),
        );
        assert_eq!(note.status, NoteStatus::Spent);
        assert_eq!(note.spent_height, None);
    }

    #[test]
    fn carries_idx_value_txid_and_change_through() {
        let note = map_wallet_note(
            7,
            Pool::Orchard,
            100,
            true,
            42,
            SpendStatus::Unspent,
            &txid(0x01),
            true,
            &HashMap::new(),
        );
        assert_eq!(note.idx, 7);
        assert_eq!(note.value_zat, "100");
        assert_eq!(note.txid, txid(0x01).to_string());
        assert!(note.change);
    }

    #[test]
    fn spending_txid_covers_every_spend_stage() {
        let spender = txid(0x05);
        assert_eq!(spending_txid(SpendStatus::Unspent), None);
        assert_eq!(
            spending_txid(SpendStatus::CalculatedSpent(spender)),
            Some(spender)
        );
        assert_eq!(
            spending_txid(SpendStatus::TransmittedSpent(spender)),
            Some(spender)
        );
        assert_eq!(
            spending_txid(SpendStatus::MempoolSpent(spender)),
            Some(spender)
        );
        assert_eq!(spending_txid(SpendStatus::Spent(spender)), Some(spender));
    }
}
