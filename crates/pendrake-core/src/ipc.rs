//! The JSON-RPC server (docs/adr/0014). It speaks newline-delimited JSON-RPC 2.0
//! on the platform transport ([`crate::transport`]) and on the optional loopback
//! TCP listener, with one task per client.
//!
//! Each connection owns a [`Session`]. Until the client sends `subscribeEvents`
//! the daemon sends only replies. After that it also sends one [`Notification`]
//! per [`SyncEvent`].

use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;

use anyhow::{bail, Context, Result};
use pendrake_ipc::{Call, Id, Notification, Request, Response, RpcError, SyncEvent};
use tokio::io::{AsyncBufReadExt, AsyncRead, AsyncReadExt, AsyncWrite, AsyncWriteExt, BufReader};
use tokio::net::TcpListener;
use tokio::sync::broadcast::{self, error::RecvError};
use zeroize::Zeroizing;

use crate::paths::Paths;
use crate::transport::Listener;
use crate::wallet_service::{ct_eq, CallError, Session, WalletService};

/// The longest request line accepted. An import carries a UFVK of a few hundred
/// bytes, so this is generous; it exists so a peer that never sends a newline
/// cannot grow the read buffer until the daemon dies.
const MAX_LINE_BYTES: usize = 64 * 1024;

/// The delay after a wrong cookie.
const BAD_COOKIE_DELAY: Duration = Duration::from_millis(250);

/// The TCP listener configuration. `cookie` is the secret a session must present
/// first. `cookie_unlocks` means a session that presented it starts unlocked if
/// the daemon has the Passphrase in memory.
pub struct RpcListen {
    pub addr: SocketAddr,
    pub cookie: Zeroizing<String>,
    pub cookie_unlocks: bool,
}

pub async fn serve(
    service: Arc<WalletService>,
    paths: Paths,
    rpc: Option<Arc<RpcListen>>,
) -> Result<()> {
    let endpoint = paths.endpoint();
    let mut local =
        Listener::bind(&endpoint).with_context(|| format!("binding endpoint {endpoint}"))?;
    tracing::info!("listening on {endpoint}");

    if let Some(rpc) = rpc {
        let tcp = TcpListener::bind(rpc.addr)
            .await
            .with_context(|| format!("binding rpc listener {}", rpc.addr))?;
        tracing::info!("rpc listening on {}", rpc.addr);
        let service = Arc::clone(&service);
        tokio::spawn(async move {
            loop {
                let conn = match tcp.accept().await {
                    Ok((conn, _peer)) => conn,
                    Err(e) => {
                        tracing::warn!("rpc accept failed: {e}");
                        continue;
                    }
                };
                let session = service.session(false);
                spawn_conn(conn, Arc::clone(&service), session, Some(Arc::clone(&rpc)));
            }
        });
    }

    loop {
        // An accept error is one failed connection (the OS aborts handshakes
        // under load), not a reason to go deaf: a daemon that keeps syncing but
        // refuses every connection strands the GUI with no way back short of a
        // kill. Log and keep accepting.
        let conn = match local.accept().await {
            Ok(conn) => conn,
            Err(e) => {
                tracing::warn!("accept failed: {e}");
                continue;
            }
        };
        let session = service.session(true);
        spawn_conn(conn, Arc::clone(&service), session, None);
    }
}

fn spawn_conn<S>(
    stream: S,
    service: Arc<WalletService>,
    session: Session,
    rpc: Option<Arc<RpcListen>>,
) where
    S: AsyncRead + AsyncWrite + Send + 'static,
{
    tokio::spawn(async move {
        if let Err(e) = handle_conn(stream, service, session, rpc).await {
            tracing::debug!("connection closed: {e}");
        }
    });
}

