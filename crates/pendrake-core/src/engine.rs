//! The wallet engine: sole owner of the zingolib wallet file.
//!
//! It builds a watch-only wallet from a UFVK, persists it, and runs a sync loop
//! driven by pepper-sync's event stream. Each scanned batch advances a live
//! progress snapshot and each discovered transaction feeds the [`Notifier`] and a
//! pushed event, so the GUI sees progress and history update as blocks land
//! rather than on a poll timer.

use std::collections::{HashSet, VecDeque};
use std::ops::Range;
use std::sync::atomic::{AtomicBool, AtomicU64, AtomicUsize, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};

use anyhow::{anyhow, Result};
use pendrake_ipc::{
    Balance, BatchPhase, BatchProgress, BatchSummary, BatchTiming, CommitBreakdown, ImportType,
    ImportUfvkArgs, Network, Note, NoteDirection, ParseUfvkResult, Pool, PoolBalance, RemoveArgs,
    SetIndexerArgs, SyncEvent, SyncPhase, SyncState, SyncStatus, Tx, TxKind, TxStatus, UfvkNetwork,
    UnlockArgs, VerifyPassphraseArgs, ViewMode, WalletAddress, WalletState,
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
use zingolib::wallet::summary::data::{TransactionKind, TransactionSummary};
use zingolib::wallet::WalletSettings;
use zingolib::ActivationHeights;
use zip32::AccountId;

use crate::birthday::resolve_birthday;
use crate::notify::Notifier;
use crate::paths::{Meta, Paths};
use crate::ufvk::{parse_ufvk, UfvkError};

/// Gap between sync rounds once a round has finished cleanly. Kept short so a
/// newly mined transaction is picked up within roughly this window.
const IDLE_INTERVAL: Duration = Duration::from_secs(2);
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

pub struct Engine {
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
    /// Received txids already notified, so each transaction notifies exactly once
    /// across sync rounds and restarts.
    seen_txids: Mutex<HashSet<String>>,
    /// Set once the "Indexer unreachable" notification has fired for the current
    /// outage, so a multi-round backoff notifies once. Cleared when a round
    /// succeeds, the Indexer changes, or a fresh sync loop starts.
    unreachable_notified: AtomicBool,
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
}

impl From<anyhow::Error> for RoundError {
    fn from(e: anyhow::Error) -> Self {
        // Everything that reaches this path (no wallet, sync start, missing task) is a
        // local/state error, never a poll-time transport failure.
        Self {
            message: e.to_string(),
            unreachable: false,
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

/// Validate a candidate Indexer with a real `GetLightdInfo` request, not just a
/// TCP/TLS connect. A plain HTTPS server accepts the connection but doesn't speak
/// the lightwalletd protocol, so the gRPC call is what actually proves the endpoint
/// is a Zcash indexer before we point a Wallet at it.
async fn probe_indexer(uri: &http::Uri) -> Result<()> {
    use zingo_netutils::Indexer;
    let mut indexer = zingo_netutils::GrpcIndexer::new(uri.clone())
        .await
        .map_err(|e| anyhow!("could not connect to indexer: {e}"))?;
    indexer
        .get_lightd_info(INDEXER_PROBE_TIMEOUT)
        .await
        .map_err(|e| anyhow!("that server did not respond as a Zcash indexer: {e}"))?;
    Ok(())
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
    )
}

impl Engine {
    /// Build the engine, loading and resuming sync for an existing wallet.
    pub async fn load(paths: Paths, notifier: Arc<dyn Notifier>) -> Result<Arc<Self>> {
        paths.ensure_dirs()?;
        let seen = load_notified(&paths.notified_file);
        let (events, _) = broadcast::channel(EVENT_CAPACITY);
        let engine = Arc::new(Self {
            notifier,
            client: Mutex::new(None),
            meta: RwLock::new(None),
            sync: RwLock::new(SyncStatus::default()),
            events,
            txs: RwLock::new(Vec::new()),
            balance: RwLock::new(None),
            addresses: RwLock::new(Vec::new()),
            seen_txids: Mutex::new(seen),
            unreachable_notified: AtomicBool::new(false),
            generation: AtomicU64::new(0),
            restart: Notify::new(),
            session_locked: AtomicBool::new(false),
            encrypted: AtomicBool::new(false),
            subscribers: AtomicUsize::new(0),
            session_passphrase: Mutex::new(None),
            paths,
        });

        if let Some(meta) = Meta::load(&engine.paths.meta_file)? {
            engine.encrypted.store(meta.encrypted, Ordering::SeqCst);
            if meta.encrypted {
                // An encrypted wallet starts the session locked: hold the meta but
                // open no client until the GUI sends the passphrase via `unlock`,
                // which loads the client and starts sync.
                tracing::info!("encrypted wallet on disk, waiting for unlock");
                engine.session_locked.store(true, Ordering::SeqCst);
                *engine.meta.write().await = Some(meta);
            } else {
                let config = engine.client_config(
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
                        *engine.client.lock().await = Some(client);
                        *engine.meta.write().await = Some(meta);
                        // Prime the read cache before the sync loop starts contending
                        // for the wallet, so the GUI's opening queries are instant.
                        engine.refresh_snapshot().await;
                        // Reflect "syncing" right away instead of the default idle,
                        // so the GUI doesn't flash "Synced" before the first round.
                        engine.sync.write().await.state = SyncState::Syncing;
                        engine.spawn_sync_loop();
                    }
                    Err(e) => tracing::warn!("meta present but wallet load failed: {e}"),
                }
            }
        }
        Ok(engine)
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
            // Wallet reads are served from the snapshot cache, never the `client`
            // lock, so they don't queue behind the sync loop.
            "getBalance" => Ok(to_value(
                self.balance.read().await.clone().unwrap_or_default(),
            )?),
            "getTransactions" => Ok(to_value(self.txs.read().await.clone())?),
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
            // The push stream is wired up by the IPC layer, so the engine just acks.
            "subscribeEvents" => Ok(serde_json::Value::Null),
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
            .set_wallet_dir(self.paths.wallet_dir.clone())
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
                fingerprint: m.fingerprint.clone(),
                import_type: m.import_type,
                view_mode: m.view_mode,
                network: m.network,
                birthday_height: m.birthday_height,
                indexer_uri: m.indexer_uri.clone(),
            },
            None => WalletState {
                exists: false,
                locked: false,
                session_held,
                fingerprint: None,
                import_type: ImportType::Ufvk,
                view_mode: ViewMode::Full,
                network: Network::Mainnet,
                birthday_height: 0,
                indexer_uri: String::new(),
            },
        }
    }

    /// Rebuild the read cache (transactions, balance, addresses) from the wallet in
    /// one client-lock acquisition. Best-effort: a transient read failure leaves
    /// the previous snapshot in place. Called at low-contention points (load,
    /// import, end of a sync round), never on a client request path.
    async fn refresh_snapshot(&self) {
        let guard = self.client.lock().await;
        let Some(client) = guard.as_ref() else { return };

        if let Ok(summaries) = client.transaction_summaries(true).await {
            *self.txs.write().await = summaries.iter().map(map_tx).collect();
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
        let meta = Meta {
            network: args.network,
            indexer_uri: args.indexer_uri.clone(),
            import_type: ImportType::Ufvk,
            view_mode: ViewMode::Full,
            birthday_height: birthday,
            encrypted: true,
            fingerprint: Some(identity.fingerprint.clone()),
        };

        // Re-import overwrites any wallet already on disk.
        let _ = std::fs::remove_dir_all(&self.paths.wallet_dir);
        self.paths.ensure_dirs()?;

        let wallet = WalletConfig::Ufvk {
            ufvk: args.ufvk,
            birthday,
            wallet_settings: wallet_settings(),
        };
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

        meta.save(&self.paths.meta_file)?;
        *self.meta.write().await = Some(meta);
        *self.client.lock().await = Some(client);
        *self.session_passphrase.lock().await = Some(passphrase);
        self.encrypted.store(true, Ordering::SeqCst);
        self.session_locked.store(false, Ordering::SeqCst);
        *self.sync.write().await = SyncStatus::default();
        self.seen_txids.lock().await.clear();
        let _ = std::fs::remove_file(&self.paths.notified_file);
        // Prime the cache (empty history, fixed addresses, zero balance) so the
        // GUI's post-import queries don't block on the starting sync.
        self.refresh_snapshot().await;

        self.generation.fetch_add(1, Ordering::SeqCst);
        self.spawn_sync_loop();

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
        self.refresh_snapshot().await;
        self.sync.write().await.state = SyncState::Syncing;
        self.generation.fetch_add(1, Ordering::SeqCst);
        self.spawn_sync_loop();
        Ok(self.wallet_state().await)
    }

    /// Point the running Wallet at a different Indexer (AUZ-47). The candidate is
    /// validated with a real `GetLightdInfo` call first (see [`probe_indexer`]), so a
    /// reachable-but-not-an-indexer endpoint is rejected before anything changes. Only
    /// then is the gRPC client swapped in place, so the wallet file is never reopened
    /// and in-flight scanned data and the autosave task survive. The saved value is
    /// left untouched on any failure.
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

        // Probe outside the client lock: a fresh connection plus one GetLightdInfo,
        // so a slow or dead candidate doesn't block reads on the live client.
        probe_indexer(&uri).await?;

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
                meta.save(&self.paths.meta_file)?;
            }
        }

        self.set_sync(|s| {
            s.state = SyncState::Syncing;
            s.error = None;
            s.unreachable = false;
        })
        .await;
        // A switch starts a fresh outage episode, so a dead new Indexer notifies too.
        self.unreachable_notified.store(false, Ordering::SeqCst);
        // Cut short any idle/backoff wait so the new round starts now.
        self.restart.notify_one();

        Ok(self.wallet_state().await)
    }

    /// Wipe the current Wallet. `keep_session` retains the in-memory passphrase so a
    /// Replace lands in onboarding without re-collecting it; Start over passes false
    /// and the passphrase is dropped (docs/adr/0004).
    async fn remove(&self, keep_session: bool) -> Result<()> {
        self.generation.fetch_add(1, Ordering::SeqCst);
        self.session_locked.store(false, Ordering::SeqCst);
        self.encrypted.store(false, Ordering::SeqCst);
        *self.client.lock().await = None;
        *self.meta.write().await = None;
        if !keep_session {
            *self.session_passphrase.lock().await = None;
        }
        *self.sync.write().await = SyncStatus::default();
        self.txs.write().await.clear();
        *self.balance.write().await = None;
        self.addresses.write().await.clear();
        self.seen_txids.lock().await.clear();
        let _ = std::fs::remove_file(&self.paths.meta_file);
        let _ = std::fs::remove_file(&self.paths.notified_file);
        let _ = std::fs::remove_dir_all(&self.paths.wallet_dir);
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
        // A fresh loop (unlock, import, replace) starts a clean outage episode.
        self.unreachable_notified.store(false, Ordering::SeqCst);
        let engine = Arc::clone(self);
        let generation = engine.generation.load(Ordering::SeqCst);
        tokio::spawn(async move { engine.run_sync_loop(generation).await });
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
                    // A round got through, so the outage (if any) is over: a later one notifies again.
                    self.unreachable_notified.store(false, Ordering::SeqCst);
                    // A restart signal (e.g. an Indexer change) cuts the idle wait short.
                    tokio::select! {
                        _ = tokio::time::sleep(IDLE_INTERVAL) => {}
                        _ = self.restart.notified() => {}
                    }
                }
                Err(e) => {
                    let RoundError {
                        message,
                        unreachable,
                    } = e;
                    tracing::warn!(
                        "sync round failed: {message}; unreachable={unreachable}; backing off {backoff:?}"
                    );
                    self.set_sync(|s| {
                        s.state = SyncState::Error;
                        s.error = Some(message.clone());
                        s.unreachable = unreachable;
                    })
                    .await;
                    let _ = self.events.send(SyncEvent::Error {
                        message,
                        unreachable,
                    });
                    // One desktop notification per outage: the loop re-emits the error every
                    // backoff round, but the user only needs telling once that the Indexer is
                    // down and where to fix it. Recovery or an Indexer change re-arms it.
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
                        self.notifier.notify(
                            "Can't reach your Indexer",
                            &body,
                            "pendrake://settings/indexer",
                        );
                    }
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

    async fn sync_round(&self, generation: u64) -> Result<(), RoundError> {
        self.set_sync(|s| {
            s.state = SyncState::Syncing;
            s.error = None;
            s.unreachable = false;
        })
        .await;

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
                                return Err(RoundError {
                                    message: format!("sync error: {e}"),
                                    unreachable: is_unreachable(&e),
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
                already_scanned_sapling_outputs,
                already_scanned_orchard_outputs,
                ..
            } => {
                view.total_outputs = u64::from(total_sapling_outputs + total_orchard_outputs);
                view.scanned_outputs =
                    u64::from(already_scanned_sapling_outputs + already_scanned_orchard_outputs);
                view.synced_height = u32::from(sync_start_height);
                view.chain_tip = u32::from(tip);
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
            } => {
                let range = height_range(&range);
                view.in_flight.retain(|b| b.range != range);
                view.in_flight.push(Batch {
                    range,
                    priority: format!("{priority:?}"),
                    outputs: u64::from(sapling_outputs + orchard_outputs),
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
                timing,
            } => {
                let range = height_range(&range);
                let outputs = u64::from(sapling_outputs + orchard_outputs);
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
            let tx = map_tx(&summary);
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

        let already_notified = self.seen_txids.lock().await.contains(&txid);
        if !already_notified {
            let amount = format_amount(summary.value);
            let (title, body) = if received {
                (
                    "Funds received",
                    format!("{amount} arrived in your wallet."),
                )
            } else {
                ("Funds sent", format!("{amount} sent from your wallet."))
            };
            tracing::info!(
                "new tx {txid} ({} zat, received={received}), notifying",
                summary.value
            );
            // Record the txid as notified only after delivery succeeds. A failure
            // leaves it out of the set, so a later rediscovery (at the latest, the
            // next restart's catch-up sync) tries again rather than losing it.
            match self
                .notifier
                .notify(title, &body, &format!("pendrake://tx?txid={txid}"))
            {
                Ok(()) => {
                    let mut seen = self.seen_txids.lock().await;
                    seen.insert(txid.clone());
                    save_notified(&self.paths.notified_file, &seen);
                }
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
                    status.total_sapling_outputs_scanned + status.total_orchard_outputs_scanned,
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
            performance_level: PerformanceLevel::High,
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

fn load_notified(path: &std::path::Path) -> HashSet<String> {
    std::fs::read(path)
        .ok()
        .and_then(|bytes| serde_json::from_slice(&bytes).ok())
        .unwrap_or_default()
}

fn save_notified(path: &std::path::Path, seen: &HashSet<String>) {
    match serde_json::to_vec(seen) {
        Ok(bytes) => {
            if let Err(e) = std::fs::write(path, bytes) {
                tracing::warn!("could not persist notified txids: {e}");
            }
        }
        Err(e) => tracing::warn!("could not serialize notified txids: {e}"),
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

fn map_tx(s: &TransactionSummary) -> Tx {
    let confirmed = s.status.is_confirmed();
    Tx {
        txid: s.txid.to_string(),
        datetime: s.datetime as u64,
        block_height: confirmed.then(|| u32::from(s.blockheight)),
        kind: match s.kind {
            TransactionKind::Received => TxKind::Received,
            TransactionKind::Sent(_) => TxKind::Sent,
        },
        value_zat: s.value.to_string(),
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

fn map_balance(bal: &AccountBalance) -> Balance {
    Balance {
        orchard: pool_balance(bal.confirmed_orchard_balance, bal.total_orchard_balance),
        sapling: pool_balance(bal.confirmed_sapling_balance, bal.total_sapling_balance),
        transparent: pool_balance(
            bal.confirmed_transparent_balance,
            bal.total_transparent_balance,
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
        let engine = Engine::load(test_paths("verify"), Arc::new(NullNotifier))
            .await
            .unwrap();
        // Nothing held (cold daemon): every guess is rejected.
        assert!(!engine.verify_passphrase("anything").await);

        *engine.session_passphrase.lock().await = Some("correct horse".into());
        assert!(engine.verify_passphrase("correct horse").await);
        assert!(!engine.verify_passphrase("wrong").await);
    }

    #[tokio::test]
    async fn remove_keeps_the_session_passphrase_only_for_replace() {
        let engine = Engine::load(test_paths("remove"), Arc::new(NullNotifier))
            .await
            .unwrap();

        // Replace (keep_session) retains it, so onboarding can skip Set Password.
        *engine.session_passphrase.lock().await = Some("pw".into());
        engine.remove(true).await.unwrap();
        assert_eq!(
            engine.session_passphrase.lock().await.as_deref(),
            Some("pw")
        );
        assert!(engine.verify_passphrase("pw").await);

        // Start over drops it, so onboarding asks for a new passphrase.
        engine.remove(false).await.unwrap();
        assert!(engine.session_passphrase.lock().await.is_none());
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
        ] {
            assert!(allowed_while_locked(m), "{m} should be allowed while locked");
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
        let engine = Engine::load(test_paths("lock-session"), Arc::new(NullNotifier))
            .await
            .unwrap();
        *engine.session_passphrase.lock().await = Some("pw".into());
        engine.session_locked.store(false, Ordering::SeqCst);

        engine.lock_session();

        assert!(engine.session_locked());
        // The key is retained so background sync survives the lock.
        assert!(engine.session_passphrase.lock().await.is_some());
    }

    #[tokio::test]
    async fn handle_gates_wallet_reads_while_locked() {
        let engine = Engine::load(test_paths("gate"), Arc::new(NullNotifier))
            .await
            .unwrap();
        engine.session_locked.store(true, Ordering::SeqCst);

        // Lifecycle and auth stay available so the GUI can route and re-authenticate.
        assert!(engine.handle("getWalletState", Value::Null).await.is_ok());
        assert!(engine.handle("lock", Value::Null).await.is_ok());

        // Wallet reads are refused while the session is locked.
        assert!(engine.handle("getBalance", Value::Null).await.is_err());
        assert!(engine.handle("getTransactions", Value::Null).await.is_err());
        assert!(engine.handle("getAddresses", Value::Null).await.is_err());
    }

    #[tokio::test]
    async fn last_subscriber_relocks_an_encrypted_session_only() {
        let engine = Engine::load(test_paths("relock-enc"), Arc::new(NullNotifier))
            .await
            .unwrap();
        engine.encrypted.store(true, Ordering::SeqCst);
        engine.session_locked.store(false, Ordering::SeqCst);

        // Two feeds: the first to leave is not the last, so it must not relock.
        engine.subscriber_joined();
        engine.subscriber_joined();
        engine.subscriber_left();
        assert!(!engine.session_locked());
        // The last one out relocks, so the next GUI session re-authenticates.
        engine.subscriber_left();
        assert!(engine.session_locked());
    }

    #[tokio::test]
    async fn last_subscriber_does_not_relock_a_plaintext_session() {
        let engine = Engine::load(test_paths("relock-plain"), Arc::new(NullNotifier))
            .await
            .unwrap();
        engine.encrypted.store(false, Ordering::SeqCst);
        engine.session_locked.store(false, Ordering::SeqCst);

        engine.subscriber_joined();
        engine.subscriber_left();
        // A plaintext wallet has no passphrase to demand, so it stays open.
        assert!(!engine.session_locked());
    }
}
