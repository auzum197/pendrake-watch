import { useEffect, useRef, useState } from "react";
import "./sync-viz.css";

// One scanning batch: a belt of compact outputs creeping through the decryptor
// gate at the lane's centre. Most stay grey (not yours). When the daemon actually
// discovers one of your transactions, the lead scanning lane sends one square that
// crosses the gate and turns green.

const BELT = 30; // squares per half; the row is doubled for a seamless loop

export function BatchScanViz({
  active,
  sparkSeq,
  canSpark,
}: {
  active: boolean;
  sparkSeq: number;
  canSpark: boolean;
}) {
  const [flashSeq, setFlashSeq] = useState(0);
  const prev = useRef(sparkSeq);

  useEffect(() => {
    if (sparkSeq !== prev.current) {
      prev.current = sparkSeq;
      if (canSpark) setFlashSeq(sparkSeq);
    }
  }, [sparkSeq, canSpark]);

  return (
    <div className="relative h-7 overflow-hidden rounded-md border border-border bg-muted/20 [container-type:inline-size]">
      <div
        className={`absolute inset-y-0 left-0 flex w-max items-center gap-1.5 px-1 ${active ? "sync-belt" : ""}`}
      >
        {Array.from({ length: BELT * 2 }).map((_, i) => (
          <span
            key={i}
            className="h-2 w-2 shrink-0 rounded-[2px] bg-muted-foreground/20"
          />
        ))}
      </div>

      {/* decryptor gate */}
      <div className="pointer-events-none absolute inset-y-1 left-1/2 w-2.5 -translate-x-1/2 rounded-sm border-x border-primary/50 bg-primary/10" />

      {/* a discovered note crossing the gate */}
      {flashSeq > 0 && (
        <span
          key={flashSeq}
          className="sync-match pointer-events-none absolute left-1 top-1/2 -mt-1 h-2 w-2 rounded-[2px] shadow-[0_0_6px_1px_rgba(34,197,94,0.6)]"
        />
      )}
    </div>
  );
}
