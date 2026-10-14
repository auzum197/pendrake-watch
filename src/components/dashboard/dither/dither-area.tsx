import {
  type CSSProperties,
  type PointerEvent,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useMasked } from "@/lib/discreet";
import { maskFor } from "@/components/ui/discreet-value/discreet-value";
import { type BalancePoint, formatUsd } from "@/lib/format";
import { animationsEnabled } from "@/lib/motion";
import { cn } from "@/lib/utils";
import {
  type Bloom,
  bloomStyle,
  clamp01,
  type DitherVariant,
  easeInOutCubic,
  easeOutCubic,
  paintColumn,
  prefersReducedMotion,
} from "./dither-paint";
import { INK, type Rgb, rgba } from "./palette";
import "./dither-area.css";

export type ChartKind = "area" | "line" | "bars";
export type Curve = "step" | "linear";

export type DitherLook = {
  ink: Rgb;
  variant: DitherVariant;
  kind: ChartKind;
  curve: Curve;
  cell: number;
  bloom: Bloom;
  sparkles: boolean;
};

export const DEFAULT_LOOK: DitherLook = {
  ink: INK.brand,
  variant: "gradient",
  kind: "area",
  curve: "step",
  cell: 2,
  bloom: "low",
  sparkles: true,
};

export type DitherAreaProps = Partial<DitherLook> & {
  points: BalancePoint[];
  usd?: boolean;
  animate?: boolean;
  interactive?: boolean;
  axes?: boolean;
  bins?: number;
  className?: string;
};

export type Mark = {
  x: number;
  y: number;
  t: number;
  value: number;
  label: string;
  height?: number;
  zec?: number;
};

type Surface = {
  top: Float64Array;
  floor: Float64Array;
  marks: Mark[];
};

type LoopState = {
  surface: Surface;
  look: DitherLook;
  hover: number | null;
  inside: { current: boolean };
  animate: boolean;
  entered: { current: boolean };
};

const ENTRANCE_MS = 800;
const TWEEN_MS = 400;
const MAX_LABELS = 6;

