// "Balance over time" card chart, built on shadcn charts (recharts). One point per
// confirmed transaction plus a leading point for the balance before the first one,
// drawn as a step: a balance holds flat between transactions and jumps at each one.
// A smooth curve would imply intermediate values the wallet never actually held.
//
// The series is reconstructed in balanceHistory() from the confirmed history, so
// there's no dedicated daemon command behind it. The series also grows out of order
// during the initial scan (tip-first scanning finds recent transactions before
// older ones), so points insert in the middle, not just the end. We drive recharts
// off geometry tweened in JS keyed by transaction identity, so an inserted point
// slides out of its neighbour instead of the whole curve reshuffling, and each
// fresh arrival gets a one-shot ping marking where it landed. recharts' own
// draw-on animation is left off so it doesn't redraw the curve on every refetch.

import { memo, useEffect, useRef, useState } from "react";
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
const TWEEN_MS = 400;

const config = {
	value: { label: "Balance", color: "var(--color-brand)" },
} satisfies ChartConfig;

const easeOut = (t: number) => 1 - (1 - t) ** 3;
const prefersReducedMotion = () =>
	typeof window !== "undefined" &&
	window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type Datum = {
	key: string;
	x: number;
	t: number;
	label: string;
	value: number;
	last: boolean;
};

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

// Ease each datum's plotted position (x and value) from where it currently sits to
// its target, keyed by identity so a point keeps its tween across an out-of-order
// insertion. A point with no prior position grows from its left neighbour, so it
// slides out of the existing line rather than popping in. Skipped under reduced
// motion. Geometry is tweened in data space and fed to recharts with its own
// animation off, the same hand-rolled approach the chart used before recharts.
function useTweenedData(target: Datum[]): Datum[] {
	const [shown, setShown] = useState(target);
	const current = useRef(
		new Map(target.map((d) => [d.key, { x: d.x, value: d.value }])),
	);
	const goal = useRef(target);
	goal.current = target;
	const raf = useRef(0);
	const sig = target
		.map((d) => `${d.key}:${Math.round(d.x)}:${d.value.toFixed(4)}`)
		.join("|");

	useEffect(() => {
		const dest = goal.current;
		const cur = current.current;
		const from = new Map<string, { x: number; value: number }>();
		dest.forEach((d, i) => {
			const had = cur.get(d.key);
			if (had) {
				from.set(d.key, had);
			} else {
				const leftKey = i > 0 ? dest[i - 1].key : null;
				const seed = leftKey ? (from.get(leftKey) ?? cur.get(leftKey) ?? d) : d;
				from.set(d.key, { x: seed.x, value: seed.value });
			}
		});

		if (prefersReducedMotion()) {
			current.current = new Map(
				dest.map((d) => [d.key, { x: d.x, value: d.value }]),
			);
			setShown(dest);
			return;
		}

		const t0 = performance.now();
		const tick = () => {
			const t = Math.min((performance.now() - t0) / TWEEN_MS, 1);
			const k = easeOut(t);
			const next = new Map<string, { x: number; value: number }>();
			const frame = dest.map((d) => {
				const f = from.get(d.key)!;
				const x = f.x + (d.x - f.x) * k;
				const value = f.value + (d.value - f.value) * k;
				next.set(d.key, { x, value });
				return { ...d, x, value };
			});
			current.current = next;
			setShown(frame);
			if (t < 1) raf.current = requestAnimationFrame(tick);
		};
		cancelAnimationFrame(raf.current);
		raf.current = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf.current);
		// Re-tween when the geometry changes, not on every frame's setShown.
	}, [sig]); // eslint-disable-line react-hooks/exhaustive-deps

	return shown;
}

// Keys present now that weren't a render ago. Seeded with the initial set so the
// chart's first appearance pings nothing (that's the empty-state crossfade's job).
// Only genuinely new arrivals ping.
function useFreshKeys(keys: string[]): Set<string> {
	const seen = useRef(new Set(keys));
	const [fresh, setFresh] = useState<Set<string>>(new Set());
	const sig = keys.join("|");

	useEffect(() => {
		const next = new Set<string>();
		for (const k of keys) if (!seen.current.has(k)) next.add(k);
		seen.current = new Set(keys);
		setFresh(next);
		// Recompute against the key set, not its array identity.
	}, [sig]); // eslint-disable-line react-hooks/exhaustive-deps

	return fresh;
}

