import { describe, expect, it } from "vitest";
import { downsampleSeries } from "./BalanceChart";
import type { BalancePoint } from "@/lib/format";

const pt = (i: number, value: number): BalancePoint => ({
  key: `k${i}`,
  t: i,
  value,
  label: "",
});

const series = (values: number[]): BalancePoint[] =>
  values.map((v, i) => pt(i, v));

describe("downsampleSeries", () => {
  it("returns the series untouched when it already fits the cap", () => {
    const points = series([1, 2, 3]);
    expect(downsampleSeries(points, 10)).toBe(points);
  });

  it("keeps the first and last point so the curve still ends on the headline", () => {
    const points = series(Array.from({ length: 100 }, (_, i) => i));
    const out = downsampleSeries(points, 10);
    expect(out[0].key).toBe("k0");
    expect(out[out.length - 1].key).toBe("k99");
  });

  it("keeps the global peak even when it falls between strides", () => {
    // A lone spike at index 37, dwarfing the gentle ramp around it, sits off any
    // even stride from 1; the axis is sized to it, so the line must reach it.
    const values = Array.from({ length: 100 }, (_, i) => i % 5);
    values[37] = 9999;
    const out = downsampleSeries(series(values), 10);
    expect(out.some((p) => p.key === "k37")).toBe(true);
  });

  it("never returns more points than the cap", () => {
    for (const n of [50, 241, 1000]) {
      for (const cap of [8, 24, 240]) {
        const out = downsampleSeries(series(Array(n).fill(0)), cap);
        expect(out.length).toBeLessThanOrEqual(cap);
      }
    }
  });

  it("returns points in time order with no repeats", () => {
    const out = downsampleSeries(
      series(Array.from({ length: 500 }, (_, i) => i % 7)),
      60,
    );
    const ts = out.map((p) => p.t);
    expect(ts).toEqual([...ts].sort((a, b) => a - b));
    expect(new Set(out.map((p) => p.key)).size).toBe(out.length);
  });
});
