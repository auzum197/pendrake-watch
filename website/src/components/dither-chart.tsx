import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  easeInOutCubic,
  easeOutCubic,
  paintColumn,
} from "@/components/dashboard/dither/dither-paint";
import { INK, rgba } from "@/components/dashboard/dither/palette";
import "@/components/dashboard/dither/dither-area.css";
import { clockLabel, type Point } from "../lib/content";
import { reducedMotion } from "../lib/motion";

const CELL = 2;
const AXIS_W = 64;
const AXIS_H = 22;
const ENTRANCE_MS = 800;
const TWEEN_MS = 400;
const MAX_LABELS = 6;

function niceAxis(peak: number) {
  if (peak <= 0) return { max: 1, step: 1 };
  const rough = peak / 4;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const n = rough / mag;
  const step =
    (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
  return { max: Math.ceil(peak / step) * step, step };
}

function surfaceFor(points: Point[], cols: number, rows: number, max: number) {
  const top = new Float64Array(cols).fill(rows - 1);
  const t0 = points[0].t;
  const span = points[points.length - 1].t - t0 || 1;
  let i = 0;
  for (let c = 0; c < cols; c++) {
    const t = t0 + (span * c) / (cols - 1);
    while (i + 1 < points.length && points[i + 1].t <= t) i++;
    top[c] = (1 - points[i].value / max) * (rows - 1);
  }
  return top;
}

function valueAt(points: Point[], fx: number) {
  const t0 = points[0].t;
  const span = points[points.length - 1].t - t0 || 1;
  const t = t0 + fx * span;
  let i = 0;
  while (i + 1 < points.length && points[i + 1].t <= t) i++;
  return { value: points[i].value, t };
}

type Live = { points: Point[]; max: number; hover: number | null };

function runChart(
  area: HTMLDivElement,
  front: HTMLCanvasElement,
  glow: HTMLCanvasElement,
  data: { current: Live },
  setSize: (size: { w: number; h: number }) => void,
  setHover: (x: number | null) => void,
) {
  const off = document.createElement("canvas");
  const c = front.getContext("2d")!;
  const b = glow.getContext("2d")!;
  const o = off.getContext("2d")!;
  const still = reducedMotion();
  const ink = INK.brand;
  let cols = 0;
  let rows = 0;
  let top = new Float64Array(0);
  let from = new Float64Array(0);
  let target = new Float64Array(0);
  let frame: ImageData | null = null;
  let stars: { col: number; depth: number; phase: number }[] = [];
  let raf = 0;
  let start = 0;
  let tweenStart = 0;
  let tweening = false;
  let entered = still;
  let needsFill = true;
  let intensity = 0;
  let inside = false;
  let tick = 0;
  let lastWink = 0;
  let lastHover: number | null = null;
  let lastPoints = data.current.points;
  let lastMax = data.current.max;

  const retarget = () => {
    if (cols === 0) return;
    target = surfaceFor(data.current.points, cols, rows, data.current.max);
    if (top.length !== cols || still || !entered) {
      top = Float64Array.from(target);
      tweening = false;
    } else {
      from = Float64Array.from(top);
      tweenStart = performance.now();
      tweening = true;
    }
    needsFill = true;
  };

  const resize = new ResizeObserver(([entry]) => {
    const w = Math.round(entry.contentRect.width);
    const h = Math.round(entry.contentRect.height);
    if (w === 0 || h === 0) return;
    setSize({ w, h });
    cols = Math.max(8, Math.round(w / CELL));
    rows = Math.max(8, Math.round(h / CELL));
    for (const canvas of [front, glow, off]) {
      canvas.width = cols;
      canvas.height = rows;
    }
    frame = o.createImageData(cols, rows);
    stars = Array.from(
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
    top = new Float64Array(0);
    retarget();
  });
  resize.observe(area);

  const paintFill = (reveal: number) => {
    if (!frame) return;
    frame.data.fill(0);
    const revealCols = Math.ceil(reveal * cols);
    for (let x = 0; x < cols && x <= revealCols; x++) {
      paintColumn(
        frame.data,
        cols,
        x,
        top[x],
        rows - 1,
        ink,
        "gradient",
        intensity,
      );
    }
    o.putImageData(frame, 0, 0);
  };

  const draw = (now: number) => {
    raf = requestAnimationFrame(draw);
    if (cols === 0 || !frame) return;
    const live = data.current;
    if (live.points !== lastPoints || live.max !== lastMax) {
      lastPoints = live.points;
      lastMax = live.max;
      retarget();
    }
    if (!start) start = now;
    const prog = entered ? 1 : Math.min(1, (now - start) / ENTRANCE_MS);
    const progChanged = !entered;
    if (prog >= 1) entered = true;

    let moving = false;
    if (tweening) {
      const k = easeOutCubic(Math.min(1, (now - tweenStart) / TWEEN_MS));
      for (let x = 0; x < cols; x++)
        top[x] = from[x] + (target[x] - from[x]) * k;
      moving = k < 1;
      if (!moving) tweening = false;
    }

    const lift = inside ? 1 : 0;
    let settling = false;
    if (Math.abs(intensity - lift) > 0.001) {
      intensity += (lift - intensity) * 0.16;
      settling = true;
    } else intensity = lift;

    const winkDue = !still && now - lastWink >= 100;
    const hoverChanged = live.hover !== lastHover;
    if (
      !(
        moving ||
        settling ||
        winkDue ||
        hoverChanged ||
        progChanged ||
        needsFill
      )
    )
      return;
    lastHover = live.hover;
    if (winkDue) {
      lastWink = now;
      tick += 1;
    }

    const reveal = entered ? 1 : easeInOutCubic(prog);
    if (needsFill || moving || settling || progChanged) paintFill(reveal);
    needsFill = false;
    c.clearRect(0, 0, cols, rows);
    c.drawImage(off, 0, 0);

    const revealCols = reveal * cols;
    if (live.hover !== null) {
      const mx = Math.round(live.hover * (cols - 1));
      if (mx <= revealCols) {
        const my = Math.round(top[mx]);
        c.fillStyle = rgba(ink, 0.55);
        c.fillRect(mx, my, 1, rows - my);
        c.fillStyle = rgba(ink);
        c.fillRect(mx - 1, my - 1, 3, 3);
      }
    }

    for (const star of stars) {
      const sx = star.col;
      if (sx > revealCols) continue;
      const sy = Math.round(top[sx] + star.depth * (rows - 1 - top[sx]));
      const tw = still ? 0.85 : (Math.sin((tick + star.phase) * 0.35) + 1) / 2;
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

    b.clearRect(0, 0, cols, rows);
    b.drawImage(front, 0, 0);
  };
  raf = requestAnimationFrame(draw);

  const onMove = (e: PointerEvent) => {
    const box = area.getBoundingClientRect();
    setHover(Math.min(1, Math.max(0, (e.clientX - box.left) / box.width)));
  };
  const onEnter = () => {
    inside = true;
  };
  const onLeave = () => {
    inside = false;
    setHover(null);
  };
  area.addEventListener("pointermove", onMove);
  area.addEventListener("pointerenter", onEnter);
  area.addEventListener("pointerleave", onLeave);

  return () => {
    cancelAnimationFrame(raf);
    resize.disconnect();
    area.removeEventListener("pointermove", onMove);
    area.removeEventListener("pointerenter", onEnter);
    area.removeEventListener("pointerleave", onLeave);
  };
}

export function DitherChart({
  points,
  className,
}: {
  points: Point[];
  className?: string;
}) {
  const plot = useRef<HTMLDivElement>(null);
  const crisp = useRef<HTMLCanvasElement>(null);
  const bloom = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hover, setHover] = useState<number | null>(null);

  const axis = niceAxis(Math.max(0, ...points.map((p) => p.value)));
  const ticks = Array.from(
    { length: Math.round(axis.max / axis.step) + 1 },
    (_, i) => i * axis.step,
  );
  const every = Math.ceil(points.length / MAX_LABELS);
  const t0 = points[0].t;
  const span = points[points.length - 1].t - t0 || 1;
  const labels = points
    .filter((_, i) => i % every === 0)
    .map((p) => ({ x: (p.t - t0) / span, label: p.label }));
  const digits = axis.max < 1 ? 4 : axis.max < 100 ? 2 : 0;
  const scrub = hover === null ? null : { x: hover, ...valueAt(points, hover) };
  const mark = scrub && { ...scrub, y: 1 - scrub.value / axis.max };

  const data = useRef<Live>({ points, max: axis.max, hover });
  useEffect(() => {
    data.current = { points, max: axis.max, hover };
  }, [points, axis.max, hover]);

  useEffect(() => {
    if (!plot.current || !crisp.current || !bloom.current) return;
    return runChart(
      plot.current,
      crisp.current,
      bloom.current,
      data,
      setSize,
      setHover,
    );
  }, []);

  return (
    <div
      className={`relative text-xs text-muted-foreground ${className ?? ""}`}
    >
      <div
        className="absolute left-0 top-0"
        style={{ width: AXIS_W, bottom: AXIS_H }}
      >
        {ticks.map((v) => (
          <span
            key={v}
            className="absolute right-2 -translate-y-1/2 tabular-nums"
            style={{ top: `${(1 - v / axis.max) * 100}%` }}
          >
            {v.toLocaleString("en-US", { maximumFractionDigits: digits })}
          </span>
        ))}
      </div>
      <div
        ref={plot}
        className="dither-plot absolute right-0 top-0"
        style={{ left: AXIS_W, bottom: AXIS_H }}
      >
        <svg className="absolute inset-0 h-full w-full" aria-hidden>
          {ticks.map((v) => (
            <line
              key={v}
              x1="0"
              x2="100%"
              y1={`${(1 - v / axis.max) * 100}%`}
              y2={`${(1 - v / axis.max) * 100}%`}
              stroke="var(--border)"
              strokeOpacity={v === 0 ? 0.9 : 0.5}
              strokeDasharray={v === 0 ? undefined : "4 6"}
            />
          ))}
        </svg>
        <canvas ref={crisp} className="dither-crisp" />
        <canvas
          ref={bloom}
          className="dither-bloom"
          style={{
            filter: "blur(3px) brightness(1.35) saturate(1.4)",
            opacity: 0.7,
            mixBlendMode: "plus-lighter",
          }}
        />
        {mark && (
          <div
            className="dither-tip"
            style={{
              transform: `translate(${mark.x * size.w}px, ${mark.y * size.h}px)`,
            }}
          >
            <div
              className="dither-tip-card tip-card"
              style={
                {
                  "--tip-shift":
                    mark.x < 0.12 ? "-12%" : mark.x > 0.88 ? "-88%" : "-50%",
                  "--tip-y": mark.y < 0.3 ? "16px" : "calc(-100% - 16px)",
                } as CSSProperties
              }
            >
              <span className="tip-card-date">Today, {clockLabel(mark.t)}</span>
              <span className="tip-card-value">
                {mark.value.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 4,
                })}
                <small>ZEC</small>
              </span>
            </div>
          </div>
        )}
      </div>
      <div
        className="absolute bottom-0 right-0"
        style={{ left: AXIS_W, height: AXIS_H }}
      >
        {labels.map((l) => (
          <span
            key={l.label}
            className="absolute bottom-0 -translate-x-1/2 whitespace-nowrap"
            style={{ left: `${l.x * 100}%` }}
          >
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}
