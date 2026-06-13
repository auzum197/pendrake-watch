import { useEffect, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { getTransaction, onSyncEvent, type Tx } from "@/lib/ipc";

export function TxDetailPage() {
  const { txid } = useParams({ strict: false }) as { txid: string };
  const [tx, setTx] = useState<Tx | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function find() {
      const found = await getTransaction(txid).catch(() => null);
      if (!active) return;
      setTx(found);
      setLoading(false);
      return found != null;
    }
    find();
    // On a cold open the daemon may still be repopulating its cache, so refetch
    // on discovery events and a short poll until the tx resolves.
    const unlisten = onSyncEvent((ev) => {
      if (active && (ev.event === "transaction" || ev.event === "finished")) {
        find();
      }
    });
    const timer = setInterval(() => {
      find().then((done) => {
        if (done) clearInterval(timer);
      });
    }, 2000);
    return () => {
      active = false;
      clearInterval(timer);
      unlisten.then((fn) => fn()).catch(() => {});
    };
  }, [txid]);

  const received = tx?.kind === "received";

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pt-[6vh]">
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back
      </Link>

      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          {tx ? (received ? "Received" : "Sent") : "Transaction"}
        </h1>
        {tx && (
          <span
            className={`font-heading text-3xl font-semibold tabular-nums ${received ? "text-green-600 dark:text-green-400" : ""}`}
          >
            {received ? "+" : "−"}
            {formatZec(tx.valueZat)} ZEC
          </span>
        )}
      </header>

      {loading && !tx && (
        <p className="text-sm text-muted-foreground">Looking up transaction…</p>
      )}

      {!loading && !tx && (
        <p className="text-sm text-muted-foreground">
          This transaction isn't in the wallet yet. It may still be syncing.
        </p>
      )}

      {tx && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Status</dt>
          <dd className="capitalize">{tx.status}</dd>
          <dt className="text-muted-foreground">Amount</dt>
          <dd className="tabular-nums">{formatZec(tx.valueZat)} ZEC</dd>
          <dt className="text-muted-foreground">Block</dt>
          <dd className="tabular-nums">{tx.blockHeight?.toLocaleString() ?? "pending"}</dd>
          <dt className="text-muted-foreground">Date</dt>
          <dd>{new Date(tx.datetime * 1000).toLocaleString()}</dd>
          <dt className="self-start text-muted-foreground">Txid</dt>
          <dd className="break-all font-mono text-xs">{tx.txid}</dd>
        </dl>
      )}

      <a
        href={`https://mainnet.zcashexplorer.app/transactions/${txid}`}
        target="_blank"
        rel="noreferrer"
        className="text-sm text-primary underline-offset-4 hover:underline"
      >
        View on block explorer
      </a>
    </div>
  );
}

function formatZec(zat: string): string {
  const n = BigInt(zat);
  const whole = n / 100_000_000n;
  const frac = (n % 100_000_000n).toString().padStart(8, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole.toString();
}
