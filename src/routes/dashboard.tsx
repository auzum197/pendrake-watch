import { useEffect } from "react";
import { IconEye, IconEyeOff, IconRefresh } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { useWalletStore } from "@/stores/walletStore";
import { useUiStore } from "@/stores/uiStore";
import { zatoshisToZec, HIDDEN_AMOUNT } from "@/lib/zec";

/** Overview: total balance, per-pool breakdown and sync status. */
export function DashboardPage() {
  const balance = useWalletStore((s) => s.balance);
  const syncStatus = useWalletStore((s) => s.syncStatus);
  const loading = useWalletStore((s) => s.loading);
  const error = useWalletStore((s) => s.error);
  const refreshAll = useWalletStore((s) => s.refreshAll);

  const balanceHidden = useUiStore((s) => s.balanceHidden);
  const toggleBalanceHidden = useUiStore((s) => s.toggleBalanceHidden);

  // Data fetching lives in the store action; the component just triggers it.
  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const show = (zatoshis: string | undefined) =>
    zatoshis === undefined
      ? "—"
      : balanceHidden
        ? HIDDEN_AMOUNT
        : `${zatoshisToZec(zatoshis)} ZEC`;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Dashboard
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleBalanceHidden}
            aria-label={balanceHidden ? "Show balance" : "Hide balance"}
          >
            {balanceHidden ? <IconEyeOff size={18} /> : <IconEye size={18} />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refreshAll()}
            disabled={loading}
          >
            <IconRefresh size={16} className="mr-1" />
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">Total balance</p>
        <p className="mt-1 font-heading text-4xl font-bold tracking-tight">
          {show(balance?.totalZatoshis)}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(
          [
            ["Transparent", balance?.transparent],
            ["Sapling", balance?.sapling],
            ["Orchard", balance?.orchard],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="mt-1 text-lg font-semibold">{show(value)}</p>
          </div>
        ))}
      </div>

      <div className="text-sm text-muted-foreground">
        {syncStatus
          ? `Sync: ${syncStatus.state} · block ${syncStatus.syncedBlocks.toLocaleString()} / ${syncStatus.totalBlocks.toLocaleString()}`
          : "Sync status unavailable"}
      </div>
    </div>
  );
}
