//! Fiat price fetching, cross-source reconciliation, and caching (AUZ-83, docs/adr/0008).
//!
//! Off by default: the refresh loop only runs once the user consents (`fiat_enabled`).
//! Only the current spot and bulk daily series are fetched, never a price keyed to a
//! transaction's height or time, so a lookup can't be correlated to wallet activity.
//!
//! Prices come from several providers and are reconciled by median so one bad feed can't
//! move the number. Where only one provider covers a period (the pre-2020 tail served from
//! a bundled CSV), the point is marked low [`Confidence`].

use std::collections::BTreeMap;
use std::path::Path;
use std::time::Duration;

use anyhow::{Context, Result};
use pendrake_ipc::{Confidence, PricePoint, PriceSpot};
use serde::{Deserialize, Serialize};

/// Reconciled points whose sources disagree by more than this fraction carry the
/// `diverged` flag, so the UI can surface low confidence without hiding the value.
const DIVERGENCE_THRESHOLD: f64 = 0.02;

/// Daily closes for 2016-10-29 → 2020-12-07, the span before Coinbase's ZEC-USD candle
/// floor. `date,usd` per line, no header. Frozen historical data: old closes don't change,
/// so a bundled file needs no network and sidesteps the providers' redistribution terms
/// for the deep tail.
const TAIL_CSV: &str = include_str!("../assets/zec-usd-daily-tail.csv");

const COINBASE_FLOOR: &str = "2020-12-08";

/// A common desktop-browser User-Agent, so price requests blend into ordinary web traffic
/// instead of announcing the wallet. A distinctive UA like `pendrake-watch` fingerprints
/// every fetch as this app to the provider and its CDN, tying the app to the source IP,
/// which is the metadata leak docs/adr/0008 sets out to bound. Windows Chrome is the single
/// largest UA share, so it's the widest crowd to hide in.
const BROWSER_USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36";

/// The reconciled price state the daemon caches and serves. Persisted to `price_cache.json`
/// as plaintext (it holds nothing secret), mirroring `notified.json`.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct PriceCache {
    /// Last reconciled spot, kept across restarts so the GUI opens on a value rather than a
    /// blank while the first fetch runs. Carries its own `fetched_at` for staleness.
    pub spot: Option<PriceSpot>,
    /// Daily marks keyed by UTC `YYYY-MM-DD`. Immutable once written: only new days append,
    /// so a provider changing an old close doesn't rewrite history.
    #[serde(default)]
    pub daily: BTreeMap<String, PricePoint>,
}

impl PriceCache {
    pub fn load(path: &Path) -> Self {
        std::fs::read(path)
            .ok()
            .and_then(|bytes| serde_json::from_slice(&bytes).ok())
            .unwrap_or_default()
    }

    pub fn save(&self, path: &Path) -> Result<()> {
        let bytes = serde_json::to_vec(self).context("serializing price_cache.json")?;
        let tmp = path.with_extension("json.tmp");
        std::fs::write(&tmp, &bytes).context("writing price_cache.json.tmp")?;
        std::fs::rename(&tmp, path).context("renaming price_cache.json")?;
        Ok(())
    }

    /// The date to fetch the daily series from. Once the deep history is backfilled (the
    /// oldest Coinbase day is present), only the newest cached day forward, so a routine
    /// refresh is one request instead of paging to the 2020 floor every day. `None` before
    /// backfill, asking for the full range. Gated on the Coinbase floor day, not the newest
    /// key: the CSV tail always seeds days back to 2020-12-07, and CoinGecko can seed the
    /// last year, so a newest key of "today" doesn't imply the middle stretch is covered.
    pub fn daily_since(&self) -> Option<String> {
        if self.daily.contains_key(COINBASE_FLOOR) {
            self.daily.keys().next_back().cloned()
        } else {
            None
        }
    }

    /// Seed the tail once from the bundled CSV, filling only days not already present so a
    /// live provider's overlap wins. Cheap to call on every load; a no-op once seeded.
    pub fn seed_tail(&mut self) {
        for (date, usd) in parse_tail(TAIL_CSV) {
            self.daily.entry(date.clone()).or_insert(PricePoint {
                date,
                usd_per_zec: usd,
                confidence: Confidence::Low,
                diverged: false,
            });
        }
    }
}

