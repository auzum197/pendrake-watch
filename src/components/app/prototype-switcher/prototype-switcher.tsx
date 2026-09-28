import { useEffect } from "react";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

// The floating variant bar for UI prototypes (.claude/skills/prototype/UI.md).
// Dev-only, so a stray merge never ships it. Deliberately foreign to the app's
// look so it reads as scaffolding, not as part of the design under review.
export function PrototypeSwitcher<V extends string>({
	variants,
	current,
	onChange,
}: {
	variants: { key: V; name: string }[];
	current: V;
	onChange: (next: V) => void;
}) {
	const at = Math.max(
		0,
		variants.findIndex((v) => v.key === current),
	);
	const step = (delta: number) =>
		onChange(variants[(at + delta + variants.length) % variants.length].key);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			const target = e.target;
			if (
				target instanceof HTMLElement &&
				(target.tagName === "INPUT" ||
					target.tagName === "TEXTAREA" ||
					target.isContentEditable)
			) {
				return;
			}
			if (e.key === "ArrowLeft") step(-1);
			if (e.key === "ArrowRight") step(1);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	});

	if (!import.meta.env.DEV) return null;

	return (
		<div className="fixed bottom-4 left-1/2 z-100 flex -translate-x-1/2 items-center gap-1 rounded-full bg-yellow-300 px-1 py-1 font-mono text-xs text-black shadow-lg ring-2 ring-black/80">
			<button
				type="button"
				onClick={() => step(-1)}
				className="rounded-full p-1 hover:bg-black/10"
				aria-label="Previous variant"
			>
				<IconChevronLeft className="size-4" />
			</button>
			<span className="px-2 tabular-nums">
				{variants[at].key.toUpperCase()} — {variants[at].name}
			</span>
			<button
				type="button"
				onClick={() => step(1)}
				className="rounded-full p-1 hover:bg-black/10"
				aria-label="Next variant"
			>
				<IconChevronRight className="size-4" />
			</button>
		</div>
	);
}
