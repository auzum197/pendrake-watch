//! Filesystem layout and persisted import metadata.
//!
//! Layout (multi-wallet ready):
//!
//! ```text
//! $PENDRAKE_DATA_DIR/
//!   active_wallet_id      # which wallet is selected
//!   daemon.sock
//!   price_cache.json      # shared; public ZEC/USD only
//!   wallets/
//!     <id>/
//!       meta.json
//!       wallet/           # zingolib wallet dir
//!       notified.json     # per-wallet seen-set
//! ```
//!
//! A legacy single-wallet tree (`meta.json` + `wallet/` at the data root) is
//! migrated once into `wallets/<id>/` on startup. zingolib owns the wallet file
//! inside `wallet_dir`. `meta.json` is plaintext and holds nothing secret; the
//! viewing key lives only inside the encrypted wallet file (docs/adr/0003).

use std::path::{Path, PathBuf};

use anyhow::{Context, Result};
use pendrake_ipc::{ImportType, Network, ViewMode};
use serde::{Deserialize, Serialize};

#[derive(Clone)]
pub struct Paths {
    pub root: PathBuf,
    pub socket: PathBuf,
    /// Reconciled spot + daily price series (AUZ-83). Shared across wallets.
    pub price_cache_file: PathBuf,
    /// `$root/wallets`.
    pub wallets_dir: PathBuf,
    /// File holding the active wallet id (one line).
    pub active_id_file: PathBuf,
    /// Set when this `Paths` is scoped to a wallet via [`Self::for_wallet`].
    pub wallet_id: Option<String>,
    /// zingolib wallet directory for the active (or scoped) wallet.
    pub wallet_dir: PathBuf,
    pub meta_file: PathBuf,
    /// Txids already notified for this wallet.
    pub notified_file: PathBuf,
}

impl Paths {
    pub fn resolve() -> Result<Self> {
        // Override for tests or running several instances side by side.
        let root = match std::env::var_os("PENDRAKE_DATA_DIR") {
            Some(dir) => PathBuf::from(dir),
            None => dirs::data_dir()
                .context("could not determine OS data directory")?
                .join("pendrake-watch"),
        };
        Ok(Self::with_root(root))
    }

    pub fn with_root(root: PathBuf) -> Self {
        let wallets_dir = root.join("wallets");
        Self {
            socket: root.join("daemon.sock"),
            price_cache_file: root.join("price_cache.json"),
            active_id_file: root.join("active_wallet_id"),
            wallets_dir,
            wallet_id: None,
            // Placeholders until `for_wallet` / migration; legacy names kept so
            // migrate can still see the old root files.
            wallet_dir: root.join("wallet"),
            meta_file: root.join("meta.json"),
            notified_file: root.join("notified.json"),
            root,
        }
    }

    /// Scope paths to one wallet under `wallets/<id>/`.
    pub fn for_wallet(&self, id: &str) -> Self {
        let dir = self.wallets_dir.join(id);
        Self {
            wallet_id: Some(id.to_string()),
            wallet_dir: dir.join("wallet"),
            meta_file: dir.join("meta.json"),
            notified_file: dir.join("notified.json"),
            ..self.clone()
        }
    }

    pub fn ensure_dirs(&self) -> Result<()> {
        std::fs::create_dir_all(&self.wallets_dir).with_context(|| {
            format!("creating wallets dir {}", self.wallets_dir.display())
        })?;
        if self.wallet_id.is_some() {
            std::fs::create_dir_all(&self.wallet_dir).with_context(|| {
                format!("creating wallet dir {}", self.wallet_dir.display())
            })?;
        }
        Ok(())
    }

    pub fn read_active_id(&self) -> Result<Option<String>> {
        match std::fs::read_to_string(&self.active_id_file) {
            Ok(s) => {
                let id = s.trim();
                Ok((!id.is_empty()).then(|| id.to_string()))
            }
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
            Err(e) => Err(e).context("reading active_wallet_id"),
        }
    }

    pub fn write_active_id(&self, id: &str) -> Result<()> {
        std::fs::write(&self.active_id_file, id.as_bytes())
            .context("writing active_wallet_id")?;
        Ok(())
    }

    pub fn list_wallet_ids(&self) -> Result<Vec<String>> {
        let mut ids = Vec::new();
        let entries = match std::fs::read_dir(&self.wallets_dir) {
            Ok(e) => e,
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(ids),
            Err(e) => return Err(e).context("reading wallets dir"),
        };
        for entry in entries {
            let entry = entry?;
            if entry.file_type()?.is_dir() {
                ids.push(entry.file_name().to_string_lossy().into_owned());
            }
        }
        ids.sort();
        Ok(ids)
    }

