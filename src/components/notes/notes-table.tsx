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
  // A fixed width (Tailwind) so a column keeps its size whatever the visible rows
  // hold. Without this the table is content-sized and columns jump between filters.
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
  { key: "idx", label: "№", sortable: true, width: "w-12" },
  { key: "pool", label: "Pool", sortable: true, width: "w-28" },
  { key: "value", label: "Value (ZEC)", sortable: true, align: "right", width: "w-48" },
  { key: "status", label: "Status", sortable: true, width: "w-28" },
  { key: "height", label: "Block", sortable: true, width: "w-28" },
  { key: "txid", label: "Txid", sortable: false, width: "w-36" },
  { key: "flags", label: "Flags", sortable: true, width: "w-24" },
  { key: "spentHeight", label: "Spent at", sortable: true, width: "w-28" },
];

function shortTxid(txid: string): string {
  return txid.length > 13 ? `${txid.slice(0, 6)}…${txid.slice(-4)}` : txid;
}

// A cell whose content copies to the clipboard on click, rolling a muted "Copied"
// up into its place and back a beat later. WKWebView resolves navigator.clipboard on
// the click gesture, so no Tauri plugin is needed (the CSV export leans on the same
// thing). `copy` is the exact text put on the clipboard, which can differ from the
// shown, shortened `children`. The `step` counter re-keys the track so its keyframe
// replays on each switch; the arriving label always rides the bottom row, so the
// motion travels upward whichever way it swaps.
function CopyCell({
  copy,
  className,
  children,
}: {
  copy: string;
  className?: string;
  children: ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function onCopy() {
    await navigator.clipboard.writeText(copy);
    // Re-clicking while it already reads "Copied" just extends the window, so the
    // label doesn't flicker back through the value on the way to itself.
    if (!copied) {
      setCopied(true);
      setStep((s) => s + 1);
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setCopied(false);
      setStep((s) => s + 1);
    }, 1200);
  }

  const flag = <span className="text-muted-foreground">Copied</span>;

  return (
    <button
      type="button"
      onClick={onCopy}
      title="Copy"
      className={cn(
        "copy-roll transition-[color,transform] duration-150 ease-out hover:text-foreground active:scale-[0.97]",
        className,
      )}
    >
      {step === 0 ? (
        // Untouched cells stay a bare label, so a full table doesn't mount a rolling
        // track per copyable cell up front. The track appears once a cell is clicked.
        children
      ) : (
        <span className="copy-roll__track" key={step} data-animate>
          <span className="copy-roll__row" aria-hidden>
            {copied ? children : flag}
          </span>
          <span className="copy-roll__row">{copied ? flag : children}</span>
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
    <table className="mt-4 w-full table-fixed text-sm">
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
  );
}

function NoteRow({ note }: { note: WalletNote }) {
  // Spent notes stay visible but recede, so the spendable set reads first.
  const muted = note.status === "spent" ? "text-muted-foreground" : "";
  return (
    <tr className={muted}>
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
