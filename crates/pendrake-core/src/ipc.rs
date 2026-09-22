//! IPC server. Newline-delimited JSON, one task per client, over the platform
//! transport (Unix socket or Windows named pipe, see [`crate::transport`]).
//!
//! A connection is request/response until it sends `subscribeEvents`; from then
//! on the daemon also pushes [`SyncEvent`] lines as the wallet scans, interleaved
//! with any further replies on the same connection.

use std::sync::Arc;

use anyhow::{bail, Context, Result};
use pendrake_ipc::{Call, Request, Response, SyncEvent};
use tokio::io::{
    AsyncBufReadExt, AsyncRead, AsyncReadExt, AsyncWrite, AsyncWriteExt, BufReader, ReadHalf,
    WriteHalf,
};
use tokio::sync::broadcast::error::RecvError;

use crate::wallet_service::WalletService;
use crate::paths::Paths;
use crate::transport::Listener;

/// The longest request line accepted. An import carries a UFVK of a few hundred
/// bytes, so this is generous; it exists so a peer that never sends a newline
/// cannot grow the read buffer until the daemon dies.
const MAX_LINE_BYTES: usize = 64 * 1024;

pub async fn serve(service: Arc<WalletService>, paths: Paths) -> Result<()> {
    let endpoint = paths.endpoint();
    let mut listener =
        Listener::bind(&endpoint).with_context(|| format!("binding endpoint {endpoint}"))?;
    tracing::info!("listening on {endpoint}");

    loop {
        // An accept error is one failed connection (the OS aborts handshakes
        // under load), not a reason to go deaf: a daemon that keeps syncing but
        // refuses every connection strands the GUI with no way back short of a
        // kill. Log and keep accepting.
        let conn = match listener.accept().await {
            Ok(conn) => conn,
            Err(e) => {
                tracing::warn!("accept failed: {e}");
                continue;
            }
        };
        let service = Arc::clone(&service);
        tokio::spawn(async move {
            if let Err(e) = handle_conn(conn, service).await {
                tracing::debug!("connection closed: {e}");
            }
        });
    }
}

async fn handle_conn<S>(stream: S, service: Arc<WalletService>) -> Result<()>
where
    S: AsyncRead + AsyncWrite + Send + 'static,
{
    let (read_half, mut write_half) = tokio::io::split(stream);
    let mut reader = BufReader::new(read_half);
    let mut buf = Vec::new();

    while let Some(line) = read_frame(&mut reader, &mut buf).await? {
        if line.trim().is_empty() {
            continue;
        }
        let (resp, subscribe) = match serde_json::from_str::<Request>(&line) {
            Ok(req) => {
                let subscribe = matches!(req.call, Call::SubscribeEvents);
                let resp = match service.handle(req.call).await {
                    Ok(result) => Response::ok(req.id, result),
                    Err(e) => Response::err(req.id, e.to_string()),
                };
                (resp, subscribe)
            }
            Err(e) => (Response::err(0, format!("bad request: {e}")), false),
        };
        write_line(&mut write_half, &resp).await?;

        // The ack is the last reply before this connection becomes an event feed.
        if subscribe {
            return stream_events(reader, write_half, service).await;
        }
    }
    Ok(())
}

/// One newline-delimited frame, or `None` once the peer has closed. A final line
/// without a newline still counts. A line past [`MAX_LINE_BYTES`] is a protocol
/// violation and ends the connection.
///
/// Safe to cancel inside a `select!`: bytes already read stay in `buf`, and the
/// next call continues from them, so the cap holds across cancellations too.
async fn read_frame<R>(reader: &mut BufReader<R>, buf: &mut Vec<u8>) -> Result<Option<String>>
where
    R: AsyncRead + Unpin,
{
    loop {
        let remaining = (MAX_LINE_BYTES + 1).saturating_sub(buf.len()) as u64;
        let n = reader.take(remaining).read_until(b'\n', buf).await?;
        let complete = buf.last() == Some(&b'\n');
        if complete || n == 0 {
            if buf.is_empty() {
                return Ok(None);
            }
            if complete {
                buf.pop();
            }
            let line = String::from_utf8(std::mem::take(buf)).context("request is not UTF-8")?;
            return Ok(Some(line));
        }
        if buf.len() > MAX_LINE_BYTES {
            bail!("request line exceeds {MAX_LINE_BYTES} bytes");
        }
    }
}

