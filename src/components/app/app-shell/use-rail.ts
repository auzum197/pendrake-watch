import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { animationsEnabled } from "@/lib/motion";
import { createSpring, type Spring } from "@/lib/spring";

const RAIL = { response: 0.18, damping: 1 };

// Sets --rail on the sidebar, 0 open and 1 as a rail. app-sidebar.css and
// wallet-card.css read it for every size that changes with the collapse.
export function useRail(target: RefObject<HTMLElement | null>, rail: boolean) {
  const [animate] = useState(animationsEnabled);
  const springRef = useRef<Spring | null>(null);

  useLayoutEffect(() => {
    const first = !springRef.current;
    springRef.current ??= createSpring((v) =>
      target.current?.style.setProperty("--rail", String(v)),
    );
    const to = rail ? 1 : 0;
    if (animate && !first) springRef.current.animateTo(to, RAIL);
    else springRef.current.set(to);
  }, [target, rail, animate]);
}
