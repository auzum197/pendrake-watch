import { subDays, subMonths, subYears } from "date-fns";
import type { Balance, SyncStatus, Tx } from "@/lib/ipc";

export function confirmed(pool: Balance["orchard"]): bigint {
  return BigInt(pool?.confirmed ?? "0");
}

export function totalConfirmed(balance: Balance | null): bigint | null {
  if (!balance) return null;
  return (
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
  // `idle` is the daemon's authoritative "round reached the real tip" signal.
  if (sync.state === "idle") return true;
  // Height proximity alone is not enough: the engine scans by priority (the tip
  // region first), so syncedHeight reaches chainTip while most of the backlog
  // (and most of `percent`) is still outstanding. Require near-complete output
  // progress too, so only the tip maintenance rounds (which report 100%) read as
  // synced, not an initial sync that has merely touched the tip.
  return (
    sync.chainTip > 0 &&
    sync.chainTip - sync.syncedHeight <= TIP_SLACK &&
    sync.percent >= 99
  );
}

export function syncLabel(sync: SyncStatus | null): string {
  if (!sync) return "Connecting…";
  if (sync.state === "error") return "Sync error";
  if (isSynced(sync)) return "Synced";
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
// into a CSV cell. Exact integer math, no float rounding. formatZec is the grouped,
// human-facing counterpart for the UI.
function zatToZecPlain(zat: bigint): string {
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
