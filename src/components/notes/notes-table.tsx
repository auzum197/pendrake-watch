import { type ReactNode, useEffect, useRef, useState } from "react";
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
  // A share of the table width (Tailwind percentage). table-fixed splits its width by
  // these, so columns scale with the window and stay put whatever the visible rows
  // hold. Percentages, not px, so the table shrinks with a narrow window instead of
  // overflowing. They sum to 100.
  width: string;
};

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
  { key: "idx", label: "№", sortable: true, width: "w-[7%]" },
  { key: "pool", label: "Pool", sortable: true, width: "w-[13%]" },
  { key: "value", label: "Value (ZEC)", sortable: true, align: "right", width: "w-[18%]" },
  { key: "status", label: "Status", sortable: true, width: "w-[12%]" },
  { key: "height", label: "Block", sortable: true, width: "w-[12%]" },
  { key: "txid", label: "Txid", sortable: false, width: "w-[15%]" },
  { key: "flags", label: "Flags", sortable: true, width: "w-[10%]" },
  { key: "spentHeight", label: "Spent at", sortable: true, width: "w-[13%]" },
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
      <table className="w-full min-w-2xl table-fixed text-sm">
        <thead>
          <tr className="text-left text-xs text-muted-foreground">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className={`pb-3 font-normal ${col.width} ${col.align === "right" ? "text-right pr-6" : ""}`}
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
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {notes.map((note) => (
            <NoteRow key={note.idx} note={note} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NoteRow({ note }: { note: WalletNote }) {
  // Spent notes stay visible but recede, so the spendable set reads first.
  const muted = note.status === "spent" ? "text-muted-foreground" : "";
  return (
    <tr className={cn("note-row", muted)}>
      <td className="py-2.5 font-mono tabular-nums text-muted-foreground">
        {note.idx}
      </td>
      <td className="py-2.5">
        <PoolBadge pool={note.pool} />
      </td>
      <td className="py-2.5 pr-6 text-right font-mono tabular-nums">
        <CopyCell copy={zatToZecPlain(BigInt(note.valueZat))}>
          {formatZec(BigInt(note.valueZat))}
        </CopyCell>
      </td>
      <td className="py-2.5">
        <StatusBadge status={note.status} />
      </td>
      <td className="py-2.5 font-mono tabular-nums">
        {note.height != null ? (
          <CopyCell copy={String(note.height)}>
            {note.height.toLocaleString()}
          </CopyCell>
        ) : (
          <MempoolBadge />
        )}
      </td>
      <td className="py-2.5 font-mono text-muted-foreground">
        <CopyCell copy={note.txid}>{shortTxid(note.txid)}</CopyCell>
      </td>
      <td className="py-2.5">
        {note.change ? (
          <ChangeBadge />
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="py-2.5 font-mono tabular-nums">
        {note.spentHeight != null ? (
          <CopyCell copy={String(note.spentHeight)}>
            {note.spentHeight.toLocaleString()}
          </CopyCell>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  );
}
