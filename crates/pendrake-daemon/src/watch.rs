//! `pendraked watch`, a debugging client (docs/adr/0014). It connects over the
//! local socket or the TCP listener, authenticates and unlocks when asked,
//! subscribes, and prints every pushed notification. It never polls.
//!
//! Lifecycle lines go to stderr and notifications to stdout. With `--json` stdout
//! is the raw JSON-RPC lines.

use std::fmt::Write as _;
use std::net::SocketAddr;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use anyhow::{anyhow, bail, Context, Result};
use pendrake_core::{transport, Paths};
use pendrake_ipc::{
    AuthenticateArgs, Call, GetWalletStateArgs, Id, Notification, Request, Response, RpcError,
    UnlockArgs,
};
use serde_json::Value;
use tokio::io::{AsyncBufReadExt, AsyncRead, AsyncWrite, AsyncWriteExt, BufReader};
use tokio::net::TcpStream;
use zeroize::Zeroizing;

const USAGE: &str = "usage: pendraked watch [--tcp HOST:PORT] [--unlock] [--json]";

const BACKOFF_MIN: Duration = Duration::from_millis(500);
const BACKOFF_MAX: Duration = Duration::from_secs(10);

pub struct Options {
    tcp: Option<SocketAddr>,
    unlock: bool,
    json: bool,
}

pub fn parse_args(args: &[String]) -> Result<Options> {
    let mut opts = Options {
        tcp: None,
        unlock: false,
        json: false,
    };
    let mut rest = args.iter();
    while let Some(arg) = rest.next() {
        match arg.as_str() {
            "--tcp" => {
                let addr = rest
                    .next()
                    .ok_or_else(|| anyhow!("--tcp needs HOST:PORT\n{USAGE}"))?;
                opts.tcp = Some(addr.parse().context("--tcp is not a host:port address")?);
            }
            "--unlock" => opts.unlock = true,
            "--json" => opts.json = true,
            other => bail!("unknown argument {other}\n{USAGE}"),
        }
    }
    Ok(opts)
}

/// An error that a reconnect cannot fix, such as a wrong cookie or passphrase.
#[derive(Debug, thiserror::Error)]
#[error("{0}")]
struct Fatal(String);

pub async fn run(paths: &Paths, opts: Options) -> Result<()> {
    let passphrase = if opts.unlock {
        Some(Zeroizing::new(rpassword::prompt_password("Passphrase: ")?))
    } else {
        None
    };
    let cookie = match opts.tcp {
        Some(_) => Some(Zeroizing::new(
            std::fs::read_to_string(&paths.rpc_cookie_file)
                .with_context(|| {
                    format!(
                        "reading {} (is the daemon running with PENDRAKE_RPC_LISTEN?)",
                        paths.rpc_cookie_file.display()
                    )
                })?
                .trim()
                .to_owned(),
        )),
        None => None,
    };
    let endpoint = match opts.tcp {
        Some(addr) => addr.to_string(),
        None => paths.endpoint(),
    };
    let watcher = Watcher {
        cookie,
        passphrase,
        json: opts.json,
        endpoint,
    };

    let mut backoff = BACKOFF_MIN;
    loop {
        let outcome = match opts.tcp {
            Some(addr) => match TcpStream::connect(addr).await {
                Ok(stream) => watcher.session(stream).await,
                Err(e) => Err(e.into()),
            },
            None => match transport::connect(&watcher.endpoint).await {
                Ok(stream) => watcher.session(stream).await,
                Err(e) => Err(e.into()),
            },
        };
        match outcome {
            Ok(()) => {
                watcher.note("disconnected: the daemon closed the connection");
                backoff = BACKOFF_MIN;
            }
            Err(e) if e.is::<Fatal>() => return Err(e),
            Err(e) => watcher.note(&format!("disconnected: {e}")),
        }
        watcher.note(&format!("reconnecting in {:.1}s", backoff.as_secs_f64()));
        tokio::time::sleep(backoff).await;
        backoff = (backoff * 2).min(BACKOFF_MAX);
    }
}

struct Watcher {
    cookie: Option<Zeroizing<String>>,
    passphrase: Option<Zeroizing<String>>,
    json: bool,
    endpoint: String,
}

impl Watcher {
    fn note(&self, text: &str) {
        eprintln!("{}  -- {text}", clock());
    }