    /// Move a legacy root-level wallet into `wallets/<id>/` once.
    ///
    /// Returns the new wallet id when a migration ran.
    pub fn migrate_legacy_if_needed(&self) -> Result<Option<String>> {
        let legacy_meta = self.root.join("meta.json");
        if !legacy_meta.exists() {
            return Ok(None);
        }
        // Already on the multi-wallet layout.
        if self.read_active_id()?.is_some() {
            return Ok(None);
        }

        let meta = Meta::load(&legacy_meta)?.context("legacy meta.json missing after exists check")?;
        let id = meta
            .fingerprint
            .clone()
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| "default".to_string());

        let dest = self.for_wallet(&id);
        std::fs::create_dir_all(self.wallets_dir.join(&id)).with_context(|| {
            format!("creating {}", self.wallets_dir.join(&id).display())
        })?;

        let legacy_wallet = self.root.join("wallet");
        if legacy_wallet.exists() {
            std::fs::rename(&legacy_wallet, &dest.wallet_dir)
                .with_context(|| "moving legacy wallet/")?;
        }
        std::fs::rename(&legacy_meta, &dest.meta_file)
            .with_context(|| "moving legacy meta.json")?;

        let legacy_notified = self.root.join("notified.json");
        if legacy_notified.exists() {
            let _ = std::fs::rename(&legacy_notified, &dest.notified_file);
        }

        self.write_active_id(&id)?;
        tracing::info!(%id, "migrated legacy wallet into wallets/<id>");
        Ok(Some(id))
    }

    /// The IPC endpoint the server binds and clients connect to: the `socket` path
    /// on Unix, a named pipe on Windows. Derived from `root` so a
    /// `PENDRAKE_DATA_DIR` override keeps client and daemon in agreement.
    pub fn endpoint(&self) -> String {
        crate::transport::endpoint(&self.root)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Meta {
    pub network: Network,
    pub indexer_uri: String,
    pub import_type: ImportType,
    pub view_mode: ViewMode,
    pub birthday_height: u32,
    /// ADR-0006: the chain tip pinned at import, the end of the Initial scan. While
    /// `synced_height` is below it, detections are silent. Defaults 0 for a wallet
    /// imported before this existed, so it reads as already-live and always notifies,
    /// matching the prior behavior.
    #[serde(default)]
    pub scan_target_height: u32,
    /// Whether the wallet file is encrypted at rest. Defaults false so a wallet
    /// imported before encryption existed still loads as plaintext.
    #[serde(default)]
    pub encrypted: bool,
    /// The UFVK's fingerprint, seeding the Wallet's LifeHash. Persisted at import so
    /// the GUI can render the current Wallet's identity (the Settings danger zone,
    /// the Replace modal) without re-deriving it. `None` for a wallet imported
    /// before this was tracked.
    #[serde(default)]
    pub fingerprint: Option<String>,
    /// Whether transaction and scan-complete notifications fire, toggled from
    /// Settings. Defaults true so a wallet imported before this existed keeps
    /// notifying, matching the prior always-on behavior.
    #[serde(default = "default_true")]
    pub notifications_enabled: bool,
    /// Whether the user has consented to fiat price display (docs/adr/0008). Defaults false
    /// so a wallet imported before this existed stays private until the user opts in.
    #[serde(default)]
    pub fiat_enabled: bool,
    /// Whether Discreet mode is on: the GUI masks amounts, dates, and identifiers, and
    /// the daemon redacts new-transaction notifications (docs/adr/0009). Defaults false
    /// so a meta.json written before this existed loads unchanged.
    #[serde(default)]
    pub discreet: bool,
    /// The Anchor's height: `min(birthday, tip-at-import)` clamped to ≥1, recorded at
    /// import (docs/adr/0010). 0 means no anchor was recorded (a wallet imported
    /// before this existed); the sync loop adopts one after its next good round.
    #[serde(default)]
    pub anchor_height: u32,
    /// The Anchor: hex of the block hash at `anchor_height`, the Wallet's proof of
    /// which chain incarnation it synced. Verified against the Indexer before every
    /// sync round; a mismatch refuses to sync (docs/adr/0010).
    #[serde(default)]
    pub anchor_hash: Option<String>,
}

fn default_true() -> bool {
    true
}

impl Meta {
    pub fn load(path: &Path) -> Result<Option<Self>> {
        match std::fs::read(path) {
            Ok(bytes) => Ok(Some(
                serde_json::from_slice(&bytes).context("parsing meta.json")?,
            )),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
            Err(e) => Err(e).context("reading meta.json"),
        }
    }

    pub fn save(&self, path: &Path) -> Result<()> {
        let bytes = serde_json::to_vec_pretty(self).context("serializing meta.json")?;
        let tmp = path.with_extension("json.tmp");
        std::fs::write(&tmp, &bytes).context("writing meta.json.tmp")?;
        std::fs::rename(&tmp, path).context("renaming meta.json")?;
        Ok(())
    }
}