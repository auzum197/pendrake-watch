// Step line chart for the dashboard's "Balance over time" card. Hand-drawn SVG to
// match the sync visualizations already in the project and skip a chart dep. One
// point per confirmed transaction, plotted at its real time, connected as a step:
// a balance holds flat between transactions and jumps at each one. A smooth curve
// would imply intermediate values the wallet never actually held.
//
// The series grows out of order during the initial scan (tip-first scanning finds
// recent transactions before older ones), so points insert in the middle, not just
// the end. Geometry is tweened in JS keyed by transaction identity, so an inserted
// point slides out of its neighbour instead of the whole curve reshuffling. SVG
// path `d` isn't CSS-animatable in WebKit, which is why the tween is hand-rolled.
// Each newly arrived point gets a one-shot ping marking where it landed.

import { useEffect, useRef, useState } from "react";
import type { BalancePoint } from "@/lib/format";
import "./balance-chart.css";

const W = 900;
const H = 240;
const PAD = { top: 16, right: 16, bottom: 28, left: 56 };
const MAX_LABELS = 6;
const TWEEN_MS = 400;

type Vec = { x: number; y: number };
type KPt = { key: string } & Vec;

const easeOut = (t: number) => 1 - (1 - t) ** 3;

// Fit the y-axis to the data. Rounding the peak straight up to a 1/2/2.5/5
// multiple can nearly double it (1.2 -> 2), leaving the line stranded in the
// lower half under a big empty top. Instead size a clean tick step for ~4
// intervals, then take the next step above the peak: readable gridlines, but at
// most a fraction of a step of headroom.
function niceAxis(peak: number): { max: number; step: number } {
  if (peak <= 0) return { max: 1, step: 1 };
  const rough = peak / 4;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const n = rough / mag;
  const step =
    (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
  return { max: Math.ceil(peak / step) * step, step };
}

// Step-after path: each level holds to the next point's x, then jumps. A balance
// only changes at a transaction, so this draws what actually happened instead of
// interpolating a value the wallet never held between two transactions.
function stepPath(pts: KPt[]): string {
  if (pts.length === 0) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    d += ` L ${pts[i].x} ${pts[i - 1].y} L ${pts[i].x} ${pts[i].y}`;
  }
  return d;
}

// Ease each point from where it currently sits to `target`, keyed by identity so
// a point keeps its tween across an out-of-order insertion. A point with no prior
// position grows from its left neighbour, so it slides out of the existing line
// rather than popping in. Movement is skipped under reduced motion.
function useTweenedPoints(target: KPt[]): KPt[] {
  const [shown, setShown] = useState(target);
  const current = useRef(new Map(target.map((p) => [p.key, { x: p.x, y: p.y }])));
  const goal = useRef(target);
  goal.current = target;
  const raf = useRef(0);
  const sig = target
    .map((p) => `${p.key}:${Math.round(p.x)}:${Math.round(p.y)}`)
    .join("|");

  useEffect(() => {
    const dest = goal.current;
    const cur = current.current;
    const from = new Map<string, Vec>();
    dest.forEach((p, i) => {
      const had = cur.get(p.key);
      if (had) {
        from.set(p.key, had);
      } else {
        const leftKey = i > 0 ? dest[i - 1].key : null;
        const seed = leftKey
          ? (from.get(leftKey) ?? cur.get(leftKey) ?? p)
          : p;
        from.set(p.key, { x: seed.x, y: seed.y });
      }
    });

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      current.current = new Map(dest.map((p) => [p.key, { x: p.x, y: p.y }]));
      setShown(dest);
      return;
    }

    const t0 = performance.now();
    const tick = () => {
      const t = Math.min((performance.now() - t0) / TWEEN_MS, 1);
      const k = easeOut(t);
      const next = new Map<string, Vec>();
      const frame = dest.map((p) => {
        const f = from.get(p.key)!;
        const x = f.x + (p.x - f.x) * k;
        const y = f.y + (p.y - f.y) * k;
        next.set(p.key, { x, y });
        return { key: p.key, x, y };
      });
      current.current = next;
      setShown(frame);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // Re-tween when the geometry changes, not on every frame's setShown.
  }, [sig]); // eslint-disable-line react-hooks/exhaustive-deps

  return shown;
}

// Keys present now that weren't a render ago. Seeded with the initial set so the
// chart's first appearance pings nothing (that's the empty-state crossfade's job).
// Only genuinely new arrivals ping.
function useFreshKeys(keys: string[]): Set<string> {
  const seen = useRef(new Set(keys));
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const sig = keys.join("|");

  useEffect(() => {
    const next = new Set<string>();
    for (const k of keys) if (!seen.current.has(k)) next.add(k);
    seen.current = new Set(keys);
    setFresh(next);
    // Recompute against the key set, not its array identity.
  }, [sig]); // eslint-disable-line react-hooks/exhaustive-deps

  return fresh;
}

