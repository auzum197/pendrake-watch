// A compact step-area trace of a pool's balance over time. Hand-drawn SVG rather
// than a charting lib: it's decorative, three of them sit on the page, and recharts
// would be heavy for a thumbnail. The line steps (balance holds flat between
// transactions, then jumps), matching the full chart's read. Stroke stays crisp at
// any width via non-scaling-stroke, so the box can stretch without thinning the line.
// Only rendered when there's real movement to plot; the no-data placeholder lives in
// the card.

const W = 240;
const H = 56;
const PAD = 5;

function stepPaths(values: number[]) {
	const max = Math.max(...values);
	const min = Math.min(...values);
	const range = max - min || 1;
	const n = values.length;
	const x = (i: number) => (i / (n - 1)) * W;
	const y = (v: number) => PAD + (H - PAD * 2) * (1 - (v - min) / range);

	let line = `M ${x(0)} ${y(values[0])}`;
	for (let i = 1; i < n; i++) {
		line += ` L ${x(i)} ${y(values[i - 1])} L ${x(i)} ${y(values[i])}`;
	}
	const area = `${line} L ${x(n - 1)} ${H} L ${x(0)} ${H} Z`;
	return { line, area };
}

export function Sparkline({
	values,
	className,
}: {
	values: number[];
	className?: string;
}) {
	const { line, area } = stepPaths(values);

	return (
		<svg
			viewBox={`0 0 ${W} ${H}`}
			className={`text-brand ${className ?? ""}`}
			preserveAspectRatio="none"
			aria-hidden
		>
			<path d={area} fill="currentColor" fillOpacity="0.1" />
			<path
				d={line}
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
		</svg>
	);
}
