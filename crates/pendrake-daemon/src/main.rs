//! Pendrake background daemon, the `pendraked` binary (Linux and Windows).
//!
//! Supplies a desktop `Notifier`, starts the shared service via
//! `pendrake_core::run`, and waits for a clean shutdown (IPC `shutdown` or
//! process signal). macOS uses the Swift helper instead.
//!
//! Usage:
//!   pendraked                       run the daemon
//!   pendraked call <method> [json]  debug client: send one request, print the reply

mod notify;

use std::sync::Arc;

use anyhow::Result;
use pendrake_core::{transport, Config, Paths};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};

use crate::notify::DesktopNotifier;

fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "pendraked=info,pendrake_core=info,warn".into()),
        )
        .init();

    let args: Vec<String> = std::env::args().collect();
    if args.get(1).map(String::as_str) == Some("call") {
        let rt = tokio::runtime::Runtime::new()?;
        return rt.block_on(run_client(&Paths::resolve()?, &args[2..]));
    }

    // Brand desktop toasts as "Pendrake" with our icon under our own AUMID.
    #[cfg(target_os = "windows")]
    {
        let paths = Paths::resolve()?;
        paths.ensure_dirs()?;
        notify::register_identity(&paths.root);
    }

    let handle = pendrake_core::run(Config::default(), Arc::new(DesktopNotifier))?;
    tracing::info!("pendraked running");
    // Stay alive until the GUI (or a client) sends `shutdown`, or the process is
    // signalled. Dropping the handle stops the runtime, removes the socket, and
    // releases the single-instance lock.
    handle.wait_for_shutdown();
    Ok(())
}

/// Minimal debug client: send one request, print the single matching reply.
async fn run_client(paths: &Paths, args: &[String]) -> Result<()> {
    let method = args
        .first()
        .cloned()
        .ok_or_else(|| anyhow::anyhow!("usage: pendraked call <method> [json-params]"))?;
    let params: serde_json::Value = match args.get(1) {
        Some(p) => serde_json::from_str(p)?,
        None => serde_json::json!({}),
    };

    let stream = transport::connect(&paths.endpoint()).await?;
    let (read_half, mut write_half) = tokio::io::split(stream);

    let req = serde_json::json!({ "id": 1, "method": method, "params": params });
    write_half.write_all(format!("{req}\n").as_bytes()).await?;

    // `subscribeEvents` turns the connection into a live feed, so keep printing
    // pushed lines; every other method has a single reply.
    let stream = method == "subscribeEvents";
    let mut lines = BufReader::new(read_half).lines();
    while let Some(line) = lines.next_line().await? {
        println!("{line}");
        if !stream {
            break;
        }
    }
    Ok(())
}
