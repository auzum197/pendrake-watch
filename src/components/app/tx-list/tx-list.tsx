import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  IconCircleCheckFilled,
  IconLoader2,
  IconMessage2,
} from "@tabler/icons-react";
import type { Tx } from "@/lib/ipc";
import {
  DiscreetValue,
  maskFor,
} from "@/components/ui/discreet-value/discreet-value";
import { formatBlock, formatTxDate, formatZec, txHasMemo } from "@/lib/format";
import { animationsEnabled } from "@/lib/motion";
import { takeReturnRow } from "../return-flash";
import "../reveal.css";

const STAGGER_CEILING_MS = 360;
const STAGGER_TAU = 9;

const COLS = "grid grid-cols-[7rem_1fr_7.5rem_7rem_10ch] items-center gap-4";

const TYPE_COL = "7rem";
const STATUS_COL = "7.5rem";
const DATE_COL = "7rem";

function colWidths(rows: Tx[]): { amount: number; block: number } {
  let amount = maskFor("zec").length + 5;
  let block = maskFor("block").length;
  for (const tx of rows) {
    amount = Math.max(amount, formatZec(BigInt(tx.valueZat)).length + 5);
    if (tx.blockHeight) {
      block = Math.max(block, formatBlock(tx.blockHeight).length);
    }
  }
  return { amount, block };
}

function colsFor(rows: Tx[]): string {
  const w = colWidths(rows);
  return `${TYPE_COL} minmax(${w.amount}ch, 1fr) ${STATUS_COL} ${DATE_COL} ${w.block}ch`;
}

const ROW_HEIGHT = 49;