    async fn session<S>(&self, stream: S) -> Result<()>
    where
        S: AsyncRead + AsyncWrite,
    {
        let (read_half, mut write_half) = tokio::io::split(stream);
        let mut lines = BufReader::new(read_half).lines();
        let mut next_id = 1u64;
        self.note(&format!("connected to {}", self.endpoint));

        let mut call = |call: Call| {
            let id = Id::Number(next_id);
            next_id += 1;
            Request::new(id, call)
        };

        if let Some(cookie) = &self.cookie {
            let req = call(Call::Authenticate(AuthenticateArgs {
                cookie: String::clone(cookie),
            }));
            self.exchange(&mut write_half, &mut lines, req)
                .await?
                .map_err(|e| Fatal(format!("authenticate refused: {e}")))?;
            self.note("authenticated with the cookie");
        }

        if let Some(passphrase) = &self.passphrase {
            let req = call(Call::Unlock(UnlockArgs {
                passphrase: String::clone(passphrase),
            }));
            self.exchange(&mut write_half, &mut lines, req)
                .await?
                .map_err(|e| Fatal(format!("unlock refused: {e}")))?;
            self.note("unlocked");
        }

        let req = call(Call::GetWalletState(GetWalletStateArgs::default()));
        match self.exchange(&mut write_half, &mut lines, req).await? {
            Ok(state) => {
                let locked = state["locked"].as_bool().unwrap_or(false);
                self.note(&format!(
                    "wallets exist: {}, session locked: {}, passphrase held: {}",
                    state["exists"].as_bool().unwrap_or(false),
                    locked,
                    state["sessionHeld"].as_bool().unwrap_or(false),
                ));
                if locked {
                    self.note("locked sessions receive only event.error; pass --unlock to see wallet events");
                }
            }
            Err(e) => self.note(&format!("getWalletState refused: {e}")),
        }

        let req = call(Call::SubscribeEvents);
        self.exchange(&mut write_half, &mut lines, req)
            .await?
            .map_err(|e| anyhow!("subscribeEvents refused: {e}"))?;
        self.note("subscribed, waiting for events");

        while let Some(line) = lines.next_line().await? {
            self.show(&line);
        }
        Ok(())
    }

    /// Sends one request and returns its reply. Notifications that arrive first
    /// are printed.
    async fn exchange<W, R>(
        &self,
        write_half: &mut W,
        lines: &mut tokio::io::Lines<BufReader<R>>,
        req: Request,
    ) -> Result<Result<Value, RpcError>>
    where
        W: AsyncWrite + Unpin,
        R: AsyncRead + Unpin,
    {
        let mut encoded = serde_json::to_vec(&req)?;
        encoded.push(b'\n');
        write_half.write_all(&encoded).await?;
        while let Some(line) = lines.next_line().await? {
            if let Ok(resp) = serde_json::from_str::<Response>(&line) {
                if resp.id.as_ref() == Some(&req.id) {
                    return Ok(resp.into_result());
                }
            }
            self.show(&line);
        }
        bail!("the daemon closed the connection before replying")
    }

    fn show(&self, line: &str) {
        if self.json {
            println!("{line}");
            return;
        }
        let Ok(value) = serde_json::from_str::<Value>(line) else {
            println!("{}  ?? {line}", clock());
            return;
        };
        match serde_json::from_value::<Notification>(value.clone()) {
            Ok(note) => println!("{}  {}", clock(), describe(&note)),
            Err(_) => println!("{}  reply {value}", clock()),
        }
    }
}

