//! Cross-platform IPC transport for the daemon endpoint.
//!
//! Unix uses a domain socket at a file path. Windows uses a named pipe whose name
//! is derived from the data root, so a `PENDRAKE_DATA_DIR` override gives parallel
//! instances distinct pipes. Both connection types are `AsyncRead + AsyncWrite`, so
//! the newline-JSON protocol above this layer never sees the difference.
//!
//! The GUI client mirrors [`endpoint`] without depending on this crate (it must not
//! link pendrake-core), so the derivation has to stay deterministic across binaries.
//! That rules out `DefaultHasher`, hence the inline FNV-1a.

use std::path::Path;

pub use imp::{connect, Conn, Listener, ServerConn};

/// FNV-1a over the data root, shared by the Windows pipe name here and in the GUI.
#[cfg(windows)]
fn root_hash(root: &Path) -> u64 {
    let mut hash: u64 = 0xcbf2_9ce4_8422_2325;
    for byte in root.to_string_lossy().as_bytes() {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(0x0000_0100_0000_01b3);
    }
    hash
}

/// The endpoint clients connect to and the server binds: a socket path on Unix, a
/// pipe name on Windows. Server and clients derive it from the same data root.
pub fn endpoint(root: &Path) -> String {
    #[cfg(unix)]
    {
        root.join("daemon.sock").to_string_lossy().into_owned()
    }
    #[cfg(windows)]
    {
        format!(r"\\.\pipe\pendrake-{:016x}", root_hash(root))
    }
}

#[cfg(unix)]
mod imp {
    use std::io;

    use tokio::net::{UnixListener, UnixStream};

    pub type Conn = UnixStream;
    pub type ServerConn = UnixStream;

    pub async fn connect(endpoint: &str) -> io::Result<Conn> {
        UnixStream::connect(endpoint).await
    }

    pub struct Listener(UnixListener);

    impl Listener {
        pub fn bind(endpoint: &str) -> io::Result<Self> {
            // A stale socket file blocks bind; the service is single-instance.
            let _ = std::fs::remove_file(endpoint);
            Ok(Self(UnixListener::bind(endpoint)?))
        }

        pub async fn accept(&mut self) -> io::Result<ServerConn> {
            let (stream, _addr) = self.0.accept().await?;
            Ok(stream)
        }
    }
}

#[cfg(windows)]
mod imp {
    use std::io;

    use tokio::net::windows::named_pipe::{
        ClientOptions, NamedPipeClient, NamedPipeServer, ServerOptions,
    };

    pub type Conn = NamedPipeClient;
    pub type ServerConn = NamedPipeServer;

    pub async fn connect(endpoint: &str) -> io::Result<Conn> {
        // `open` returns at once. The GUI's probe-and-spawn retries while the
        // daemon comes up, so one attempt per call is enough.
        ClientOptions::new().open(endpoint)
    }

    pub struct Listener {
        endpoint: String,
        next: NamedPipeServer,
    }

    impl Listener {
        pub fn bind(endpoint: &str) -> io::Result<Self> {
            let next = ServerOptions::new()
                .first_pipe_instance(true)
                .create(endpoint)?;
            Ok(Self {
                endpoint: endpoint.to_owned(),
                next,
            })
        }

        pub async fn accept(&mut self) -> io::Result<ServerConn> {
            self.next.connect().await?;
            // Pre-create the next instance so the following client can connect
            // while this one is being served.
            let server =
                std::mem::replace(&mut self.next, ServerOptions::new().create(&self.endpoint)?);
            Ok(server)
        }
    }
}
