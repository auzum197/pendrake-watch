import { useEffect, useRef, useState } from "react";
import {
	IconAlertTriangle,
	IconCircleCheckFilled,
	IconLoader2,
} from "@tabler/icons-react";
import type { SyncStatus } from "@/lib/ipc";
import { formatEta, isSynced } from "@/lib/format";

const clampPct = (p: number) => Math.min(100, Math.max(0, p));

// True while the wallet is actively scanning (not idle/synced, not errored). Drives
// whether the card shows the progress bar at all.
export function isSyncing(sync: SyncStatus | null): boolean {
	return !!sync && sync.state !== "error" && !isSynced(sync);
}

// Between the engine's batch-completion updates the real percent freezes, so the
// raw fill would jump then stall. Project it forward with the round's ETA so the
// bar creeps continuously, re-anchoring to each real reading, staying monotonic,
// and capping short of 100 so it never claims completion before the round ends.
function useCreepingPercent(sync: SyncStatus | null, syncing: boolean): number {
	const [displayed, setDisplayed] = useState(0);
	const view = useRef({ shown: 0, anchor: 0, atMs: 0, eta: 0, active: false });

	useEffect(() => {
		if (!sync) return;
		const real = clampPct(sync.percent);
		const v = view.current;

		if (!syncing) {
			v.active = false;
			v.shown = 0;
			setDisplayed(0);
			return;
		}

		if (!v.active) {
			v.active = true;
			v.shown = real;
		}
		v.anchor = Math.max(v.shown, real);
		v.atMs = performance.now();
		v.eta = sync.etaSeconds ?? 0;

		const project = !window.matchMedia("(prefers-reduced-motion: reduce)")
			.matches;

		let raf = 0;
		const tick = () => {
			const elapsed = (performance.now() - v.atMs) / 1000;
			const frac = project && v.eta > 0 ? Math.min(elapsed / v.eta, 0.97) : 0;
			const target = v.anchor + (100 - v.anchor) * frac;
			v.shown += (target - v.shown) * 0.12;
			const settled = target - v.shown < 0.05;
			if (settled) v.shown = target;
			setDisplayed(v.shown);
			if (!settled || frac < 0.97) raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, [sync, syncing]);

	return displayed;
}

// The wallet's sync state as a compact chip, sized for the card's top row beside the
// network badge. The percent lives on the bar below; the chip just names the state.
export function SyncChip({ sync }: { sync: SyncStatus | null }) {
	const base =
		"inline-flex shrink-0 items-center gap-1 text-[0.625rem] font-medium leading-none";
	if (!sync) {
		return (
			<span className={`${base} text-white/45`}>
				<IconLoader2 className="size-3 motion-safe:animate-spin" />
				Connecting
			</span>
		);
	}
	if (sync.state === "error" && sync.wrongChain) {
		// Red, a step past the amber outage: waiting won't heal a swapped chain.
		return (
			<span className={`${base} text-red-400`}>
				<IconAlertTriangle className="size-3" />
				Wrong chain
			</span>
		);
	}
	if (sync.state === "error") {
		return (
			<span className={`${base} text-amber-400`}>
				<IconAlertTriangle className="size-3" />
				Sync error
			</span>
		);
	}
	if (isSynced(sync)) {
		return (
			<span className={`${base} text-emerald-400`}>
				<IconCircleCheckFilled className="size-3" />
				Synced
			</span>
		);
	}
	return (
		<span className={`${base} text-white/70`}>
			<IconLoader2 className="size-3 motion-safe:animate-spin" />
			Syncing
		</span>
	);
}

// The progress track shown in the card's collapsible region while scanning. Stays
// mounted across the synced transition so the region can animate its collapse; parks
// at zero once synced.
export function SyncBar({ sync }: { sync: SyncStatus | null }) {
	const syncing = isSyncing(sync);
	const displayed = useCreepingPercent(sync, syncing);
	const eta = sync ? formatEta(sync.etaSeconds) : null;
	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex items-center justify-between text-[0.625rem] tabular-nums text-white/45">
				<span>{Math.round(displayed)}%</span>
				{eta ? <span className="truncate pl-2">{eta}</span> : null}
			</div>
			<div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
				<div
					className="relative h-full overflow-hidden rounded-full bg-brand"
					style={{ width: `${displayed}%` }}
				>
					<span className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent motion-safe:animate-[sync-sheen_1.8s_linear_infinite]" />
				</div>
			</div>
		</div>
	);
}
