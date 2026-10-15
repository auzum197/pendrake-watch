//! The service entry point shared by every host (the Rust daemon, the macOS
//! Swift helper). `run` owns its own tokio runtime and returns without blocking,
//! so a host that drives its own run loop (an `NSApplication`) keeps the main
//! thread. The returned [`ServiceHandle`] keeps the service alive; dropping it
//! tears the runtime down.

use std::fs::File;
use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::mpsc;
use std::sync::Arc;

use anyhow::{bail, Context, Result};
use rand::RngCore;
use zeroize::Zeroizing;

use crate::ipc::{self, RpcListen};
use crate::notify::Notifier;
use crate::paths::Paths;
use crate::wallet_service::WalletService;

#[derive(Default)]
pub struct Config {
    /// Override the data directory. `None` uses the per-user default.
    pub data_dir: Option<PathBuf>,
    /// The JSON-RPC TCP listener. `None` means the environment variables
    /// `PENDRAKE_RPC_LISTEN` and `PENDRAKE_RPC_COOKIE_UNLOCKS` decide. Without them
    /// there is no listener.
    pub rpc: Option<RpcConfig>,
}

/// The loopback JSON-RPC listener (docs/adr/0014). The per-run cookie in
/// `rpc.cookie` is the proof of local access. Only loopback addresses are accepted.
#[derive(Debug, Clone)]
pub struct RpcConfig {
    pub listen: SocketAddr,
    /// Whether a session that presented the cookie starts unlocked if the daemon
    /// has the Passphrase in memory.
    pub cookie_unlocks: bool,
}

impl RpcConfig {
    pub fn from_env() -> Result<Option<Self>> {
        let Some(listen) = std::env::var_os("PENDRAKE_RPC_LISTEN") else {
            return Ok(None);
        };
        let listen: SocketAddr = listen
            .to_string_lossy()
            .parse()
            .context("PENDRAKE_RPC_LISTEN is not a host:port address")?;
        let cookie_unlocks = std::env::var("PENDRAKE_RPC_COOKIE_UNLOCKS")
            .map(|v| matches!(v.as_str(), "1" | "true"))
            .unwrap_or(false);
        Ok(Some(Self {
            listen,
            cookie_unlocks,
        }))
    }
}

/// A fresh cookie of 32 random bytes in hex, written to `path` as an owner-only
/// file.
fn write_cookie(path: &std::path::Path) -> Result<Zeroizing<String>> {
    let mut bytes = Zeroizing::new([0u8; 32]);
    rand::rngs::OsRng.fill_bytes(&mut *bytes);
    let cookie = Zeroizing::new(bytes.iter().map(|b| format!("{b:02x}")).collect::<String>());
    let _ = std::fs::remove_file(path);
    let mut options = File::options();
    options.create_new(true).write(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600);
    }
    let mut file = options
        .open(path)
        .with_context(|| format!("creating {}", path.display()))?;
    std::io::Write::write_all(&mut file, cookie.as_bytes())?;
    Ok(cookie)
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
    /// The cookie file. It exists only if the TCP listener is open. It is removed
    /// together with the socket.
    cookie: Option<PathBuf>,
    // Held for the service's lifetime so a second instance can't serve the same
    // wallet. Released when the handle drops.
    _lock: File,
    /// Completes when the service receives a `shutdown` IPC request.
    shutdown_rx: mpsc::Receiver<()>,
}

impl ServiceHandle {
    /// Block until `shutdown` is requested over IPC. Dropping the handle then
    /// tears down the runtime, socket, and lock.
    pub fn wait_for_shutdown(self) {
        let _ = self.shutdown_rx.recv();
    }
}