/// Median when three or more sources cover a point, mean when two, the lone value
/// otherwise. Returns the reconciled price and whether the samples diverged beyond
/// [`DIVERGENCE_THRESHOLD`]. `None` for an empty set.
pub fn reconcile(mut samples: Vec<f64>) -> Option<(f64, bool)> {
    samples.retain(|v| v.is_finite() && *v > 0.0);
    if samples.is_empty() {
        return None;
    }
    samples.sort_by(|a, b| a.partial_cmp(b).expect("finite, non-NaN after retain"));

    let value = if samples.len() >= 3 {
        median(&samples)
    } else {
        samples.iter().sum::<f64>() / samples.len() as f64
    };

    let spread = samples.last().copied().unwrap_or(value) - samples[0];
    let diverged = value > 0.0 && spread / value > DIVERGENCE_THRESHOLD;
    Some((value, diverged))
}

fn median(sorted: &[f64]) -> f64 {
    let mid = sorted.len() / 2;
    if sorted.len().is_multiple_of(2) {
        (sorted[mid - 1] + sorted[mid]) / 2.0
    } else {
        sorted[mid]
    }
}

/// A single `date,usd` sample from one provider, before reconciliation.
struct DailySample {
    date: String,
    usd: f64,
}

fn confidence_for(n: usize) -> Confidence {
    if n >= 2 {
        Confidence::High
    } else {
        Confidence::Low
    }
}

/// Reconcile per-day samples from several providers into the daily series. Days covered by
/// a single provider are low confidence.
fn reconcile_daily(samples: Vec<DailySample>) -> BTreeMap<String, PricePoint> {
    let mut by_day: BTreeMap<String, Vec<f64>> = BTreeMap::new();
    for s in samples {
        by_day.entry(s.date).or_default().push(s.usd);
    }
    by_day
        .into_iter()
        .filter_map(|(date, values)| {
            let confidence = confidence_for(values.len());
            reconcile(values).map(|(usd_per_zec, diverged)| {
                (
                    date.clone(),
                    PricePoint {
                        date,
                        usd_per_zec,
                        confidence,
                        diverged,
                    },
                )
            })
        })
        .collect()
}

/// The providers the daemon fetches from. All are keyless plain HTTPS GETs.
pub struct PriceFetcher {
    http: reqwest::Client,
}

impl PriceFetcher {
    pub fn new() -> Result<Self> {
        let http = reqwest::Client::builder()
            .user_agent(BROWSER_USER_AGENT)
            .timeout(Duration::from_secs(15))
            .build()
            .context("building price HTTP client")?;
        Ok(Self { http })
    }

    /// Fetch and reconcile the current spot from every reachable provider. Errors from one
    /// provider don't sink the result: whatever came back is reconciled, and only an empty
    /// set (all providers down) is an error, so the caller can keep the last-known value.
    pub async fn spot(&self) -> Result<PriceSpot> {
        let mut prices = Vec::new();
        let mut sources = Vec::new();
        for (name, result) in [
            ("coingecko", self.coingecko_spot().await),
            ("coinbase", self.coinbase_spot().await),
            ("kraken", self.kraken_spot().await),
        ] {
            match result {
                Ok(p) => {
                    prices.push(p);
                    sources.push(name.to_string());
                }
                Err(e) => tracing::warn!("spot fetch from {name} failed: {e}"),
            }
        }
        let (usd_per_zec, diverged) =
            reconcile(prices).context("no spot price provider was reachable")?;
        Ok(PriceSpot {
            usd_per_zec,
            fetched_at: now_secs(),
            sources,
            stale: false,
            diverged,
        })
    }

    /// Fetch the daily series each provider can serve and reconcile it. Coinbase reaches
    /// back to 2020-12-08; the bundled CSV covers before that. A provider that fails is
    /// skipped, not fatal. `since` bounds Coinbase's paging to the newest cached day once the
    /// deep history is backfilled, so a routine refresh is one request rather than ~8.
    pub async fn daily(&self, since: Option<&str>) -> BTreeMap<String, PricePoint> {
        let mut samples = Vec::new();
        for (name, result) in [
            ("coinbase", self.coinbase_daily(since).await),
            ("coingecko", self.coingecko_daily().await),
        ] {
            match result {
                Ok(mut days) => samples.append(&mut days),
                Err(e) => tracing::warn!("daily fetch from {name} failed: {e}"),
            }
        }
        reconcile_daily(samples)
    }

    async fn coingecko_spot(&self) -> Result<f64> {
        let url = "https://api.coingecko.com/api/v3/simple/price?ids=zcash&vs_currencies=usd";
        let body: serde_json::Value = self.http.get(url).send().await?.error_for_status()?.json().await?;
        body["zcash"]["usd"]
            .as_f64()
            .context("coingecko spot: missing zcash.usd")
    }

