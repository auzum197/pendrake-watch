//! The service entry point shared by every host (the Rust daemon, the macOS
//! Swift helper). `run` owns its own tokio runtime and returns without blocking,
//! so a host that drives its own run loop (an `NSApplication`) keeps the main
//! thread. The returned [`ServiceHandle`] keeps the service alive; dropping it
//! tears the runtime down.

use std::fs::File;
use std::path::PathBuf;
use std::sync::Arc;

use anyhow::{anyhow, Result};

use crate::ipc;
use crate::wallet_service::WalletService;
use crate::notify::Notifier;
use crate::paths::Paths;

#[derive(Default)]
pub struct Config {
    /// Override the data directory. `None` uses the per-user default.
    pub data_dir: Option<PathBuf>,
}

pub struct ServiceHandle {
    runtime: Option<tokio::runtime::Runtime>,
    socket: PathBuf,
    // Held for the service's lifetime so a second instance can't serve the same
    // wallet. Released when the handle drops.
    _lock: File,
}

impl Drop for ServiceHandle {
    fn drop(&mut self) {
        // Drop the runtime (stopping the IPC server and sync loop) before the
        // socket file is removed.
        self.runtime.take();
        let _ = std::fs::remove_file(&self.socket);
    }
}

/// Start the runtime, IPC server, and sync loop on background threads. Returns
/// once the service is up. Errors if another instance already holds the lock.
pub fn run(config: Config, notifier: Arc<dyn Notifier>) -> Result<ServiceHandle> {
    // zingolib's gRPC/TLS stack uses the rustls ring provider.
    let _ = rustls::crypto::ring::default_provider().install_default();

    let paths = match config.data_dir {
        Some(dir) => Paths::with_root(dir),
        None => Paths::resolve()?,
    };
    paths.ensure_dirs()?;

    let lock = File::options()
        .create(true)
        .write(true)
        .open(paths.root.join("daemon.lock"))?;
    if fs2::FileExt::try_lock_exclusive(&lock).is_err() {
        return Err(anyhow!(
            "another Pendrake service instance is already running"
        ));
    }

    let runtime = tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()?;

    let service = runtime.block_on(WalletService::load(paths.clone(), notifier))?;
    let serve_paths = paths.clone();
    runtime.spawn(async move {
        if let Err(e) = ipc::serve(service, serve_paths).await {
            tracing::error!("ipc server stopped: {e}");
        }
    });

    Ok(ServiceHandle {
        runtime: Some(runtime),
        socket: paths.socket,
        _lock: lock,
    })
}
