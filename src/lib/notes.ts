import type { WalletNote } from "@/lib/ipc";
import { formatZecFixed } from "@/lib/format";

// Sorting, filtering, search, and the spendable summary for the notes debug view,
// kept apart from the components so they can be exercised directly. Every column
// except Txid sorts. Clicking the active column flips direction, another resets to
// ascending. Default is № ascending.

export type SortKey =
  | "idx"
  | "pool"
  | "value"
  | "status"
  | "height"
  | "flags"
  | "spentHeight";

export type SortDir = "asc" | "desc";

export type Sort = { key: SortKey; dir: SortDir };

export type Filter =
  | "all"
  | "unspent"
  | "spent"
  | "pending"
  | "change"
  | "orchard"
  | "sapling"
  | "ironwood";

// A missing height sorts to the bottom ascending, the top descending, so pending
// notes (and unspent ones in the Spent-at column) cluster at one end rather than
// scattering. Treating null as +∞ and letting the direction flip gives both ends.
function heightKey(h: number | null): number {
  return h ?? Number.POSITIVE_INFINITY;
}

function compare(a: WalletNote, b: WalletNote, key: SortKey): number {
  switch (key) {
    case "idx":
      return a.idx - b.idx;
    case "value": {
      const av = BigInt(a.valueZat);
      const bv = BigInt(b.valueZat);
      return av < bv ? -1 : av > bv ? 1 : 0;
    }
    case "pool":
      return a.pool.localeCompare(b.pool);
    case "status":
      return a.status.localeCompare(b.status);
    case "flags":
      return Number(a.change) - Number(b.change);
    case "height":
      return heightKey(a.height) - heightKey(b.height);
    case "spentHeight":
      return heightKey(a.spentHeight) - heightKey(b.spentHeight);
  }
}

export function sortNotes(notes: WalletNote[], sort: Sort): WalletNote[] {
  const dir = sort.dir === "asc" ? 1 : -1;
  return [...notes].sort((a, b) => {
    const primary = compare(a, b, sort.key) * dir;
    // Hold a stable row order within ties so re-sorts don't jitter equal rows.
    return primary !== 0 ? primary : a.idx - b.idx;
  });
}

export function matchesFilter(note: WalletNote, filter: Filter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "unspent":
    case "spent":
    case "pending":
      return note.status === filter;
    case "change":
      return note.change;
    case "orchard":
    case "sapling":
    case "ironwood":
      return note.pool === filter;
  }
}

// Search spans the fields a debugger reaches for: the txid, either block height, and
// the value (raw zatoshis and the rendered ZEC), all case-insensitive substring.
export function matchesSearch(note: WalletNote, query: string): boolean {
  if (!query) return true;
  const needle = query.toLowerCase();
  const fields = [
    note.txid.toLowerCase(),
    note.height != null ? String(note.height) : "",
    note.spentHeight != null ? String(note.spentHeight) : "",
    note.valueZat,
    formatZecFixed(BigInt(note.valueZat), 8),
  ];
  return fields.some((field) => field.includes(needle));
}

export type Spendable = { zat: bigint; count: number };

// The unspent value (and note count) across a set, optionally one pool. The summary
// bar feeds this the visible set, so it always answers "what's spendable in what I'm
// looking at". Filtering to one pool narrows every card to it.
export function sumSpendable(
  notes: WalletNote[],
  pool?: WalletNote["pool"],
): Spendable {
  const rows = notes.filter(
    (n) => n.status === "unspent" && (!pool || n.pool === pool),
  );
  return {
    zat: rows.reduce((acc, n) => acc + BigInt(n.valueZat), 0n),
    count: rows.length,
  };
}