import { useEffect, useMemo, useRef, useState } from "react";
import {
	IconAlertTriangle,
	IconCircleCheckFilled,
	IconLoader2,
	IconShieldCheckFilled,
} from "@tabler/icons-react";
import { TxList } from "@/components/app/tx-list";
import { BalanceChart } from "@/components/dashboard/BalanceChart";
import { useWalletData } from "@/hooks/use-wallet-data";
import {
	athStanding,
	balanceHistory,
	formatEta,
	formatZec,
	isSynced,
	totalConfirmed,
} from "@/lib/format";
import type { Balance, SyncStatus, Tx } from "@/lib/ipc";

// The designer's Home frame, wired to the live daemon feed through useWalletData.
// Balance, block height, sync progress, and recent activity come from the engine.
// The "Balance over time" chart has no dedicated daemon command, so it's
// reconstructed from the confirmed transaction history.

export function DashboardPage() {
	const { balance, txs, sync, error } = useWalletData();

	return (
		<>
			{error && (
				<p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
					Can't reach the background process: {error}
				</p>
			)}
			<BalanceHero balance={balance} sync={sync} />
			<ChartCard balance={balance} txs={txs} sync={sync} />
			<section className="rounded-2xl border border-zinc-200 bg-card p-6">
				<h2 className="font-heading text-base font-semibold">
					Recent Activity
				</h2>
				<TxList txs={txs} limit={5} />
			</section>
		</>
	);
}

function BalanceHero({
	balance,
	sync,
}: {
	balance: Balance | null;
	sync: SyncStatus | null;
}) {
	const total = totalConfirmed(balance);
	return (
		// No overflow-hidden here: WebKitGTK under software rendering (no GPU, e.g. a
		// VM) miscomputes the height of an overflow-hidden flex container without an
		// explicit height, sizing it to the first line and clipping the balance and
		// sync row. The brand glow is a radial gradient, so the rounded corners still
		// clip it without overflow-hidden, and there's no blur layer to render.
		<section
			className="rounded-2xl bg-ink p-6 text-white"
			style={{
				backgroundImage:
					"radial-gradient(60% 120% at 85% 0%, rgba(26,43,255,0.28), transparent 70%)",
			}}
		>
			<div className="flex flex-col gap-5">
				<div className="flex flex-col gap-1">
					<span className="flex items-center gap-1.5 text-xs text-white/45">
						<IconShieldCheckFilled className="size-3.5" />
						Balance
					</span>
					<span className="font-heading text-4xl font-bold tabular-nums">
						{total === null ? "…" : formatZec(total)}{" "}
						<span className="text-2xl font-normal text-white/45">ZEC</span>
					</span>
				</div>
				<SyncRow sync={sync} />
			</div>
		</section>
	);
}

const clampPct = (p: number) => Math.min(100, Math.max(0, p));

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

		// Not shown while synced, so park at 0: a later sync then fills in from
		// empty instead of flashing the prior round's full bar for a frame.
		if (!syncing) {
			v.active = false;
			v.shown = 0;
			setDisplayed(0);
			return;
		}

		// Anchor the forward projection at the latest real reading. A fresh session
		// starts the floor at the real percent. Within a session it never regresses.
		if (!v.active) {
			v.active = true;
			v.shown = real;
		}
		v.anchor = Math.max(v.shown, real);
		v.atMs = performance.now();
		v.eta = sync.etaSeconds ?? 0;

		// Forward projection is predictive motion, so drop it under reduced motion
		// and just ease toward the real readings.
		const project = !window.matchMedia("(prefers-reduced-motion: reduce)")
			.matches;

		// One loop drives both the ETA projection toward the tip and a per-frame
		// glide (~150ms settle) toward it, so re-estimates and overtakes ease in
		// rather than snapping. Monotonic: the target never drops below `shown`.
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

