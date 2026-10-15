import type { Pool } from "@/lib/ipc";
import type { PoolSeries } from "@/lib/pools";
import type { BalancePoint } from "@/lib/format";

export type WalletStyle = "hodl" | "trader" | "dust" | "whale";

const END = Math.floor(Date.now() / 1000);
const DAY = 86_400;
const BLOCKS_PER_DAY = 1_152;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function label(t: number, spanDays: number): string {
  return new Date(t * 1000).toLocaleDateString(undefined, {
    month: "short",
    ...(spanDays > 540 ? { year: "numeric" } : { day: "numeric" }),
  });
}

function delta(style: WalletStyle, balance: number, r: () => number): number {
  switch (style) {
    case "hodl":
      return r() < 0.85
        ? r() * r() * 2 + 0.05
        : -Math.min(balance * r() * 0.3, balance);
    case "trader":
      return r() < 0.5
        ? r() * 4 + 0.1
        : -Math.min(balance * (0.1 + r() * 0.5), balance);
    case "dust":
      return r() < 0.97 ? 0.0001 + r() * 0.01 : r() * 0.5;
    case "whale":
      return r() < 0.7
        ? 100 + r() * r() * 4_900
        : -Math.min(balance * (0.2 + r() * 0.6), balance);
  }
}

export function zecSeries({
  transactions,
  years,
  style,
  seed,
}: {
  transactions: number;
  years: number;
  style: WalletStyle;
  seed: number;
}): BalancePoint[] {
  const r = mulberry32(seed);
  const span = years * 365 * DAY;
  const t0 = END - span;
  const spanDays = span / DAY;
  const times = Array.from(
    { length: transactions },
    () => t0 + r() * span,
  ).sort((a, b) => a - b);

  let balance = 0;
  let height = 2_000_000;
  const points: BalancePoint[] = [
    { key: "start", t: t0 - span * 0.03, value: 0, label: "" },
  ];
  times.forEach((t, i) => {
    balance = Math.max(0, balance + delta(style, balance, r));
    height += 50 + Math.floor(r() * 4_000);
    points.push({
      key: `tx-${i}`,
      t,
      value: balance,
      label: label(t, spanDays),
      height,
    });
  });
  return points;
}

export function usdSeries(zec: BalancePoint[], seed: number): BalancePoint[] {
  const r = mulberry32(seed ^ 0x9e3779b9);
  const t0 = zec[0].t;
  const span = zec[zec.length - 1].t - t0;
  const spanDays = span / DAY;
  const samples = Math.min(260, Math.max(60, Math.round(spanDays)));

  let price = 30 + r() * 20;
  let txIdx = 1;
  let held = 0;
  const points: BalancePoint[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = t0 + (span * i) / samples;
    price = Math.max(5, price * (1 + (r() - 0.485) * 0.06));
    let jump = 0;
    while (txIdx < zec.length && zec[txIdx].t <= t) {
      jump += Math.abs(zec[txIdx].value - held) * price;
      held = zec[txIdx].value;
      txIdx++;
    }
    points.push({
      key: `d-${i}`,
      t,
      value: held * price,
      label: label(t, spanDays),
      zec: held,
      change: jump > 0,
      jump,
    });
  }
  return points;
}

export function poolWalk(seed: number, days = 90, scale = 1): BalancePoint[] {
  const r = mulberry32(seed);
  const t0 = END - days * DAY;
  let v = 2 + r() * 3;
  const points: BalancePoint[] = [];
  for (let i = 0; i <= days; i++) {
    if (r() < 0.2) v = Math.max(0.1, v + (r() - 0.4) * 2);
    points.push({
      key: `p-${i}`,
      t: t0 + i * DAY,
      value: v * scale,
      label: label(t0 + i * DAY, days),
    });
  }
  return points;
}

export const DATASETS = {
  hodl: zecSeries({ transactions: 40, years: 1, style: "hodl", seed: 7 }),
  trader: zecSeries({ transactions: 150, years: 1, style: "trader", seed: 7 }),
  whale: zecSeries({ transactions: 40, years: 8, style: "whale", seed: 3 }),
  dust: zecSeries({ transactions: 600, years: 1, style: "dust", seed: 7 }),
  dense: zecSeries({ transactions: 2000, years: 3, style: "trader", seed: 7 }),
  first: zecSeries({ transactions: 1, years: 0.25, style: "hodl", seed: 7 }),
};

export type DatasetName = keyof typeof DATASETS;

export const DATASET_NAMES = Object.keys(DATASETS) as DatasetName[];

export const USD = usdSeries(
  zecSeries({ transactions: 200, years: 4, style: "hodl", seed: 7 }),
  7,
);

const MIGRATION: {
  pool: Pool;
  name: string;
  seed: number;
  from: number;
  to: number;
}[] = [
  {
    pool: "ironwood",
    name: "Ironwood",
    seed: 21,
    from: 0,
    to: 9,
  },
  {
    pool: "orchard",
    name: "Orchard",
    seed: 22,
    from: 5,
    to: 6,
  },
  {
    pool: "sapling",
    name: "Sapling",
    seed: 23,
    from: 6,
    to: 2,
  },
  {
    pool: "transparent",
    name: "Transparent",
    seed: 24,
    from: 4,
    to: 0.6,
  },
];

export function poolMigration(days = 120): PoolSeries[] {
  const start = END - days * DAY;
  return MIGRATION.map(({ pool, name, seed, from, to }) => {
    const random = mulberry32(seed);
    let drift = 0;
    const points: BalancePoint[] = [];
    for (let day = 0; day <= days; day++) {
      const fraction = day / days;
      const eased = fraction * fraction * (3 - 2 * fraction);
      if (random() < 0.25)
        drift = Math.max(-1, Math.min(1, drift + (random() - 0.5)));
      const base = from + (to - from) * eased;
      const value = Math.max(0, base + drift * 0.6 * Math.max(base, 0.4));
      points.push({
        key: `${pool}-${day}`,
        t: start + day * DAY,
        value,
        label: label(start + day * DAY, days),
        height: 3_000_000 + day * BLOCKS_PER_DAY,
      });
    }
    return { pool, name, points };
  });
}

export const POOL_SERIES = poolMigration();