export function TxList({ txs, limit }: { txs: Tx[]; limit?: number }) {
  const navigate = useNavigate();
  const [returnTxid] = useState(takeReturnRow);
  const ordered = [...txs].sort((a, b) => {
    const ha = a.blockHeight ?? Infinity;
    const hb = b.blockHeight ?? Infinity;
    if (ha !== hb) return hb - ha;
    return b.datetime - a.datetime;
  });
  const rows = limit ? ordered.slice(0, limit) : ordered;

  if (rows.length === 0) {
    return <p className="mt-4 text-sm text-muted-foreground">No transactions yet.</p>;
  }

  const open = (txid: string) =>
    navigate({ to: "/tx/$txid", params: { txid } });

  if (limit) {
    const w = colWidths(rows);
    return (
      <table className="mt-4 w-full table-fixed font-mono text-sm">
        <colgroup>
          <col style={{ width: TYPE_COL }} />
          <col />
          <col style={{ width: STATUS_COL }} />
          <col style={{ width: DATE_COL }} />
          <col style={{ width: `${w.block}ch` }} />
        </colgroup>
        <thead>
          <tr className="text-left font-sans text-xs text-muted-foreground">
            <th className="pb-3 font-normal">Tx Type</th>
            <th className="pb-3 font-normal">Amount</th>
            <th className="pb-3 font-normal">Status</th>
            <th className="pb-3 font-normal">Date</th>
            <th className="pb-3 font-normal">Block</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
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
                className={`cursor-pointer transition-colors hover:bg-muted ${
                  flash ? "tx-flash" : reveal ? "reveal-up" : ""
                }`}
              >
                <td className="py-3 font-sans font-medium">
                  <TxType tx={tx} received={received} />
                </td>
                <td
                  className={`py-3 tabular-nums ${received ? "text-green-400" : ""}`}
                >
                  <TxAmount tx={tx} received={received} />
                </td>
                <td className="py-3 font-sans">
                  <StatusBadge status={tx.status} />
                </td>
                <td className="whitespace-nowrap py-3 font-sans tabular-nums text-muted-foreground">
                  <TxDate epoch={tx.datetime} />
                </td>
                <td className="py-3 tabular-nums text-muted-foreground">
                  <TxBlock height={tx.blockHeight} />
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

  useLayoutEffect(() => {
    if (returnTxid === null || !scrollEl) return;
    const index = rows.findIndex((t) => t.txid === returnTxid);
    if (index >= 0) virtualizer.scrollToIndex(index, { align: "center" });
  }, [scrollEl]); // eslint-disable-line react-hooks/exhaustive-deps

  const [revealing, setRevealing] = useState(
    animationsEnabled() && returnTxid === null,
  );
  useEffect(() => {
    if (!animationsEnabled() || returnTxid !== null) return;
    const t = setTimeout(() => setRevealing(false), STAGGER_CEILING_MS + 440);
    return () => clearTimeout(t);
  }, [returnTxid]);

  const cols = useMemo(() => colsFor(rows), [rows]);

  return (
    <div className="mt-4 text-sm">
      <div
        className={`${COLS} pb-3 text-left font-mono text-muted-foreground`}
        style={{ gridTemplateColumns: cols }}
      >
        <span className="font-sans text-xs">Tx Type</span>
        <span className="font-sans text-xs">Amount</span>
        <span className="font-sans text-xs">Status</span>
        <span className="font-sans text-xs">Date</span>
        <span className="font-sans text-xs">Block</span>
      </div>
      <div
        ref={listRef}
        className="relative"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((item) => {
          const tx = rows[item.index];
          const flash = animationsEnabled() && tx.txid === returnTxid;
          const reveal = revealing && !flash;
          const delay = reveal
            ? Math.round(
                STAGGER_CEILING_MS * (1 - Math.exp(-item.index / STAGGER_TAU)),
              )
            : 0;
          return (
            <div
              key={item.key}
              style={{
                height: ROW_HEIGHT,
                transform: `translateY(${item.start - scrollMargin}px)`,
              }}
              className="absolute inset-x-0 top-0"
            >
              <TxRow
                tx={tx}
                cols={cols}
                onOpen={onOpen}
                flash={flash}
                reveal={reveal}
                delay={delay}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TxRow({
  tx,
  cols,
  onOpen,
  flash = false,
  reveal = false,
  delay = 0,
}: {
  tx: Tx;
  cols?: string;
  onOpen?: (txid: string) => void;
  flash?: boolean;
  reveal?: boolean;
  delay?: number;
}) {
  const received = tx.kind === "received";
  return (
    <div
      onClick={() => onOpen?.(tx.txid)}
      style={{
        ...(cols && { gridTemplateColumns: cols }),
        ...(reveal && { animationDelay: `${delay}ms` }),
      }}
      className={`${COLS} h-full cursor-pointer border-b border-border font-mono transition-colors hover:bg-muted ${
        flash ? "tx-flash" : reveal ? "reveal-up" : ""
      }`}
    >
      <span className="font-sans font-medium">
        <TxType tx={tx} received={received} />
      </span>
      <span className={`tabular-nums ${received ? "text-green-400" : ""}`}>
        <TxAmount tx={tx} received={received} />
      </span>
      <span className="font-sans">
        <StatusBadge status={tx.status} />
      </span>
      <span className="whitespace-nowrap font-sans tabular-nums text-muted-foreground">
        <TxDate epoch={tx.datetime} />
      </span>
      <span className="tabular-nums text-muted-foreground">
        <TxBlock height={tx.blockHeight} />
      </span>
    </div>
  );
}

function TxType({ tx, received }: { tx: Tx; received: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      {received ? "Received" : "Sent"}
      {txHasMemo(tx) && (
        <IconMessage2 className="size-3.5 text-muted-foreground" aria-label="Has memo" />
      )}
    </span>
  );
}

function TxAmount({ tx, received }: { tx: Tx; received: boolean }) {
  return (
    <>
      {received ? "+" : "−"}
      <DiscreetValue kind="zec">{formatZec(BigInt(tx.valueZat))}</DiscreetValue>{" "}
      ZEC
    </>
  );
}

function TxDate({ epoch }: { epoch: number }) {
  return <DiscreetValue kind="date">{formatTxDate(epoch)}</DiscreetValue>;
}

function TxBlock({ height }: { height: number | undefined }) {
  if (!height) return <>{formatBlock(height)}</>;
  return <DiscreetValue kind="block">{formatBlock(height)}</DiscreetValue>;
}

function StatusBadge({ status }: { status: Tx["status"] }) {
  if (status === "confirmed") {
    return (
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <IconCircleCheckFilled className="size-4 text-brand" />
        Confirmed
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-muted-foreground">
      <IconLoader2 className="size-4 animate-spin text-brand" />
      Pending
    </span>
  );
}
