import type { PricePoint, PriceSpot } from "../ipc";
import { rng } from "./prng";

const LAUNCH = Date.UTC(2016, 9, 28);
const DAY_MS = 86_400_000;
const MULTI_SOURCE_FROM = Date.UTC(2020, 0, 1);
const SOURCES = ["coingecko", "coinbase", "kraken"];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// A mean-reverting walk in log space. The seed is fixed and the walk
// starts at launch. Marks before
// 2020 are single-source, as the daemon's bundled tail is.
export function priceHistory(todayMs: number): PricePoint[] {
  const r = rng(0x5eed2ec);
  const centre = Math.log(55);
  let lp = Math.log(48);
  const points: PricePoint[] = [];
  for (let t = LAUNCH; t <= todayMs; t += DAY_MS) {
    lp += 0.004 * (centre - lp) + 0.045 * r.gaussian();
    const confidence = t < MULTI_SOURCE_FROM ? "low" : "high";
    const point: PricePoint = {
      date: new Date(t).toISOString().slice(0, 10),
      usdPerZec: round2(Math.exp(lp)),
      confidence,
    };
    if (confidence === "high" && r.chance(0.01)) point.diverged = true;
    points.push(point);
  }
  return points;
}

export function spotFrom(
  last: PricePoint,
  fetchedAt: number,
  wobble: number,
): PriceSpot {
  return {
    usdPerZec: round2(last.usdPerZec * (1 + wobble)),
    fetchedAt,
    sources: SOURCES,
  };
}