/// Serves one connection until it closes. Dropping the connection drops the session
/// and relocks it.
async fn handle_conn<S>(
    stream: S,
    service: Arc<WalletService>,
    mut session: Session,
    rpc: Option<Arc<RpcListen>>,
) -> Result<()>
where
    S: AsyncRead + AsyncWrite + Send + 'static,
{
    let (read_half, mut write_half) = tokio::io::split(stream);
    let mut reader = BufReader::new(read_half);
    let mut buf = Vec::new();
    let mut events: Option<broadcast::Receiver<SyncEvent>> = None;

    loop {
        tokio::select! {
            frame = read_frame(&mut reader, &mut buf) => {
                let Some(line) = frame? else { break };
                // A line may contain the passphrase or the cookie, so it is wiped once handled.
                let line = Zeroizing::new(line);
                if line.trim().is_empty() {
                    continue;
                }
                let (resp, subscribe) = match Request::parse(&line) {
                    Ok(req) => answer(req, &service, &mut session, rpc.as_deref()).await,
                    Err((id, error)) => (Response::err(id, error), false),
                };
                write_line(&mut write_half, &resp).await?;
                if subscribe && events.is_none() {
                    events = Some(service.subscribe());
                }
            }

            event = recv(&mut events), if events.is_some() => match event {
                // A locked session receives no wallet data. An Error (connectivity)
                // is safe to surface to the unlock screen.
                Ok(event) => {
                    if session.unlocked_with(service.encrypted_store())
                        || matches!(event, SyncEvent::Error { .. })
                    {
                        write_line(&mut write_half, &Notification::from_event(&event)).await?;
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

async fn recv(events: &mut Option<broadcast::Receiver<SyncEvent>>) -> Result<SyncEvent, RecvError> {
    match events {
        Some(events) => events.recv().await,
        None => std::future::pending().await,
    }
}

/// The reply to one request, and whether the request was an accepted
/// `subscribeEvents`. `authenticate` is checked here because this is where the
/// cookie lives. On the local socket it is a plain ack.
async fn answer(
    req: Request,
    service: &Arc<WalletService>,
    session: &mut Session,
    rpc: Option<&RpcListen>,
) -> (Response, bool) {
    let Request { id, call, .. } = req;
    if let Call::Authenticate(args) = &call {
        if let Some(rpc) = rpc {
            if !session.is_authenticated() {
                return (
                    authenticate(id, &args.cookie, rpc, service, session).await,
                    false,
                );
            }
        }
    }
    let subscribe = matches!(call, Call::SubscribeEvents);
    let method = call.method_name();
    let resp = match service.dispatch(call, session).await {
        Ok(result) => Response::ok(id, result),
        Err(CallError::Locked) => Response::err(Some(id), RpcError::locked()),
        Err(CallError::Unauthenticated) => {
            Response::err(Some(id), RpcError::unauthenticated("not authenticated"))
        }
        Err(CallError::Failed(e)) => Response::err(Some(id), RpcError::call_failed(e.to_string())),
    };
    match &resp.error {
        None => tracing::debug!(method, id = ?resp.id, "rpc ok"),
        Some(e) => {
            tracing::debug!(method, id = ?resp.id, code = e.code, error = %e.message, "rpc error")
        }
    }
    let accepted = resp.error.is_none();
    (resp, subscribe && accepted)
}

async fn authenticate(
    id: Id,
    cookie: &str,
    rpc: &RpcListen,
    service: &WalletService,
    session: &mut Session,
) -> Response {
    if !ct_eq(cookie.as_bytes(), rpc.cookie.as_bytes()) {
        tracing::debug!(method = "authenticate", id = ?id, "rpc error: invalid cookie");
        tokio::time::sleep(BAD_COOKIE_DELAY).await;
        return Response::err(Some(id), RpcError::unauthenticated("invalid cookie"));
    }
    tracing::debug!(method = "authenticate", id = ?id, "rpc ok");
    session.authenticate();
    if rpc.cookie_unlocks && service.session_key_held().await {
        session.unlock();
    }
    Response::ok(id, serde_json::Value::Null)
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