function BalanceChartImpl({ points }: { points: BalancePoint[] }) {
	const { max, step } = niceAxis(Math.max(0, ...points.map((p) => p.value)));

	// Position by real time when the series spans one. A single transaction (or a
	// cluster sharing one timestamp) has no span, so fall back to even spacing.
	const tMin = points[0]?.t ?? 0;
	const span = points.length ? points[points.length - 1].t - tMin : 0;
	const target: Datum[] = points.map((p, i) => ({
		key: p.key,
		x: span > 0 ? p.t : i,
		t: p.t,
		label: p.label,
		value: p.value,
		last: i === points.length - 1,
	}));

	const tweened = useTweenedData(target);
	const fresh = useFreshKeys(points.map((p) => p.key));
	// One render can land before the tween realigns its array, so fall back to the
	// target then to keep the series complete.
	const data = tweened.length === target.length ? tweened : target;

	if (points.length === 0) return null;

	const ticks = Array.from(
		{ length: Math.round(max / step) + 1 },
		(_, i) => i * step,
	);
	const decimals = max < 1 ? 4 : max < 100 ? 2 : 0;
	const fmtAxis = (v: number) =>
		v.toLocaleString(undefined, { maximumFractionDigits: decimals });
	const fmtZec = (v: number) =>
		v.toLocaleString(undefined, { maximumFractionDigits: 8 });

	// Ticks and domain come off the stable target, not the tweening data, so the
	// axes hold still while points slide into place.
	const labelEvery = Math.ceil(points.length / MAX_LABELS);
	const labelByX = new Map(
		target
			.filter((d, i) => d.label && i % labelEvery === 0)
			.map((d) => [d.x, d.label]),
	);
	const xDomain: [number, number] = [target[0].x, target[target.length - 1].x];

	return (
		<ChartContainer config={config} className="aspect-900/240 w-full">
			<AreaChart
				data={data}
				margin={{ top: 16, right: 16, bottom: 0, left: 0 }}
			>
				<defs>
					<linearGradient id="balance-fill" x1="0" y1="0" x2="0" y2="1">
						<stop
							offset="0%"
							stopColor="var(--color-brand)"
							stopOpacity={0.18}
						/>
						<stop
							offset="100%"
							stopColor="var(--color-brand)"
							stopOpacity={0}
						/>
					</linearGradient>
				</defs>
				<CartesianGrid vertical={false} strokeDasharray="4 6" />
				<XAxis
					dataKey="x"
					type="number"
					domain={xDomain}
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
					isAnimationActive={false}
					activeDot={{
						r: 5,
						fill: "var(--color-brand)",
						stroke: "var(--card)",
					}}
					dot={(props) => {
						const { cx, cy, payload } = props;
						// The leading "balance before the first tx" point isn't a transaction,
						// so it gets no dot. The last transaction is the emphasized tip. A
						// freshly arrived point also gets an expanding ring at where it landed.
						const ping = fresh.has(payload.key) ? (
							<circle
								className="balance-ping"
								cx={cx}
								cy={cy}
								r={5}
								fill="none"
								stroke="var(--color-brand)"
								strokeWidth={2}
							/>
						) : null;
						if (payload.key === "start") return <g key={payload.key}>{ping}</g>;
						const r = payload.last ? 5 : 3;
						return (
							<g key={payload.key}>
								<circle
									cx={cx}
									cy={cy}
									r={r}
									fill="var(--color-brand)"
									fillOpacity={payload.last ? 1 : 0.55}
									stroke="var(--card)"
									strokeWidth={payload.last ? 2 : 1.5}
								/>
								{ping}
							</g>
						);
					}}
				/>
			</AreaChart>
		</ChartContainer>
	);
}

// The dashboard re-renders on every sync tick, but the chart only needs to redraw
// when its points change. Skipping the sync-only renders keeps the hover tooltip
// tracking the cursor instead of trailing it. Paired with the memoised `points` in
// ChartCard so this comparison actually holds across those renders.
export const BalanceChart = memo(BalanceChartImpl);
