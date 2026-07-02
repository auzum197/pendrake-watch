import {
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { WalletNote } from "@/lib/ipc";
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

// The list is virtualized, so it can't be a <table> (one layout box can't position
// rows independently). Header and every row share this grid instead. The fractions are
// the column's share of the width, so columns scale with the window the way the old
// table-fixed percentages did. They sum to 100 and match the COLUMNS order.
const GRID =
  "grid grid-cols-[7fr_13fr_18fr_12fr_12fr_15fr_10fr_13fr] items-center";

// Fixed row height for the virtualizer, matching a py-2.5 single-line row (the same
// size the pre-virtualization content-visibility reserved), so estimate and actual
// agree and nothing has to re-measure.
const ROW_HEIGHT = 41;

// Order matches the spec. The leading № leaves the left edge free for the planned
// per-row expand toggle without shifting the rest.
//
// № vs Block, since they look alike but mean different things:
//   № (idx):    a plain row counter the daemon stamps over the returned list, 0..n.
//               It identifies a row in this view, carries no chain meaning, and is
//               not a wallet-internal note id. Sorting any column keeps it on its
//               row, so it doubles as the default (creation-ish) order.
//   Block (height): the blockchain height of the block that mined the note's
//               transaction, i.e. where the note actually exists on chain. Null
//               (shown as `mempool`) until that transaction confirms.
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

// How long "Copied" stays parked before it rolls back, once the roll-in lands. A
// re-copy while it's up resets this instead of replaying the roll.
const COPIED_HOLD_MS = 1200;

// A cell whose content copies to the clipboard on click, then rolls a muted "Copied"
// up into its place and back to the value a beat later. WKWebView resolves
// navigator.clipboard on the click gesture, so no Tauri plugin is needed (the CSV
// export leans on the same thing). `copy` is the exact text put on the clipboard,
// which can differ from the shown, shortened `children`.
//
// The roll runs as phases (in, hold, out) over a three-row track (value, Copied,
// value) so that spamming copy doesn't restart the roll: while "Copied" is up or
// arriving, another click just holds it longer. A click only starts a fresh roll from
// idle or once it's already rolling back out.
function CopyCell({
  copy,
  className,
  children,
}: {
  copy: string;
  className?: string;
  children: ReactNode;
}) {
  const [phase, setPhase] = useState<CopyPhase>("idle");
  // Bumped only when a fresh roll starts, to re-key the track so its keyframe replays.
  // A re-copy mid-hold leaves it untouched, so the parked label just stays put.
  const [gen, setGen] = useState(0);
  const holdTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(holdTimer.current), []);

  function holdThenRollOut() {
    clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => setPhase("out"), COPIED_HOLD_MS);
  }

  async function onCopy() {
    await navigator.clipboard.writeText(copy);
    // Already reading "Copied" or on its way there: keep it up, don't restart the roll.
    if (phase === "in" || phase === "hold") {
      if (phase === "hold") holdThenRollOut();
      return;
    }
    // Idle, or already rolling back out: start a fresh roll from the top.
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
        // Untouched cells stay a bare label, so a full table doesn't mount a rolling
        // track per copyable cell up front. The track mounts on the first click and
        // unmounts when the roll ends, landing back on the identical value row.
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

// Virtualizes against the routed page's scroll container (the `app-main` scroller in
// app-shell) rather than an inner one, so only the visible rows mount. A full note list
// is hundreds of rows, each building several copy cells, and mounting them all at once is
// what stalled the page on first paint. The spacer reproduces the full height so the
// scrollbar stays honest. Mirrors the Activity list (see tx-list).
function VirtualRows({ notes }: { notes: WalletNote[] }) {
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollEl, setScrollEl] = useState<HTMLElement | null>(null);
  // The list's distance from the scroller's content top, so virtual offsets map onto the
  // real scroll position. The chrome above the list is fixed for the page's lifetime, so
  // this is measured once.
  const [scrollMargin, setScrollMargin] = useState(0);

  useLayoutEffect(() => {
    const scroller = listRef.current?.closest<HTMLElement>(
      '[data-scroll-restoration-id="app-main"]',
    );
    if (!scroller || !listRef.current) return;
    setScrollEl(scroller);
    // Distance from the scroller's content top to the list top. Summed off the offset
    // chain rather than getBoundingClientRect, since the filter-swap animation transforms
    // an ancestor and a transform would skew a rect read (offsetTop is layout, so it
    // doesn't). The scroller is positioned, so it terminates the chain.
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
  // Spent notes stay visible but recede, so the spendable set reads first.
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
        <CopyCell copy={zatToZecPlain(BigInt(note.valueZat))}>
          {formatZec(BigInt(note.valueZat))}
        </CopyCell>
      </span>
      <span>
        <StatusBadge status={note.status} />
      </span>
      <span className="font-mono tabular-nums">
        {note.height != null ? (
          <CopyCell copy={String(note.height)}>
            {note.height.toLocaleString()}
          </CopyCell>
        ) : (
          <MempoolBadge />
        )}
      </span>
      <span className="font-mono text-muted-foreground">
        <CopyCell copy={note.txid}>{shortTxid(note.txid)}</CopyCell>
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
          <CopyCell copy={String(note.spentHeight)}>
            {note.spentHeight.toLocaleString()}
          </CopyCell>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </span>
    </div>
  );
}
