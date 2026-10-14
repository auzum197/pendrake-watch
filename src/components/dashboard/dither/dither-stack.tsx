import {
  type PointerEvent,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { maskFor } from "@/components/ui/discreet-value/discreet-value";
import { useMasked } from "@/lib/discreet";
import type { BalancePoint } from "@/lib/format";
import type { Pool } from "@/lib/ipc";
import { animationsEnabled } from "@/lib/motion";
import type { PoolSeries } from "@/lib/pools";
import { cn } from "@/lib/utils";
import {
  AXIS_WIDTH,
  type Curve,
  type Mark,
  MASKED_AXIS_WIDTH,
  niceAxis,
  ScrubTip,
  usePlotSize,
} from "./dither-area";
import {
  type Bloom,
  bloomStyle,
  clamp01,
  type DitherVariant,
  easeOutCubic,
  paintColumn,
  prefersReducedMotion,
} from "./dither-paint";
import { INK, type Rgb, rgba } from "./palette";
import "./dither-area.css";

export type StackMode = "stacked" | "share" | "layered";

export type DitherStackProps = {
  series: PoolSeries[];
  mode?: StackMode;
  variant?: DitherVariant;
  curve?: Curve;
  cell?: number;
  bloom?: Bloom;
  axes?: boolean;
  sparkles?: boolean;
  labels?: BalancePoint[];
  className?: string;
};

type Band = { top: Float64Array; floor: Float64Array };

type Geometry = {
  bands: Band[];
  values: Float64Array[];
  totals: Float64Array;
  max: number;
  step: number;
  start: number;
  span: number;
};

type Hover = { x: number; y: number };

const DIM = 0.55;
const MAX_LABELS = 6;
const FILL_LIGHTNESS = 0.42;
const FILL_SATURATION = 0.2;

function hue2rgb(p: number, q: number, t: number): number {
  const h = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
  if (h < 1 / 6) return p + (q - p) * 6 * h;
  if (h < 1 / 2) return q;
  if (h < 2 / 3) return p + (q - p) * (2 / 3 - h) * 6;
  return p;
}

type Hsl = { hue: number; saturation: number; lightness: number };

function toHsl([r, g, b]: Rgb): Hsl {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const chroma = max - min;
  let hue = 0;
  let saturation = 0;
  if (chroma > 0) {
    saturation = chroma / (1 - Math.abs(2 * lightness - 1));
    if (max === red)
      hue = ((green - blue) / chroma + (green < blue ? 6 : 0)) / 6;
    else if (max === green) hue = ((blue - red) / chroma + 2) / 6;
    else hue = ((red - green) / chroma + 4) / 6;
  }
  return { hue, saturation, lightness };
}

function fromHsl({ hue, saturation, lightness }: Hsl): Rgb {
  const q =
    lightness < 0.5
      ? lightness * (1 + saturation)
      : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;
  return [
    Math.round(hue2rgb(p, q, hue + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, hue) * 255),
    Math.round(hue2rgb(p, q, hue - 1 / 3) * 255),
  ];
}

const BRAND_HUE = toHsl(INK.brand).hue;
const HUE_TOLERANCE = 3 / 360;

function fillInk(ink: Rgb): Rgb {
  const { hue, saturation, lightness } = toHsl(ink);
  if (Math.abs(hue - BRAND_HUE) < HUE_TOLERANCE) return INK.brand;
  return fromHsl({
    hue,
    saturation: Math.min(1, saturation + FILL_SATURATION),
    lightness: Math.min(lightness, FILL_LIGHTNESS),
  });
}

function poolColor(pool: Pool): string {
  return `var(--pool-${pool})`;
}

function poolInk(element: Element, pool: Pool): Rgb {
  const hex = getComputedStyle(element)
    .getPropertyValue(`--pool-${pool}`)
    .trim();
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return INK[pool];
  const packed = parseInt(hex.slice(1), 16);
  return [(packed >> 16) & 255, (packed >> 8) & 255, packed & 255];
}

function sampleSeries(
  points: BalancePoint[],
  start: number,
  span: number,
  columns: number,
  curve: Curve,
): Float64Array {
  const samples = new Float64Array(columns);
  let index = 0;
  for (let column = 0; column < columns; column++) {
    const time = start + (span * column) / (columns - 1);
    while (index + 1 < points.length && points[index + 1].t <= time) index++;
    const before = points[index];
    let value = before.value;
    if (curve === "linear" && index + 1 < points.length) {
      const after = points[index + 1];
      value =
        before.value +
        (after.value - before.value) *
          clamp01((time - before.t) / (after.t - before.t || 1));
    }
    samples[column] = value;
  }
  return samples;
}

function buildGeometry(
  series: PoolSeries[],
  columns: number,
  rows: number,
  mode: StackMode,
  curve: Curve,
): Geometry {
  const start = Math.min(...series.map((poolSeries) => poolSeries.points[0].t));
  const end = Math.max(
    ...series.map(
      (poolSeries) => poolSeries.points[poolSeries.points.length - 1].t,
    ),
  );
  const span = end - start || 1;
  const values = series.map((poolSeries) =>
    sampleSeries(poolSeries.points, start, span, columns, curve),
  );
  const totals = new Float64Array(columns);
  for (const value of values)
    for (let column = 0; column < columns; column++)
      totals[column] += value[column];

  let peak = 0;
  if (mode === "layered") {
    for (const value of values) for (const x of value) peak = Math.max(peak, x);
  } else {
    for (const x of totals) peak = Math.max(peak, x);
  }
  const axis = mode === "share" ? { max: 1, step: 0.25 } : niceAxis(peak);
  const yRow = (value: number) => (1 - value / axis.max) * (rows - 1);
  const glowDepth = Math.max(5, Math.round(rows * 0.14));

  const bands = series.map(() => ({
    top: new Float64Array(columns),
    floor: new Float64Array(columns),
  }));
  for (let column = 0; column < columns; column++) {
    if (mode === "layered") {
      for (let index = 0; index < series.length; index++) {
        bands[index].top[column] = yRow(values[index][column]);
        bands[index].floor[column] = Math.min(
          rows - 1,
          bands[index].top[column] + glowDepth,
        );
      }
      continue;
    }
    const scale = mode === "share" ? totals[column] || 1 : 1;
    let cumulative = 0;
    for (let index = series.length - 1; index >= 0; index--) {
      bands[index].floor[column] = yRow(cumulative / scale);
      cumulative += values[index][column];
      bands[index].top[column] = yRow(cumulative / scale);
    }
  }
  return { bands, values, totals, max: axis.max, step: axis.step, start, span };
}

function bandAt(
  geometry: Geometry,
  mode: StackMode,
  column: number,
  row: number,
): number | null {
  let best: number | null = null;
  for (let index = 0; index < geometry.bands.length; index++) {
    const { top, floor } = geometry.bands[index];
    if (mode === "layered") {
      if (
        best === null ||
        Math.abs(top[column] - row) <
          Math.abs(geometry.bands[best].top[column] - row)
      )
        best = index;
      continue;
    }
    if (row < top[column] || row >= floor[column]) continue;
    if (best === null || top[column] > geometry.bands[best].top[column])
      best = index;
  }
  return best;
}

type LoopState = {
  geometry: Geometry;
  pools: Pool[];
  variant: DitherVariant;
  sparkles: boolean;
  hover: Hover | null;
  focus: number | null;
  inside: { current: boolean };
};

const TWEEN_MS = 400;
const SETTLE = 0.16;
const WINK_MS = 100;

function cloneBands(bands: Band[]): Band[] {
  return bands.map((band) => ({
    top: Float64Array.from(band.top),
    floor: Float64Array.from(band.floor),
  }));
}

function crestAt(bands: Band[], x: number): number {
  let crest = Infinity;
  for (const band of bands) crest = Math.min(crest, band.top[x]);
  return crest;
}

function bandUnder(bands: Band[], x: number, y: number): number | null {
  for (let index = 0; index < bands.length; index++) {
    if (y >= bands[index].top[x] && y < bands[index].floor[x]) return index;
  }
  return null;
}

function startLoop(
  crispCanvas: HTMLCanvasElement,
  bloomCanvas: HTMLCanvasElement,
  columns: number,
  rows: number,
  state: RefObject<LoopState>,
) {
  const crispContext = crispCanvas.getContext("2d");
  const bloomContext = bloomCanvas.getContext("2d");
  if (!crispContext || !bloomContext) return;
  for (const canvas of [crispCanvas, bloomCanvas]) {
    canvas.width = columns;
    canvas.height = rows;
  }

  const still = !animationsEnabled() || prefersReducedMotion();
  const frame = crispContext.createImageData(columns, rows);
  const pixels = frame.data;
  const stars = Array.from(
    { length: Math.max(4, Math.round(columns / 14)) },
    (_, index) => {
      const seed = index * 67 + 13;
      return {
        column: (seed * 97) % columns,
        depth: ((seed * 53 + 7) % 100) / 100,
        phase: (seed * 41) % 360,
      };
    },
  );

  let raf = 0;
  let tick = 0;
  let lastWink = 0;
  let tweenStart = 0;
  let tweening = false;
  let intensity = 0;
  let needsFill = true;
  let bands: Band[] = [];
  let fromBands: Band[] = [];
  let lit: number[] = [];
  let inks: Rgb[] = [];
  let fills: Rgb[] = [];
  let lastGeometry: Geometry | null = null;
  let lastPools: Pool[] | null = null;
  let lastVariant: DitherVariant | null = null;

  const paintFill = (variant: DitherVariant) => {
    pixels.fill(0);
    for (let index = 0; index < bands.length; index++) {
      const { top, floor } = bands[index];
      const dim = lit[index];
      for (let x = 0; x < columns; x++) {
        const topRow = Math.round(top[x]);
        const floorRow = Math.round(floor[x]);
        if (floorRow - topRow <= 0) continue;
        paintColumn(
          pixels,
          columns,
          x,
          top[x],
          floor[x],
          fills[index],
          variant,
          intensity,
        );
        if (dim < 0.999)
          for (let y = topRow; y < floorRow; y++)
            pixels[(y * columns + x) * 4 + 3] *= dim;
      }
    }
  };

  const draw = (now: number) => {
    raf = requestAnimationFrame(draw);
    const current = state.current;
    const target = current.geometry;

    if (current.pools !== lastPools) {
      lastPools = current.pools;
      inks = current.pools.map((pool) => poolInk(crispCanvas, pool));
      fills = inks.map(fillInk);
      needsFill = true;
    }
    if (target !== lastGeometry) {
      const sameShape =
        lastGeometry !== null &&
        lastGeometry.bands.length === target.bands.length;
      if (!sameShape || still) {
        bands = cloneBands(target.bands);
        lit = target.bands.map(() => 1);
        tweening = false;
      } else {
        fromBands = cloneBands(bands);
        tweenStart = now;
        tweening = true;
      }
      lastGeometry = target;
      needsFill = true;
    }
    if (current.variant !== lastVariant) {
      lastVariant = current.variant;
      needsFill = true;
    }

    let moving = false;
    if (tweening) {
      const k = easeOutCubic(Math.min(1, (now - tweenStart) / TWEEN_MS));
      for (let index = 0; index < bands.length; index++) {
        const from = fromBands[index];
        const to = target.bands[index];
        const band = bands[index];
        for (let x = 0; x < columns; x++) {
          band.top[x] = from.top[x] + (to.top[x] - from.top[x]) * k;
          band.floor[x] = from.floor[x] + (to.floor[x] - from.floor[x]) * k;
        }
      }
      moving = k < 1;
      if (!moving) tweening = false;
    }

    let settling = false;
    const lift = current.inside.current ? 1 : 0;
    if (Math.abs(intensity - lift) > 0.001) {
      intensity += (lift - intensity) * (still ? 1 : SETTLE);
      settling = true;
    } else {
      intensity = lift;
    }
    for (let index = 0; index < lit.length; index++) {
      const goal = current.focus === null || current.focus === index ? 1 : DIM;
      if (Math.abs(lit[index] - goal) > 0.001) {
        lit[index] += (goal - lit[index]) * (still ? 1 : SETTLE);
        settling = true;
      } else {
        lit[index] = goal;
      }
    }

    const winkDue = current.sparkles && !still && now - lastWink >= WINK_MS;
    if (!(moving || settling || winkDue || current.hover !== null || needsFill))
      return;
    if (winkDue) {
      lastWink = now;
      tick += 1;
    }

    if (needsFill || moving || settling) paintFill(current.variant);
    needsFill = false;
    crispContext.putImageData(frame, 0, 0);

    if (current.hover) {
      const column = Math.round(current.hover.x * (columns - 1));
      const crest = Math.round(crestAt(bands, column));
      const ink = current.focus === null ? INK.grey : inks[current.focus];
      crispContext.fillStyle = rgba(ink, 0.55);
      crispContext.fillRect(column, crest, 1, rows - crest);
      if (current.focus !== null) {
        const row = Math.round(bands[current.focus].top[column]);
        crispContext.fillStyle = rgba(ink);
        crispContext.fillRect(column - 1, row - 1, 3, 3);
      }
    }

    if (current.sparkles) {
      for (const star of stars) {
        const crest = crestAt(bands, star.column);
        if (crest >= rows - 1) continue;
        const sy = Math.round(crest + star.depth * (rows - 1 - crest));
        const under = bandUnder(bands, star.column, sy);
        if (under === null) continue;
        const twinkle = still
          ? 0.85
          : (Math.sin((tick + star.phase) * 0.35) + 1) / 2;
        const glint = twinkle * (0.7 + 0.3 * intensity) * lit[under];
        if (glint < 0.55) continue;
        const ink = inks[under];
        crispContext.fillStyle = rgba(ink, glint);
        crispContext.fillRect(star.column, sy, 1, 1);
        if (twinkle > 0.9) {
          crispContext.fillStyle = rgba(
            ink,
            glint * 0.6 * (twinkle - 0.9) * 10,
          );
          crispContext.fillRect(star.column - 1, sy, 1, 1);
          crispContext.fillRect(star.column + 1, sy, 1, 1);
          crispContext.fillRect(star.column, sy - 1, 1, 1);
          crispContext.fillRect(star.column, sy + 1, 1, 1);
        }
      }
    }

    bloomContext.clearRect(0, 0, columns, rows);
    bloomContext.drawImage(crispCanvas, 0, 0);
  };

  raf = requestAnimationFrame(draw);
  return () => cancelAnimationFrame(raf);
}

function useStackLoop(
  crispRef: RefObject<HTMLCanvasElement | null>,
  bloomRef: RefObject<HTMLCanvasElement | null>,
  columns: number,
  rows: number,
  ready: boolean,
  state: LoopState,
) {
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });
  useEffect(() => {
    const crispCanvas = crispRef.current;
    const bloomCanvas = bloomRef.current;
    if (!crispCanvas || !bloomCanvas || !ready) return;
    return startLoop(crispCanvas, bloomCanvas, columns, rows, stateRef);
  }, [crispRef, bloomRef, columns, rows, ready]);
}

