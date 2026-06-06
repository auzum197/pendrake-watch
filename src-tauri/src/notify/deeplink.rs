//! The `pendrake://` deep-link contract shared by notifications and the GUI's URI
//! handler. Keep this in sync with `src/lib/deeplink.ts` on the frontend.
//!
//! The scheme name is **provisional** — final value is dorianvp's call. It lives in
//! one place ([`URI_SCHEME`]) so changing it is a one-line edit here (plus the
//! mirror constant in `deeplink.ts` and `tauri.conf.json`).

/// Custom URI scheme. Provisional; TBD with dorianvp.
pub const URI_SCHEME: &str = "pendrake";

/// A notification click intent, encoded as `pendrake://<host>?<query>`.
///
/// We only notify on a **new transaction** (decision with dorianvp: don't notify on
/// sync lifecycle events — too noisy). Kept as an enum for forward-compatibility.
#[derive(Debug, Clone)]
pub enum DeepLink {
    /// A transaction touched an account → open it in the history view.
    Tx { account: u32, txid: String },
}

impl DeepLink {
    pub fn to_uri(&self) -> String {
        match self {
            DeepLink::Tx { account, txid } => {
                format!("{URI_SCHEME}://tx?account={account}&txid={}", encode(txid))
            }
        }
    }
}

/// Minimal percent-encoding for query values: RFC 3986 unreserved characters pass
/// through untouched, everything else is `%XX`.
fn encode(s: &str) -> String {
    s.bytes()
        .map(|b| match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                (b as char).to_string()
            }
            _ => format!("%{b:02X}"),
        })
        .collect()
}
