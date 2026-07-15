import { useEffect, useRef, useState } from "react";
import { useMasked } from "@/lib/discreet";
import { animationsEnabled } from "@/lib/motion";

// A sensitive value that masks under Discreet mode. Each kind settles to a fixed
// dot template, so every masked amount is the same width and neither magnitude nor
// memo length leaks. Only the value itself is passed in; signs, units rendered as
// separate styled spans, and "pending" fallbacks stay at the call site.
//
// The scramble plays only when the masked state flips while mounted (the eye, the
// Settings switch, a peek). A value that mounts with Discreet mode already on
// renders dots at once, so navigating never replays the effect.

export type DiscreetKind =
	| "zec"
	| "usd"
	| "date"
	| "block"
	| "txid"
	| "address"
	| "memo";

const MASKS: Record<DiscreetKind, string> = {
	zec: "•••••",
	usd: "$•••••",
	date: "•• ••• ••••",
	block: "#•••••••",
	txid: "••••••••••••",
	address: "••••••••••••••••••••",
	memo: "•••••••••••••••",
};

// The settled mask for a kind, for sites that swap subtrees instead of mounting
// DiscreetValue across the flip (the notes-table copy cells).
export function maskFor(kind: DiscreetKind): string {
	return MASKS[kind];
}

// One rAF loop drives every in-flight scramble. A toggle fires dozens at once
// (headline, chart card, ~20 virtualized rows), so they share a ticker instead of
// each running its own loop.
const frames = new Set<(now: number) => void>();
let raf = 0;

function pump(now: number) {
	for (const cb of Array.from(frames)) cb(now);
	raf = frames.size > 0 ? requestAnimationFrame(pump) : 0;
}

function onFrame(cb: (now: number) => void): () => void {
	frames.add(cb);
	if (raf === 0) raf = requestAnimationFrame(pump);
	return () => {
		frames.delete(cb);
		if (frames.size === 0 && raf !== 0) {
			cancelAnimationFrame(raf);
			raf = 0;
		}
	};
}

const SCRAMBLE_MS = 500;
// Unresolved positions reroll at ~25fps; every frame reads as flicker, not churn.
const ROLL_MS = 40;
// Digits and the dot: with tabular figures the span holds width mid-scramble.
const GLYPHS = "0123456789•";

const easeOut = (t: number) => 1 - (1 - t) ** 3;

// Random glyphs in the target's footprint. Spaces stay, so its structure holds.
function scrambleGlyphs(to: string): string {
	return Array.from(to, (c) =>
		c === " " ? " " : GLYPHS.charAt(Math.floor(Math.random() * GLYPHS.length)),
	).join("");
}

// Positions resolve left to right over the duration; the rest churn random
// glyphs. Ends by handing the display back to the live target via `done`, never
// by painting a final frame of its own, so a target that moved mid-scramble
// (a balance update) shows its current value the moment the effect ends.
function runScramble(
	to: string,
	set: (text: string) => void,
	done: () => void,
): () => void {
	const t0 = performance.now();
	let lastRoll = -Infinity;
	let glyphs: string[] = [];
	const stop = onFrame((now) => {
		const p = Math.min((now - t0) / SCRAMBLE_MS, 1);
		if (p >= 1) {
			stop();
			done();
			return;
		}
		if (now - lastRoll >= ROLL_MS) {
			glyphs = Array.from(scrambleGlyphs(to));
			lastRoll = now;
		}
		const resolved = Math.floor(easeOut(p) * to.length);
		set(
			Array.from(to, (c, i) => (i < resolved || c === " " ? c : glyphs[i])).join(
				"",
			),
		);
	});
	return stop;
}

export function DiscreetValue({
	kind,
	children,
	className,
}: {
	kind: DiscreetKind;
	children: string;
	className?: string;
}) {
	const masked = useMasked();
	const target = masked ? MASKS[kind] : children;
	// Non-null only while a scramble is animating; otherwise the live target
	// renders directly, so ordinary data updates stay synchronous.
	const [frame, setFrame] = useState<string | null>(null);
	const [prev, setPrev] = useState(masked);

	// A flip must never paint the outgoing value: adjust state during render (the
	// re-render runs before commit), so the first painted frame is already glyphs.
	// A hide that painted the real value first would leak the very thing it hides.
	if (prev !== masked) {
		setPrev(masked);
		setFrame(animationsEnabled() ? scrambleGlyphs(target) : null);
	}

	const prevMasked = useRef(masked);
	const cancel = useRef<(() => void) | null>(null);
	useEffect(() => () => cancel.current?.(), []);
	// Drives the animation only. Cancellation between runs is handled here, not
	// via the effect cleanup: a cleanup would also run on a plain data update
	// (target change, no flip) and kill an in-flight scramble mid-churn.
	useEffect(() => {
		const flipped = prevMasked.current !== masked;
		prevMasked.current = masked;
		if (!flipped) return;
		cancel.current?.();
		if (!animationsEnabled()) {
			setFrame(null);
			return;
		}
		cancel.current = runScramble(target, setFrame, () => {
			cancel.current = null;
			setFrame(null);
		});
	}, [masked, target]);

	const text = frame ?? target;
	return (
		<span
			className={`tabular-nums ${className ?? ""}`}
			aria-label={masked ? "Hidden" : undefined}
		>
			{masked ? <span aria-hidden>{text}</span> : text}
		</span>
	);
}
