import { useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

const easeInOut = (x: number) =>
  x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;

// Press-and-hold confirm (AUZ-96). A single click can't fire the action: the
// caller only hears `onConfirm` once the press is held for `durationMs`, with the
// fill tracking elapsed time. Releasing early resets, so a stray tap never trips a
// destructive action. Pointer and keyboard (Space/Enter) both hold.
//
// While held, the button sinks in and trembles, the tremble growing with progress
// so the destructive action feels like it's straining harder the closer it gets.
// Scale and shake share one transform driven from the frame loop (splitting them
// across elements leaves a compositing seam where an edge looks pinned), so the
// built-in transition is muted during the hold and handed back on release.
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
  const btn = useRef<HTMLButtonElement>(null);
  const reduce = useRef(false);

  function tick(now: number) {
    const elapsed = now - startedAt.current;
    const p = Math.min(elapsed / durationMs, 1);
    setProgress(p);

    const el = btn.current;
    if (el && !reduce.current) {
      const scale = 1 - 0.03 * easeInOut(Math.min(elapsed / 500, 1));
      // Amplitude ramps from nothing to full over the hold. Two detuned sines per
      // axis read as an organic jitter rather than a mechanical buzz.
      const amp = p * 0.8;
      const jx = (Math.sin(elapsed / 23) + Math.sin(elapsed / 31)) * 0.5 * amp;
      const jy = (Math.sin(elapsed / 19) + Math.sin(elapsed / 29)) * 0.5 * amp;
      const rot = Math.sin(elapsed / 37) * amp * 0.3;
      el.style.transform = `translate3d(${jx}px, ${jy}px, 0) scale(${scale}) rotate(${rot}deg)`;
    }

    if (p >= 1) {
      frame.current = null;
      onConfirm();
      return;
    }
    frame.current = requestAnimationFrame(tick);
  }

  function start() {
    if (frame.current !== null) return;
    reduce.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    startedAt.current = performance.now();
    // Per-frame transform writes would otherwise smear through the 150ms
    // transition, so mute it for the duration of the hold.
    if (btn.current && !reduce.current) btn.current.style.transition = "none";
    frame.current = requestAnimationFrame(tick);
  }

  function cancel() {
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current);
      frame.current = null;
    }
    setProgress(0);
    // Hand the transform back to CSS so the release settles home on the 150ms
    // curve instead of snapping.
    const el = btn.current;
    if (el) {
      el.style.transition = "";
      el.style.transform = "";
    }
  }

  return (
    <button
      ref={btn}
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
        "relative h-11 w-full overflow-hidden rounded-md border border-destructive/40 bg-destructive/10 text-sm font-semibold text-destructive transition-[transform,background-color] duration-150 ease-out select-none hover:bg-destructive/20 motion-safe:hover:scale-[1.02] focus-visible:border-destructive/40 focus-visible:ring-3 focus-visible:ring-destructive/20 focus-visible:outline-none",
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
