import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  IconAlertTriangle,
  IconCircleCheckFilled,
  IconLoader2,
  IconStack2,
} from "@tabler/icons-react";
import { Segmented } from "@/components/app/segmented/segmented";
import { DiscreetEye } from "@/components/app/discreet-eye/discreet-eye";
import { appToast } from "@/components/app/app-toast/app-toast";
import { DiscreetValue } from "@/components/ui/discreet-value/discreet-value";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { TxList } from "@/components/app/tx-list/tx-list";
import {
  axisLabels,
  DitherArea,
} from "@/components/dashboard/dither/dither-area";
import { DitherStack } from "@/components/dashboard/dither/dither-stack";
import "@/components/dashboard/balance-chart.css";
import { FiatConsentDialog } from "@/components/dashboard/fiat-consent-dialog";
import { useNotesData } from "@/hooks/use-notes-data";
import { usePriceData } from "@/hooks/use-price-data";
import { setCachedWallet, useWalletData } from "@/hooks/use-wallet-data";
import {
  athStanding,
  balanceHistory,
  type BalancePoint,
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
  restartSync,
  setFiatEnabled,
  type SyncStatus,
  type Tx,
  type WalletNote,
  type WalletState,
} from "@/lib/ipc";
import { animationsEnabled } from "@/lib/motion";
import { poolHistory, type PoolSeries } from "@/lib/pools";

export function DashboardPage() {
  const { wallet, balance, txs, sync, switching } = useWalletData();
  const { notes } = useNotesData();
  return (
    <DashboardView
      wallet={wallet}
      balance={balance}
      txs={txs}
      notes={notes}
      sync={sync}
      switching={switching}
    />
  );
}

