// End grain of a log for the Ironwood pool: a pith, one open growth ring, and the
// bark ring. Drawn in the Tabler grammar (24 units, 2px round stroke, currentColor)
// so it sits beside IconTrees and IconPlant on the same tile.
export function HeartwoodIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <path d="M10.65 6.98A5.2 5.2 0 1 1 6.98 10.65" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}
