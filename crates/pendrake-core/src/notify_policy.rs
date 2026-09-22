//! The notification policy (ADR-0006): which detected transactions raise a toast,
//! and the one-time "scan finished" crossing.
//!
//! The Initial scan is the interval `synced_height < target`, where the target N is
//! the chain tip pinned at import. Transactions found there are recorded silently.
//! Once the wallet is live (`synced_height >= target`) each freshly seen txid
//! notifies. The seen-set is persisted so a restart never re-notifies a txid, and
//! the live edge is held in memory (initialized from the heights), so a process
//! killed mid-scan resumes in the Initial scan with nothing to recover.

use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

/// What a detected transaction should trigger.
#[derive(Debug, PartialEq, Eq)]
pub enum Disposition {
    /// Live and freshly seen: show the toast, then call [`NotificationPolicy::mark_notified`].
    Notify,
    /// In the Initial scan: recorded silently, no toast.
    Silent,
    /// Seen before (notified, or recorded during the Initial scan): nothing to do.
    AlreadySeen,
}

pub struct NotificationPolicy {
    seen: Mutex<HashSet<String>>,
    file: PathBuf,
    /// `None` until the first height reading, then `Some(true)` once the wallet has
    /// gone live this run. Drives the one-time crossing toast.
    live: Mutex<Option<bool>>,
}

impl NotificationPolicy {
    pub fn load(file: PathBuf) -> Self {
        let seen = read_seen(&file);
        Self {
            seen: Mutex::new(seen),
            file,
            live: Mutex::new(None),
        }
    }

    /// Classify a detected txid given whether the wallet is live. A fresh txid found
    /// while live notifies. Found during the Initial scan it is recorded silently, so
    /// it never notifies once the wallet goes live.
    pub fn classify(&self, txid: &str, live: bool) -> Disposition {
        let mut seen = self.seen();
        if seen.contains(txid) {
            return Disposition::AlreadySeen;
        }
        if live {
            return Disposition::Notify;
        }
        seen.insert(txid.to_owned());
        persist(&self.file, &seen);
        Disposition::Silent
    }

    /// Record a notified txid once its toast was delivered, so it isn't repeated. A
    /// failed delivery skips this, so a later rediscovery retries.
    pub fn mark_notified(&self, txid: &str) {
        let mut seen = self.seen();
        if seen.insert(txid.to_owned()) {
            persist(&self.file, &seen);
        }
    }

    /// Seed the live edge from the round's start height, before any scanning moves
    /// it. Only the first seed of a run takes; later seeds and the crossing checks
    /// leave it alone. Seeding from the start is what stops pepper-sync's tip-first
    /// scan from firing the crossing early: judged against the true start, a wallet
    /// that began behind the target stays not-yet-live until the scan reaches the
    /// tip, instead of the moment `synced_height` first races past N.
    pub fn seed_live(&self, synced_height: u32, target: u32) {
        let mut live = self.live.lock().unwrap_or_else(|e| e.into_inner());
        if live.is_none() {
            *live = Some(synced_height >= target);
        }
    }

    /// True exactly once, when `synced_height` first reaches `target` this run. A run
    /// that starts already at or past `target` is already live, so it never fires.
    pub fn crossed_to_live(&self, synced_height: u32, target: u32) -> bool {
        let now = synced_height >= target;
        let mut live = self.live.lock().unwrap_or_else(|e| e.into_inner());
        match *live {
            None => {
                *live = Some(now);
                false
            }
            Some(true) => false,
            Some(false) => {
                if now {
                    *live = Some(true);
                }
                now
            }
        }
    }

    fn seen(&self) -> std::sync::MutexGuard<'_, HashSet<String>> {
        self.seen.lock().unwrap_or_else(|e| e.into_inner())
    }
}

fn read_seen(path: &Path) -> HashSet<String> {
    std::fs::read(path)
        .ok()
        .and_then(|bytes| serde_json::from_slice(&bytes).ok())
        .unwrap_or_default()
}

fn persist(path: &Path, seen: &HashSet<String>) {
    match serde_json::to_vec(seen) {
        Ok(bytes) => {
            if let Err(e) = std::fs::write(path, bytes) {
                tracing::warn!("could not persist notified txids: {e}");
            }
        }
        Err(e) => tracing::warn!("could not serialize notified txids: {e}"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // A throwaway notified-file under the temp dir, wiped first so a rerun is clean.
    fn policy(name: &str) -> NotificationPolicy {
        let file = std::env::temp_dir().join(format!("pendrake-notify-{name}.json"));
        let _ = std::fs::remove_file(&file);
        NotificationPolicy::load(file)
    }

    #[test]
    fn live_fresh_txid_notifies_then_dedups() {
        let p = policy("notify-dedup");
        assert_eq!(p.classify("a", true), Disposition::Notify);
        p.mark_notified("a");
        assert_eq!(p.classify("a", true), Disposition::AlreadySeen);
    }

    #[test]
    fn initial_scan_records_silently_and_never_notifies() {
        let p = policy("silent-scan");
        // Found below the target: silent, and recorded.
        assert_eq!(p.classify("a", false), Disposition::Silent);
        // The same txid, now live, is already seen: still no toast.
        assert_eq!(p.classify("a", true), Disposition::AlreadySeen);
    }

    #[test]
    fn a_failed_live_delivery_is_retried() {
        let p = policy("retry");
        // Classified Notify but mark_notified not called, as if delivery failed.
        assert_eq!(p.classify("a", true), Disposition::Notify);
        // A rediscovery still asks to notify.
        assert_eq!(p.classify("a", true), Disposition::Notify);
    }

    #[test]
    fn crossing_fires_exactly_once() {
        let p = policy("crossing");
        assert!(!p.crossed_to_live(90, 100));
        assert!(!p.crossed_to_live(99, 100));
        // The first reading at or past the target fires.
        assert!(p.crossed_to_live(100, 100));
        // Never again.
        assert!(!p.crossed_to_live(101, 100));
        assert!(!p.crossed_to_live(100, 100));
    }

    #[test]
    fn a_run_starting_past_the_target_never_fires() {
        let p = policy("already-live");
        // A restart resuming already live: the first reading initializes without firing.
        assert!(!p.crossed_to_live(150, 100));
        assert!(!p.crossed_to_live(160, 100));
    }

    #[test]
    fn seeded_behind_then_fires_once_at_completion() {
        let p = policy("seed-behind");
        // Seeded from the round's true start (below target), so the only crossing
        // check, run at completion when the scan reached the tip, fires once.
        p.seed_live(80, 100);
        assert!(p.crossed_to_live(120, 100));
        assert!(!p.crossed_to_live(120, 100));
    }

    #[test]
    fn without_a_seed_a_completion_only_check_never_fires() {
        let p = policy("no-seed");
        // The first reading only initializes (the None-init), so a crossing observed
        // solely at completion would be missed. Seeding at round start is what arms it.
        assert!(!p.crossed_to_live(120, 100));
    }

    #[test]
    fn seeding_at_or_past_target_never_fires() {
        let p = policy("seed-live");
        // A restart that resumes already caught up seeds live and stays quiet.
        p.seed_live(150, 100);
        assert!(!p.crossed_to_live(160, 100));
    }

    #[test]
    fn the_seen_set_survives_a_reload() {
        let file = std::env::temp_dir().join("pendrake-notify-reload.json");
        let _ = std::fs::remove_file(&file);
        let p = NotificationPolicy::load(file.clone());
        p.mark_notified("a");
        let p2 = NotificationPolicy::load(file);
        assert_eq!(p2.classify("a", true), Disposition::AlreadySeen);
    }
}
