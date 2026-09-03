import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
	IconAlertTriangle,
	IconCircleCheckFilled,
	IconLoader2,
} from "@tabler/icons-react";
import { Segmented } from "@/components/app/segmented/segmented";
import { DiscreetEye } from "@/components/app/discreet-eye/discreet-eye";
import { DiscreetValue } from "@/components/ui/discreet-value/discreet-value";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { TxList } from "@/components/app/tx-list/tx-list";
import { BalanceChart, type Denom } from "@/components/dashboard/BalanceChart";
import { FiatConsentDialog } from "@/components/dashboard/fiat-consent-dialog";
import { usePriceData } from "@/hooks/use-price-data";
import { setCachedWallet, useWalletData } from "@/hooks/use-wallet-data";
import {
	athStanding,
	balanceHistory,
	type ChartRange,
	fiatSeries,
	filterRange,
	formatUsd,
	formatZec,
	isSynced,
	syncLabel,
	totalConfirmed,
} from "@/lib/format";
import {
	type Balance,
	setFiatEnabled,
	type SyncStatus,
	type Tx,
	type WalletState,
} from "@/lib/ipc";
import { animationsEnabled } from "@/lib/motion";


export function DashboardPage() {
	const { wallet, balance, txs, sync, switching } = useWalletData();
	return (
		<DashboardView
			wallet={wallet}
			balance={balance}
			txs={txs}
			sync={sync}
			switching={switching}
		/>
	);
}

export function DashboardView({
	wallet,
	balance,
	txs,
	sync,
	switching,
}: {
	wallet: WalletState | null;
	balance: Balance | null;
	txs: Tx[];
	sync: SyncStatus | null;
	switching: boolean;
}) {
	if (switching) {
		return <DashboardSkeleton />;
	}

	return (
		<>
			<ChartCard wallet={wallet} balance={balance} txs={txs} sync={sync} />
			<section className="rounded-2xl border border-border bg-card p-6">
				<h2 className="font-heading text-base font-semibold">
					Recent Activity
				</h2>
				<TxList txs={txs} limit={5} />
			</section>
		</>
	);
}

