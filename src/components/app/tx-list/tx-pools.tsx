// The Pools cell of a transaction row. Each pool the transaction touches is drawn
// as an inline SVG of its name (pool-glyphs.ts) in that pool's identity colour,
// comma separated. Under Discreet mode every word morphs into a 12px grey disc
// while sliding into a partly stacked row of discs at the cell's left edge, one
// continuous movement (morph.ts). The stack hides which pools and how many
// letters, and keeps the count legible for the wallet's owner. Holding the stack
// peeks the words, like every other hidden value.

import {
  type CSSProperties,
  type PointerEvent,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { PEEK_HOLD_MS } from "@/components/ui/discreet-value/discreet-value";
import { useMasked } from "@/lib/discreet";
import type { Pool } from "@/lib/ipc";
import { animationsEnabled } from "@/lib/motion";
import { buildMorph, circlePath, easeInOut, morphPath, type Pt } from "./morph";
import { FONT, POOL_GLYPHS } from "./pool-glyphs";
import "./tx-pools.css";

const POOL_NAME: Record<Pool, string> = {
  orchard: "Orchard",
  sapling: "Sapling",
  ironwood: "Ironwood",
  transparent: "Transparent",
};

const POOL_ORDER: Pool[] = ["orchard", "sapling", "ironwood", "transparent"];

export function poolsOf(notes: { pool: Pool }[]): Pool[] {
  const seen = new Set(notes.map((n) => n.pool));
  return POOL_ORDER.filter((p) => seen.has(p));
}

const DOT_PX = 12;
const OVERLAP_PX = 4;
const STEP_PX = DOT_PX - OVERLAP_PX;
const DURATION_MS = 260;

// The cell renders at text-sm. Font units per pixel at that size.
const FONT_PX = 14;
const UNITS_PER_PX = FONT.unitsPerEm / FONT_PX;
const RADIUS = (DOT_PX / 2) * UNITS_PER_PX;
const RING = 2 * UNITS_PER_PX;
// The disc sits on the middle of the x-height, where the eye reads the word's centre.
const DISC_Y = -240;
const LINE_UNITS = FONT.ascent - FONT.descent;

function PoolWord({
  pool,
  hidden,
  dx,
  zIndex,
}: {
  pool: Pool;
  hidden: boolean;
  dx: number;
  zIndex: number;
}) {
  const glyph = POOL_GLYPHS[pool];
  const center = useMemo<Pt>(() => [glyph.advance / 2, DISC_Y], [glyph.advance]);
  const morph = useMemo(() => buildMorph(glyph.d, center, RADIUS), [glyph.d, center]);
  const disc = useMemo(() => circlePath(center, RADIUS), [center]);

  const itemRef = useRef<HTMLSpanElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const t = useRef(hidden ? 1 : 0);
  const raf = useRef(0);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  // One value drives both the shape and the slide, so they can never come apart.
  // A toggle mid-flight restarts from the current t rather than snapping.
  useEffect(() => {
    const target = hidden ? 1 : 0;
    const path = pathRef.current;
    const item = itemRef.current;
    if (!path || !item) return;
    const apply = (v: number) => {
      t.current = v;
      path.setAttribute("d", v >= 1 ? disc : v <= 0 ? glyph.d : morphPath(morph, v));
      item.style.transform = v <= 0 ? "" : `translateX(${(dx * v).toFixed(2)}px)`;
    };
    cancelAnimationFrame(raf.current);
    const from = t.current;
    if (!animationsEnabled() || from === target) {
      apply(target);
      return;
    }
    const duration = DURATION_MS * Math.abs(target - from);
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      apply(from + (target - from) * easeInOut(p));
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  }, [hidden, dx, disc, glyph.d, morph]);

  return (
    <span
      ref={itemRef}
      className="tx-pool"
      style={{ "--pool": `var(--pool-${pool})`, zIndex } as CSSProperties}
      data-pool
    >
      <svg
        className="tx-pool-glyph"
        viewBox={`0 ${-FONT.ascent} ${glyph.advance} ${LINE_UNITS}`}
        style={{
          width: `${glyph.advance / FONT.unitsPerEm}em`,
          height: `${LINE_UNITS / FONT.unitsPerEm}em`,
        }}
        aria-hidden
      >
        <path
          ref={pathRef}
          d={hidden ? disc : glyph.d}
          fillRule="nonzero"
          strokeWidth={RING}
        />
      </svg>
    </span>
  );
}

export function TxPools({ pools }: { pools: Pool[] }) {
  const masked = useMasked();
  const [peeked, setPeeked] = useState(false);
  const hidden = masked && !peeked;
  const wrap = useRef<HTMLSpanElement>(null);
  const holdTimer = useRef(0);
  const [centers, setCenters] = useState<number[]>([]);

  // Each word's centre inside the cell, so word i knows how far to slide for its
  // disc to land centred on slot i. Layout position, unaffected by the transform.
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const measure = () =>
      setCenters(
        Array.from(
          el.querySelectorAll<HTMLElement>("[data-pool]"),
          (w) => w.offsetLeft + w.offsetWidth / 2,
        ),
      );
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [pools]);

  useEffect(() => () => window.clearTimeout(holdTimer.current), []);

  useEffect(() => {
    if (!masked) setPeeked(false);
  }, [masked]);

  function press(e: PointerEvent) {
    if (!masked || e.button !== 0) return;
    e.stopPropagation();
    window.clearTimeout(holdTimer.current);
    holdTimer.current = window.setTimeout(() => setPeeked(true), PEEK_HOLD_MS);
  }

  function release() {
    window.clearTimeout(holdTimer.current);
    setPeeked(false);
  }

  return (
    <span
      ref={wrap}
      className="tx-pools"
      data-hidden={hidden}
      data-motion={animationsEnabled() ? "on" : "off"}
      role="img"
      aria-label={hidden ? "Hidden" : pools.map((p) => POOL_NAME[p]).join(", ")}
      onPointerDown={press}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
      onClick={masked ? (e) => e.stopPropagation() : undefined}
      style={masked ? { touchAction: "none" } : undefined}
    >
      {pools.map((p, i) => {
        const slotCenter = i * STEP_PX + DOT_PX / 2;
        const dx = slotCenter - (centers[i] ?? slotCenter);
        return (
          <span key={p} className="contents">
            {i > 0 && <span className="tx-pool-sep text-muted-foreground">,{" "}</span>}
            <PoolWord pool={p} hidden={hidden} dx={dx} zIndex={pools.length - i} />
          </span>
        );
      })}
    </span>
  );
}