export function BalanceChart({ points }: { points: BalancePoint[] }) {
  const { max, step } = niceAxis(Math.max(...points.map((p) => p.value)));
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) =>
    i === 0 ? 0 : i * step,
  );
  const decimals = max < 1 ? 4 : max < 100 ? 2 : 0;
  const fmt = (v: number) =>
    v.toLocaleString(undefined, { maximumFractionDigits: decimals });

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const baseY = PAD.top + plotH;

  const tMin = points[0].t;
  const tMax = points[points.length - 1].t;
  const span = tMax - tMin;
  // Position by real time when the series spans one. A single transaction (or a
  // cluster sharing one second) has no span, so fall back to even spacing.
  const x = (p: BalancePoint, i: number) =>
    span > 0
      ? PAD.left + ((p.t - tMin) / span) * plotW
      : PAD.left + (points.length > 1 ? i / (points.length - 1) : 0.5) * plotW;
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;

  const target: KPt[] = points.map((p, i) => ({
    key: p.key,
    x: x(p, i),
    y: y(p.value),
  }));
  const tweened = useTweenedPoints(target);
  const fresh = useFreshKeys(points.map((p) => p.key));

  // One render can land before the tween realigns its array, so fall back to the
  // target then to keep the path complete.
  const pts = tweened.length === target.length ? tweened : target;
  const posByKey = new Map(pts.map((p) => [p.key, p]));
  const targetByKey = new Map(target.map((p) => [p.key, p]));

  const line = stepPath(pts);
  const last = pts[pts.length - 1];
  const area = `${line} L ${last.x} ${baseY} L ${pts[0].x} ${baseY} Z`;
  // Dots mark transactions, so the leading "balance before the first tx" point
  // doesn't get one. The last transaction is the emphasized tip.
  const dots = pts.filter((p) => p.key !== "start");
  // Thin the per-tx guide columns so a dense cluster doesn't stack into a bar that
  // out-weighs the line. Drop any guide that would land within MIN_GUIDE_GAP of the
  // last kept one. The dots still mark every transaction precisely.
  const MIN_GUIDE_GAP = 12;
  const guides = dots.reduce<KPt[]>((kept, p) => {
    const prev = kept[kept.length - 1];
    if (!prev || p.x - prev.x >= MIN_GUIDE_GAP) kept.push(p);
    return kept;
  }, []);
  const labelEvery = Math.ceil(points.length / MAX_LABELS);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      preserveAspectRatio="none"
      role="img"
      aria-label="Balance over time"
    >
      <defs>
        <linearGradient id="balance-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-brand)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(t)}
            y2={y(t)}
            stroke="currentColor"
            strokeOpacity="0.12"
            strokeDasharray="4 6"
          />
          <text
            x={PAD.left - 10}
            y={y(t) + 4}
            textAnchor="end"
            className="text-[11px]"
            fill="currentColor"
            fillOpacity="0.45"
          >
            {fmt(t)}
          </text>
        </g>
      ))}

      {points.map((p, i) => {
        if (!p.label || i % labelEvery !== 0) return null;
        const pos = posByKey.get(p.key);
        return pos ? (
          <text
            key={p.key}
            x={pos.x}
            y={H - 8}
            textAnchor="middle"
            fill="currentColor"
            fillOpacity="0.45"
            className="text-[11px]"
          >
            {p.label}
          </text>
        ) : null;
      })}

      <path d={area} fill="url(#balance-fill)" />

      {/* A faint neutral dashed column marks when a transaction happened,
          independent of how much the balance moved. Kept as subdued furniture
          (neutral, not brand) so it never out-weighs the line, and thinned above
          so clusters don't stack. */}
      {guides.map((p) => (
        <line
          key={p.key}
          x1={p.x}
          x2={p.x}
          y1={PAD.top}
          y2={baseY}
          stroke="currentColor"
          strokeWidth="1"
          strokeOpacity="0.14"
          strokeDasharray="2 6"
        />
      ))}

      <path
        d={line}
        fill="none"
        stroke="var(--color-brand)"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* A hairline halo in the card colour lifts each node off the line, so a
          transaction that barely moved the balance still reads as a deliberate
          point and not a speck on a flat stretch. */}
      {dots.slice(0, -1).map((p) => (
        <circle
          key={p.key}
          cx={p.x}
          cy={p.y}
          r="3"
          fill="var(--color-brand)"
          fillOpacity="0.55"
          stroke="var(--color-card)"
          strokeWidth="1.5"
        />
      ))}
      <circle
        cx={last.x}
        cy={last.y}
        r="5"
        fill="var(--color-brand)"
        stroke="var(--color-card)"
        strokeWidth="2"
      />

      {[...fresh].map((key) => {
        const pos = targetByKey.get(key);
        return pos ? (
          <circle
            key={key}
            className="balance-ping"
            cx={pos.x}
            cy={pos.y}
            r="5"
            fill="none"
            stroke="var(--color-brand)"
            strokeWidth="2"
          />
        ) : null;
      })}
    </svg>
  );
}
