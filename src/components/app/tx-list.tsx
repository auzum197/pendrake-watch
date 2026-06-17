import { useNavigate } from "@tanstack/react-router";
import { IconCircleCheckFilled, IconLoader2 } from "@tabler/icons-react";
import type { Tx } from "@/lib/ipc";
import { formatTime, formatZec } from "@/lib/format";

export function TxList({ txs, limit }: { txs: Tx[]; limit?: number }) {
  const navigate = useNavigate();
  const rows = limit ? txs.slice(0, limit) : txs;

  if (rows.length === 0) {
    return <p className="mt-4 text-sm text-zinc-400">No transactions yet.</p>;
  }

  return (
    <table className="mt-4 w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-zinc-400">
          <th className="pb-3 font-normal">Tx Type</th>
          <th className="pb-3 font-normal">Amount</th>
          <th className="pb-3 font-normal">Status</th>
          <th className="pb-3 font-normal">Time Stamp</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-100">
        {rows.map((tx) => {
          const received = tx.kind === "received";
          return (
            <tr
              key={tx.txid}
              onClick={() =>
                navigate({ to: "/tx/$txid", params: { txid: tx.txid } })
              }
              className="cursor-pointer transition-colors hover:bg-zinc-50"
            >
              <td className="py-3 font-medium">
                {received ? "Received" : "Sent"}
              </td>
              <td
                className={`py-3 font-mono tabular-nums ${received ? "text-green-600" : ""}`}
              >
                {received ? "+" : "−"}
                {formatZec(BigInt(tx.valueZat))} ZEC
              </td>
              <td className="py-3">
                <StatusBadge status={tx.status} />
              </td>
              <td className="py-3 text-zinc-400">{formatTime(tx.datetime)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function StatusBadge({ status }: { status: Tx["status"] }) {
  if (status === "confirmed") {
    return (
      <span className="flex items-center gap-1.5 text-zinc-600">
        <IconCircleCheckFilled className="size-4 text-brand" />
        Completed
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-zinc-600">
      <IconLoader2 className="size-4 animate-spin text-brand" />
      In progress
    </span>
  );
}
