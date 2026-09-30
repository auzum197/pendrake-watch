import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  IconArrowDownLeft,
  IconArrowUpRight,
  IconCurrencyZcash,
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
import { poolsOf, TxPools } from "./tx-pools";
import "../reveal.css";

const STAGGER_CEILING_MS = 360;
const STAGGER_TAU = 9;

// One line per transaction: direction arrow, signed amount, txid, Pools, date,
// block. Confirmed is the expected state so it carries no mark; Pending is the
// one status that shows, and it takes the block slot (docs/adr/0013).
const COLS = "grid items-center gap-4";

const KIND_COL = "1.25rem";
// The Discreet mask for a txid is wider than the shortened txid itself.
const TXID_COL = `${maskFor("txid").length + 1}ch`;
const POOLS_COL = "minmax(6rem, 1fr)";
const DATE_COL = "7rem";
// Wide enough for the Pending mark when a row has no block.
const BLOCK_MIN_CH = 9;
const AMOUNT_EXTRA_CH = 7;

const HEADERS = ["", "Amount", "Txid", "Pools", "Date", "Block"];

function colWidths(rows: Tx[]): { amount: number; block: number } {
  // Sign, digits, the currency glyph and room for the memo mark.
  let amount = maskFor("zec").length + AMOUNT_EXTRA_CH;
  let block = Math.max(maskFor("block").length, BLOCK_MIN_CH);
  for (const tx of rows) {
    amount = Math.max(
      amount,
      formatZec(BigInt(tx.valueZat)).length + AMOUNT_EXTRA_CH,
    );
    if (tx.blockHeight) {
      block = Math.max(block, formatBlock(tx.blockHeight).length);
    }
  }
  return { amount, block };
}

function colsFor(rows: Tx[]): string {
  const w = colWidths(rows);
  return `${KIND_COL} ${w.amount}ch ${TXID_COL} ${POOLS_COL} ${DATE_COL} ${w.block}ch`;
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
    return (
      <p className="mt-4 text-sm text-muted-foreground">No transactions yet.</p>
    );
  }

  const open = (txid: string) =>
    navigate({ to: "/tx/$txid", params: { txid } });

  if (limit) {
    const w = colWidths(rows);
    return (
      <table className="mt-4 w-full table-fixed font-mono text-sm">
        <colgroup>
          <col style={{ width: KIND_COL }} />
          <col style={{ width: `${w.amount}ch` }} />
          <col style={{ width: TXID_COL }} />
          <col />
          <col style={{ width: DATE_COL }} />
          <col style={{ width: `${w.block}ch` }} />
        </colgroup>
        <thead>
          <tr className="text-left font-sans text-xs text-muted-foreground">
            {HEADERS.map((h, i) => (
              <th key={i} className="pb-3 font-normal">
                {h}
              </th>
            ))}
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
            return (
              <tr
                key={tx.txid}
                onClick={() => open(tx.txid)}
                style={reveal ? { animationDelay: `${delay}ms` } : undefined}
                className={`cursor-pointer transition-colors hover:bg-muted ${
                  flash ? "tx-flash" : reveal ? "reveal-up" : ""
                }`}
              >
                <td className="py-3">
                  <TxKind tx={tx} />
                </td>
                <td className="py-3">
                  <TxAmount tx={tx} />
                </td>
                <td className="py-3">
                  <TxTxid tx={tx} />
                </td>
                <td className="py-3 font-sans">
                  <TxPools pools={poolsOf(tx.notes)} />
                </td>
                <td className="whitespace-nowrap py-3 font-sans">
                  <TxDate epoch={tx.datetime} />
                </td>
                <td className="py-3">
                  <TxBlock tx={tx} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }

  return <VirtualTxList rows={rows} returnTxid={returnTxid} onOpen={open} />;
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
        className={`${COLS} pb-3 text-left font-sans text-xs text-muted-foreground`}
        style={{ gridTemplateColumns: cols }}
      >
        {HEADERS.map((h, i) => (
          <span key={i}>{h}</span>
        ))}
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
  return (
    <div
      onClick={() => onOpen?.(tx.txid)}
      style={{
        gridTemplateColumns: cols ?? colsFor([tx]),
        ...(reveal && { animationDelay: `${delay}ms` }),
      }}
      className={`${COLS} h-full cursor-pointer border-b border-border font-mono transition-colors hover:bg-muted ${
        flash ? "tx-flash" : reveal ? "reveal-up" : ""
      }`}
    >
      <TxKind tx={tx} />
      <TxAmount tx={tx} />
      <TxTxid tx={tx} />
      <span className="font-sans">
        <TxPools pools={poolsOf(tx.notes)} />
      </span>
      <span className="whitespace-nowrap font-sans">
        <TxDate epoch={tx.datetime} />
      </span>
      <TxBlock tx={tx} />
    </div>
  );
}

function TxKind({ tx }: { tx: Tx }) {
  const received = tx.kind === "received";
  const Arrow = received ? IconArrowDownLeft : IconArrowUpRight;
  return (
    <Arrow
      className="size-4 text-muted-foreground"
      aria-label={received ? "Received" : "Sent"}
      role="img"
    />
  );
}

function TxAmount({ tx }: { tx: Tx }) {
  const received = tx.kind === "received";
  return (
    <span
      className={`flex items-center gap-1.5 whitespace-nowrap tabular-nums ${received ? "text-green-400" : ""}`}
    >
      <span>
        {received ? "+" : "−"}
        <DiscreetValue kind="zec">
          {formatZec(BigInt(tx.valueZat))}
        </DiscreetValue>
        <IconCurrencyZcash
          className="ml-1 inline size-[1em] align-[-0.15em] text-muted-foreground"
          aria-label="ZEC"
        />
      </span>
      {txHasMemo(tx) && (
        <IconMessage2
          className="size-3.5 text-muted-foreground"
          aria-label="Has memo"
        />
      )}
    </span>
  );
}

function shortTxid(txid: string): string {
  return `${txid.slice(0, 6)}…${txid.slice(-4)}`;
}

function TxTxid({ tx }: { tx: Tx }) {
  return (
    <DiscreetValue kind="txid" className="text-muted-foreground">
      {shortTxid(tx.txid)}
    </DiscreetValue>
  );
}

function TxDate({ epoch }: { epoch: number }) {
  return (
    <DiscreetValue kind="date" className="text-muted-foreground">
      {formatTxDate(epoch)}
    </DiscreetValue>
  );
}

function TxBlock({ tx }: { tx: Tx }) {
  if (tx.status === "pending") {
    return (
      <span className="flex items-center gap-1.5 whitespace-nowrap font-sans text-xs text-muted-foreground">
        <IconLoader2 className="size-3.5 animate-spin text-brand" />
        Pending
      </span>
    );
  }
  return (
    <DiscreetValue kind="block" className="text-muted-foreground">
      {formatBlock(tx.blockHeight)}
    </DiscreetValue>
  );
}
