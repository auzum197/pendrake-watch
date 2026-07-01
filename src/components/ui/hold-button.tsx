import { useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

// Press-and-hold confirm (AUZ-96). A single click can't fire the action: the
// caller only hears `onConfirm` once the press is held for `durationMs`, with the
// fill tracking elapsed time. Releasing early resets, so a stray tap never trips a
// destructive action. Pointer and keyboard (Space/Enter) both hold.
export function HoldButton({
  onConfirm,
  durationMs = 1200,
  children,
  className,
}: {
  onConfirm: () => void;
  durationMs?: number;
  children: ReactNode;
  className?: string;
}) {
  const [progress, setProgress] = useState(0);
  const frame = useRef<number | null>(null);
  const startedAt = useRef(0);

  function tick(now: number) {
    const p = Math.min((now - startedAt.current) / durationMs, 1);
    setProgress(p);
    if (p >= 1) {
      frame.current = null;
      onConfirm();
      return;
    }
    frame.current = requestAnimationFrame(tick);
  }

  function start() {
    if (frame.current !== null) return;
    startedAt.current = performance.now();
    frame.current = requestAnimationFrame(tick);
  }

  function cancel() {
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current);
      frame.current = null;
    }
    setProgress(0);
  }

  return (
    <button
      type="button"
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          if (!e.repeat) start();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === " " || e.key === "Enter") cancel();
      }}
      onBlur={cancel}
      className={cn(
        "relative h-11 w-full overflow-hidden rounded-md border border-destructive/40 bg-destructive/10 text-sm font-semibold text-destructive transition-colors select-none hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-3 focus-visible:ring-destructive/20 focus-visible:outline-none",
        className,
      )}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 bg-destructive/25"
        style={{ width: `${progress * 100}%` }}
      />
      <span className="relative">{children}</span>
    </button>
  );
}
