import { useMemo, useRef, useState } from "react";
import { IconSearch } from "@tabler/icons-react";
import { PoolDot } from "@/components/notes/badges";
import { DiscreetValue } from "@/components/ui/discreet-value/discreet-value";
import {
  NotesContentSkeleton,
  SummaryBarSkeleton,
} from "@/components/notes/notes-skeleton";
import { NotesTable } from "@/components/notes/notes-table";
import { useNotesData } from "@/hooks/use-notes-data";
import { useTweenNumber } from "@/hooks/use-tween-number";
import {
  type Filter,
  matchesFilter,
  matchesSearch,
  type Sort,
  type SortKey,
  sortNotes,
  sumSpendable,
} from "@/lib/notes";
import { animationsEnabled } from "@/lib/motion";
import type { Pool, WalletNote } from "@/lib/ipc";
import "@/components/app/reveal.css";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All notes" },
  { key: "unspent", label: "Unspent" },
  { key: "spent", label: "Spent" },
  { key: "pending", label: "Pending" },
  { key: "change", label: "Change" },
  { key: "ironwood", label: "Ironwood" },
  { key: "orchard", label: "Orchard" },
  { key: "sapling", label: "Sapling" },
];

export function NotesPage() {
  const { notes, loaded, error } = useNotesData();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>({ key: "idx", dir: "asc" });
  const [reveal] = useState(animationsEnabled);

  const visible = useMemo(
    () =>
      notes.filter((n) => matchesFilter(n, filter) && matchesSearch(n, query)),
    [notes, filter, query],
  );
  const sorted = useMemo(() => sortNotes(visible, sort), [visible, sort]);

  // A token that ticks on every filter change (but not on mount, search, or sort), so
  // remounting the table replays the swap animation only when the filter switches.
  // Tracking the previous filter in a ref keeps it a render-time derivation, no effect.
  const prevFilter = useRef(filter);
  const swap = useRef(0);
  if (prevFilter.current !== filter) {
    prevFilter.current = filter;
    swap.current += 1;
  }

  function onSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  }

  return (
    <>
      <div>
        <h1 className="font-heading text-xl font-bold">Notes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every output the wallet can see.
        </p>
      </div>

      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          Can't reach the background process: {error}
        </p>
      )}

      {loaded ? (
        <SummaryBar notes={visible} className={reveal ? "reveal-up" : ""} />
      ) : (
        <SummaryBarSkeleton />
      )}

      <section className="rounded-2xl border border-border bg-card p-6">
        {!loaded ? (
          <NotesContentSkeleton />
        ) : (
          <div
            className={reveal ? "reveal-up" : ""}
            style={reveal ? { animationDelay: "60ms" } : undefined}
          >
            <div className="flex items-center justify-between gap-3">
              <FilterControls active={filter} onChange={setFilter} />
              <div className="relative shrink-0">
                <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search…"
                  className="w-72 rounded-full border border-border bg-background py-1.5 pl-8 pr-3 text-xs outline-none transition-colors focus:border-foreground/30"
                />
              </div>
            </div>

            {notes.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                No notes yet.
              </p>
            ) : (
              // Keyed on the swap token so a filter switch remounts and replays the
              // fade-in. Search and sort keep the same token, updating in place.
              <div
                key={swap.current}
                className={
                  reveal && swap.current > 0 ? "notes-filter-swap" : ""
                }
              >
                <NotesTable notes={sorted} sort={sort} onSort={onSort} />
              </div>
            )}
          </div>
        )}
      </section>
    </>
  );
}

function FilterControls({
  active,
  onChange,
}: {
  active: Filter;
  onChange: (filter: Filter) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {FILTERS.map((f) => {
        const on = f.key === active;
        return (
          <button
            key={f.key}
            type="button"
            onClick={() => onChange(f.key)}
            aria-pressed={on}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors active:scale-[0.97] ${
              on
                ? "bg-foreground text-background"
                : "border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}

function SummaryBar({
  notes,
  className,
}: {
  notes: WalletNote[];
  className?: string;
}) {
  // Each card sums the visible, unspent set (optionally one pool), so the bar always
  // answers "what's spendable in what I'm looking at".
  const cards: { label: string; pool?: Pool }[] = [
    { label: "Total spendable" },
    { label: "Ironwood", pool: "ironwood" },
    { label: "Orchard", pool: "orchard" },
    { label: "Sapling", pool: "sapling" },
    { label: "Transparent", pool: "transparent" },
  ];

  return (
    <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 ${className ?? ""}`}>
      {cards.map((card) => (
        <StatCard
          key={card.label}
          label={card.label}
          pool={card.pool}
          notes={notes}
        />
      ))}
    </div>
  );
}

function StatCard({
  label,
  pool,
  notes,
}: {
  label: string;
  pool?: Pool;
  notes: WalletNote[];
}) {
  const { zat, count } = sumSpendable(notes, pool);
  // Roll both figures to their new values instead of snapping, so a filter or search
  // change reads as the set narrowing rather than the numbers blinking. The tween
  // still runs while masked (hooks are unconditional); DiscreetValue owns the flip
  // animation, so the two never stack.
  const zec = useTweenNumber(Number(zat) / 1e8);
  const shownCount = Math.round(useTweenNumber(count));

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {pool && <PoolDot pool={pool} />}
        {label}
      </div>
      <div className="mt-1.5 font-mono text-lg font-semibold tabular-nums">
        <DiscreetValue kind="zec">
          {zec.toLocaleString(undefined, {
            minimumFractionDigits: 4,
            maximumFractionDigits: 4,
          })}
        </DiscreetValue>
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">
        {shownCount} {shownCount === 1 ? "note" : "notes"}
      </div>
    </div>
  );
}