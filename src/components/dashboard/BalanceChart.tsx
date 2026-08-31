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
import {
	Area,
	AreaChart,
	CartesianGrid,
	ReferenceLine,
	XAxis,
	YAxis,
} from "recharts";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from "@/components/ui/chart/chart";
import { useMasked } from "@/lib/discreet";
import { type BalancePoint, formatUsd } from "@/lib/format";
import { animationsEnabled } from "@/lib/motion";
import "./balance-chart.css";

// Which unit the series is drawn in. ZEC is the reconstructed balance (a step function);
// USD is that balance marked daily against the price (docs/adr/0008), so it undulates
// between transactions and is drawn as a smooth curve rather than a step.
export type Denom = "zec" | "usd";

const MAX_LABELS = 6;
const TWEEN_MS = 400;
// The chart is ~900px wide, so points past a couple hundred fall sub-pixel and can't
// be told apart. Feeding recharts the full history (thousands of points on a busy
// wallet) is the dominant cost when the dashboard mounts and when a navigation has to
// snapshot the chart for its crossfade. Cap the rendered series here; the axis bounds
// and all-time-high still come off the full data, so only the line's resolution drops.
const MAX_POINTS = 240;
// On the USD curve, a balance change gets a dot only when its jump is at least this
// fraction of the axis peak. Below it the change is a barely-visible step, so a dot there
// just crowds the line, which is what happens when many small transactions cluster.
const DOT_MIN_FRACTION = 0.04;

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
	height?: number;
	// The ZEC balance at this point (USD series only), for the tooltip's ZEC line.
	zec?: number;
	// A balance-change point (USD series only), the only points that can get a static dot.
	change?: boolean;
	// The USD size of the change, for dotting only the big ones (USD series only).
	jump?: number;
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

