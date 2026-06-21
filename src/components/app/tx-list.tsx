import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  IconCircleCheckFilled,
  IconLoader2,
  IconMessage2,
} from "@tabler/icons-react";
import type { Tx } from "@/lib/ipc";
import { formatTime, formatZec, txHasMemo } from "@/lib/format";
import { takeReturnRow } from "./return-flash";
import "./reveal.css";

// The entrance cascade eases toward a ceiling rather than stepping linearly then
// clamping flat. A flat clamp makes every row past the cutoff fire on the same
// frame, which reads as a sudden lurch once the list is longer than the cutoff.
// Easing toward the ceiling keeps each row landing just after the one before it,
// the gaps shrinking smoothly, so a long history still settles within the ceiling
// with no visible wall. TAU sets the falloff: the first gap is ~CEILING / TAU.
const STAGGER_CEILING_MS = 360;
const STAGGER_TAU = 9;

export function TxList({ txs, limit }: { txs: Tx[]; limit?: number }) {
  const navigate = useNavigate();
  // Read once on mount: non-null means we arrived here by backing out of a
  // transaction's detail. On a return the list is already where it was, so the
  // entrance cascade is skipped and only that row flashes; on a fresh visit the
  // rows stagger in as usual.
  const [returnTxid] = useState(takeReturnRow);
  // Always newest block first. Pending transactions have no height yet, so they
  // sit above confirmed ones. Transactions in the same block fall back to time.
  const ordered = [...txs].sort((a, b) => {
    const ha = a.blockHeight ?? Infinity;
    const hb = b.blockHeight ?? Infinity;
    if (ha !== hb) return hb - ha;
    return b.datetime - a.datetime;
  });
  const rows = limit ? ordered.slice(0, limit) : ordered;

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
        {rows.map((tx, i) => {
          const received = tx.kind === "received";
          const returning = returnTxid !== null;
          const flash = tx.txid === returnTxid;
          const delay = Math.round(
            STAGGER_CEILING_MS * (1 - Math.exp(-i / STAGGER_TAU)),
          );
          return (
            <tr
              key={tx.txid}
              onClick={() =>
                navigate({ to: "/tx/$txid", params: { txid: tx.txid } })
              }
              style={returning ? undefined : { animationDelay: `${delay}ms` }}
              className={`cursor-pointer transition-colors hover:bg-zinc-50 ${
                returning ? (flash ? "tx-flash" : "") : "reveal-up"
              }`}
            >
              <td className="py-3 font-medium">
                <span className="flex items-center gap-1.5">
                  {received ? "Received" : "Sent"}
                  {txHasMemo(tx) && (
                    <IconMessage2
                      className="size-3.5 text-zinc-400"
                      aria-label="Has memo"
                    />
                  )}
                </span>
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
        Confirmed
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-zinc-600">
      <IconLoader2 className="size-4 animate-spin text-brand" />
      Pending
    </span>
  );
}