function DashboardSkeleton() {
	return (
		<>
			<div className="rounded-2xl border border-border bg-card p-6">
				<div className="flex items-center justify-between">
					<Skeleton className="h-4 w-28" />
					<Skeleton className="h-7 w-24 rounded-full" />
				</div>
				<Skeleton className="mt-4 h-9 w-48" />
				<Skeleton className="mt-6 h-48 w-full rounded-xl" />
			</div>
			<section className="rounded-2xl border border-border bg-card p-6">
				<Skeleton className="h-5 w-36" />
				<div className="mt-4 space-y-3">
					{[0, 1, 2, 3, 4].map((row) => (
						<div key={row} className="flex items-center gap-3">
							<Skeleton className="size-9 rounded-full" />
							<div className="flex-1 space-y-2">
								<Skeleton className="h-3 w-32" />
								<Skeleton className="h-3 w-20" />
							</div>
							<Skeleton className="h-3 w-16" />
						</div>
					))}
				</div>
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

const PERIOD_HIGH: Record<ChartRange, string> = {
	all: "all-time high",
	year: "1-year high",
	month: "1-month high",
	week: "1-week high",
	day: "1-day high",
};

function HeroSyncPill({ sync }: { sync: SyncStatus | null }) {
	const synced = isSynced(sync);
	const errored = sync?.state === "error";
	const active = sync?.state === "syncing" && !synced;

	if (!synced && !errored && !active) return null;

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
	wallet,
	balance,
	txs,
	sync,
}: {
	wallet: WalletState | null;
	balance: Balance | null;
	txs: Tx[];
	sync: SyncStatus | null;
}) {
	const navigate = useNavigate();
	const [range, setRange] = useState<ChartRange>("all");
	const [denom, setDenom] = useState<Denom>("zec");
	const [consentOpen, setConsentOpen] = useState(false);
	const [enabledLocal, setEnabledLocal] = useState(false);
	const fiatEnabled = enabledLocal || !!wallet?.fiatEnabled;
	const price = usePriceData(fiatEnabled);

	const total = totalConfirmed(balance);
	const points = useMemo(() => balanceHistory(txs, balance), [txs, balance]);
	const spotUsd = price.spot?.usdPerZec ?? null;
	const fiatPoints = useMemo(
		() =>
			denom === "usd"
				? fiatSeries(points, price.history, spotUsd, range, Date.now())
				: [],
		[denom, points, price.history, spotUsd, range],
	);
	const showUsd = denom === "usd" && fiatPoints.length >= 2;
	const activeDenom: Denom = showUsd ? "usd" : "zec";
	const zecSeries = useMemo(() => filterRange(points, range), [points, range]);
	const series = showUsd ? fiatPoints : zecSeries;
	const hasData = series.length >= 2;

	function onDenom(next: Denom) {
		if (next === "usd" && !fiatEnabled) {
			setConsentOpen(true);
			return;
		}
		setDenom(next);
	}

	async function acceptConsent() {
		const state = await setFiatEnabled(true);
		setCachedWallet(state);
		setEnabledLocal(true);
		setDenom("usd");
	}

	const usdTotal =
		total !== null && spotUsd !== null ? (Number(total) / 1e8) * spotUsd : null;
	const standing = athStanding(series);
	const calculating = sync?.state === "syncing" && !isSynced(sync);
	return (
		<section className="rounded-2xl border border-border bg-card p-6">
			<div className="flex items-start justify-between gap-4">
				<div className="flex flex-col gap-3">
					<div className="flex items-center gap-3">
						<span className="text-base font-medium text-muted-foreground">
							Total Balance
						</span>
						<DiscreetEye />
						<HeroSyncPill sync={sync} />
					</div>
					{activeDenom === "usd" ? (
						<span className="font-heading text-5xl font-bold leading-none tabular-nums">
							{usdTotal === null ? (
								"…"
							) : (
								<DiscreetValue kind="usd">{formatUsd(usdTotal)}</DiscreetValue>
							)}{" "}
							<span className="text-2xl font-normal text-muted-foreground">
								USD
							</span>
						</span>
					) : (
						<span className="font-heading text-5xl font-bold leading-none tabular-nums">
							{total === null ? (
								"…"
							) : (
								<DiscreetValue kind="zec">{formatZec(total)}</DiscreetValue>
							)}{" "}
							<span className="text-2xl font-normal text-muted-foreground">
								ZEC
							</span>
						</span>
					)}
					<div className="h-4">
						{activeDenom === "usd" && price.spot && (
							<PriceFreshness spot={price.spot} />
						)}
					</div>
				</div>
				<div className="flex shrink-0 flex-col items-end gap-3">
					<div className="w-44">
						<Segmented
							tone="neutral"
							value={denom}
							onChange={onDenom}
							options={[
								{ value: "zec", label: "ZEC" },
								{ value: "usd", label: "USD" },
							]}
						/>
					</div>
					<button
						type="button"
						onClick={() => navigate({ to: "/pools" })}
						className="w-44 rounded-lg border border-border bg-muted/40 px-6 py-2.5 text-sm font-medium text-foreground transition-[background-color,border-color,transform] duration-150 ease-out hover:border-muted-foreground/40 hover:bg-muted active:scale-[0.98]"
					>
						Pools
					</button>
				</div>
			</div>

			<hr className="my-6 border-border" />

			<div className="flex items-center justify-between gap-4">
				<div className="flex flex-col gap-0.5">
					<h2 className="font-heading text-base font-semibold">
						Balance over time
					</h2>
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
						key={activeDenom === "usd" ? `usd-${range}` : "zec"}
						className={`col-start-1 row-start-1 ${animationsEnabled() ? "balance-chart-enter" : ""}`}
					>
						<BalanceChart points={series} denom={activeDenom} />
					</div>
				)}
			</div>

			<FiatConsentDialog
				open={consentOpen}
				onOpenChange={setConsentOpen}
				onAccept={acceptConsent}
			/>
		</section>
	);
}

function PriceFreshness({
	spot,
}: {
	spot: { fetchedAt: number; stale?: boolean };
}) {
	const ageMs = Date.now() - spot.fetchedAt * 1000;
	const mins = Math.max(0, Math.round(ageMs / 60000));
	const label =
		mins < 1
			? "updated just now"
			: mins < 60
				? `updated ${mins}m ago`
				: `updated ${Math.round(mins / 60)}h ago`;
	return (
		<span
			className={`text-xs ${spot.stale ? "text-amber-400" : "text-muted-foreground"}`}
		>
			{label}
		</span>
	);
}