function markAt(
  geometry: Geometry,
  series: PoolSeries[],
  hover: Hover,
  focus: number | null,
  rows: number,
): Mark {
  const column = Math.round(hover.x * (geometry.values[0].length - 1));
  const time = geometry.start + hover.x * geometry.span;
  const points = series[focus ?? 0].points;
  let index = 0;
  while (index + 1 < points.length && points[index + 1].t <= time) index++;
  const band = focus === null ? null : geometry.bands[focus];
  return {
    x: hover.x,
    y: band
      ? (band.top[column] + band.floor[column]) / 2 / (rows - 1)
      : hover.y,
    t: time,
    value:
      focus === null ? geometry.totals[column] : geometry.values[focus][column],
    label: points[index].label,
    height: points[index].height,
  };
}

function xLabels(series: PoolSeries[], span: number): BalancePoint[] {
  const dated = series
    .flatMap((poolSeries) => poolSeries.points)
    .filter((point) => point.label)
    .sort((before, after) => before.t - after.t);
  const gap = span / (MAX_LABELS + 1);
  const picked: BalancePoint[] = [];
  for (const point of dated) {
    const last = picked[picked.length - 1];
    if (!last || point.t - last.t >= gap) picked.push(point);
  }
  return picked;
}

function zecLabel(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function percentLabel(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function Axes({
  geometry,
  mode,
  labels,
  yWidth,
  xHeight,
  masked,
}: {
  geometry: Geometry;
  mode: StackMode;
  labels: BalancePoint[];
  yWidth: number;
  xHeight: number;
  masked: boolean;
}) {
  const ticks = Array.from(
    { length: Math.round(geometry.max / geometry.step) + 1 },
    (_, index) => index * geometry.step,
  );
  const yPercent = (value: number) => `${(1 - value / geometry.max) * 100}%`;
  return (
    <>
      <div
        className="absolute left-0 top-0"
        style={{ width: yWidth, bottom: xHeight }}
      >
        {ticks.map((value) => (
          <span
            key={value}
            className="absolute right-2 -translate-y-1/2 tabular-nums"
            style={{ top: yPercent(value) }}
          >
            {masked
              ? maskFor("zec")
              : mode === "share"
                ? percentLabel(value)
                : zecLabel(value)}
          </span>
        ))}
      </div>
      <svg
        className="absolute right-0 top-0"
        style={{
          left: yWidth,
          bottom: xHeight,
          width: `calc(100% - ${yWidth}px)`,
          height: `calc(100% - ${xHeight}px)`,
        }}
        aria-hidden
      >
        {ticks.map((value) => (
          <line
            key={value}
            x1="0"
            x2="100%"
            y1={yPercent(value)}
            y2={yPercent(value)}
            stroke="var(--border)"
            strokeOpacity={value === 0 ? 0.9 : 0.5}
            strokeDasharray={value === 0 ? undefined : "4 6"}
          />
        ))}
      </svg>
      <div
        className="absolute bottom-0 right-0"
        style={{ left: yWidth, height: xHeight }}
      >
        {labels.map((point) => (
          <span
            key={point.t}
            className="absolute bottom-0 -translate-x-1/2 whitespace-nowrap"
            style={{
              left: `${((point.t - geometry.start) / geometry.span) * 100}%`,
            }}
          >
            {masked ? maskFor("date") : point.label}
          </span>
        ))}
      </div>
    </>
  );
}

export function DitherStack({
  series,
  mode = "stacked",
  variant = "gradient",
  curve = "step",
  cell = 2,
  bloom = "low",
  axes = true,
  sparkles = true,
  labels,
  className,
}: DitherStackProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const crispRef = useRef<HTMLCanvasElement>(null);
  const bloomRef = useRef<HTMLCanvasElement>(null);
  const plot = usePlotSize(plotRef);
  const [hover, setHover] = useState<Hover | null>(null);
  const inside = useRef(false);
  const masked = useMasked();

  const columns = Math.max(8, Math.round(plot.w / cell));
  const rows = Math.max(8, Math.round(plot.h / cell));
  const geometry = useMemo(
    () => buildGeometry(series, columns, rows, mode, curve),
    [series, columns, rows, mode, curve],
  );

  const focus = hover
    ? bandAt(
        geometry,
        mode,
        Math.round(hover.x * (columns - 1)),
        hover.y * (rows - 1),
      )
    : null;

  const pools = useMemo(
    () => series.map((poolSeries) => poolSeries.pool),
    [series],
  );
  useStackLoop(crispRef, bloomRef, columns, rows, plot.w > 0, {
    geometry,
    pools,
    variant,
    sparkles,
    hover,
    focus,
    inside,
  });

  const yWidth = axes ? (masked ? MASKED_AXIS_WIDTH : AXIS_WIDTH) : 0;
  const xHeight = axes ? 22 : 0;
  const dates = labels ?? xLabels(series, geometry.span);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="relative flex-1 text-xs text-muted-foreground">
        {axes && (
          <Axes
            geometry={geometry}
            mode={mode}
            labels={dates}
            yWidth={yWidth}
            xHeight={xHeight}
            masked={masked}
          />
        )}
        <div
          ref={plotRef}
          className="dither-plot absolute right-0 top-0"
          style={{ left: yWidth, bottom: xHeight }}
          {...(!masked && {
            onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
              const rect = event.currentTarget.getBoundingClientRect();
              setHover({
                x: clamp01((event.clientX - rect.left) / rect.width),
                y: clamp01((event.clientY - rect.top) / rect.height),
              });
            },
            onPointerEnter: () => {
              inside.current = true;
            },
            onPointerLeave: () => {
              inside.current = false;
              setHover(null);
            },
          })}
        >
          <canvas ref={crispRef} className="dither-crisp" />
          <canvas
            ref={bloomRef}
            className="dither-bloom"
            style={bloomStyle(bloom)}
          />
          {hover && (
            <ScrubTip
              mark={markAt(geometry, series, hover, focus, rows)}
              plot={plot}
              usd={false}
              pool={
                focus === null
                  ? undefined
                  : {
                      name: series[focus].name,
                      color: poolColor(series[focus].pool),
                    }
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