function SyncRow({ sync }: { sync: SyncStatus | null }) {
	const synced = isSynced(sync);
	const syncing = !!sync && sync.state !== "error" && !synced;
	const displayed = useCreepingPercent(sync, syncing);
	if (!sync) return null;
	if (sync.state === "error") {
		// The raw transport error belongs in the logs. A connectivity failure gets
		// named so the app-shell "Change Indexer" banner reads as its fix. Any other
		// error reads as a transient pause the backoff loop is already retrying.
		return (
			<span className="flex items-center gap-1.5 text-xs text-white/55">
				<IconAlertTriangle className="size-3.5 text-amber-400" />
				{sync.unreachable
					? "Can't reach your Indexer"
					: "Sync paused, retrying…"}
			</span>
		);
	}
	if (synced) {
		return (
			<span className="flex items-center gap-1.5 text-xs text-white/55">
				<IconCircleCheckFilled className="size-3.5 text-brand" />
				Synced
			</span>
		);
	}
	const pct = clampPct(Math.round(sync.percent));
	const eta = formatEta(sync.etaSeconds);
	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center justify-between text-xs text-white/55 tabular-nums">
				<span>Syncing {pct}%</span>
				{eta ? <span>{eta}</span> : null}
			</div>
			<div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
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

function ChartCard({
	balance,
	txs,
	sync,
}: {
	balance: Balance | null;
	txs: Tx[];
	sync: SyncStatus | null;
}) {
	const total = totalConfirmed(balance);
	// Memoised so a sync-only refresh (the percent bar, the still-calculating
	// spinner) doesn't hand the chart a fresh array and force a full recharts
	// reconcile while you're hovering it.
	const points = useMemo(() => balanceHistory(txs, balance), [txs, balance]);
	const hasData = points.length >= 2;
	const standing = athStanding(points);
	// The standing reads off the reconstructed history, which keeps shifting until
	// the initial scan finishes. Show it anyway, with a spinner so the number reads
	// as still settling rather than final.
	const calculating = !isSynced(sync);
	return (
		<section className="rounded-2xl border border-zinc-200 bg-card p-6">
			<div className="flex items-start justify-between">
				<div className="flex flex-col">
					{standing ? (
						<span className="flex items-center gap-1.5 text-sm">
							<span
								className={
									standing.atPeak && !calculating
										? "font-medium text-brand"
										: "text-zinc-400"
								}
							>
								{standing.atPeak
									? "At your all-time high"
									: `${standing.pct}% of all-time high`}
							</span>
							{calculating && (
								<IconLoader2
									className="size-3.5 text-zinc-400 motion-safe:animate-spin"
									aria-label="Still calculating"
								/>
							)}
						</span>
					) : (
						<span className="text-sm text-zinc-400">Balance over time</span>
					)}
					<span className="font-heading text-lg font-semibold tabular-nums">
						{total === null ? "…" : `${formatZec(total)} ZEC`}
					</span>
				</div>
				{/* The series is reconstructed from tx history. The ZEC/USD toggle stays
            presentational until a price feed lands. */}
				<div className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 p-1">
					<span className="rounded-full bg-brand px-4 py-1 text-xs font-medium text-white">
						ZEC
					</span>
					<span className="rounded-full px-4 py-1 text-xs font-medium text-zinc-400">
						USD
					</span>
				</div>
			</div>
			{/* Empty state and chart share one grid cell so the first confirmed point
          crossfades in instead of snapping. The empty state matches the chart's
          viewBox ratio, so the swap carries no layout shift under it. */}
			<div className="mt-4 grid text-zinc-400">
				<div
					aria-hidden={hasData}
					style={{ opacity: hasData ? 0 : 1 }}
					className="col-start-1 row-start-1 flex aspect-900/240 items-center justify-center text-sm text-zinc-400 transition-opacity duration-360 ease-[cubic-bezier(0.23,1,0.32,1)]"
				>
					No confirmed activity yet
				</div>
				{hasData && (
					<div className="balance-chart-enter col-start-1 row-start-1">
						<BalanceChart points={points} />
					</div>
				)}
			</div>
		</section>
	);
}