export function niceAxis(peak: number): { max: number; step: number } {
  if (peak <= 0) return { max: 1, step: 1 };
  const rough = peak / 4;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const n = rough / mag;
  const step =
    (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
  return { max: Math.ceil(peak / step) * step, step };
}

function fullDate(epoch: number): string {
  const ms = epoch < 1e12 ? epoch * 1000 : epoch;
  return new Date(ms).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function axisLabel(v: number, usd: boolean, max: number): string {
  const decimals = max < 1 ? 4 : max < 100 ? 2 : 0;
  const n = v.toLocaleString(undefined, { maximumFractionDigits: decimals });
  return usd ? `$${n}` : n;
}

function valueLabel(v: number, usd: boolean): string {
  return usd
    ? formatUsd(v)
    : `${v.toLocaleString(undefined, { maximumFractionDigits: 8 })} ZEC`;
}

function sampleAt(
  points: BalancePoint[],
  fx: number,
  curve: Curve,
  max: number,
): Mark {
  const t0 = points[0].t;
  const span = points[points.length - 1].t - t0 || 1;
  const t = t0 + fx * span;
  let i = 0;
  while (i + 1 < points.length && points[i + 1].t <= t) i++;
  const a = points[i];
  let value = a.value;
  if (curve === "linear" && i + 1 < points.length) {
    const b = points[i + 1];
    value = a.value + (b.value - a.value) * ((t - a.t) / (b.t - a.t || 1));
  }
  return {
    x: fx,
    y: 1 - value / max,
    t,
    value,
    label: a.label,
    height: a.height,
    zec: a.zec,
  };
}

function buildSurface(
  points: BalancePoint[],
  cols: number,
  rows: number,
  max: number,
  kind: ChartKind,
  curve: Curve,
  bins: number,
): Surface {
  const empty = {
    top: new Float64Array(0),
    floor: new Float64Array(0),
    marks: [],
  };
  if (points.length === 0) return empty;
  const t0 = points[0].t;
  const span = points[points.length - 1].t - t0 || 1;
  const yRow = (v: number) => (1 - v / max) * (rows - 1);
  const top = new Float64Array(cols).fill(rows - 1);
  const floor = new Float64Array(cols).fill(rows - 1);
  const marks: Mark[] = [];

  if (kind === "bars") {
    top.fill(NaN);
    floor.fill(NaN);
    const gap = Math.max(1, Math.round((cols / bins) * 0.14));
    let i = 0;
    for (let b = 0; b < bins; b++) {
      const tEnd = t0 + (span * (b + 1)) / bins;
      while (i + 1 < points.length && points[i + 1].t <= tEnd) i++;
      const value = points[i].value;
      const c0 = Math.round((cols * b) / bins) + gap;
      const c1 = Math.round((cols * (b + 1)) / bins) - gap;
      for (let c = c0; c < c1; c++) {
        top[c] = yRow(value);
        floor[c] = rows - 1;
      }
      marks.push({
        x: (c0 + c1) / 2 / (cols - 1),
        y: 1 - value / max,
        t: tEnd,
        value,
        label: points[i].label || fullDate(tEnd),
        height: points[i].height,
      });
    }
    return { top, floor, marks };
  }

  const glow = Math.max(5, Math.round(rows * 0.14));
  let i = 0;
  for (let c = 0; c < cols; c++) {
    const t = t0 + (span * c) / (cols - 1);
    while (i + 1 < points.length && points[i + 1].t <= t) i++;
    let v = points[i].value;
    if (curve === "linear" && i + 1 < points.length) {
      const a = points[i];
      const b = points[i + 1];
      const f = (t - a.t) / (b.t - a.t || 1);
      v = a.value + (b.value - a.value) * f;
    }
    top[c] = yRow(v);
    floor[c] = kind === "line" ? Math.min(rows - 1, top[c] + glow) : rows - 1;
  }
  for (const p of points) {
    if (p.key === "start") continue;
    marks.push({
      x: (p.t - t0) / span,
      y: 1 - p.value / max,
      t: p.t,
      value: p.value,
      label: p.label,
      height: p.height,
      zec: p.zec,
    });
  }
  return { top, floor, marks };
}

function startLoop(
  crisp: HTMLCanvasElement,
  bloom: HTMLCanvasElement,
  cols: number,
  rows: number,
  state: RefObject<LoopState>,
) {
  const c = crisp.getContext("2d");
  const b = bloom.getContext("2d");
  if (!c || !b) return;
  crisp.width = cols;
  crisp.height = rows;
  bloom.width = cols;
  bloom.height = rows;
  const off = document.createElement("canvas");
  off.width = cols;
  off.height = rows;
  const o = off.getContext("2d");
  if (!o) return;

  const still = !animationsEnabled() || prefersReducedMotion();
  const top = new Float64Array(cols);
  const floor = new Float64Array(cols);
  const fromTop = new Float64Array(cols);
  const fromFloor = new Float64Array(cols);
  const frame = o.createImageData(cols, rows);
  const pixels = frame.data;
  const stars = Array.from(
    { length: Math.max(4, Math.round(cols / 14)) },
    (_, i) => {
      const seed = i * 67 + 13;
      return {
        col: (seed * 97) % cols,
        depth: ((seed * 53 + 7) % 100) / 100,
        phase: (seed * 41) % 360,
      };
    },
  );

  let raf = 0;
  let tick = 0;
  let lastWink = 0;
  let animStart = 0;
  let lastProg = -1;
  let tweenStart = 0;
  let tweening = false;
  let intensity = 0;
  let needsFill = true;
  let lastSurface: Surface | null = null;
  let lastLook: DitherLook | null = null;

  const paintFill = (reveal: number) => {
    pixels.fill(0);
    const { look } = state.current;
    const revealCols = Math.ceil(reveal * cols);
    for (let x = 0; x < cols && x <= revealCols; x++) {
      if (Number.isNaN(top[x])) continue;
      paintColumn(
        pixels,
        cols,
        x,
        top[x],
        floor[x],
        look.ink,
        look.variant,
        intensity,
      );
    }
    o.putImageData(frame, 0, 0);
  };

  const draw = (now: number) => {
    raf = requestAnimationFrame(draw);
    const s = state.current;
    const tgt = s.surface;
    if (tgt !== lastSurface) {
      if (lastSurface === null || still) {
        top.set(tgt.top);
        floor.set(tgt.floor);
        tweening = false;
      } else {
        fromTop.set(top);
        fromFloor.set(floor);
        tweenStart = now;
        tweening = true;
      }
      lastSurface = tgt;
      needsFill = true;
    }
    if (s.look !== lastLook) {
      lastLook = s.look;
      needsFill = true;
    }
    const animate = s.animate && !still && !s.entered.current;
    if (!animStart) animStart = now;
    const prog = animate ? Math.min(1, (now - animStart) / ENTRANCE_MS) : 1;
    const progChanged = prog !== lastProg;
    if (prog >= 1) s.entered.current = true;

    let moving = false;
    if (tweening) {
      const k = easeOutCubic(Math.min(1, (now - tweenStart) / TWEEN_MS));
      for (let x = 0; x < cols; x++) {
        const tt = tgt.top[x];
        const ft = fromTop[x];
        if (Number.isNaN(tt) || Number.isNaN(ft)) {
          top[x] = tt;
          floor[x] = tgt.floor[x];
        } else {
          top[x] = ft + (tt - ft) * k;
          floor[x] = fromFloor[x] + (tgt.floor[x] - fromFloor[x]) * k;
        }
      }
      moving = k < 1;
      if (!moving) tweening = false;
    }

    const lift = s.inside.current ? 1 : 0;
    let settling = false;
    if (Math.abs(intensity - lift) > 0.001) {
      intensity += (lift - intensity) * 0.16;
      settling = true;
    } else {
      intensity = lift;
    }

    const winkDue = s.look.sparkles && !still && now - lastWink >= 100;
    if (
      !(
        moving ||
        settling ||
        winkDue ||
        s.hover !== null ||
        progChanged ||
        needsFill
      )
    )
      return;
    if (progChanged) lastProg = prog;
    if (winkDue) {
      lastWink = now;
      tick += 1;
    }

    const reveal = animate ? easeInOutCubic(prog) : 1;
    if (needsFill || moving || settling || progChanged) paintFill(reveal);
    needsFill = false;
    c.clearRect(0, 0, cols, rows);
    c.drawImage(off, 0, 0);

    const { ink } = s.look;
    const revealCols = reveal * cols;
    if (s.hover !== null) {
      const mx = Math.round(s.hover * (cols - 1));
      if (mx <= revealCols && !Number.isNaN(top[mx])) {
        const my = Math.round(top[mx]);
        c.fillStyle = rgba(ink, 0.55);
        c.fillRect(mx, my, 1, rows - my);
        c.fillStyle = rgba(ink);
        c.fillRect(mx - 1, my - 1, 3, 3);
      }
    }

    if (s.look.sparkles) {
      for (const star of stars) {
        const sx = star.col;
        if (sx > revealCols || Number.isNaN(top[sx])) continue;
        const sy = Math.round(top[sx] + star.depth * (floor[sx] - top[sx]));
        const tw = still
          ? 0.85
          : (Math.sin((tick + star.phase) * 0.35) + 1) / 2;
        const glint = tw * (0.7 + 0.3 * intensity);
        if (glint < 0.55 || sy < 0 || sy >= rows) continue;
        c.fillStyle = rgba(ink, glint);
        c.fillRect(sx, sy, 1, 1);
        if (tw > 0.9) {
          c.fillStyle = rgba(ink, glint * 0.6 * (tw - 0.9) * 10);
          c.fillRect(sx - 1, sy, 1, 1);
          c.fillRect(sx + 1, sy, 1, 1);
          c.fillRect(sx, sy - 1, 1, 1);
          c.fillRect(sx, sy + 1, 1, 1);
        }
      }
    }

    if (s.look.bloom !== "off") {
      b.clearRect(0, 0, cols, rows);
      b.drawImage(crisp, 0, 0);
    }
  };

  raf = requestAnimationFrame(draw);
  return () => cancelAnimationFrame(raf);
}

export function usePlotSize(ref: RefObject<HTMLDivElement | null>) {
  const [plot, setPlot] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = (w: number, h: number) =>
      setPlot((prev) => {
        const next = { w: Math.round(w), h: Math.round(h) };
        return prev.w === next.w && prev.h === next.h ? prev : next;
      });
    const rect = el.getBoundingClientRect();
    measure(rect.width, rect.height);
    const ro = new ResizeObserver(([entry]) =>
      measure(entry.contentRect.width, entry.contentRect.height),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return plot;
}

function markAt(
  hover: number | null,
  kind: ChartKind,
  surface: Surface,
  points: BalancePoint[],
  curve: Curve,
  max: number,
): Mark | undefined {
  if (hover === null) return undefined;
  if (kind === "bars") return surface.marks.find((m) => m.x === hover);
  return sampleAt(points, hover, curve, max);
}

function nearestBar(marks: Mark[], fx: number): number | null {
  let best: Mark | undefined;
  for (const m of marks) {
    if (!best || Math.abs(m.x - fx) < Math.abs(best.x - fx)) best = m;
  }
  return best ? best.x : null;
}

function YAxis({
  ticks,
  max,
  width,
  bottom,
  label,
}: {
  ticks: number[];
  max: number;
  width: number;
  bottom: number;
  label: (v: number) => string;
}) {
  return (
    <div className="absolute left-0 top-0" style={{ width, bottom }}>
      {ticks.map((v) => (
        <span
          key={v}
          className="absolute right-2 -translate-y-1/2 tabular-nums"
          style={{ top: `${(1 - v / max) * 100}%` }}
        >
          {label(v)}
        </span>
      ))}
    </div>
  );
}

function GridLines({ ticks, max }: { ticks: number[]; max: number }) {
  return (
    <svg className="absolute inset-0 h-full w-full" aria-hidden>
      {ticks.map((v) => (
        <line
          key={v}
          x1="0"
          x2="100%"
          y1={`${(1 - v / max) * 100}%`}
          y2={`${(1 - v / max) * 100}%`}
          stroke="var(--border)"
          strokeOpacity={v === 0 ? 0.9 : 0.5}
          strokeDasharray={v === 0 ? undefined : "4 6"}
        />
      ))}
    </svg>
  );
}

function XAxis({
  labels,
  left,
  height,
  masked,
}: {
  labels: Mark[];
  left: number;
  height: number;
  masked: boolean;
}) {
  return (
    <div className="absolute bottom-0 right-0" style={{ left, height }}>
      {labels.map((m) => (
        <span
          key={m.t}
          className="absolute bottom-0 -translate-x-1/2 whitespace-nowrap"
          style={{ left: `${m.x * 100}%` }}
        >
          {masked ? maskFor("date") : m.label}
        </span>
      ))}
    </div>
  );
}

function tipPlacement(mark: Mark): CSSProperties {
  const shift = mark.x < 0.12 ? "-12%" : mark.x > 0.88 ? "-88%" : "-50%";
  const y = mark.y < 0.3 ? "14px" : "calc(-100% - 12px)";
  return { "--tip-shift": shift, "--tip-y": y } as CSSProperties;
}

export function ScrubTip({
  mark,
  plot,
  usd,
  pool,
}: {
  mark: Mark;
  plot: { w: number; h: number };
  usd: boolean;
  pool?: { name: string; color: string };
}) {
  return (
    <div
      className="dither-tip"
      style={{
        transform: `translate(${mark.x * plot.w}px, ${mark.y * plot.h}px)`,
      }}
    >
      <div
        className="dither-tip-card w-max rounded-lg border border-border bg-popover px-3 py-2 text-popover-foreground shadow-lg"
        style={tipPlacement(mark)}
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-foreground">{fullDate(mark.t)}</span>
          {pool && <span style={{ color: pool.color }}>{pool.name}</span>}
          {mark.height ? (
            <span className="text-muted-foreground">
              Block {mark.height.toLocaleString()}
            </span>
          ) : null}
          <span className="mt-1 font-mono font-medium tabular-nums text-foreground">
            {valueLabel(mark.value, usd)}
          </span>
          {usd && typeof mark.zec === "number" && (
            <span className="font-mono tabular-nums text-muted-foreground">
              {mark.zec.toLocaleString(undefined, {
                maximumFractionDigits: 8,
              })}{" "}
              ZEC
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function useDitherLoop(
  crispRef: RefObject<HTMLCanvasElement | null>,
  bloomRef: RefObject<HTMLCanvasElement | null>,
  cols: number,
  rows: number,
  ready: boolean,
  state: LoopState,
) {
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });
  useEffect(() => {
    const crisp = crispRef.current;
    const bloom = bloomRef.current;
    if (!crisp || !bloom || !ready) return;
    return startLoop(crisp, bloom, cols, rows, stateRef);
  }, [crispRef, bloomRef, cols, rows, ready]);
}

export const AXIS_WIDTH = 64;
export const MASKED_AXIS_WIDTH = 76;

function axisGeometry(axes: boolean, masked: boolean) {
  if (!axes) return { yWidth: 0, xHeight: 0 };
  return { yWidth: masked ? MASKED_AXIS_WIDTH : AXIS_WIDTH, xHeight: 22 };
}

function ticksFor(max: number, step: number): number[] {
  return Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);
}

function xLabelsFor<T extends { label: string }>(marks: T[]): T[] {
  const every = Math.ceil(marks.length / MAX_LABELS);
  return marks.filter((m, i) => m.label && i % every === 0);
}

export function axisLabels(points: BalancePoint[]): BalancePoint[] {
  return xLabelsFor(points.filter((p) => p.key !== "start"));
}

function yLabelFor(masked: boolean, usd: boolean, max: number) {
  if (masked) return () => maskFor(usd ? "usd" : "zec");
  return (v: number) => axisLabel(v, usd, max);
}

export function DitherArea({
  points,
  usd = false,
  animate = true,
  interactive = true,
  axes = true,
  bins = 24,
  className,
  ink = DEFAULT_LOOK.ink,
  variant = DEFAULT_LOOK.variant,
  kind = DEFAULT_LOOK.kind,
  curve = DEFAULT_LOOK.curve,
  cell = DEFAULT_LOOK.cell,
  bloom = DEFAULT_LOOK.bloom,
  sparkles = DEFAULT_LOOK.sparkles,
}: DitherAreaProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const crispRef = useRef<HTMLCanvasElement>(null);
  const bloomRef = useRef<HTMLCanvasElement>(null);
  const plot = usePlotSize(plotRef);
  const [hover, setHover] = useState<number | null>(null);
  const inside = useRef(false);
  const entered = useRef(false);
  const masked = useMasked();
  const scrub = interactive && !masked;

  const look = useMemo<DitherLook>(
    () => ({ ink, variant, kind, curve, cell, bloom, sparkles }),
    [ink, variant, kind, curve, cell, bloom, sparkles],
  );

  const cols = Math.max(8, Math.round(plot.w / cell));
  const rows = Math.max(8, Math.round(plot.h / cell));
  const { max, step } = niceAxis(Math.max(0, ...points.map((p) => p.value)));
  const surface = useMemo(
    () => buildSurface(points, cols, rows, max, kind, curve, bins),
    [points, cols, rows, max, kind, curve, bins],
  );

  useDitherLoop(crispRef, bloomRef, cols, rows, plot.w > 0, {
    surface,
    look,
    hover,
    inside,
    animate,
    entered,
  });

  const pointer = scrub
    ? {
        onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
          const r = e.currentTarget.getBoundingClientRect();
          const fx = clamp01((e.clientX - r.left) / r.width);
          setHover(kind === "bars" ? nearestBar(surface.marks, fx) : fx);
        },
        onPointerEnter: () => {
          inside.current = true;
        },
        onPointerLeave: () => {
          inside.current = false;
          setHover(null);
        },
      }
    : {};

  const { yWidth, xHeight } = axisGeometry(axes, masked);
  const ticks = ticksFor(max, step);
  const mark = markAt(hover, kind, surface, points, curve, max);

  if (points.length === 0) return null;

  return (
    <div className={cn("relative text-xs text-muted-foreground", className)}>
      {axes && (
        <YAxis
          ticks={ticks}
          max={max}
          width={yWidth}
          bottom={xHeight}
          label={yLabelFor(masked, usd, max)}
        />
      )}
      <div
        ref={plotRef}
        className="dither-plot absolute right-0 top-0"
        style={{ left: yWidth, bottom: xHeight }}
        {...pointer}
      >
        {axes && <GridLines ticks={ticks} max={max} />}
        <canvas ref={crispRef} className="dither-crisp" />
        <canvas
          ref={bloomRef}
          className="dither-bloom"
          style={bloomStyle(bloom)}
        />
        {scrub && mark && <ScrubTip mark={mark} plot={plot} usd={usd} />}
      </div>
      {axes && (
        <XAxis
          labels={xLabelsFor(surface.marks)}
          left={yWidth}
          height={xHeight}
          masked={masked}
        />
      )}
    </div>
  );
}
