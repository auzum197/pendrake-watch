//! Filesystem layout and persisted import metadata.
//!
//! zingolib owns the wallet file inside `wallet_dir`. Alongside it we persist a
//! small `meta.json` describing how the wallet was imported, so the daemon can
//! rebuild [`pendrake_ipc::WalletState`] and reconnect after a restart. The wallet
//! file is encrypted at rest with the global passphrase (docs/adr/0003) when
//! `Meta.encrypted` is set. `meta.json` itself is plaintext and holds nothing
//! secret, the viewing key lives only inside the encrypted wallet file.

use std::path::{Path, PathBuf};

use anyhow::{Context, Result};
use pendrake_ipc::{ImportType, Network, ViewMode};
use serde::{Deserialize, Serialize};

#[derive(Clone)]
pub struct Paths {
    pub root: PathBuf,
    pub wallet_dir: PathBuf,
    pub meta_file: PathBuf,
    pub socket: PathBuf,
    /// Txids already notified, so a restart doesn't re-announce past receipts.
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
        Self {
            wallet_dir: root.join("wallet"),
            meta_file: root.join("meta.json"),
            socket: root.join("daemon.sock"),
            notified_file: root.join("notified.json"),
            root,
        }
    }

    pub fn ensure_dirs(&self) -> Result<()> {
        std::fs::create_dir_all(&self.wallet_dir)
            .with_context(|| format!("creating data dir {}", self.wallet_dir.display()))?;
        Ok(())
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
    /// Whether the user wants desktop notifications (AUZ-61). The master switch the
    /// daemon checks before delivering any toast. Defaults true so a wallet imported
    /// before this existed keeps notifying.
    #[serde(default = "default_true")]
    pub notifications_enabled: bool,
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
