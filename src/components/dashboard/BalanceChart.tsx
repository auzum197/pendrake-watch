
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
import { maskFor } from "@/components/ui/discreet-value/discreet-value";
import { type BalancePoint, formatUsd } from "@/lib/format";
import { animationsEnabled } from "@/lib/motion";
import "./balance-chart.css";

export type Denom = "zec" | "usd";

const MAX_LABELS = 6;
const TWEEN_MS = 400;
const MAX_POINTS = 240;
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
	zec?: number;
	change?: boolean;
	jump?: number;
};

function niceAxis(peak: number): { max: number; step: number } {
	if (peak <= 0) return { max: 1, step: 1 };
	const rough = peak / 4;
	const mag = 10 ** Math.floor(Math.log10(rough));
	const n = rough / mag;
	const step =
		(n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
	return { max: Math.ceil(peak / step) * step, step };
}

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
	const masked = useMasked();
	const { max, step } = niceAxis(Math.max(0, ...points.map((p) => p.value)));
	const view = usd ? points : downsampleSeries(points, MAX_POINTS);

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

	const tweened = useTweenedData(target, !usd);
	const data = usd
		? target
		: tweened.length === target.length
			? tweened
			: target;

	const denseDots = !usd && view.length > 80;
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
	const fmtValue = (v: number) =>
		usd ? formatUsd(v) : `${v.toLocaleString(undefined, { maximumFractionDigits: 8 })} ZEC`;
	const yWidth = usd ? (max >= 10_000 ? 76 : 60) : 48;

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
						labelByX.has(v) ? (masked ? maskFor("date") : (labelByX.get(v) ?? "")) : ""
					}
					tickLine={false}
					axisLine={false}
					tickMargin={8}
				/>
				<YAxis
					domain={[0, max]}
					ticks={ticks}
					tickFormatter={(v) => (masked ? maskFor("zec") : fmtAxis(v))}
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
								return (
									<span className="flex flex-col gap-0.5">
										<span>{fullDate(p?.t ?? tMin)}</span>
										{p?.height ? (
											<span className="text-muted-foreground">
												Block {p.height.toLocaleString()}
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
						if (payload.key === "start") return null;
						const bigChange =
							Boolean(payload.change) &&
							(payload.jump ?? 0) >= DOT_MIN_FRACTION * max;
						const drawDot = usd
							? bigChange || payload.last
							: !hideDots || payload.last;
						if (!drawDot) return null;
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

export const BalanceChart = memo(BalanceChartImpl);
