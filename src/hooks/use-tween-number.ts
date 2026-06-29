import { useEffect, useRef, useState } from "react";
import { animationsEnabled } from "@/lib/motion";

// Roll a displayed number toward `target` over `duration` with an ease-out curve,
// instead of snapping. Interruptible: a target that moves mid-roll (a quick second
// filter switch) retargets from whatever is on screen rather than restarting from
// the old value. Snaps when motion is reduced. The notes summary uses it so the
// spendable figures don't jump when the filter or search narrows the set.
export function useTweenNumber(target: number, duration = 360): number {
  const [value, setValue] = useState(target);
  // The latest shown value, so a retarget starts from the current frame, not a stale
  // render's value.
  const current = useRef(target);
  current.current = value;
  const frame = useRef(0);

  useEffect(() => {
    if (!animationsEnabled()) {
      setValue(target);
      return;
    }
    const from = current.current;
    const delta = target - from;
    if (delta === 0) return;

    const easeOut = (t: number) => 1 - (1 - t) ** 3;
    let start = 0;
    const step = (now: number) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / duration);
      // Land exactly on target on the last frame so the settled display matches the
      // exact formatted figure.
      setValue(t < 1 ? from + delta * easeOut(t) : target);
      if (t < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame.current);
  }, [target, duration]);

  return value;
}
