import { useEffect, useRef, useState } from "react";
import {
	IconAlertTriangle,
	IconCircleCheckFilled,
	IconLoader2,
	IconRefresh,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { syncWallet, type SyncStatus } from "@/lib/ipc";
import { formatEta, isSynced } from "@/lib/format";

const clampPct = (p: number) => Math.min(100, Math.max(0, p));

// True while the wallet is actively scanning (not idle/synced, not errored). Drives
// whether the card shows the progress bar at all.
export function isSyncing(sync: SyncStatus | null): boolean {
	return !!sync && sync.state !== "error" && !isSynced(sync) && sync.state === "syncing";
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

// The wallet's sync state as a compact chip. When idle (not at tip) or on error,
// the chip is a control that starts tip-follow via syncWallet (manual multi-wallet).
export function SyncChip({ sync }: { sync: SyncStatus | null }) {
	const [busy, setBusy] = useState(false);
	const base =
		"inline-flex shrink-0 items-center gap-1 text-[0.625rem] font-medium leading-none";

	async function startSync() {
		if (busy) return;
		setBusy(true);
		try {
			await syncWallet();
		} catch (e) {
			toast.error(String(e));
		} finally {
			setBusy(false);
		}
	}

	if (!sync) {
		return (
			<span className={`${base} text-white/45`}>
				<IconLoader2 className="size-3 motion-safe:animate-spin" />
				Connecting
			</span>
		);
	}
	if (sync.state === "error" && sync.wrongChain) {
		return (
			<span className={`${base} text-red-400`}>
				<IconAlertTriangle className="size-3" />
				Wrong chain
			</span>
		);
	}
	if (sync.state === "error") {
		return (
			<button
				type="button"
				onClick={startSync}
				disabled={busy}
				className={`${base} cursor-pointer text-amber-400 hover:underline disabled:opacity-60`}
				title="Retry sync"
			>
				{busy ? (
					<IconLoader2 className="size-3 motion-safe:animate-spin" />
				) : (
					<IconAlertTriangle className="size-3" />
				)}
				{busy ? "Starting…" : "Retry sync"}
			</button>
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
	// Actively scanning.
	if (sync.state === "syncing" || isSyncing(sync)) {
		return (
			<span className={`${base} text-white/70`}>
				<IconLoader2 className="size-3 motion-safe:animate-spin" />
				Syncing
			</span>
		);
	}
	// Idle but not synced (never scanned, or waiting for a user-started round).
	return (
		<button
			type="button"
			onClick={startSync}
			disabled={busy}
			className={`${base} cursor-pointer text-brand hover:underline disabled:opacity-60`}
			title="Sync this wallet to the chain tip"
		>
			{busy ? (
				<IconLoader2 className="size-3 motion-safe:animate-spin" />
			) : null}
			{busy ? "Starting…" : "Sync"}
		</button>
	);
}

export function SyncGlyph({ sync }: { sync: SyncStatus | null }) {
	const [busy, setBusy] = useState(false);

	async function startSync() {
		if (busy) return;
		setBusy(true);
		try {
			await syncWallet();
		} catch (e) {
			toast.error(String(e));
		} finally {
			setBusy(false);
		}
	}

	const scanning =
		busy || !sync || sync.state === "syncing" || isSyncing(sync);
	const title = !sync
		? "Connecting"
		: sync.state === "error"
			? sync.wrongChain
				? "Wrong chain"
				: "Retry sync"
			: isSynced(sync)
				? "Synced"
				: scanning
					? "Syncing"
					: "Sync this wallet to the chain tip";

	return (
		<button
			type="button"
			onClick={startSync}
			disabled={busy}
			aria-label={title}
			title={title}
			className="flex shrink-0 cursor-pointer items-center text-white/45 transition-colors hover:text-white/80 disabled:opacity-60"
		>
			<IconRefresh
				className={`size-3.5 ${scanning ? "motion-safe:animate-spin" : ""}`}
			/>
		</button>
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
