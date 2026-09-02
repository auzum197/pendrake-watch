import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { WalletNote } from "@/lib/ipc";
import {
  DiscreetValue,
  type DiscreetKind,
} from "@/components/ui/discreet-value/discreet-value";
import { useMasked } from "@/lib/discreet";
import { formatZec, zatToZecPlain } from "@/lib/format";
import type { Sort, SortKey } from "@/lib/notes";
import { cn } from "@/lib/utils";
import { ChangeBadge, MempoolBadge, PoolBadge, StatusBadge } from "./badges";
import "./notes.css";

type Column = {
  key: SortKey | "txid";
  label: string;
  sortable: boolean;
  align?: "right";
};

const GRID =
  "grid grid-cols-[7fr_13fr_18fr_12fr_12fr_15fr_10fr_13fr] items-center";

const ROW_HEIGHT = 41;

const COLUMNS: Column[] = [
  { key: "idx", label: "№", sortable: true },
  { key: "pool", label: "Pool", sortable: true },
  { key: "value", label: "Value (ZEC)", sortable: true, align: "right" },
  { key: "status", label: "Status", sortable: true },
  { key: "height", label: "Block", sortable: true },
  { key: "txid", label: "Txid", sortable: false },
  { key: "flags", label: "Flags", sortable: true },
  { key: "spentHeight", label: "Spent at", sortable: true },
];

function shortTxid(txid: string): string {
  return txid.length > 13 ? `${txid.slice(0, 6)}…${txid.slice(-4)}` : txid;
}

type CopyPhase = "idle" | "in" | "hold" | "out";

const COPIED_HOLD_MS = 1200;

function CopyCell({
  copy,
  kind,
  className,
  children,
}: {
  copy: string;
  kind: DiscreetKind;
  className?: string;
  children: string;
}) {
  const masked = useMasked();
  const [phase, setPhase] = useState<CopyPhase>("idle");
  const [gen, setGen] = useState(0);
  const holdTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(holdTimer.current), []);

  if (masked) {
    return (
      <DiscreetValue kind={kind} className={className}>
        {children}
      </DiscreetValue>
    );
  }

  function holdThenRollOut() {
    clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => setPhase("out"), COPIED_HOLD_MS);
  }

  async function onCopy() {
    await navigator.clipboard.writeText(copy);
    if (phase === "in" || phase === "hold") {
      if (phase === "hold") holdThenRollOut();
      return;
    }
    setGen((g) => g + 1);
    setPhase("in");
  }

  function onRollEnd() {
    if (phase === "in") {
      setPhase("hold");
      holdThenRollOut();
    } else if (phase === "out") {
      setPhase("idle");
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      title="Copy"
      className={cn(
        "copy-roll transition-transform duration-150 ease-out active:scale-[0.97]",
        className,
      )}
    >
      {phase === "idle" ? (
        children
      ) : (
        <span
          key={gen}
          className="copy-roll__track"
          data-phase={phase}
          onAnimationEnd={onRollEnd}
        >
          <span className="copy-roll__row" aria-hidden>
            {children}
          </span>
          <span className="copy-roll__row text-muted-foreground">Copied</span>
          <span className="copy-roll__row" aria-hidden>
            {children}
          </span>
        </span>
      )}
    </button>
  );
}

export function NotesTable({
  notes,
  sort,
  onSort,
}: {
  notes: WalletNote[];
  sort: Sort;
  onSort: (key: SortKey) => void;
}) {
  if (notes.length === 0) {
    return (
      <p className="mt-4 text-sm text-muted-foreground">
        No notes match this filter.
      </p>
    );
  }

  return (
    <div className="mt-4 overflow-x-auto">
      <div className="min-w-2xl text-sm">
        <div
          className={`${GRID} pb-3 text-left text-xs text-muted-foreground`}
        >
          {COLUMNS.map((col) => (
            <div
              key={col.key}
              className={col.align === "right" ? "pr-6 text-right" : ""}
            >
              {col.sortable ? (
                <button
                  type="button"
                  onClick={() => onSort(col.key as SortKey)}
                  className={`inline-flex items-center gap-1 transition-colors hover:text-foreground active:scale-[0.97] ${
                    col.align === "right" ? "flex-row-reverse" : ""
                  } ${sort.key === col.key ? "text-foreground" : ""}`}
                >
                  {col.label}
                  {sort.key === col.key && (
                    <span aria-hidden>{sort.dir === "asc" ? "↑" : "↓"}</span>
                  )}
                </button>
              ) : (
                col.label
              )}
            </div>
          ))}
        </div>
        <VirtualRows notes={notes} />
      </div>
    </div>
  );
}

function VirtualRows({ notes }: { notes: WalletNote[] }) {
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollEl, setScrollEl] = useState<HTMLElement | null>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  useLayoutEffect(() => {
    const scroller = listRef.current?.closest<HTMLElement>(
      '[data-scroll-restoration-id="app-main"]',
    );
    if (!scroller || !listRef.current) return;
    setScrollEl(scroller);
    let top = 0;
    let el: HTMLElement | null = listRef.current;
    while (el && el !== scroller) {
      top += el.offsetTop;
      el = el.offsetParent as HTMLElement | null;
    }
    setScrollMargin(top);
  }, []);

  const virtualizer = useVirtualizer({
    count: notes.length,
    getScrollElement: () => scrollEl,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
    scrollMargin,
    getItemKey: (i) => notes[i].idx,
  });

  return (
    <div
      ref={listRef}
      className="relative"
      style={{ height: virtualizer.getTotalSize() }}
    >
      {virtualizer.getVirtualItems().map((item) => (
        <div
          key={item.key}
          style={{
            height: ROW_HEIGHT,
            transform: `translateY(${item.start - scrollMargin}px)`,
          }}
          className="absolute inset-x-0 top-0"
        >
          <NoteRow note={notes[item.index]} />
        </div>
      ))}
    </div>
  );
}

function NoteRow({ note }: { note: WalletNote }) {
  const muted = note.status === "spent" ? "text-muted-foreground" : "";
  return (
    <div className={cn(GRID, "h-full border-b border-border", muted)}>
      <span className="font-mono tabular-nums text-muted-foreground">
        {note.idx}
      </span>
      <span>
        <PoolBadge pool={note.pool} />
      </span>
      <span className="pr-6 text-right font-mono tabular-nums">
        <CopyCell kind="zec" copy={zatToZecPlain(BigInt(note.valueZat))}>
          {formatZec(BigInt(note.valueZat))}
        </CopyCell>
      </span>
      <span>
        <StatusBadge status={note.status} />
      </span>
      <span className="font-mono tabular-nums">
        {note.height != null ? (
          <CopyCell kind="block" copy={String(note.height)}>
            {note.height.toLocaleString()}
          </CopyCell>
        ) : (
          <MempoolBadge />
        )}
      </span>
      <span className="font-mono text-muted-foreground">
        <CopyCell kind="txid" copy={note.txid}>
          {shortTxid(note.txid)}
        </CopyCell>
      </span>
      <span>
        {note.change ? (
          <ChangeBadge />
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </span>
      <span className="font-mono tabular-nums">
        {note.spentHeight != null ? (
          <CopyCell kind="block" copy={String(note.spentHeight)}>
            {note.spentHeight.toLocaleString()}
          </CopyCell>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </span>
    </div>
  );
}
