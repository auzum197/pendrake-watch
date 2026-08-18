import { subDays, subMonths, subYears } from "date-fns";
import type { Balance, PricePoint, SyncStatus, Tx } from "@/lib/ipc";

export function confirmed(pool: Balance["orchard"]): bigint {
  return BigInt(pool?.confirmed ?? "0");
}

export function totalConfirmed(balance: Balance | null): bigint | null {
  if (!balance) return null;
  return (
    confirmed(balance.ironwood) +
    confirmed(balance.orchard) +
    confirmed(balance.sapling) +
    confirmed(balance.transparent)
  );
}

export function formatZec(zatoshis: bigint): string {
  return (Number(zatoshis) / 1e8).toLocaleString(undefined, {
    maximumFractionDigits: 8,
  });
}

// The raw zatoshi count, grouped. For per-note amounts, where dust (a few hundred
// zatoshis) rounds to a misleading 0 in ZEC.
export function formatZat(zatoshis: bigint): string {
  return zatoshis.toLocaleString();
}

// Below this, ZEC notation is all leading zeros and reads as dust, so show the raw
// zatoshi count instead.
const ZEC_DISPLAY_FLOOR = 100_000n;

// A note amount in whichever unit reads better: ZEC once it's at least 0.001 ZEC,
// otherwise the raw zatoshi count.
export function formatNoteAmount(zatoshis: bigint): {
  value: string;
  unit: string;
} {
  return zatoshis >= ZEC_DISPLAY_FLOOR
    ? { value: formatZec(zatoshis), unit: "ZEC" }
    : { value: formatZat(zatoshis), unit: "zat" };
}