    async fn coinbase_spot(&self) -> Result<f64> {
        let url = "https://api.exchange.coinbase.com/products/ZEC-USD/ticker";
        let body: serde_json::Value = self.http.get(url).send().await?.error_for_status()?.json().await?;
        body["price"]
            .as_str()
            .and_then(|s| s.parse().ok())
            .context("coinbase spot: missing price")
    }

    async fn kraken_spot(&self) -> Result<f64> {
        let url = "https://api.kraken.com/0/public/Ticker?pair=ZECUSD";
        let body: serde_json::Value = self.http.get(url).send().await?.error_for_status()?.json().await?;
        // Kraken nests results under the canonical pair name (e.g. XZECZUSD); take the first.
        let result = body["result"]
            .as_object()
            .and_then(|m| m.values().next())
            .context("kraken spot: empty result")?;
        result["c"][0]
            .as_str()
            .and_then(|s| s.parse().ok())
            .context("kraken spot: missing last-trade price")
    }

    /// Coinbase daily candles, paged back to the floor (its 2020-12-08 ZEC-USD start, or a
    /// later `since` once the deep history is cached). Each page returns up to 300
    /// `[time, low, high, open, close, volume]` rows newest-first. Clamping each page's start
    /// to the floor keeps a routine `since = yesterday` refresh to a single small request.
    async fn coinbase_daily(&self, since: Option<&str>) -> Result<Vec<DailySample>> {
        let mut out = Vec::new();
        let mut end = now_secs();
        let floor =
            day_start_secs(COINBASE_FLOOR).max(since.map(day_start_secs).unwrap_or(0));
        loop {
            let start = end.saturating_sub(300 * 86_400).max(floor);
            let url = format!(
                "https://api.exchange.coinbase.com/products/ZEC-USD/candles\
                 ?granularity=86400&start={start}&end={end}"
            );
            let rows: Vec<Vec<f64>> = self
                .http
                .get(&url)
                .send()
                .await?
                .error_for_status()?
                .json()
                .await?;
            if rows.is_empty() {
                break;
            }
            for row in &rows {
                if let (Some(&t), Some(&close)) = (row.first(), row.get(4)) {
                    out.push(DailySample {
                        date: date_of(t as u64),
                        usd: close,
                    });
                }
            }
            if start <= floor {
                break;
            }
            end = start;
        }
        Ok(out)
    }

    /// CoinGecko market_chart, capped at 365 days on the free tier. Serves as a recent-window
    /// cross-check against Coinbase so those days reconcile to high confidence.
    async fn coingecko_daily(&self) -> Result<Vec<DailySample>> {
        let url = "https://api.coingecko.com/api/v3/coins/zcash/market_chart\
                   ?vs_currency=usd&days=365&interval=daily";
        let body: serde_json::Value = self.http.get(url).send().await?.error_for_status()?.json().await?;
        let prices = body["prices"]
            .as_array()
            .context("coingecko daily: missing prices")?;
        Ok(prices
            .iter()
            .filter_map(|pair| {
                let ms = pair.get(0)?.as_f64()?;
                let usd = pair.get(1)?.as_f64()?;
                Some(DailySample {
                    date: date_of((ms / 1000.0) as u64),
                    usd,
                })
            })
            .collect())
    }
}

fn parse_tail(csv: &str) -> impl Iterator<Item = (String, f64)> + '_ {
    csv.lines().filter_map(|line| {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            return None;
        }
        let (date, usd) = line.split_once(',')?;
        Some((date.trim().to_string(), usd.trim().parse().ok()?))
    })
}

pub(crate) fn now_secs() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

/// Today's UTC date as `YYYY-MM-DD`, for the once-per-day daily-series fetch gate.
pub(crate) fn today() -> String {
    date_of(now_secs())
}

/// UTC `YYYY-MM-DD` for a unix-seconds instant. Plain civil-date arithmetic (no chrono dep),
/// which is enough for keying a daily series.
fn date_of(secs: u64) -> String {
    let days = (secs / 86_400) as i64;
    let (y, m, d) = civil_from_days(days);
    format!("{y:04}-{m:02}-{d:02}")
}

fn day_start_secs(date: &str) -> u64 {
    let mut parts = date.split('-');
    let y: i64 = parts.next().and_then(|s| s.parse().ok()).unwrap_or(1970);
    let m: i64 = parts.next().and_then(|s| s.parse().ok()).unwrap_or(1);
    let d: i64 = parts.next().and_then(|s| s.parse().ok()).unwrap_or(1);
    (days_from_civil(y, m, d) * 86_400).max(0) as u64
}

