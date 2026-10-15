import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { animationsEnabled } from "@/lib/motion";
import { createSpring, type Spring } from "@/lib/spring";

const FOLD = { response: 0.18, damping: 1 };

export function useFold(target: RefObject<HTMLElement | null>) {
  const [open, setOpen] = useState(false);
  const [animate] = useState(animationsEnabled);
  const springRef = useRef<Spring | null>(null);

  function spring(): Spring {
    if (!springRef.current) {
      springRef.current = createSpring((v) =>
        target.current?.style.setProperty("--t", String(v)),
      );
    }
    return springRef.current;
  }

  function settle(next: boolean) {
    setOpen(next);
    const t = next ? 1 : 0;
    if (animate) spring().animateTo(t, FOLD);
    else spring().set(t);
  }

  return { open, animate, settle, toggle: () => settle(!open) };
}

const PEEK_LAG_MS = 40;
const UNPEEK_LAG_MS = 30;

// The hover pill of the card in the sidebar's rail, as two springs on the slab.
// --peek grows the circle and --peek-side extends it to the right, starting a
// little later. On the way out the order is the reverse. Keyboard focus shows
// the pill with no animation. Both values are inert while the sidebar is open.
export function usePeek(target: RefObject<HTMLElement | null>) {
  const [animate] = useState(animationsEnabled);

  useEffect(() => {
    const slab = target.current;
    if (!slab) return;
    const grow = createSpring((v) =>
      slab.style.setProperty("--peek", String(v)),
    );
    const side = createSpring((v) =>
      slab.style.setProperty("--peek-side", String(v)),
    );
    let lag = 0;

    function show(on: boolean, spring: boolean) {
      window.clearTimeout(lag);
      const to = on ? 1 : 0;
      if (!spring) {
        grow.set(to);
        side.set(to);
        return;
      }
      const [first, second] = on ? [grow, side] : [side, grow];
      first.animateTo(to, FOLD);
      lag = window.setTimeout(
        () => second.animateTo(to, FOLD),
        on ? PEEK_LAG_MS : UNPEEK_LAG_MS,
      );
    }

    const focused = () => slab.matches(":has(:focus-visible)");
    const enter = (e: PointerEvent) => {
      if (e.pointerType === "mouse") show(true, animate);
    };
    const leave = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && !focused()) show(false, animate);
    };
    const focusIn = () => {
      if (focused()) show(true, false);
    };
    const focusOut = () => {
      if (!slab.matches(":hover")) show(false, false);
    };

    slab.addEventListener("pointerenter", enter);
    slab.addEventListener("pointerleave", leave);
    slab.addEventListener("focusin", focusIn);
    slab.addEventListener("focusout", focusOut);
    return () => {
      window.clearTimeout(lag);
      slab.removeEventListener("pointerenter", enter);
      slab.removeEventListener("pointerleave", leave);
      slab.removeEventListener("focusin", focusIn);
      slab.removeEventListener("focusout", focusOut);
    };
  }, [target, animate]);
}

export function useHeight(ref: RefObject<HTMLElement | null>): number {
  const [height, setHeight] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return height;
}
