import type { BalancePoint } from "@/lib/format";

export function downsampleSeries(
  points: BalancePoint[],
  cap: number,
): BalancePoint[] {
  if (points.length <= cap) return points;
  const last = points.length - 1;
  let peak = 1;
  for (let i = 2; i < last; i++)
    if (points[i].value > points[peak].value) peak = i;
  const keep = new Set([0, peak, last]);
  const stride = Math.ceil((points.length - 2) / (cap - 3));
  for (let i = 1; i < last; i += stride) keep.add(i);
  return [...keep].sort((a, b) => a - b).map((i) => points[i]);
}
