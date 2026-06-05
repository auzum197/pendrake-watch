import { useEffect } from "react";
import { getRouteApi, Link } from "@tanstack/react-router";
import { useWalletStore } from "@/stores/walletStore";
import { useUiStore } from "@/stores/uiStore";
import { zatoshisToZec, HIDDEN_AMOUNT } from "@/lib/zec";
import { POOLS, type Pool } from "@/types/wallet";

// Typed access to this route's validated search params (see router.tsx).
const routeApi = getRouteApi("/app/transactions");

/** Transaction history, optionally filtered by pool via `?pool=` search param. */
export function TransactionsPage() {
  const { pool } = routeApi.useSearch();

  const transactions = useWalletStore((s) => s.transactions);
  const refreshTransactions = useWalletStore((s) => s.refreshTransactions);
  const balanceHidden = useUiStore((s) => s.balanceHidden);

  useEffect(() => {
    if (transactions.length === 0) void refreshTransactions();
  }, [transactions.length, refreshTransactions]);

  const filtered = pool
    ? transactions.filter((tx) => tx.pool === pool)
    : transactions;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="font-heading text-2xl font-bold tracking-tight">
        Transactions
      </h1>

      {/* Pool filter — demonstrates type-safe search-param navigation. */}
      <div className="flex flex-wrap gap-2">
        <PoolFilterLink active={pool === undefined}>All</PoolFilterLink>
        {POOLS.map((p) => (
          <PoolFilterLink key={p} pool={p} active={pool === p}>
            {p}
          </PoolFilterLink>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No transactions.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {filtered.map((tx) => (
            <li
              key={tx.txid}
              className="flex items-center justify-between px-4 py-3"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium capitalize">
                  {tx.direction} · {tx.pool}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {tx.txid.slice(0, 16)}…
                </span>
              </div>
              <div className="text-right">
                <span
                  className={
                    tx.direction === "received"
                      ? "font-semibold text-emerald-500"
                      : "font-semibold text-foreground"
                  }
                >
                  {tx.direction === "received" ? "+" : "−"}
                  {balanceHidden
                    ? HIDDEN_AMOUNT
                    : `${zatoshisToZec(tx.valueZatoshis)} ZEC`}
                </span>
                <p className="text-xs text-muted-foreground">
                  {tx.confirmations.toLocaleString()} conf.
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PoolFilterLink({
  pool,
  active,
  children,
}: {
  pool?: Pool;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      to="/transactions"
      search={pool ? { pool } : {}}
      className={[
        "rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors",
        active
          ? "border-transparent bg-accent text-accent-foreground"
          : "border-border text-muted-foreground hover:text-foreground",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}