export function DashboardView({
  wallet,
  balance,
  txs,
  notes,
  sync,
  switching,
}: {
  wallet: WalletState | null;
  balance: Balance | null;
  txs: Tx[];
  notes: WalletNote[];
  sync: SyncStatus | null;
  switching: boolean;
}) {
  if (switching) {
    return <DashboardSkeleton />;
  }

  return (
    <>
      <ChartCard
        wallet={wallet}
        balance={balance}
        txs={txs}
        notes={notes}
        sync={sync}
      />
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

type Denom = "zec" | "usd";

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

// The pill beside the total. A plain sync error turns it into a button: the engine
// already retries failed rounds on its own with a growing backoff, so clicking
// just asks the daemon to cut that wait short. Wrong chain stays inert, since no
// amount of retrying the same Indexer fixes an anchor mismatch — the Indexer
// switch in Settings is the way out.
type PillState =
  | "restarting"
  | "synced"
  | "error"
  | "wrongChain"
  | "syncing"
  | "hidden";

function pillState(sync: SyncStatus | null, restarting: boolean): PillState {
  if (restarting) return "restarting";
  if (sync === null) return "hidden";
  if (sync.state === "error") return sync.wrongChain ? "wrongChain" : "error";
  if (isSynced(sync)) return "synced";
  if (sync.state === "syncing") return "syncing";
  return "hidden";
}

const PILL_STYLE: Record<
  PillState,
  { icon: typeof IconLoader2; iconClass: string } | null
> = {
  restarting: {
    icon: IconLoader2,
    iconClass: "text-muted-foreground motion-safe:animate-spin",
  },
  synced: { icon: IconCircleCheckFilled, iconClass: "text-brand" },
  error: { icon: IconAlertTriangle, iconClass: "text-amber-400" },
  wrongChain: { icon: IconAlertTriangle, iconClass: "text-red-400" },
  syncing: {
    icon: IconLoader2,
    iconClass: "text-brand motion-safe:animate-spin",
  },
  hidden: null,
};

function HeroSyncPill({
  sync,
  walletId,
}: {
  sync: SyncStatus | null;
  walletId: string | null;
}) {
  const [restarting, setRestarting] = useState(false);
  const state = pillState(sync, restarting);
  const style = PILL_STYLE[state];
  if (style === null) return null;

  async function restart() {
    if (restarting) return;
    setRestarting(true);
    try {
      await restartSync(walletId ?? undefined);
    } catch (e) {
      appToast.error("Couldn't restart sync", String(e));
    }
    setRestarting(false);
  }

  const label = restarting ? "Restarting…" : syncLabel(sync);
  const body = (
    <>
      <style.icon className={`size-3.5 shrink-0 ${style.iconClass}`} />
      {label}
    </>
  );

  if (state === "error") {
    return (
      <button
        type="button"
        onClick={restart}
        title={sync?.error ?? "Restart sync now"}
        aria-label="Restart sync"
        className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground outline-none transition-colors hover:border-amber-400/50 hover:text-foreground focus-visible:border-amber-400/50"
      >
        {body}
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground">
      {body}
    </span>
  );
}

let chartEntered = false;

function useChartEntrance(hasData: boolean): boolean {
  const [enter] = useState(() => !chartEntered && animationsEnabled());
  useEffect(() => {
    if (hasData) chartEntered = true;
  }, [hasData]);
  return enter;
}

function ChartSlot({
  series,
  usd,
  pools,
  byPool,
}: {
  series: BalancePoint[];
  usd: boolean;
  pools: PoolSeries[];
  byPool: boolean;
}) {
  const hasData = series.length >= 2;
  const enter = useChartEntrance(hasData);
  return (
    <div className="mt-4 grid text-muted-foreground">
      <div className="col-start-1 row-start-1">
        <div
          aria-hidden={hasData}
          style={{ opacity: hasData ? 0 : 1 }}
          className="flex aspect-900/240 items-center justify-center text-sm text-muted-foreground transition-opacity duration-360 ease-[cubic-bezier(0.23,1,0.32,1)]"
        >
          No confirmed activity yet
        </div>
      </div>
      {hasData && (
        <div
          className={`col-start-1 row-start-1 ${enter ? "balance-chart-enter" : ""}`}
        >
          <div className="grid">
            <div
              className={`balance-chart-swap col-start-1 row-start-1 ${byPool ? "balance-chart-swap-out" : ""}`}
              aria-hidden={byPool}
            >
              <DitherArea
                points={series}
                usd={usd}
                animate={enter}
                className="aspect-900/240 w-full"
              />
            </div>
            {pools.length > 0 && (
              <div
                className={`balance-chart-swap col-start-1 row-start-1 ${byPool ? "" : "balance-chart-swap-out"}`}
                aria-hidden={!byPool}
              >
                <DitherStack
                  series={pools}
                  labels={axisLabels(series)}
                  className="aspect-900/240 w-full"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ChartCard({
  wallet,
  balance,
  txs,
  notes,
  sync,
}: {
  wallet: WalletState | null;
  balance: Balance | null;
  txs: Tx[];
  notes: WalletNote[];
  sync: SyncStatus | null;
}) {
  const navigate = useNavigate();
  const [range, setRange] = useState<ChartRange>("all");
  const [denom, setDenom] = useState<Denom>("zec");
  const [byPool, setByPool] = useState(false);
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
  const pools = useMemo(() => {
    if (points.length === 0) return [];
    const frame = { start: points[0].t, end: points[points.length - 1].t };
    return poolHistory(notes, frame).map((poolSeries) => ({
      ...poolSeries,
      points: filterRange(poolSeries.points, range),
    }));
  }, [notes, points, range]);
  const stacked = byPool && activeDenom === "zec" && pools.length > 0;

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
            <HeroSyncPill sync={sync} walletId={wallet?.walletId ?? null} />
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
        <div className="flex w-108 max-w-3/5 shrink-0 items-center gap-3">
          <button
            type="button"
            aria-pressed={byPool}
            title={byPool ? "Show total balance" : "Break down by pool"}
            onClick={() => setByPool((on) => !on)}
            className={`balance-chart-toggle flex size-9 shrink-0 items-center justify-center rounded-full border border-ink-line bg-ink-soft text-white/55 hover:text-white/80 ${
              byPool ? "bg-white/10 text-white" : ""
            } ${activeDenom === "usd" || pools.length === 0 ? "balance-chart-toggle-out" : ""}`}
          >
            <IconStack2 className="size-4" />
          </button>
          <div className="min-w-0 flex-1">
            <Segmented
              tone="neutral"
              value={range}
              onChange={setRange}
              options={RANGES}
            />
          </div>
        </div>
      </div>

      <ChartSlot
        series={series}
        usd={activeDenom === "usd"}
        pools={pools}
        byPool={stacked}
      />

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
