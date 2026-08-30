// A pill segmented control whose active fill slides between options rather than
// jumping. The fill is one absolutely-positioned span translated to the active index,
// so the block glides under the labels while their colour crosses over. The slide is
// dropped under prefers-reduced-motion. Shared by onboarding's sync-mode switch (brand
// fill) and the dashboard's chart controls (neutral fill).
export function Segmented<T extends string>({
	value,
	onChange,
	options,
	tone = "brand",
}: {
	value: T;
	onChange: (v: T) => void;
	options: { value: T; label: string }[];
	tone?: "brand" | "neutral";
}) {
	const active = Math.max(
		0,
		options.findIndex((o) => o.value === value),
	);
	const fill = tone === "brand" ? "bg-brand" : "bg-white/10";
	const activeText = tone === "brand" ? "text-brand-foreground" : "text-white";
	return (
		<div
			className="relative grid w-full rounded-full border border-ink-line bg-ink-soft p-1"
			style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
		>
			<span
				aria-hidden
				className={`pointer-events-none absolute inset-y-1 left-1 rounded-full ${fill} ease-out-soft motion-safe:transition-transform motion-safe:duration-200`}
				style={{
					width: `calc((100% - 0.5rem) / ${options.length})`,
					transform: `translateX(${active * 100}%)`,
				}}
			/>
			{options.map((o) => (
				<button
					key={o.value}
					type="button"
					aria-pressed={value === o.value}
					onClick={() => onChange(o.value)}
					className={`relative z-10 rounded-full px-5 py-1.5 text-sm font-medium transition-colors ${
						value === o.value
							? activeText
							: "text-white/55 hover:text-white/80"
					}`}
				>
					{o.label}
				</button>
			))}
		</div>
	);
}
