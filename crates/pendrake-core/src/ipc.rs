//! IPC server. Newline-delimited JSON, one task per client, over the platform
//! transport (Unix socket or Windows named pipe, see [`crate::transport`]).
//!
//! A connection is request/response until it sends `subscribeEvents`; from then
//! on the daemon also pushes [`SyncEvent`] lines as the wallet scans, interleaved
//! with any further replies on the same connection.

use std::sync::Arc;

use anyhow::{Context, Result};
use pendrake_ipc::{Request, Response};
use tokio::io::{
    AsyncBufReadExt, AsyncRead, AsyncWrite, AsyncWriteExt, BufReader, Lines, ReadHalf, WriteHalf,
};
use tokio::sync::broadcast::error::RecvError;

use crate::engine::Engine;
use crate::paths::Paths;
use crate::transport::Listener;

pub async fn serve(engine: Arc<Engine>, paths: Paths) -> Result<()> {
    let endpoint = paths.endpoint();
    let mut listener =
        Listener::bind(&endpoint).with_context(|| format!("binding endpoint {endpoint}"))?;
    tracing::info!("listening on {endpoint}");

    loop {
        let conn = listener.accept().await.context("accept failed")?;
        let engine = Arc::clone(&engine);
        tokio::spawn(async move {
            if let Err(e) = handle_conn(conn, engine).await {
                tracing::debug!("connection closed: {e}");
            }
        });
    }
}

async fn handle_conn<S>(stream: S, engine: Arc<Engine>) -> Result<()>
where
    S: AsyncRead + AsyncWrite + Send + 'static,
{
    let (read_half, mut write_half) = tokio::io::split(stream);
    let mut lines = BufReader::new(read_half).lines();

    while let Some(line) = lines.next_line().await? {
        if line.trim().is_empty() {
            continue;
        }
        let (resp, subscribe) = match serde_json::from_str::<Request>(&line) {
            Ok(req) => {
                let subscribe = req.method == "subscribeEvents";
                let resp = match engine.handle(&req.method, req.params).await {
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
            return stream_events(lines, write_half, engine).await;
        }
    }
    Ok(())
}

/// Drain the engine's event stream onto a subscribed connection, still answering
/// any requests the client sends alongside the push feed.
async fn stream_events<S>(
    mut lines: Lines<BufReader<ReadHalf<S>>>,
    mut write_half: WriteHalf<S>,
    engine: Arc<Engine>,
) -> Result<()>
where
    S: AsyncRead + AsyncWrite,
{
    let mut events = engine.subscribe();
    loop {
        tokio::select! {
            line = lines.next_line() => {
                let Some(line) = line? else { break };
                if line.trim().is_empty() {
                    continue;
                }
                let resp = match serde_json::from_str::<Request>(&line) {
                    Ok(req) => match engine.handle(&req.method, req.params).await {
                        Ok(result) => Response::ok(req.id, result),
                        Err(e) => Response::err(req.id, e.to_string()),
                    },
                    Err(e) => Response::err(0, format!("bad request: {e}")),
                };
                write_line(&mut write_half, &resp).await?;
            }

            event = events.recv() => match event {
                Ok(event) => write_line(&mut write_half, &event).await?,
                // A slow reader fell behind; the next Progress snapshot resyncs it.
                Err(RecvError::Lagged(_)) => {}
                Err(RecvError::Closed) => break,
            },
        }
    }
    Ok(())
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