// ZEC at a fixed number of decimals, padded, for columns that align on the point.
// formatZec trims trailing zeros for the headline figure. The notes debug view wants
// every row the same width (8 places in the table, 4 in the summary cards).
export function formatZecFixed(zatoshis: bigint, decimals: number): string {
  return (Number(zatoshis) / 1e8).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// At the chain tip the daemon keeps running short maintenance rounds: each new
// block flips state to "syncing" and drops syncedHeight a block or two below the
// tip until the round commits, flickering "Synced" <-> "Syncing 100%" once per
// block. Treat being within a couple of blocks of the tip as synced so the label
// holds steady.
const TIP_SLACK = 2;

export function isSynced(sync: SyncStatus | null): boolean {
  if (!sync) return false;
  if (sync.state === "error") return false;
  // Idle with no chain data = loaded but never tip-followed (manual sync).
  if (sync.state === "idle") {
    if (sync.chainTip === 0 && sync.syncedHeight === 0) return false;
    return true;
  }
  return (
    sync.chainTip > 0 &&
    sync.chainTip - sync.syncedHeight <= TIP_SLACK &&
    sync.percent >= 99
  );
}

/** True only while a sync round is in flight. */
export function isActivelySyncing(sync: SyncStatus | null): boolean {
  return !!sync && sync.state === "syncing" && !isSynced(sync);
}

export function syncLabel(sync: SyncStatus | null): string {
  if (!sync) return "Connecting…";
  if (sync.state === "error") {
    return sync.wrongChain ? "Wrong chain" : "Sync error";
  }
  if (isSynced(sync)) return "Synced";
  // Idle / not started: do not claim "Syncing… 0%".
  if (sync.state !== "syncing") return "Not synced";
  return `Syncing… ${Math.round(sync.percent)}%`;
}

export function formatHeight(sync: SyncStatus | null): string {
  const h = sync?.chainTip || sync?.syncedHeight;
  return h ? h.toLocaleString() : "—";
}

// The block-height pair can't double as a progress readout: the engine scans the
// tip region first, so syncedHeight leaps to within a few blocks of chainTip
// while most outputs are still unscanned. The reliable companion to `percent` is
// the time left, which tracks the real output rate. Null until the daemon has
// enough throughput history to estimate.
export function formatEta(seconds: number | undefined): string | null {
  if (!seconds || seconds <= 0) return null;
  if (seconds < 60) return "less than a minute left";
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `~${mins} min left`;
  const hrs = Math.round(seconds / 3600);
  return `~${hrs} hr${hrs === 1 ? "" : "s"} left`;
}

// Each point carries the transaction's time (for the chart's time axis) and a
// stable key (the txid, or "start" for the leading point) so the chart can tween
// a point by identity when the series grows out of order during the scan.
export type BalancePoint = {
  key: string;
  t: number;
  value: number;
  label: string;
  // The block the transaction confirmed in, for the tooltip. Absent on the
  // synthetic leading point, which belongs to no transaction.
  height?: number;
  // The ZEC balance held at this point, carried on the USD series so the tooltip can
  // show the ZEC amount alongside the fiat value. Absent on the plain ZEC series (where
  // `value` is already ZEC).
  zec?: number;
  // Marks a balance-change point on the USD series, so the chart draws a dot only there
  // while the dense interpolated samples between changes stay dotless.
  change?: boolean;
  // The USD size of the jump at a change point (|Δzec| × price), so the chart can dot only
  // the changes big enough to matter and let clustered dust changes pass without a dot.
  jump?: number;
};

function shortDate(epoch: number): string {
  const ms = epoch < 1e12 ? epoch * 1000 : epoch;
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// A transaction's effect on the confirmed balance. Prefer the daemon's signed net
// delta (received +, sent/shield/self −fee); fall back to the signed display value for
// a daemon that predates `netZat`, so the chart renders instead of throwing on
// BigInt(undefined). The fallback is less accurate through shields and self-sends.
function txDelta(t: Tx): bigint {
  if (t.netZat != null) return BigInt(t.netZat);
  const v = BigInt(t.valueZat);
  return t.kind === "received" ? v : -v;
}

// The daemon keeps no balance history, so reconstruct the confirmed balance after
// each transaction by walking the history backward from the current confirmed total,
// subtracting each transaction's net balance change. Anchoring on the live balance
// keeps the latest point equal to the headline figure, and using the net delta (not
// the display `valueZat`) keeps the walk honest through shields and self-sends. When
// the transactions reconcile with the balance the residual before the first one is
// ~0, so the curve opens at zero. If they don't reconcile (e.g. a watch-only scan
// missing early receives), that residual is the balance the wallet must have held
// before the first visible transaction, and it shows as the starting point — the
// chart can't invent history it wasn't given. A leading point sits a short runway
// before the first transaction so the area rises out of a flat run. Balance can never
// be negative, so each point is floored at zero.
export function balanceHistory(
  txs: Tx[],
  balance: Balance | null,
): BalancePoint[] {
  const confirmedTxs = txs
    .filter((t) => t.status === "confirmed")
    .sort((a, b) => a.datetime - b.datetime);
  if (confirmedTxs.length === 0) return [];

  const floor = (zat: bigint) => (zat < 0n ? 0n : zat);
  const toZec = (zat: bigint) => Number(zat) / 1e8;

  const afters: bigint[] = new Array(confirmedTxs.length);
  let running = totalConfirmed(balance) ?? 0n;
  for (let i = confirmedTxs.length - 1; i >= 0; i--) {
    afters[i] = floor(running);
    // The delta is already signed, so undoing a transaction is a plain subtraction.
    running -= txDelta(confirmedTxs[i]);
  }

  // Push the leading point back by a fraction of the series' full time span so the
  // curve gets a flat run before the first receive. Sizing the margin off the span
  // (the chart's own width) keeps it visibly proportional whether the history is
  // dense or sparse, and it recomputes as the span grows while the scan streams
  // points in. Falls back to a day when every confirmed tx shares a timestamp.
  const first = confirmedTxs[0].datetime;
  const last = confirmedTxs[confirmedTxs.length - 1].datetime;
  const span = last - first;
  const runway = span > 0 ? Math.round(span * 0.07) : 86_400;

  const points: BalancePoint[] = [
    {
      key: "start",
      t: first - runway,
      value: toZec(floor(running)),
      label: "",
    },
  ];
  for (let i = 0; i < confirmedTxs.length; i++) {
    points.push({
      key: confirmedTxs[i].txid,
      t: confirmedTxs[i].datetime,
      value: toZec(afters[i]),
      label: shortDate(confirmedTxs[i].datetime),
      height: confirmedTxs[i].blockHeight,
    });
  }
  return points;
}

export type ChartRange = "all" | "year" | "month" | "week" | "day";

// Clip the reconstructed balance series to a trailing time window. "all" passes the
// full series through. For a window, keep the points inside it and prepend a baseline
// at the window's start carrying the balance the wallet held entering it, so the area
// opens at that level instead of dropping to zero. When no transaction lands in the
// window the balance is flat across it (one line from the entering balance to now), and
// when the window reaches back past the first transaction there's nothing to clip, so
// the full series passes through.
export function filterRange(
  points: BalancePoint[],
  range: ChartRange,
): BalancePoint[] {
  if (range === "all" || points.length === 0) return points;
  const now = Date.now();
  const startOf = {
    year: subYears(now, 1),
    month: subMonths(now, 1),
    week: subDays(now, 7),
    day: subDays(now, 1),
  }[range].getTime();
  // Points carry their time in the daemon's unit (unix seconds); match it so the
  // cutoff lands in the same space, the way shortDate sniffs seconds vs millis.
  const inMs = points[points.length - 1].t >= 1e12;
  const cutoff = inMs ? startOf : Math.floor(startOf / 1000);
  const before = points.filter((p) => p.t < cutoff);
  if (before.length === 0) return points;
  const enter = before[before.length - 1].value;
  const baseline: BalancePoint = {
    key: "range-start",
    t: cutoff,
    value: enter,
    label: "",
  };
  const within = points.filter((p) => p.t >= cutoff);
  if (within.length === 0) {
    const nowT = inMs ? now : Math.floor(now / 1000);
    return [baseline, { key: "range-now", t: nowT, value: enter, label: "" }];
  }
  return [baseline, ...within];
}

const USD = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
});

