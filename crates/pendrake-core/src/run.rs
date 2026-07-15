//! The service entry point shared by every host (the Rust daemon, the macOS
//! Swift helper). `run` owns its own tokio runtime and returns without blocking,
//! so a host that drives its own run loop (an `NSApplication`) keeps the main
//! thread. The returned [`ServiceHandle`] keeps the service alive; dropping it
//! tears the runtime down.

use std::fs::File;
use std::path::PathBuf;
use std::sync::Arc;

use anyhow::Result;

use crate::ipc;
use crate::wallet_service::WalletService;
use crate::notify::Notifier;
use crate::paths::Paths;

#[derive(Default)]
pub struct Config {
    /// Override the data directory. `None` uses the per-user default.
    pub data_dir: Option<PathBuf>,
}

/// Why [`run`] declined to start. A host distinguishes these: `AlreadyRunning`
/// means a working service owns this data dir, so the caller should step aside
/// (the macOS helper exits), while `Failed` is a real fault worth surfacing.
#[derive(Debug, thiserror::Error)]
pub enum StartError {
    #[error("another Pendrake service instance is already running")]
    AlreadyRunning,
    #[error(transparent)]
    Failed(#[from] anyhow::Error),
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
pub fn run(config: Config, notifier: Arc<dyn Notifier>) -> Result<ServiceHandle, StartError> {
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
        .open(paths.root.join("daemon.lock"))
        .map_err(anyhow::Error::from)?;
    if fs2::FileExt::try_lock_exclusive(&lock).is_err() {
        return Err(StartError::AlreadyRunning);
    }

    let runtime = tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()
        .map_err(anyhow::Error::from)?;

    let service = runtime.block_on(WalletService::load(paths.clone(), notifier))?;
    let serve_paths = paths.clone();
    runtime.spawn(async move {
        // A service nobody can reach is worse than a dead one: it holds the
        // single-instance lock and keeps syncing while the GUI gets connection
        // refused, unrecoverable short of a kill. serve() only returns on a bind
        // failure (accept errors are absorbed inside), and each retry re-binds
        // from scratch (the stale socket file is unlinked first), so this heals
        // once the cause clears instead of leaving a deaf daemon behind.
        loop {
            if let Err(e) = ipc::serve(Arc::clone(&service), serve_paths.clone()).await {
                tracing::error!("ipc server stopped, rebinding shortly: {e}");
                tokio::time::sleep(std::time::Duration::from_secs(1)).await;
            }
        }
    });

    Ok(ServiceHandle {
        runtime: Some(runtime),
        socket: paths.socket,
        _lock: lock,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::notify::NullNotifier;
    use std::path::Path;

    fn config_at(dir: &Path) -> Config {
        Config {
            data_dir: Some(dir.to_path_buf()),
        }
    }

    #[test]
    fn second_instance_is_rejected_as_already_running() {
        let dir = tempfile::tempdir().unwrap();
        let first = run(config_at(dir.path()), Arc::new(NullNotifier))
            .expect("the first instance starts");
        match run(config_at(dir.path()), Arc::new(NullNotifier)) {
            Err(StartError::AlreadyRunning) => {}
            Err(_) => panic!("a second instance was refused, but not as AlreadyRunning"),
            Ok(_) => panic!("a second instance on the same data dir should be refused"),
        }
        drop(first);
    }

    #[test]
    fn dropping_the_handle_frees_the_data_dir_for_a_new_instance() {
        let dir = tempfile::tempdir().unwrap();
        let first = run(config_at(dir.path()), Arc::new(NullNotifier))
            .expect("the first instance starts");
        drop(first);
        run(config_at(dir.path()), Arc::new(NullNotifier))
            .expect("a fresh instance starts once the lock is released");
    }

    // The bind is spawned onto the runtime, so the socket appears shortly after
    // run() returns. Poll-connect instead of sleeping a fixed amount.
    #[cfg(unix)]
    fn connect_with_retry(socket: &Path) -> std::os::unix::net::UnixStream {
        for _ in 0..50 {
            if let Ok(stream) = std::os::unix::net::UnixStream::connect(socket) {
                return stream;
            }
            std::thread::sleep(std::time::Duration::from_millis(20));
        }
        panic!("server never came up on {}", socket.display());
    }

    #[test]
    #[cfg(unix)]
    fn a_dropped_connection_does_not_kill_the_server() {
        use std::io::{BufRead, BufReader, Write};

        let dir = tempfile::tempdir().unwrap();
        let handle = run(config_at(dir.path()), Arc::new(NullNotifier))
            .expect("the instance starts");
        let socket = dir.path().join("daemon.sock");

        // A client that sends half a request and vanishes mid-line.
        let mut rude = connect_with_retry(&socket);
        rude.write_all(b"{\"id\":1,\"met").unwrap();
        drop(rude);

        // The server must still answer a fresh connection afterwards.
        let mut stream = connect_with_retry(&socket);
        stream
            .write_all(b"{\"id\":2,\"method\":\"getSyncStatus\"}\n")
            .unwrap();
        stream
            .set_read_timeout(Some(std::time::Duration::from_secs(5)))
            .unwrap();
        let mut reply = String::new();
        BufReader::new(&stream).read_line(&mut reply).unwrap();
        assert!(reply.contains("\"ok\":true"), "unexpected reply: {reply}");
        drop(handle);
    }

    #[test]
    fn a_non_lock_startup_failure_is_reported_as_failed() {
        // A regular file sitting where the data dir should be makes directory
        // creation fail before the lock is ever considered. That fault must not
        // masquerade as AlreadyRunning, or the host would wrongly step aside.
        let file = tempfile::NamedTempFile::new().unwrap();
        let config = Config {
            data_dir: Some(file.path().to_path_buf()),
        };
        match run(config, Arc::new(NullNotifier)) {
            Err(StartError::Failed(_)) => {}
            Err(StartError::AlreadyRunning) => {
                panic!("a creation failure must not be reported as AlreadyRunning")
            }
            Ok(_) => panic!("run should fail when the data dir can't be created"),
        }
    }
}
