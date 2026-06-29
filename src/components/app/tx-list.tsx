import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  IconCircleCheckFilled,
  IconLoader2,
  IconMessage2,
} from "@tabler/icons-react";
import type { Tx } from "@/lib/ipc";
import { formatBlock, formatZec, txHasMemo } from "@/lib/format";
import { animationsEnabled } from "@/lib/motion";
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

// Four columns shared by the header and every row, so the grid stays aligned
// without a <table>. The full list is virtualized, where a table's single layout
// box can't position rows independently.
const COLS = "grid grid-cols-[1.3fr_1fr_1fr_1fr] items-center gap-4";

// Fixed row height for the virtualizer. Matches a `py-3` row's single line of
// `text-sm` content, so estimate and actual agree and nothing has to re-measure.
const ROW_HEIGHT = 49;

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

  const open = (txid: string) =>
    navigate({ to: "/tx/$txid", params: { txid } });

  // The dashboard preview is a handful of rows, so the plain table stays: it's
  // cheap and keeps its entrance cascade. The full Activity list virtualizes.
  if (limit) {
    return (
      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-zinc-400">
            <th className="pb-3 font-normal">Tx Type</th>
            <th className="pb-3 font-normal">Amount</th>
            <th className="pb-3 font-normal">Status</th>
            <th className="pb-3 font-normal">Block</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.map((tx, i) => {
            const returning = returnTxid !== null;
            const motion = animationsEnabled();
            const flash = motion && tx.txid === returnTxid;
            const delay = Math.round(
              STAGGER_CEILING_MS * (1 - Math.exp(-i / STAGGER_TAU)),
            );
            const reveal = motion && !returning;
            const received = tx.kind === "received";
            return (
              <tr
                key={tx.txid}
                onClick={() => open(tx.txid)}
                style={reveal ? { animationDelay: `${delay}ms` } : undefined}
                className={`cursor-pointer transition-colors hover:bg-zinc-50 ${
                  flash ? "tx-flash" : reveal ? "reveal-up" : ""
                }`}
              >
                <td className="py-3 font-medium">
                  <TxType tx={tx} received={received} />
                </td>
                <td
                  className={`py-3 font-mono tabular-nums ${received ? "text-green-600" : ""}`}
                >
                  <TxAmount tx={tx} received={received} />
                </td>
                <td className="py-3">
                  <StatusBadge status={tx.status} />
                </td>
                <td className="py-3 font-mono tabular-nums text-zinc-400">
                  {formatBlock(tx.blockHeight)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }

  return (
    <VirtualTxList rows={rows} returnTxid={returnTxid} onOpen={open} />
  );
}

// Virtualizes against the routed page's scroll container (the `app-main` scroller
// in app-shell) rather than an inner scroller, so TanStack Router's scroll
// restoration and the return-flash keep working: the spacer reproduces the full
// height, so the restored scrollTop lands on the same rows.
function VirtualTxList({
  rows,
  returnTxid,
  onOpen,
}: {
  rows: Tx[];
  returnTxid: string | null;
  onOpen: (txid: string) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollEl, setScrollEl] = useState<HTMLElement | null>(null);
  // The list's distance from the scroller's content top, so virtual offsets map
  // onto the real scroll position. Measured once: the chrome above the list is
  // fixed for the lifetime of the page.
  const [scrollMargin, setScrollMargin] = useState(0);

  useLayoutEffect(() => {
    const el = listRef.current?.closest<HTMLElement>(
      '[data-scroll-restoration-id="app-main"]',
    );
    if (!el || !listRef.current) return;
    setScrollEl(el);
    setScrollMargin(
      listRef.current.getBoundingClientRect().top -
        el.getBoundingClientRect().top +
        el.scrollTop,
    );
  }, []);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollEl,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
    scrollMargin,
    getItemKey: (i) => rows[i].txid,
  });

  // On a return from a tx detail, land the opened row back under the eye. The
  // router's scroll-offset restoration is unreliable here: when it runs, the rows
  // it would scroll to aren't mounted (the virtualizer only renders what's in view),
  // so the offset clamps and the list snaps to the top. Driving the scroll by the
  // row's index instead is deterministic. Runs once the scroller is wired up.
  useLayoutEffect(() => {
    if (returnTxid === null || !scrollEl) return;
    const index = rows.findIndex((t) => t.txid === returnTxid);
    if (index >= 0) virtualizer.scrollToIndex(index, { align: "center" });
    // Fixed for this mount; rerun only when the scroller attaches.
  }, [scrollEl]); // eslint-disable-line react-hooks/exhaustive-deps

  // The entrance cascade runs only on a fresh visit (not when backing out of a
  // detail, where the flash relands the eye instead). Hold it just across its own
  // run, then stop: the virtualizer recycles rows as you scroll, and an always-on
  // reveal would re-fire the animation on every row that scrolls into view.
  const [revealing, setRevealing] = useState(
    animationsEnabled() && returnTxid === null,
  );
  useEffect(() => {
    if (!animationsEnabled() || returnTxid !== null) return;
    const t = setTimeout(() => setRevealing(false), STAGGER_CEILING_MS + 440);
    return () => clearTimeout(t);
  }, [returnTxid]);

  return (
    <div className="mt-4 text-sm">
      <div className={`${COLS} pb-3 text-left text-xs text-zinc-400`}>
        <span>Tx Type</span>
        <span>Amount</span>
        <span>Status</span>
        <span>Block</span>
      </div>
      <div
        ref={listRef}
        className="relative"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((item) => {
          const tx = rows[item.index];
          const received = tx.kind === "received";
          const flash = animationsEnabled() && tx.txid === returnTxid;
          const reveal = revealing && !flash;
          const delay = reveal
            ? Math.round(
                STAGGER_CEILING_MS * (1 - Math.exp(-item.index / STAGGER_TAU)),
              )
            : 0;
          return (
            // The virtualizer positions this outer node with a transform, so the
            // reveal (which also animates transform) rides an inner row to avoid
            // clobbering that placement.
            <div
              key={item.key}
              style={{
                height: ROW_HEIGHT,
                transform: `translateY(${item.start - scrollMargin}px)`,
              }}
              className="absolute inset-x-0 top-0"
            >
              <div
                onClick={() => onOpen(tx.txid)}
                style={reveal ? { animationDelay: `${delay}ms` } : undefined}
                className={`${COLS} h-full cursor-pointer border-b border-zinc-100 transition-colors hover:bg-zinc-50 ${
                  flash ? "tx-flash" : reveal ? "reveal-up" : ""
                }`}
              >
                <span className="font-medium">
                  <TxType tx={tx} received={received} />
                </span>
                <span
                  className={`font-mono tabular-nums ${received ? "text-green-600" : ""}`}
                >
                  <TxAmount tx={tx} received={received} />
                </span>
                <StatusBadge status={tx.status} />
                <span className="font-mono tabular-nums text-zinc-400">
                  {formatBlock(tx.blockHeight)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TxType({ tx, received }: { tx: Tx; received: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      {received ? "Received" : "Sent"}
      {txHasMemo(tx) && (
        <IconMessage2 className="size-3.5 text-zinc-400" aria-label="Has memo" />
      )}
    </span>
  );
}

function TxAmount({ tx, received }: { tx: Tx; received: boolean }) {
  return (
    <>
      {received ? "+" : "−"}
      {formatZec(BigInt(tx.valueZat))} ZEC
    </>
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
