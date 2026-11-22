import {
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import {
  easeInOutCubic,
  easeOutCubic,
  paintColumn,
} from "@/components/dashboard/dither/dither-paint";
import { INK, rgba, type Rgb } from "@/components/dashboard/dither/palette";
import "@/components/dashboard/dither/dither-area.css";
import type { Point } from "./content";
import { reducedMotion } from "./shared";

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
  if (points.length === 0) return top;
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

function fullDate(epoch: number) {
  const d = new Date(epoch * 1000);
  const today = new Date().toDateString() === d.toDateString();
  const time = d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  if (today) return `Today, ${time}`;
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${time}`;
}

export function DitherChart(props: {
  points: Point[];
  class?: string;
  axes?: boolean;
  tip?: boolean;
  ink?: Rgb;
}) {
  const axes = () => props.axes ?? true;
  const axisW = () => (axes() ? AXIS_W : 0);
  const axisH = () => (axes() ? AXIS_H : 0);
  let plot!: HTMLDivElement;
  let crisp!: HTMLCanvasElement;
  let bloom!: HTMLCanvasElement;
  const [size, setSize] = createSignal({ w: 0, h: 0 });
  const [hover, setHover] = createSignal<number | null>(null);
  const axis = createMemo(() =>
    niceAxis(Math.max(0, ...props.points.map((p) => p.value))),
  );
  const ticks = createMemo(() =>
    Array.from(
      { length: Math.round(axis().max / axis().step) + 1 },
      (_, i) => i * axis().step,
    ),
  );
  const labels = createMemo(() => {
    const every = Math.ceil(props.points.length / MAX_LABELS);
    const t0 = props.points[0]?.t ?? 0;
    const span = (props.points[props.points.length - 1]?.t ?? 1) - t0 || 1;
    return props.points
      .filter((p, i) => p.label && i % every === 0)
      .map((p) => ({ x: (p.t - t0) / span, label: p.label }));
  });
  const mark = createMemo(() => {
    const fx = hover();
    if (fx === null || props.points.length === 0) return null;
    const { value, t } = valueAt(props.points, fx);
    return { x: fx, y: 1 - value / axis().max, value, t };
  });

  onMount(() => {
    const still = reducedMotion();
    const ink = props.ink ?? INK.brand;
    const c = crisp.getContext("2d")!;
    const b = bloom.getContext("2d")!;
    const off = document.createElement("canvas");
    const o = off.getContext("2d")!;
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
    let lastPoints = props.points;
    let lastMax = axis().max;

    const retarget = () => {
      if (cols === 0) return;
      target = surfaceFor(props.points, cols, rows, axis().max);
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

    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      const h = Math.round(entry.contentRect.height);
      if (w === 0 || h === 0) return;
      setSize({ w, h });
      cols = Math.max(8, Math.round(w / CELL));
      rows = Math.max(8, Math.round(h / CELL));
      for (const canvas of [crisp, bloom, off]) {
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
    ro.observe(plot);

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
      if (props.points !== lastPoints || axis().max !== lastMax) {
        lastPoints = props.points;
        lastMax = axis().max;
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
      const hoverChanged = hover() !== lastHover;
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
      lastHover = hover();
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
      const fx = hover();
      if (fx !== null) {
        const mx = Math.round(fx * (cols - 1));
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

      b.clearRect(0, 0, cols, rows);
      b.drawImage(crisp, 0, 0);
    };
    raf = requestAnimationFrame(draw);

    const onMove = (e: PointerEvent) => {
      const r = plot.getBoundingClientRect();
      setHover(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
    };
    const onEnter = () => {
      inside = true;
    };
    const onLeave = () => {
      inside = false;
      setHover(null);
    };
    plot.addEventListener("pointermove", onMove);
    plot.addEventListener("pointerenter", onEnter);
    plot.addEventListener("pointerleave", onLeave);

    onCleanup(() => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      plot.removeEventListener("pointermove", onMove);
      plot.removeEventListener("pointerenter", onEnter);
      plot.removeEventListener("pointerleave", onLeave);
    });
  });

  return (
    <div class={`relative text-xs text-muted-foreground ${props.class ?? ""}`}>
      <div
        class="absolute left-0 top-0"
        style={{ width: `${axisW()}px`, bottom: `${axisH()}px` }}
        hidden={!axes()}
      >
        <For each={ticks()}>
          {(v) => (
            <span
              class="absolute right-2 -translate-y-1/2 tabular-nums"
              style={{ top: `${(1 - v / axis().max) * 100}%` }}
            >
              {v.toLocaleString("en-US", {
                maximumFractionDigits:
                  axis().max < 1 ? 4 : axis().max < 100 ? 2 : 0,
              })}
            </span>
          )}
        </For>
      </div>
      <div
        ref={plot}
        class="dither-plot absolute right-0 top-0"
        style={{ left: `${axisW()}px`, bottom: `${axisH()}px` }}
      >
        <svg
          class="absolute inset-0 h-full w-full"
          aria-hidden
          style={{ display: axes() ? undefined : "none" }}
        >
          <For each={ticks()}>
            {(v) => (
              <line
                x1="0"
                x2="100%"
                y1={`${(1 - v / axis().max) * 100}%`}
                y2={`${(1 - v / axis().max) * 100}%`}
                stroke="var(--border)"
                stroke-opacity={v === 0 ? 0.9 : 0.5}
                stroke-dasharray={v === 0 ? undefined : "4 6"}
              />
            )}
          </For>
        </svg>
        <canvas ref={crisp} class="dither-crisp" />
        <canvas
          ref={bloom}
          class="dither-bloom"
          style={{
            filter: "blur(3px) brightness(1.35) saturate(1.4)",
            opacity: 0.7,
            "mix-blend-mode": "plus-lighter",
          }}
        />
        <Show when={(props.tip ?? true) && mark()}>
          {(m) => (
            <div
              class="dither-tip"
              style={{
                transform: `translate(${m().x * size().w}px, ${m().y * size().h}px)`,
              }}
            >
              <div
                class="dither-tip-card tip-card"
                style={{
                  "--tip-shift":
                    m().x < 0.12 ? "-12%" : m().x > 0.88 ? "-88%" : "-50%",
                  "--tip-y": m().y < 0.3 ? "16px" : "calc(-100% - 16px)",
                }}
              >
                <span class="tip-card-date">{fullDate(m().t)}</span>
                <span class="tip-card-value">
                  {m().value.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 4,
                  })}
                  <small>ZEC</small>
                </span>
              </div>
            </div>
          )}
        </Show>
      </div>
      <div
        class="absolute bottom-0 right-0"
        style={{ left: `${axisW()}px`, height: `${axisH()}px` }}
        hidden={!axes()}
      >
        <For each={labels()}>
          {(l) => (
            <span
              class="absolute bottom-0 -translate-x-1/2 whitespace-nowrap"
              style={{ left: `${l.x * 100}%` }}
            >
              {l.label}
            </span>
          )}
        </For>
      </div>
    </div>
  );
}
