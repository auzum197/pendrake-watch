import { Skeleton } from "@/components/ui/skeleton";

// Cold-start placeholders for the notes view. They trace the real layout (four
// summary cards, a filter row, a table) so the page holds its shape and nothing
// jumps when the data lands. Shown only on the first load. Return visits render the
// cached list straight away.

export function SummaryBarSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-3">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-2.5 h-6 w-28" />
          <Skeleton className="mt-2 h-3 w-12" />
        </div>
      ))}
    </div>
  );
}

// The filter chips widen left to right, like the real labels, so the row doesn't read
// as a stack of identical pills.
const CHIP_WIDTHS = ["w-16", "w-20", "w-16", "w-20", "w-16", "w-24", "w-20"];

export function NotesContentSkeleton() {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {CHIP_WIDTHS.map((w, i) => (
            <Skeleton key={i} className={`h-7 rounded-full ${w}`} />
          ))}
        </div>
        <Skeleton className="h-7 w-72 rounded-full" />
      </div>

      <div className="mt-6 space-y-3.5">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
      </div>
    </div>
  );
}