// Howard Hinnant's civil-date algorithms: days since the unix epoch <-> (y, m, d).
fn civil_from_days(z: i64) -> (i64, u32, u32) {
    let z = z + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let m = (if mp < 10 { mp + 3 } else { mp - 9 }) as u32;
    (if m <= 2 { y + 1 } else { y }, m, d)
}

fn days_from_civil(y: i64, m: i64, d: i64) -> i64 {
    let y = if m <= 2 { y - 1 } else { y };
    let era = if y >= 0 { y } else { y - 399 } / 400;
    let yoe = y - era * 400;
    let doy = (153 * (if m > 2 { m - 3 } else { m + 9 }) + 2) / 5 + d - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146_097 + doe - 719_468
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reconcile_takes_median_of_three() {
        let (value, diverged) = reconcile(vec![416.0, 415.0, 500.0]).unwrap();
        assert_eq!(value, 416.0);
        // 500 vs 415 is a wide spread, so the point is flagged even though the median holds.
        assert!(diverged);
    }

    #[test]
    fn reconcile_averages_two_close_sources() {
        let (value, diverged) = reconcile(vec![415.0, 415.4]).unwrap();
        assert!((value - 415.2).abs() < 1e-9);
        assert!(!diverged);
    }

    #[test]
    fn reconcile_passes_single_source_through() {
        let (value, diverged) = reconcile(vec![415.0]).unwrap();
        assert_eq!(value, 415.0);
        assert!(!diverged);
    }

    #[test]
    fn reconcile_drops_junk_and_empty() {
        assert!(reconcile(vec![]).is_none());
        assert!(reconcile(vec![f64::NAN, -1.0, 0.0]).is_none());
    }

    #[test]
    fn single_source_day_is_low_confidence() {
        let series = reconcile_daily(vec![
            DailySample { date: "2019-01-01".into(), usd: 50.0 },
            DailySample { date: "2022-01-01".into(), usd: 120.0 },
            DailySample { date: "2022-01-01".into(), usd: 121.0 },
        ]);
        assert_eq!(series["2019-01-01"].confidence, Confidence::Low);
        assert_eq!(series["2022-01-01"].confidence, Confidence::High);
    }

    #[test]
    fn bundled_tail_covers_pre_coinbase_span() {
        let mut cache = PriceCache::default();
        cache.seed_tail();
        // The tail spans ZEC's launch day to the day before Coinbase's candle floor, so the
        // ALL span waves all the way back instead of holding flat before 2020-12.
        assert!(cache.daily.len() > 1400, "tail is thin: {}", cache.daily.len());
        assert!(cache.daily.contains_key("2016-10-29"));
        assert!(cache.daily.contains_key("2020-12-07"));
        assert!(!cache.daily.contains_key("2020-12-08")); // Coinbase's territory
        // Every seeded day is single-source, so it reads as low confidence.
        assert!(cache
            .daily
            .values()
            .all(|p| p.confidence == Confidence::Low));
    }

    #[test]
    fn daily_since_gates_on_deep_history() {
        // Only the CSV tail seeded: the deep Coinbase history isn't cached yet, so ask for
        // the full range even though the tail's newest key is 2020-12-07.
        let mut cache = PriceCache::default();
        cache.seed_tail();
        assert_eq!(cache.daily_since(), None);

        // Newest key is "today" but the middle stretch is missing (Coinbase never ran): still
        // a full fetch, or the 2020-12-08 → last-year gap would never backfill.
        cache.daily.insert(
            "2026-06-30".into(),
            PricePoint {
                date: "2026-06-30".into(),
                usd_per_zec: 40.0,
                confidence: Confidence::Low,
                diverged: false,
            },
        );
        assert_eq!(cache.daily_since(), None);

        // Deep history present (the Coinbase floor day is cached): fetch only from the newest
        // cached day forward.
        cache.daily.insert(
            COINBASE_FLOOR.into(),
            PricePoint {
                date: COINBASE_FLOOR.into(),
                usd_per_zec: 60.0,
                confidence: Confidence::High,
                diverged: false,
            },
        );
        assert_eq!(cache.daily_since().as_deref(), Some("2026-06-30"));
    }

    #[test]
    fn civil_date_round_trips() {
        // The Coinbase floor and a couple of known epochs.
        assert_eq!(date_of(0), "1970-01-01");
        assert_eq!(date_of(day_start_secs("2020-12-08")), "2020-12-08");
        assert_eq!(date_of(day_start_secs("2016-10-29")), "2016-10-29");
    }
}
