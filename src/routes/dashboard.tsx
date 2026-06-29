import { useEffect, useMemo, useRef, useState } from "react";
import {
	IconAlertTriangle,
	IconCircleCheckFilled,
	IconInfoCircle,
	IconLoader2,
} from "@tabler/icons-react";
import { Segmented } from "@/components/app/segmented";
import { TxList } from "@/components/app/tx-list";
import { BalanceChart } from "@/components/dashboard/BalanceChart";
import { useWalletData } from "@/hooks/use-wallet-data";
import {
	athStanding,
	type BalancePoint,
	balanceHistory,
	type ChartRange,
	filterRange,
	formatZec,
	isSynced,
	syncLabel,
	totalConfirmed,
} from "@/lib/format";
import type { Balance, SyncStatus, Tx } from "@/lib/ipc";
import { animationsEnabled } from "@/lib/motion";

// The designer's Home frame, wired to the live daemon feed through useWalletData. The
// graph card is the hero: a TOTAL BALANCE header with the headline figure and a sync
// pill, the currency toggle and a Pools entry on the right, then the "ZEC over time"
// chart with its range selector. The series has no dedicated daemon command, so it's
// reconstructed from the confirmed transaction history.

export function DashboardPage() {
	const { balance, txs, sync, error } = useWalletData();

	return (
		<>
			{error && (
				<p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
					Can't reach the background process: {error}
				</p>
			)}
			<ChartCard balance={balance} txs={txs} sync={sync} />
			<section className="rounded-2xl border border-border bg-card p-6">
				<h2 className="font-heading text-base font-semibold">
					Recent Activity
				</h2>
				<TxList txs={txs} limit={5} />
			</section>
		</>
	);
}

const RANGES: { value: ChartRange; label: string }[] = [
	{ value: "all", label: "All" },
	{ value: "year", label: "1Y" },
	{ value: "month", label: "1M" },
	{ value: "week", label: "1W" },
	{ value: "day", label: "1D" },
];

// The high the standing measures against follows the selected window: "all" is the
// true all-time high, the rest are the peak within that period.
const PERIOD_HIGH: Record<ChartRange, string> = {
	all: "all-time high",
	year: "1-year high",
	month: "1-month high",
	week: "1-week high",
	day: "1-day high",
};

// Keys for transactions that have just entered the *full* history, so the chart can
// ping where they landed. Tracked over the whole reconstructed series (not the
// windowed/downsampled view), so it fires only when a new transaction is detected,
// never when a period switch merely reveals points that already existed. Cleared once
// the ping has played, so a later switch doesn't replay it.
function useFreshTxKeys(points: BalancePoint[]): Set<string> {
	const seen = useRef(new Set(points.map((p) => p.key)));
	const [fresh, setFresh] = useState<Set<string>>(new Set());
	const sig = points.map((p) => p.key).join("|");

	useEffect(() => {
		const keys = points.map((p) => p.key);
		const arrived = new Set(keys.filter((k) => !seen.current.has(k)));
		seen.current = new Set(keys);
		if (arrived.size === 0) return;
		setFresh(arrived);
		const t = setTimeout(() => setFresh(new Set()), 700);
		return () => clearTimeout(t);
		// Recompute against the key set, not its array identity.
	}, [sig]); // eslint-disable-line react-hooks/exhaustive-deps

	return fresh;
}

