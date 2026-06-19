import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { IconCircleCheckFilled, IconShieldCheckFilled } from "@tabler/icons-react";
import { AppShell } from "@/components/app/app-shell";
import { TxList } from "@/components/app/tx-list";
import { BalanceChart } from "@/components/dashboard/BalanceChart";
import { useWalletData } from "@/hooks/use-wallet-data";
import { formatHeight, formatZec, isSynced, totalConfirmed } from "@/lib/format";
import type { Balance, SyncStatus } from "@/lib/ipc";

// The designer's Home frame, wired to the live daemon feed through useWalletData.
// Balance, block height, sync progress, and recent activity come from the engine.
// The "Balance over time" chart stays on sample data: the daemon exposes no
// balance history.

export function DashboardPage() {
  const navigate = useNavigate();
  const { wallet, balance, txs, sync, loaded, error } = useWalletData();

  // A real "no wallet yet" answer means onboarding hasn't run. An error (e.g. the
  // daemon isn't reachable) leaves the view up with placeholders instead.
  useEffect(() => {
    if (loaded && wallet && !wallet.exists) navigate({ to: "/onboarding" });
  }, [loaded, wallet, navigate]);

  return (
    <AppShell active="wallet" wallet={wallet} sync={sync}>
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-bold">Wallet</h1>
        <span className="text-sm text-zinc-400 tabular-nums">
          Block height {formatHeight(sync)}
        </span>
      </div>
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
          Can't reach the background process: {error}
        </p>
      )}
      <BalanceHero balance={balance} sync={sync} />
      <ChartCard balance={balance} />
      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="font-heading text-base font-semibold">Recent Activity</h2>
        <TxList txs={txs} limit={5} />
      </section>
    </AppShell>
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
    <section className="relative overflow-hidden rounded-2xl bg-ink p-6 text-white">
      <div className="absolute right-10 top-0 size-72 rounded-full bg-brand/25 blur-[64px]" />
      <div className="relative flex flex-col gap-5">
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

function SyncRow({ sync }: { sync: SyncStatus | null }) {
  const navigate = useNavigate();
  if (!sync) return null;
  if (sync.state === "error") {
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-xs text-red-400">
          Sync error{sync.error ? `: ${sync.error}` : ""}
        </span>
        {/* Only a connectivity failure is fixable by switching servers, so the CTA
            rides on `unreachable` and jumps straight to the Indexer setting. */}
        {sync.unreachable && (
          <button
            type="button"
            onClick={() => navigate({ to: "/settings", hash: "indexer" })}
            className="text-xs font-medium text-white underline-offset-2 hover:underline"
          >
            Change Indexer
          </button>
        )}
      </div>
    );
  }
  if (isSynced(sync)) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-white/55">
        <IconCircleCheckFilled className="size-3.5 text-brand" />
        Synced
      </span>
    );
  }
  const pct = Math.min(100, Math.max(0, Math.round(sync.percent)));
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-white/55 tabular-nums">
        <span>Syncing {pct}%</span>
        {sync.chainTip ? (
          <span>
            {sync.syncedHeight.toLocaleString()} / {sync.chainTip.toLocaleString()}
          </span>
        ) : null}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-500"
          style={{ width: `${Math.max(2, pct)}%` }}
        />
      </div>
    </div>
  );
}

function ChartCard({ balance }: { balance: Balance | null }) {
  const total = totalConfirmed(balance);
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6">
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <span className="text-sm text-zinc-400">Balance over time</span>
          <span className="font-heading text-lg font-semibold tabular-nums">
            {total === null ? "…" : `${formatZec(total)} ZEC`}
          </span>
        </div>
        {/* TODO: no balance-history command on the daemon yet, so the series and
            the ZEC/USD toggle are presentational. */}
        <div className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 p-1">
          <span className="rounded-full bg-brand px-4 py-1 text-xs font-medium text-white">
            ZEC
          </span>
          <span className="rounded-full px-4 py-1 text-xs font-medium text-zinc-400">
            USD
          </span>
        </div>
      </div>
      <div className="mt-4 text-zinc-400">
        <BalanceChart />
      </div>
    </section>
  );
}