impl Drop for ServiceHandle {
    fn drop(&mut self) {
        // Drop the runtime (stopping the IPC server and sync loop) before the
        // socket file is removed.
        self.runtime.take();
        let _ = std::fs::remove_file(&self.socket);
        if let Some(cookie) = &self.cookie {
            let _ = std::fs::remove_file(cookie);
        }
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

    let (shutdown_tx, shutdown_rx) = mpsc::channel();

    let rpc = match config
        .rpc
        .map(Ok)
        .or_else(|| RpcConfig::from_env().transpose())
    {
        Some(rpc) => Some(rpc_listen(rpc?, &paths)?),
        None => None,
    };
    let cookie = rpc.as_ref().map(|_| paths.rpc_cookie_file.clone());

    let service = runtime.block_on(WalletService::load(paths.clone(), notifier))?;
    service.arm_shutdown(shutdown_tx);

    let serve_paths = paths.clone();
    runtime.spawn(async move {
        // A service nobody can reach is worse than a dead one: it holds the
        // single-instance lock and keeps syncing while the GUI gets connection
        // refused, unrecoverable short of a kill. serve() only returns on a bind
        // failure (accept errors are absorbed inside), and each retry re-binds
        // from scratch (the stale socket file is unlinked first), so this heals
        // once the cause clears instead of leaving a deaf daemon behind.
        loop {
            if let Err(e) = ipc::serve(Arc::clone(&service), serve_paths.clone(), rpc.clone()).await
            {
                tracing::error!("ipc server stopped, rebinding shortly: {e}");
                tokio::time::sleep(std::time::Duration::from_secs(1)).await;
            }
        }
    });

    Ok(ServiceHandle {
        runtime: Some(runtime),
        socket: paths.socket,
        cookie,
        _lock: lock,
        shutdown_rx,
    })
}

/// The listener for this run, with a fresh cookie. A non-loopback address is an
/// error.
fn rpc_listen(config: RpcConfig, paths: &Paths) -> Result<Arc<RpcListen>> {
    if !config.listen.ip().is_loopback() {
        bail!(
            "PENDRAKE_RPC_LISTEN must be a loopback address, got {}; tunnel remote access over SSH",
            config.listen
        );
    }
    let cookie = write_cookie(&paths.rpc_cookie_file)?;
    Ok(Arc::new(RpcListen {
        addr: config.listen,
        cookie,
        cookie_unlocks: config.cookie_unlocks,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::notify::NullNotifier;
    use std::path::Path;

    fn config_at(dir: &Path) -> Config {
        Config {
            data_dir: Some(dir.to_path_buf()),
            rpc: None,
        }
    }

    #[test]
    fn second_instance_is_rejected_as_already_running() {
        let dir = tempfile::tempdir().unwrap();
        let first =
            run(config_at(dir.path()), Arc::new(NullNotifier)).expect("the first instance starts");
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
        let first =
            run(config_at(dir.path()), Arc::new(NullNotifier)).expect("the first instance starts");
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
        let handle =
            run(config_at(dir.path()), Arc::new(NullNotifier)).expect("the instance starts");
        let socket = dir.path().join("daemon.sock");

        // A client that sends half a request and vanishes mid-line.
        let mut rude = connect_with_retry(&socket);
        rude.write_all(b"{\"jsonrpc\":\"2.0\",\"id\":1,\"met")
            .unwrap();
        drop(rude);

        // The server must still answer a fresh connection afterwards.
        let mut stream = connect_with_retry(&socket);
        stream
            .write_all(b"{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"listWallets\"}\n")
            .unwrap();
        stream
            .set_read_timeout(Some(std::time::Duration::from_secs(5)))
            .unwrap();
        let mut reply = String::new();
        BufReader::new(&stream).read_line(&mut reply).unwrap();
        assert!(
            reply.starts_with("{\"jsonrpc\":\"2.0\",\"id\":2,\"result\":"),
            "unexpected reply: {reply}"
        );
        drop(handle);
    }

    fn tcp_connect_with_retry(addr: SocketAddr) -> std::net::TcpStream {
        for _ in 0..50 {
            if let Ok(stream) = std::net::TcpStream::connect(addr) {
                return stream;
            }
            std::thread::sleep(std::time::Duration::from_millis(20));
        }
        panic!("rpc listener never came up on {addr}");
    }

    fn free_loopback_port() -> SocketAddr {
        std::net::TcpListener::bind("127.0.0.1:0")
            .unwrap()
            .local_addr()
            .unwrap()
    }

    #[test]
    fn the_rpc_listener_demands_the_cookie_before_anything_else() {
        use std::io::{BufRead, BufReader, Write};

        let dir = tempfile::tempdir().unwrap();
        let listen = free_loopback_port();
        let config = Config {
            data_dir: Some(dir.path().to_path_buf()),
            rpc: Some(RpcConfig {
                listen,
                cookie_unlocks: false,
            }),
        };
        let handle = run(config, Arc::new(NullNotifier)).expect("the instance starts");
        let cookie_file = dir.path().join("rpc.cookie");
        let cookie = std::fs::read_to_string(&cookie_file).unwrap();
        assert_eq!(cookie.len(), 64);
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mode = std::fs::metadata(&cookie_file)
                .unwrap()
                .permissions()
                .mode()
                & 0o777;
            assert_eq!(mode, 0o600);
        }

        let mut stream = tcp_connect_with_retry(listen);
        stream
            .set_read_timeout(Some(std::time::Duration::from_secs(5)))
            .unwrap();
        let mut reader = BufReader::new(stream.try_clone().unwrap());
        let mut reply = String::new();

        stream
            .write_all(b"{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"listWallets\"}\n")
            .unwrap();
        reader.read_line(&mut reply).unwrap();
        assert!(
            reply.contains("\"code\":-32002"),
            "unexpected reply: {reply}"
        );

        reply.clear();
        stream
            .write_all(
                b"{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"authenticate\",\"params\":{\"cookie\":\"nope\"}}\n",
            )
            .unwrap();
        reader.read_line(&mut reply).unwrap();
        assert!(
            reply.contains("\"code\":-32002"),
            "unexpected reply: {reply}"
        );

        reply.clear();
        let auth = format!(
            "{{\"jsonrpc\":\"2.0\",\"id\":3,\"method\":\"authenticate\",\"params\":{{\"cookie\":\"{cookie}\"}}}}\n"
        );
        stream.write_all(auth.as_bytes()).unwrap();
        reader.read_line(&mut reply).unwrap();
        assert!(
            reply.contains("\"id\":3,\"result\":null"),
            "unexpected reply: {reply}"
        );
        reply.clear();
        stream
            .write_all(b"{\"jsonrpc\":\"2.0\",\"id\":4,\"method\":\"listWallets\"}\n")
            .unwrap();
        reader.read_line(&mut reply).unwrap();
        assert!(
            reply.starts_with("{\"jsonrpc\":\"2.0\",\"id\":4,\"result\":"),
            "unexpected reply: {reply}"
        );

        drop(handle);
        assert!(!cookie_file.exists(), "the cookie must go with the daemon");
    }

    #[test]
    fn a_non_loopback_rpc_address_is_refused() {
        let dir = tempfile::tempdir().unwrap();
        let config = Config {
            data_dir: Some(dir.path().to_path_buf()),
            rpc: Some(RpcConfig {
                listen: "0.0.0.0:0".parse().unwrap(),
                cookie_unlocks: false,
            }),
        };
        match run(config, Arc::new(NullNotifier)) {
            Err(StartError::Failed(e)) => assert!(e.to_string().contains("loopback")),
            Err(StartError::AlreadyRunning) => panic!("not an instance clash"),
            Ok(_) => panic!("a non-loopback listener must be refused"),
        }
    }

    #[test]
    fn a_non_lock_startup_failure_is_reported_as_failed() {
        // A regular file sitting where the data dir should be makes directory
        // creation fail before the lock is ever considered. That fault must not
        // masquerade as AlreadyRunning, or the host would wrongly step aside.
        let file = tempfile::NamedTempFile::new().unwrap();
        let config = Config {
            data_dir: Some(file.path().to_path_buf()),
            rpc: None,
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