// Thin a long history down to at most `cap` points for rendering. Keeps the leading
// point and the tip (so the curve still ends on the headline balance) and the global
// peak (so the line reaches the top the axis is sized for), then strides evenly
// through the middle. Each kept point holds its txid key, so the tween still tracks
// points by identity across refetches.
export function downsampleSeries(points: BalancePoint[], cap: number): BalancePoint[] {
	if (points.length <= cap) return points;
	const last = points.length - 1;
	let peak = 1;
	for (let i = 2; i < last; i++) if (points[i].value > points[peak].value) peak = i;
	const keep = new Set([0, peak, last]);
	const stride = Math.ceil((points.length - 2) / (cap - 3));
	for (let i = 1; i < last; i += stride) keep.add(i);
	return [...keep].sort((a, b) => a - b).map((i) => points[i]);
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
function useTweenedData(target: Datum[], enabled: boolean): Datum[] {
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

		// On a fresh mount (a route switch back to the dashboard) every point seeds
		// from its own target, so nothing actually moves. Animating it anyway re-ran
		// recharts over the whole series ~24 times across the tween, which is the bulk
		// of the load cost on a large history. Snap to the target when no point moves.
		const moved = dest.some((d) => {
			const f = from.get(d.key);
			return !f || f.x !== d.x || f.value !== d.value;
		});
		if (!enabled || !animationsEnabled() || prefersReducedMotion() || !moved) {
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
	}, [sig, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

	return shown;
}

function BalanceChartImpl({
	points,
	denom = "zec",
}: {
	points: BalancePoint[];
	denom?: Denom;
}) {
	const usd = denom === "usd";
	// Discreet mode keeps the curve but dots out both axes and drops the tooltip
	// (every line in it is on the sensitive list). Ticks swap instantly rather than
	// scrambling: they're SVG text inside recharts, not our HTML spans.
	const masked = useMasked();
	// Axis bounds come off the full history so the peak is never clipped, but the line
	// itself renders a thinned series so recharts isn't handed thousands of points.
	const { max, step } = niceAxis(Math.max(0, ...points.map((p) => p.value)));
	// The USD series is already bounded (a fixed sample count) and its dots mark balance
	// changes, which downsampling would thin away, so only the ZEC series is downsampled.
	const view = usd ? points : downsampleSeries(points, MAX_POINTS);

	// Position by real time when the transactions span one. A single transaction (or
	// a cluster sharing one timestamp) has no span, so fall back to even spacing. The
	// synthetic leading point is excluded from the test: its runway timestamp would
	// otherwise fake a span and collapse same-time transactions onto one x.
	const txTimes = view.filter((p) => p.key !== "start").map((p) => p.t);
	const tMin = view[0]?.t ?? 0;
	const span = txTimes.length > 1 ? txTimes[txTimes.length - 1] - txTimes[0] : 0;
	const target: Datum[] = view.map((p, i) => ({
		key: p.key,
		x: span > 0 ? p.t : i,
		t: p.t,
		label: p.label,
		value: p.value,
		last: i === view.length - 1,
		height: p.height,
		zec: p.zec,
		change: p.change,
		jump: p.jump,
	}));

	// The USD series is recomputed wholesale on a period switch and its samples are keyed
	// by position, not identity, so tweening remaps every sample's x at once and drags the
	// whole curve in from the side. It carries no out-of-order scan insertions to smooth
	// over, so it renders straight from the target. Only the identity-keyed ZEC series tweens.
	const tweened = useTweenedData(target, !usd);
	// One render can land before the tween realigns its array, so fall back to the
	// target then to keep the series complete.
	const data = usd
		? target
		: tweened.length === target.length
			? tweened
			: target;

	// Past this many points a full-size dot per transaction crowds the line, so the
	// dots step down a little and lean on their card-coloured ring to stay separate. The
	// USD series only dots balance changes (a handful), so it keeps full-size dots.
	const denseDots = !usd && view.length > 80;
	// Each point draws one SVG dot. Past a couple hundred they merge into a solid band
	// along the line and stop reading as separate transactions, while still costing a
	// node each. Drop them past this count and let the line carry the shape; the tip
	// and any fresh-arrival ping still draw. (USD gates dots on the change flag instead.)
	const hideDots = view.length > 200;

	if (points.length === 0) return null;

	const ticks = Array.from(
		{ length: Math.round(max / step) + 1 },
		(_, i) => i * step,
	);
	const decimals = max < 1 ? 4 : max < 100 ? 2 : 0;
	const fmtAxis = (v: number) =>
		usd
			? `$${v.toLocaleString(undefined, { maximumFractionDigits: decimals })}`
			: v.toLocaleString(undefined, { maximumFractionDigits: decimals });
	// Tooltip value: full-precision ZEC, or the currency-formatted USD mark.
	const fmtValue = (v: number) =>
		usd ? formatUsd(v) : `${v.toLocaleString(undefined, { maximumFractionDigits: 8 })} ZEC`;
	// USD ticks carry a "$" and grouped thousands, so they need more room than the ZEC
	// axis or they clip on the left. Widen further once the balance reaches five figures.
	const yWidth = usd ? (max >= 10_000 ? 76 : 60) : 48;

	// Ticks and domain come off the stable target, not the tweening data, so the
	// axes hold still while points slide into place.
	const labelEvery = Math.ceil(view.length / MAX_LABELS);
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
				{/* The zero baseline, drawn solid and a shade stronger than the dashed
				    grid so the floor the area sits on reads clearly. */}
				<ReferenceLine
					y={0}
					stroke="var(--muted-foreground)"
					strokeOpacity={0.35}
					strokeWidth={1.5}
				/>
				<XAxis
					dataKey="x"
					type="number"
					domain={xDomain}
					ticks={[...labelByX.keys()]}
					tickFormatter={(v) =>
						labelByX.has(v) ? (masked ? "•• •••" : (labelByX.get(v) ?? "")) : ""
					}
					tickLine={false}
					axisLine={false}
					tickMargin={8}
				/>
				<YAxis
					domain={[0, max]}
					ticks={ticks}
					tickFormatter={(v) => (masked ? "•••••" : fmtAxis(v))}
					tickLine={false}
					axisLine={false}
					width={yWidth}
					tickMargin={8}
				/>
				{!masked && <ChartTooltip
					isAnimationActive={false}
					cursor={{ stroke: "var(--color-brand)", strokeOpacity: 0.25 }}
					content={
						<ChartTooltipContent
							hideIndicator
							labelFormatter={(_, payload) => {
								const p = payload?.[0]?.payload as Datum | undefined;
								// The date (always with the year) on one line; the block, when the
								// point is a transaction, on its own line rather than run together.
								return (
									<span className="flex flex-col gap-0.5">
										<span>{fullDate(p?.t ?? tMin)}</span>
										{p?.height ? (
											<span className="text-muted-foreground">
												Block #{p.height.toLocaleString()}
											</span>
										) : null}
									</span>
								);
							}}
							formatter={(value, _name, item) => {
								const zec = (item?.payload as Datum | undefined)?.zec;
								return (
									<span className="flex flex-col gap-0.5">
										<span className="font-mono font-medium tabular-nums">
											{fmtValue(Number(value))}
										</span>
										{usd && typeof zec === "number" && (
											<span className="font-mono text-xs text-muted-foreground tabular-nums">
												{zec.toLocaleString(undefined, {
													maximumFractionDigits: 8,
												})}{" "}
												ZEC
											</span>
										)}
									</span>
								);
							}}
						/>
					}
				/>}
				<Area
					dataKey="value"
					type={usd ? "monotone" : "stepAfter"}
					stroke="var(--color-brand)"
					strokeWidth={1.5}
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
						// so it gets no dot. The last transaction is the emphasized tip.
						if (payload.key === "start") return null;
						// USD dots only the big balance changes (and the tip), so a cluster of
						// small transactions doesn't crowd the line and the hover glides along
						// the continuous curve between them. ZEC dots every transaction, dropping
						// them only on a history too dense to tell them apart.
						const bigChange =
							Boolean(payload.change) &&
							(payload.jump ?? 0) >= DOT_MIN_FRACTION * max;
						const drawDot = usd
							? bigChange || payload.last
							: !hideDots || payload.last;
						if (!drawDot) return null;
						// Every transaction keeps a dot so each balance change stays visible
						// at a glance. The card-coloured edge rings each dot in the background
						// colour, so even on a dense history they read as separate points
						// against the thin line instead of merging into a band. The tip is the
						// emphasized one.
						const tip = payload.last;
						const r = tip ? 5 : denseDots ? 2.4 : 3;
						return (
							<g key={payload.key}>
								<circle
									cx={cx}
									cy={cy}
									r={r}
									fill="var(--color-brand)"
									fillOpacity={tip ? 1 : denseDots ? 0.9 : 0.55}
									stroke="var(--card)"
									strokeWidth={tip ? 2 : denseDots ? 1.25 : 1.5}
								/>
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