// A fiat figure. Sub-dollar values keep more precision so a small balance doesn't read
// as $0.00; from a dollar up it's the plain two-decimal currency form.
export function formatUsd(value: number): string {
  if (value > 0 && value < 1) {
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 4 })}`;
  }
  return USD.format(value);
}

// Build a ZEC/USD price lookup from the daily series: given an instant (unix seconds or
// millis), returns the price that day, carrying the last known price forward across gaps
// and holding the earliest for instants before coverage. Null when the series is empty.
// Used for the per-transaction USD value (price at the transaction's date).
export function priceLookup(
  prices: PricePoint[],
): (epoch: number) => number | null {
  const days = prices
    .map((p) => ({ t: Date.parse(`${p.date}T00:00:00Z`), usd: p.usdPerZec }))
    .filter((d) => Number.isFinite(d.t))
    .sort((a, b) => a.t - b.t);
  if (days.length === 0) return () => null;
  return (epoch: number) => {
    const ms = epoch < 1e12 ? epoch * 1000 : epoch;
    if (ms <= days[0].t) return days[0].usd;
    let lo = 0;
    let hi = days.length - 1;
    let idx = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (days[mid].t <= ms) {
        idx = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return days[idx].usd;
  };
}

// Number of evenly-spaced samples the fiat curve is drawn with across the visible window.
// At ~900px wide that's roughly a point every 3px, so hovering lands on a value at any x
// (recharts snaps to the nearest datum) and the interpolated curve reads as continuous.
const FIAT_SAMPLES = 300;

// Days per Span, for windowing the fiat series (mirrors filterRange).
const SPAN_DAYS: Record<Exclude<ChartRange, "all">, number> = {
  year: 365,
  month: 30,
  week: 7,
  day: 1,
};

// Linearly-interpolated ZEC/USD price at an instant, between the surrounding daily marks.
// Interpolation (rather than a step lookup) is what lets the curve and the hover value move
// smoothly between the once-a-day marks. Held flat before the first mark and after the last.
function priceInterpolator(
  prices: PricePoint[],
  toUnit: (ms: number) => number,
): ((t: number) => number) | null {
  const days = prices
    .map((p) => ({ t: toUnit(Date.parse(`${p.date}T00:00:00Z`)), usd: p.usdPerZec }))
    .filter((d) => Number.isFinite(d.t))
    .sort((a, b) => a.t - b.t);
  if (days.length === 0) return null;
  return (t: number) => {
    if (t <= days[0].t) return days[0].usd;
    if (t >= days[days.length - 1].t) return days[days.length - 1].usd;
    let lo = 0;
    let hi = days.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (days[mid].t <= t) lo = mid;
      else hi = mid;
    }
    const a = days[lo];
    const b = days[hi];
    return a.usd + (b.usd - a.usd) * ((t - a.t) / (b.t - a.t));
  };
}

// Mark the reconstructed ZEC balance against the daily price series to get the fiat curve:
// `value = balance(t) × price(t)`. The balance is a step function, the price a daily wave,
// so the curve holds the price's shape between transactions and jumps at each one.
//
// The window is sampled densely and evenly (`FIAT_SAMPLES` points) so the line is smooth
// and the tooltip tracks the cursor at any x, not just at transactions. Balance changes are
// injected as a vertical pair at their instant (old×price, new×price) and flagged so the
// chart draws a dot only there. Each point carries the ZEC balance held at that moment, for
// the tooltip. Empty when either input is empty, so the caller falls back to the ZEC view
// (fiat is always additive).
export function fiatSeries(
  balance: BalancePoint[],
  prices: PricePoint[],
  spot: number | null,
  range: ChartRange,
  nowMs: number,
): BalancePoint[] {
  if (balance.length === 0 || prices.length === 0) return [];

  const inMs = balance[balance.length - 1].t >= 1e12;
  const toUnit = (ms: number) => (inMs ? ms : Math.floor(ms / 1000));
  const priceAt = priceInterpolator(prices, toUnit);
  if (!priceAt) return [];

  const balanceAt = (t: number): number => {
    let v = balance[0].value;
    for (const p of balance) {
      if (p.t <= t) v = p.value;
      else break;
    }
    return v;
  };

  const firstT = balance[0].t;
  const end = Math.max(toUnit(nowMs), balance[balance.length - 1].t);
  const dayUnit = inMs ? 86_400_000 : 86_400;
  let start = firstT;
  if (range !== "all") {
    start = Math.max(firstT, end - SPAN_DAYS[range] * dayUnit);
  }
  if (end <= start) return [];

  const out: BalancePoint[] = [];
  const dt = (end - start) / FIAT_SAMPLES;
  for (let i = 0; i <= FIAT_SAMPLES; i++) {
    const t = i === FIAT_SAMPLES ? end : Math.round(start + i * dt);
    // The tip uses the live spot when available, since today's daily mark may not have
    // landed yet; every other sample uses the interpolated historical price.
    const p = i === FIAT_SAMPLES ? (spot ?? priceAt(t)) : priceAt(t);
    const zec = balanceAt(t);
    out.push({ key: `s${i}`, t, value: zec * p, zec, label: shortDate(t) });
  }

  // A vertical step + dot at each balance change inside the window.
  for (let i = 1; i < balance.length; i++) {
    const tc = balance[i].t;
    if (tc <= start || tc > end) continue;
    const p = priceAt(tc);
    const oldZec = balance[i - 1].value;
    const newZec = balance[i].value;
    out.push({ key: `${balance[i].key}:pre`, t: tc, value: oldZec * p, zec: oldZec, label: "" });
    out.push({
      key: balance[i].key,
      t: tc,
      value: newZec * p,
      zec: newZec,
      jump: Math.abs(newZec - oldZec) * p,
      label: shortDate(tc),
      height: balance[i].height,
      change: true,
    });
  }

  // Order the merged samples and step pairs by time; at a shared instant the step's "pre"
  // point sorts just before its "post" so the jump renders in the right direction, and the
  // even sample lands after both.
  return out.sort((a, b) => {
    if (a.t !== b.t) return a.t - b.t;
    const rank = (p: BalancePoint) =>
      p.key.endsWith(":pre") ? 0 : p.change ? 1 : 2;
    return rank(a) - rank(b);
  });
}

// Where the current balance sits against the highest it has ever reached (the
// all-time high). Returns the percent of that peak and whether we're at it.
// Null when there's no positive history to compare against. The history is
// provisional mid-sync, so callers gate this on a synced wallet.
export function athStanding(
  points: BalancePoint[],
): { pct: number; atPeak: boolean } | null {
  if (points.length === 0) return null;
  const ath = Math.max(...points.map((p) => p.value));
  if (ath <= 0) return null;
  const current = points[points.length - 1].value;
  const raw = (current / ath) * 100;
  const rounded = Math.round(raw);
  // A tiny balance against a large peak rounds down to 0%, which reads as
  // nothing left when there still is. Keep two significant digits in that
  // sub-1% range so a real holding never shows as 0%.
  const pct = rounded === 0 && raw > 0 ? Number(raw.toPrecision(2)) : rounded;
  return { pct, atPeak: rounded >= 100 };
}

// A transaction trips the list's memo indicator when any of its notes carries a
// memo. Empty memos are stripped daemon-side, so a present `memo` is real, and
// transparent-only transactions (no shielded notes) never trip it.
export function txHasMemo(tx: Tx): boolean {
  return tx.notes.some((n) => !!n.memo);
}

export type AddressParts = { prefix: string; head: string; tail: string };

// Split a Zcash address into its encoding prefix and data body so the detail view
// can color the two apart. Bech32(m) forms (unified "u1…", Sapling "zs1…") put
// the human-readable part before the final "1" separator; transparent base58
// forms ("t1…", "t3…") have no separator, so the two-character version stands in.
// The body is then clipped to the first and last `visible` characters.
export function splitAddress(addr: string, visible = 6): AddressParts {
  let prefix: string;
  if (addr.startsWith("t")) {
    prefix = addr.slice(0, 2);
  } else {
    const sep = addr.lastIndexOf("1");
    prefix = sep > 0 ? addr.slice(0, sep + 1) : addr.slice(0, 2);
  }
  const data = addr.slice(prefix.length);
  if (data.length <= visible * 2) return { prefix, head: data, tail: "" };
  return { prefix, head: data.slice(0, visible), tail: data.slice(-visible) };
}

// A transaction's confirming block, for the list's block column. Pending
// transactions have no height yet, so they read as a dash.
export function formatBlock(height: number | undefined): string {
  return height ? `#${height.toLocaleString()}` : "—";
}