/// Drain the service's event stream onto a subscribed connection, still answering
/// any requests the client sends alongside the push feed.
async fn stream_events<S>(
    mut reader: BufReader<ReadHalf<S>>,
    mut write_half: WriteHalf<S>,
    service: Arc<WalletService>,
) -> Result<()>
where
    S: AsyncRead + AsyncWrite,
{
    let mut buf = Vec::new();
    // Track this subscriber so the service relocks when the last GUI feed drops: a
    // Sign Out is explicit, this catches a plain quit. The guard decrements on every
    // exit path.
    service.subscriber_joined();
    let _subscriber = SubscriberGuard(Arc::clone(&service));

    let mut events = service.subscribe();
    loop {
        tokio::select! {
            frame = read_frame(&mut reader, &mut buf) => {
                let Some(line) = frame? else { break };
                if line.trim().is_empty() {
                    continue;
                }
                let resp = match serde_json::from_str::<Request>(&line) {
                    Ok(req) => match service.handle(req.call).await {
                        Ok(result) => Response::ok(req.id, result),
                        Err(e) => Response::err(req.id, e.to_string()),
                    },
                    Err(e) => Response::err(0, format!("bad request: {e}")),
                };
                write_line(&mut write_half, &resp).await?;
            }

            event = events.recv() => match event {
                // While the session is locked, push nothing wallet-bearing; only an
                // Error (connectivity) is safe to surface to the unlock screen.
                Ok(event) => {
                    if !service.session_locked() || matches!(event, SyncEvent::Error { .. }) {
                        write_line(&mut write_half, &event).await?;
                    }
                }
                // A slow reader fell behind; the next Progress snapshot resyncs it.
                Err(RecvError::Lagged(_)) => {}
                Err(RecvError::Closed) => break,
            },
        }
    }
    Ok(())
}

/// Decrements the service's subscriber count when a feed ends, relocking on the last
/// one out. A guard, so every exit path (clean return, error, or panic) is covered.
struct SubscriberGuard(Arc<WalletService>);

impl Drop for SubscriberGuard {
    fn drop(&mut self) {
        self.0.subscriber_left();
    }
}

async fn write_line<W, T>(write_half: &mut W, value: &T) -> Result<()>
where
    W: AsyncWrite + Unpin,
    T: serde::Serialize,
{
    let mut encoded = serde_json::to_vec(value)?;
    encoded.push(b'\n');
    write_half.write_all(&encoded).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use tokio::io::{AsyncWriteExt, BufReader};

    use super::{read_frame, MAX_LINE_BYTES};

    #[tokio::test]
    async fn frames_split_on_newlines_and_a_bare_tail_still_counts() {
        let (mut client, server) = tokio::io::duplex(1024);
        let mut reader = BufReader::new(server);
        let mut buf = Vec::new();

        client.write_all(b"one\ntwo\ntail").await.unwrap();
        drop(client);

        assert_eq!(
            read_frame(&mut reader, &mut buf).await.unwrap().as_deref(),
            Some("one")
        );
        assert_eq!(
            read_frame(&mut reader, &mut buf).await.unwrap().as_deref(),
            Some("two")
        );
        assert_eq!(
            read_frame(&mut reader, &mut buf).await.unwrap().as_deref(),
            Some("tail")
        );
        assert!(read_frame(&mut reader, &mut buf).await.unwrap().is_none());
    }

    #[tokio::test]
    async fn a_line_past_the_cap_is_refused_before_a_newline_arrives() {
        let (mut client, server) = tokio::io::duplex(4096);
        let mut reader = BufReader::new(server);
        let mut buf = Vec::new();

        let writer = tokio::spawn(async move {
            let chunk = vec![b'x'; 4096];
            for _ in 0..(MAX_LINE_BYTES / 4096 + 2) {
                if client.write_all(&chunk).await.is_err() {
                    break;
                }
            }
        });

        let err = read_frame(&mut reader, &mut buf).await.unwrap_err();
        assert!(err.to_string().contains("exceeds"));
        drop(reader);
        writer.await.unwrap();
    }

    #[tokio::test]
    async fn a_line_at_the_cap_is_still_accepted() {
        let (mut client, server) = tokio::io::duplex(4096);
        let mut reader = BufReader::new(server);
        let mut buf = Vec::new();

        let writer = tokio::spawn(async move {
            let mut line = vec![b'y'; MAX_LINE_BYTES];
            line.push(b'\n');
            client.write_all(&line).await.unwrap();
        });

        let line = read_frame(&mut reader, &mut buf).await.unwrap().unwrap();
        assert_eq!(line.len(), MAX_LINE_BYTES);
        writer.await.unwrap();
    }
}
