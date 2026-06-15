//! Filesystem layout and persisted import metadata.
//!
//! zingolib owns the wallet file inside `wallet_dir`. Alongside it we persist a
//! small `meta.json` describing how the wallet was imported, so the daemon can
//! rebuild [`pendrake_ipc::WalletState`] and reconnect after a restart. Neither
//! file is encrypted yet. At-rest encryption is a later milestone, and nothing
//! secret beyond the viewing key lives here.

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