// Zatoshis to a plain ZEC decimal with no thousands grouping, so it's safe to drop
// into a CSV cell or the clipboard. Exact integer math, no float rounding. formatZec
// is the grouped, human-facing counterpart for the UI.
export function zatToZecPlain(zat: bigint): string {
  const neg = zat < 0n;
  const abs = neg ? -zat : zat;
  const frac = (abs % 100_000_000n).toString().padStart(8, "0").replace(/0+$/, "");
  return `${neg ? "-" : ""}${abs / 100_000_000n}${frac ? `.${frac}` : ""}`;
}

// The activity list as CSV text for the clipboard. Newest first, matching the list
// on screen. No field can hold a comma (hex txid, enum kind/status, ISO date, plain
// decimal), so rows need no quoting. Block is blank while a transaction is pending.
export function txsToCsv(txs: Tx[]): string {
  const header = "Block,Date,Type,Status,Amount (ZEC),Txid";
  const ordered = [...txs].sort((a, b) => {
    const ha = a.blockHeight ?? Infinity;
    const hb = b.blockHeight ?? Infinity;
    if (ha !== hb) return hb - ha;
    return b.datetime - a.datetime;
  });
  const rows = ordered.map((tx) => {
    const ms = tx.datetime < 1e12 ? tx.datetime * 1000 : tx.datetime;
    return [
      tx.blockHeight ?? "",
      new Date(ms).toISOString(),
      tx.kind,
      tx.status,
      zatToZecPlain(BigInt(tx.valueZat)),
      tx.txid,
    ].join(",");
  });
  return [header, ...rows].join("\n");
}

export function formatTime(epoch: number): string {
  const ms = epoch < 1e12 ? epoch * 1000 : epoch;
  const d = new Date(ms);
  const today = new Date();
  const hhmm = d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  return sameDay
    ? `Today ${hhmm}`
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}