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

export function formatZecApprox(zatoshis: bigint): string {
  const shown = (Number(zatoshis) / 1e8).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
  return shown === formatZec(zatoshis) ? shown : `~${shown}`;
}

export function formatZat(zatoshis: bigint): string {
  return zatoshis.toLocaleString();
}

const ZEC_DISPLAY_FLOOR = 100_000n;

export function formatNoteAmount(zatoshis: bigint): {
  value: string;
  unit: string;
} {
  return zatoshis >= ZEC_DISPLAY_FLOOR
    ? { value: formatZec(zatoshis), unit: "ZEC" }
    : { value: formatZat(zatoshis), unit: "zat" };
}

export function formatZecFixed(zatoshis: bigint, decimals: number): string {
  return (Number(zatoshis) / 1e8).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

const TIP_SLACK = 2;

export function isSynced(sync: SyncStatus | null): boolean {
  if (!sync) return false;
  if (sync.state === "error") return false;
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

export function isActivelySyncing(sync: SyncStatus | null): boolean {
  return !!sync && sync.state === "syncing" && !isSynced(sync);
}

export function syncLabel(sync: SyncStatus | null): string {
  if (!sync) return "Connecting…";
  if (sync.state === "error") {
    return sync.wrongChain ? "Wrong chain" : "Sync error";
  }
  if (isSynced(sync)) return "Synced";
  if (sync.state !== "syncing") return "Not synced";
  return `Syncing… ${Math.round(sync.percent)}%`;
}

export function formatHeight(sync: SyncStatus | null): string {
  const h = sync?.chainTip || sync?.syncedHeight;
  return h ? h.toLocaleString() : "—";
}

export function formatEta(seconds: number | undefined): string | null {
  if (!seconds || seconds <= 0) return null;
  if (seconds < 60) return "less than a minute left";
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `~${mins} min left`;
  const hrs = Math.round(seconds / 3600);
  return `~${hrs} hr${hrs === 1 ? "" : "s"} left`;
}

export type BalancePoint = {
  key: string;
  t: number;
  value: number;
  label: string;
  height?: number;
  zec?: number;
  change?: boolean;
  jump?: number;
};

function shortDate(epoch: number): string {
  const ms = epoch < 1e12 ? epoch * 1000 : epoch;
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function txDelta(t: Tx): bigint {
  if (t.netZat != null) return BigInt(t.netZat);
  const v = BigInt(t.valueZat);
  return t.kind === "received" ? v : -v;
}

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
    running -= txDelta(confirmedTxs[i]);
  }

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

export function formatUsd(value: number): string {
  if (value > 0 && value < 1) {
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 4 })}`;
  }
  return USD.format(value);
}

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

const FIAT_SAMPLES = 300;

const SPAN_DAYS: Record<Exclude<ChartRange, "all">, number> = {
  year: 365,
  month: 30,
  week: 7,
  day: 1,
};

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
    const p = i === FIAT_SAMPLES ? (spot ?? priceAt(t)) : priceAt(t);
    const zec = balanceAt(t);
    out.push({ key: `s${i}`, t, value: zec * p, zec, label: shortDate(t) });
  }

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

  return out.sort((a, b) => {
    if (a.t !== b.t) return a.t - b.t;
    const rank = (p: BalancePoint) =>
      p.key.endsWith(":pre") ? 0 : p.change ? 1 : 2;
    return rank(a) - rank(b);
  });
}

export function athStanding(
  points: BalancePoint[],
): { pct: number; atPeak: boolean } | null {
  if (points.length === 0) return null;
  const ath = Math.max(...points.map((p) => p.value));
  if (ath <= 0) return null;
  const current = points[points.length - 1].value;
  const raw = (current / ath) * 100;
  const rounded = Math.round(raw);
  const pct = rounded === 0 && raw > 0 ? Number(raw.toPrecision(2)) : rounded;
  return { pct, atPeak: rounded >= 100 };
}

export function txHasMemo(tx: Tx): boolean {
  return tx.notes.some((n) => !!n.memo);
}

export type AddressParts = { prefix: string; head: string; tail: string };

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

export function formatBlock(height: number | undefined): string {
  return height ? height.toLocaleString() : "—";
}

export function formatTxDate(epoch: number): string {
  const ms = epoch < 1e12 ? epoch * 1000 : epoch;
  return new Date(ms).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function zatToZecPlain(zat: bigint): string {
  const neg = zat < 0n;
  const abs = neg ? -zat : zat;
  const frac = (abs % 100_000_000n).toString().padStart(8, "0").replace(/0+$/, "");
  return `${neg ? "-" : ""}${abs / 100_000_000n}${frac ? `.${frac}` : ""}`;
}

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