// A compact echo of the wallet's sync state, sitting beside the balance label. The
// detailed progress lives in the sidebar; this is the headline at a glance.
function HeroSyncPill({ sync }: { sync: SyncStatus | null }) {
	const synced = isSynced(sync);
	const errored = sync?.state === "error";
	const Icon = synced
		? IconCircleCheckFilled
		: errored
			? IconAlertTriangle
			: IconLoader2;
	const iconColor = synced
		? "text-brand"
		: errored
			? "text-amber-400"
			: "text-brand motion-safe:animate-spin";
	return (
		<span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground">
			<Icon className={`size-3.5 shrink-0 ${iconColor}`} />
			{syncLabel(sync)}
		</span>
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
	const [range, setRange] = useState<ChartRange>("all");
	const total = totalConfirmed(balance);
	// Memoised so a sync-only refresh doesn't hand the chart a fresh array and force a
	// full recharts reconcile while you're hovering it.
	const points = useMemo(() => balanceHistory(txs, balance), [txs, balance]);
	const series = useMemo(() => filterRange(points, range), [points, range]);
	// Freshness tracks the full history, so only a newly detected transaction pings,
	// not a point a period switch brings back into view.
	const freshKeys = useFreshTxKeys(points);
	const hasData = series.length >= 2;
	// The standing reads off the windowed series, so the high it measures against is the
	// peak within the selected period. The history is provisional mid-sync, so a spinner
	// marks the number as still settling rather than final.
	const standing = athStanding(series);
	const calculating = !isSynced(sync);
	return (
		<section className="rounded-2xl border border-border bg-card p-6">
			<div className="flex items-start justify-between gap-4">
				<div className="flex flex-col gap-3">
					<div className="flex items-center gap-3">
						<span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
							Total Balance
						</span>
						<HeroSyncPill sync={sync} />
					</div>
					<span className="font-heading text-5xl font-bold leading-none tabular-nums">
						{total === null ? "…" : formatZec(total)}{" "}
						<span className="text-2xl font-normal text-muted-foreground">
							ZEC
						</span>
					</span>
				</div>
				<div className="flex shrink-0 flex-col items-end gap-3">
					{/* Presentational: USD stays inert until a price feed lands, so the
              toggle is locked to ZEC. */}
					<div className="w-44">
						<Segmented
							tone="neutral"
							value="zec"
							onChange={() => {}}
							options={[
								{ value: "zec", label: "ZEC" },
								{ value: "usd", label: "USD" },
							]}
						/>
					</div>
					{/* Placeholder for a future pools breakdown section. */}
					<button
						type="button"
						className="w-44 rounded-lg border border-border bg-muted/40 px-6 py-2.5 text-sm font-medium text-foreground transition-[background-color,border-color,transform] duration-150 ease-out hover:border-muted-foreground/40 hover:bg-muted active:scale-[0.98]"
					>
						Pools
					</button>
				</div>
			</div>

			<hr className="my-6 border-border" />

			<div className="flex items-center justify-between gap-4">
				<div className="flex flex-col gap-0.5">
					<div className="flex items-center gap-1.5">
						<h2 className="font-heading text-base font-semibold">
							Balance over time
						</h2>
						<IconInfoCircle
							className="size-4 text-muted-foreground"
							aria-label="Balance reconstructed from confirmed transactions"
						/>
					</div>
					{standing && (
						<span className="flex items-center gap-1.5 text-xs">
							<span
								className={
									standing.atPeak && !calculating
										? "font-medium text-brand"
										: "text-muted-foreground"
								}
							>
								{standing.atPeak
									? `At your ${PERIOD_HIGH[range]}`
									: `${standing.pct}% of ${PERIOD_HIGH[range]}`}
							</span>
							{calculating && (
								<IconLoader2
									className="size-3.5 text-muted-foreground motion-safe:animate-spin"
									aria-label="Still calculating"
								/>
							)}
						</span>
					)}
				</div>
				<div className="w-[24rem] max-w-[60%]">
					<Segmented
						tone="neutral"
						value={range}
						onChange={setRange}
						options={RANGES}
					/>
				</div>
			</div>

			{/* Empty state and chart share one grid cell so the first confirmed point
          crossfades in instead of snapping. The empty state matches the chart's
          viewBox ratio, so the swap carries no layout shift under it. */}
			<div className="mt-4 grid text-muted-foreground">
				<div
					aria-hidden={hasData}
					style={{ opacity: hasData ? 0 : 1 }}
					className="col-start-1 row-start-1 flex aspect-900/240 items-center justify-center text-sm text-muted-foreground transition-opacity duration-360 ease-[cubic-bezier(0.23,1,0.32,1)]"
				>
					No confirmed activity yet
				</div>
				{hasData && (
					<div
						className={`col-start-1 row-start-1 ${animationsEnabled() ? "balance-chart-enter" : ""}`}
					>
						<BalanceChart points={series} freshKeys={freshKeys} />
					</div>
				)}
			</div>
		</section>
	);
}
