// "Balance over time" card chart, built on shadcn charts (recharts). One point per
// confirmed transaction plus a leading point for the balance before the first one,
// drawn as a step: a balance holds flat between transactions and jumps at each one.
// A smooth curve would imply intermediate values the wallet never actually held.
//
// The series is reconstructed in balanceHistory() from the confirmed history, so
// there's no dedicated daemon command behind it. The card's entrance crossfade and
// empty state live in dashboard.tsx; here we only handle reduced motion (recharts'
// draw-on animation is dropped) and a degenerate time span (a single transaction,
// or a cluster sharing one timestamp, falls back to even spacing).

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { BalancePoint } from "@/lib/format";
import "./balance-chart.css";

const MAX_LABELS = 6;

const config = {
  value: { label: "Balance", color: "var(--color-brand)" },
} satisfies ChartConfig;

// Fit the y-axis to the data. Rounding the peak straight up to a 1/2/2.5/5 multiple
// can nearly double it (1.2 -> 2), leaving the line stranded under a big empty top.
// Instead size a clean tick step for ~4 intervals, then take the next step above the
// peak: readable gridlines with at most a fraction of a step of headroom.
function niceAxis(peak: number): { max: number; step: number } {
  if (peak <= 0) return { max: 1, step: 1 };
  const rough = peak / 4;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const n = rough / mag;
  const step =
    (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
  return { max: Math.ceil(peak / step) * step, step };
}

function fullDate(epoch: number): string {
  const ms = epoch < 1e12 ? epoch * 1000 : epoch;
  return new Date(ms).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function BalanceChart({ points }: { points: BalancePoint[] }) {
  if (points.length === 0) return null;

  const { max, step } = niceAxis(Math.max(...points.map((p) => p.value)));
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) =>
    i * step,
  );
  const decimals = max < 1 ? 4 : max < 100 ? 2 : 0;
  const fmtAxis = (v: number) =>
    v.toLocaleString(undefined, { maximumFractionDigits: decimals });
  const fmtZec = (v: number) =>
    v.toLocaleString(undefined, { maximumFractionDigits: 8 });

  // Position by real time when the series spans one. A single transaction (or a
  // cluster sharing one timestamp) has no span, so fall back to even spacing.
  const tMin = points[0].t;
  const span = points[points.length - 1].t - tMin;
  const data = points.map((p, i) => ({
    key: p.key,
    x: span > 0 ? p.t : i,
    t: p.t,
    label: p.label,
    value: p.value,
    last: i === points.length - 1,
  }));

  // Thin the x-axis labels to at most MAX_LABELS, and only over transaction points
  // (the leading "start" point carries no date). tickFormatter reads each tick's
  // date back off the datum's x.
  const labelEvery = Math.ceil(points.length / MAX_LABELS);
  const labelByX = new Map(
    data
      .filter((d, i) => d.label && i % labelEvery === 0)
      .map((d) => [d.x, d.label]),
  );

  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <ChartContainer config={config} className="aspect-[900/240] w-full">
      <AreaChart data={data} margin={{ top: 16, right: 16, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="balance-fill" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-brand)"
              stopOpacity={0.18}
            />
            <stop offset="100%" stopColor="var(--color-brand)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="4 6" />
        <XAxis
          dataKey="x"
          type="number"
          domain={["dataMin", "dataMax"]}
          ticks={[...labelByX.keys()]}
          tickFormatter={(v) => labelByX.get(v) ?? ""}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis
          domain={[0, max]}
          ticks={ticks}
          tickFormatter={fmtAxis}
          tickLine={false}
          axisLine={false}
          width={48}
          tickMargin={8}
        />
        <ChartTooltip
          cursor={{ stroke: "var(--color-brand)", strokeOpacity: 0.25 }}
          content={
            <ChartTooltipContent
              hideIndicator
              labelFormatter={(_, payload) =>
                fullDate(payload?.[0]?.payload?.t ?? tMin)
              }
              formatter={(value) => (
                <span className="font-mono font-medium tabular-nums">
                  {fmtZec(Number(value))} ZEC
                </span>
              )}
            />
          }
        />
        <Area
          dataKey="value"
          type="stepAfter"
          stroke="var(--color-brand)"
          strokeWidth={2.5}
          fill="url(#balance-fill)"
          isAnimationActive={!reduced}
          activeDot={{ r: 5, fill: "var(--color-brand)", stroke: "var(--card)" }}
          dot={(props) => {
            const { cx, cy, payload } = props;
            // The leading "balance before the first tx" point isn't a transaction,
            // so it gets no dot. The last transaction is the emphasized tip.
            if (payload.key === "start") return <g key={payload.key} />;
            const r = payload.last ? 5 : 3;
            return (
              <circle
                key={payload.key}
                cx={cx}
                cy={cy}
                r={r}
                fill="var(--color-brand)"
                fillOpacity={payload.last ? 1 : 0.55}
                stroke="var(--card)"
                strokeWidth={payload.last ? 2 : 1.5}
              />
            );
          }}
        />
      </AreaChart>
    </ChartContainer>
  );
}
