import type { WalletNote } from "@/lib/ipc";
import { formatZecFixed } from "@/lib/format";
import type { Sort, SortKey } from "@/lib/notes";
import { ChangeBadge, MempoolBadge, PoolBadge, StatusBadge } from "./badges";

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
        {formatZecFixed(BigInt(note.valueZat), 8)}
      </td>
      <td className="py-2.5">
        <StatusBadge status={note.status} />
      </td>
      <td className="py-2.5 font-mono tabular-nums">
        {note.height != null ? note.height.toLocaleString() : <MempoolBadge />}
      </td>
      <td className="py-2.5 font-mono text-muted-foreground">
        {shortTxid(note.txid)}
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
          note.spentHeight.toLocaleString()
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  );
}
