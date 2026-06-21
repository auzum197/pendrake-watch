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
};

function shortDate(epoch: number): string {
  const ms = epoch < 1e12 ? epoch * 1000 : epoch;
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// The daemon keeps no balance history, so reconstruct the confirmed balance
// after each transaction by walking the history backward from the current
// confirmed total. Anchoring on the live balance keeps the latest point equal
// to the headline figure regardless of fee accounting. A leading point holds
// the balance before the first transaction so the area grows from it. Balance
// can never be negative, so each point is floored at zero.
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
    const delta = BigInt(confirmedTxs[i].valueZat);
    running -= confirmedTxs[i].kind === "received" ? delta : -delta;
  }

  const points: BalancePoint[] = [
    {
      key: "start",
      t: confirmedTxs[0].datetime,
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
    });
  }
  return points;
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
  const pct = Math.round((current / ath) * 100);
  return { pct, atPeak: pct >= 100 };
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