/// One line for a notification: the method, the Wallet and the main fields.
/// Unknown methods print the whole payload.
fn describe(note: &Notification) -> String {
    let p = &note.params;
    let wallet = p["walletId"].as_str().map(short_id).unwrap_or_default();
    let mut out = format!("{:<18} {wallet:<8} ", note.method);
    let status = |s: &Value| {
        let mut text = format!(
            "{} {}/{} {}%",
            s["state"].as_str().unwrap_or("?"),
            s["syncedHeight"],
            s["chainTip"],
            s["percent"]
        );
        if let Some(phase) = s["phase"].as_str() {
            let _ = write!(text, " {phase}");
        }
        if let Some(eta) = s["etaSeconds"].as_u64() {
            let _ = write!(text, " eta {eta}s");
        }
        text
    };
    match note.method.as_str() {
        "event.progress" => {
            let batches = p["batches"].as_array().map_or(0, Vec::len);
            let _ = write!(out, "{} batches={batches}", status(&p["status"]));
        }
        "event.finished" => {
            let _ = write!(out, "{}", status(&p["status"]));
        }
        "event.transaction" => {
            let zec = p["valueZat"]
                .as_str()
                .and_then(|z| z.parse::<f64>().ok())
                .map_or_else(|| p["valueZat"].to_string(), |z| format!("{:.8}", z / 1e8));
            let _ = write!(
                out,
                "{} {zec} ZEC txid={}",
                p["kind"].as_str().unwrap_or("?"),
                p["txid"].as_str().unwrap_or("?")
            );
        }
        "event.batchDone" => {
            let b = &p["batch"];
            let _ = write!(
                out,
                "{}..{} {} outputs={}",
                b["start"],
                b["end"],
                b["priority"].as_str().unwrap_or("?"),
                b["outputs"]
            );
        }
        "event.error" => {
            let _ = write!(out, "{}", p["message"].as_str().unwrap_or("?"));
            if p["unreachable"].as_bool() == Some(true) {
                out.push_str(" [unreachable]");
            }
            if p["wrongChain"].as_bool() == Some(true) {
                out.push_str(" [wrong chain]");
            }
        }
        "event.priceUpdate" => {
            let s = &p["spot"];
            let _ = write!(
                out,
                "{} USD/ZEC sources={}",
                s["usdPerZec"],
                s["sources"].as_array().map_or(0, Vec::len)
            );
            if s["stale"].as_bool() == Some(true) {
                out.push_str(" [stale]");
            }
            if s["diverged"].as_bool() == Some(true) {
                out.push_str(" [diverged]");
            }
        }
        _ => {
            let _ = write!(out, "{p}");
        }
    }
    out
}

fn short_id(id: &str) -> String {
    id.chars().take(8).collect()
}

/// The UTC time of day as `HH:MM:SS`.
fn clock() -> String {
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |d| d.as_secs())
        % 86_400;
    format!(
        "{:02}:{:02}:{:02}",
        secs / 3600,
        secs % 3600 / 60,
        secs % 60
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn args_parse_every_flag_and_refuse_the_rest() {
        let opts = parse_args(&[
            "--tcp".into(),
            "127.0.0.1:9000".into(),
            "--unlock".into(),
            "--json".into(),
        ])
        .unwrap();
        assert_eq!(opts.tcp, Some("127.0.0.1:9000".parse().unwrap()));
        assert!(opts.unlock && opts.json);

        let plain = parse_args(&[]).unwrap();
        assert!(plain.tcp.is_none() && !plain.unlock && !plain.json);

        assert!(parse_args(&["--tcp".into()]).is_err());
        assert!(parse_args(&["--tcp".into(), "nope".into()]).is_err());
        assert!(parse_args(&["--poll".into()]).is_err());
    }

    #[test]
    fn a_transaction_describes_itself_in_zec() {
        let note: Notification = serde_json::from_str(
            r#"{"jsonrpc":"2.0","method":"event.transaction","params":{"walletId":"abcdef0123456789","txid":"ab","kind":"received","valueZat":"150000000","received":true}}"#,
        )
        .unwrap();
        assert_eq!(
            describe(&note),
            "event.transaction  abcdef01 received 1.50000000 ZEC txid=ab"
        );
    }

    #[test]
    fn an_error_carries_its_fault_markers() {
        let note: Notification = serde_json::from_str(
            r#"{"jsonrpc":"2.0","method":"event.error","params":{"walletId":"w1","message":"refused","unreachable":true}}"#,
        )
        .unwrap();
        assert_eq!(
            describe(&note),
            "event.error        w1       refused [unreachable]"
        );
    }

    #[test]
    fn progress_shows_the_status_and_batch_count() {
        let note: Notification = serde_json::from_str(
            r#"{"jsonrpc":"2.0","method":"event.progress","params":{"walletId":"w1","status":{"state":"syncing","syncedHeight":10,"chainTip":100,"percent":10,"phase":"scanning","etaSeconds":7},"batches":[{},{}]}}"#,
        )
        .unwrap();
        assert_eq!(
            describe(&note),
            "event.progress     w1       syncing 10/100 10% scanning eta 7s batches=2"
        );
    }
}
