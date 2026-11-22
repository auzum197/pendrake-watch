import { onCleanup, onMount } from "solid-js";
import { reducedMotion } from "./shared";
import "./sky.css";

export const SKY_STOPS: [number, number, number][] = [
  [2, 8, 56],
  [10, 26, 140],
  [42, 79, 216],
  [238, 243, 255],
];

export const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const BAYER8 = Array.from({ length: 64 }, (_, i) => {
  const x = i & 7;
  const y = i >> 3;
  return (
    BAYER[((y & 3) << 2) | (x & 3)] * 4 + BAYER[((y >> 2) << 2) | (x >> 2)] / 4
  );
});
const SRC_W = 640;
const SRC_H = 360;

export function skyPalette(levels: number) {
  return Array.from({ length: levels }, (_, i) => {
    const seg = (i / (levels - 1)) * (SKY_STOPS.length - 1);
    const k = Math.min(SKY_STOPS.length - 2, Math.floor(seg));
    const f = seg - k;
    const a = SKY_STOPS[k];
    const b = SKY_STOPS[k + 1];
    return [0, 1, 2].map((c) => Math.round(a[c] + (b[c] - a[c]) * f)) as [
      number,
      number,
      number,
    ];
  });
}

export function toneCurve(strength: number, mid: number, gamma: number) {
  const s = (x: number) => 1 / (1 + Math.exp(strength * (mid - x)));
  const lo = s(0);
  const hi = s(1);
  return Float32Array.from({ length: 256 }, (_, i) => {
    const contrast = (s(i / 255) - lo) / (hi - lo);
    return Math.pow(contrast, 1 / gamma);
  });
}

export type Vignette = { from: number; to: number; dim: number; sink: number };
export type Lens = { x: number; y: number; radius: number; power: number };

const SINK_STEPS = 16;

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function Sky(props: {
  px?: number;
  levels?: number;
  src: string;
  band?: number;
  vignette?: Vignette;
  lens?: Lens;
  class?: string;
}) {
  let canvas!: HTMLCanvasElement;
  let host!: HTMLDivElement;
  const soft: HTMLCanvasElement[] = [];

  onMount(() => {
    const px = props.px ?? 4;
    const levels = props.levels ?? 6;
    const band = props.band ?? 0.5;
    const palette = skyPalette(levels);
    const curve = toneCurve(4, 0.5, 0.8);
    const still = reducedMotion();
    const ctx = canvas.getContext("2d")!;
    const small = document.createElement("canvas");
    const sctx = small.getContext("2d", { willReadFrequently: true })!;

    let source: HTMLVideoElement | HTMLImageElement;
    if (still) {
      const img = new Image();
      img.src = "/sky-still.png";
      source = img;
    } else {
      const video = document.createElement("video");
      video.src = props.src;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = "auto";
      video.className = "sky-source";
      host.append(video);
      source = video;
    }

    let cols = 0;
    let rows = 0;
    let out: ImageData | null = null;
    let raf = 0;
    let handle = 0;

    const ready = () =>
      source instanceof HTMLVideoElement
        ? source.readyState >= 2
        : source.complete && source.naturalWidth > 0;

    const size = () => {
      const r = host.getBoundingClientRect();
      cols = Math.max(1, Math.ceil(r.width / px));
      rows = Math.max(1, Math.ceil(r.height / px));
      small.width = canvas.width = cols;
      small.height = canvas.height = rows;
      for (const copy of soft) {
        copy.width = cols;
        copy.height = rows;
      }
      out = ctx.createImageData(cols, rows);
      sctx.imageSmoothingEnabled = true;
      sctx.imageSmoothingQuality = "high";
    };

    const paint = () => {
      if (!out || !ready()) return;
      const scale = Math.max(cols / SRC_W, rows / SRC_H);
      const dw = SRC_W * scale;
      const dh = SRC_H * scale;
      sctx.drawImage(source, (cols - dw) / 2, (rows - dh) * band, dw, dh);
      const src = sctx.getImageData(0, 0, cols, rows).data;
      const dst = out.data;
      const top = levels - 1;
      const diag = Math.hypot(cols, rows);
      const shade = props.vignette;
      const lens = props.lens;
      const lensX = lens ? lens.x * cols : 0;
      const lensY = lens ? lens.y * rows : 0;
      const lensR = lens ? lens.radius * Math.min(cols, rows) : 1;
      const sinkFrom = shade ? shade.from + (shade.to - shade.from) * 0.3 : 0;
      for (let y = 0; y < rows; y++) {
        const by = (y & 3) * 4;
        for (let x = 0; x < cols; x++) {
          const i = (y * cols + x) * 4;
          const threshold = (BAYER[by + (x & 3)] + 0.5) / 16;
          const p = shade ? Math.hypot(cols - x, y) / diag : 0;
          let pick = i;
          if (lens) {
            const dx = x - lensX;
            const dy = y - lensY;
            const d = Math.hypot(dx, dy) / lensR;
            if (d < 1) {
              const pull = 1 - lens.power * (1 - d * d) ** 2;
              pick =
                (Math.round(lensY + dy * pull) * cols +
                  Math.round(lensX + dx * pull)) *
                4;
            }
          }
          let tone = curve[src[pick]];
          let alpha = 255;
          if (shade) {
            tone *= 1 - shade.dim * smooth(shade.from, shade.to, p);
            const sink = shade.sink * smooth(sinkFrom, shade.to, p);
            const gate = (BAYER8[((y & 7) << 3) | (x & 7)] + 0.5) / 64;
            alpha =
              255 - Math.floor(sink * SINK_STEPS + gate) * (255 / SINK_STEPS);
          }
          const q = tone * top;
          const base = Math.floor(q);
          const level = Math.min(top, base + (q - base > threshold ? 1 : 0));
          const [r, g, b] = palette[level];
          dst[i] = r;
          dst[i + 1] = g;
          dst[i + 2] = b;
          dst[i + 3] = alpha;
        }
      }
      ctx.putImageData(out, 0, 0);
      for (const copy of soft) copy.getContext("2d")!.putImageData(out, 0, 0);
    };

    const loop = () => {
      paint();
      if (!(source instanceof HTMLVideoElement)) return;
      if ("requestVideoFrameCallback" in source) {
        handle = source.requestVideoFrameCallback(loop);
      } else {
        raf = requestAnimationFrame(loop);
      }
    };

    const resize = new ResizeObserver(() => {
      size();
      paint();
    });
    resize.observe(host);

    const run = () => {
      if (!(source instanceof HTMLVideoElement)) return;
      if (document.visibilityState !== "visible") {
        source.pause();
        return;
      }
      source.play().catch(() => {});
    };

    if (source instanceof HTMLVideoElement) {
      source.addEventListener("loadeddata", () => {
        run();
        loop();
      });
      document.addEventListener("visibilitychange", run);
    } else {
      source.addEventListener("load", paint, { once: true });
    }

    onCleanup(() => {
      resize.disconnect();
      document.removeEventListener("visibilitychange", run);
      cancelAnimationFrame(raf);
      if (source instanceof HTMLVideoElement) {
        if ("cancelVideoFrameCallback" in source)
          source.cancelVideoFrameCallback(handle);
        source.pause();
        source.remove();
      }
    });
  });

  return (
    <div ref={host} class={`sky ${props.class ?? ""}`} aria-hidden>
      <canvas ref={canvas} class="sky-canvas" />
      {props.lens && (
        <div
          class="sky-lens"
          style={{
            "--lx": `${props.lens.x * 100}%`,
            "--ly": `${props.lens.y * 100}%`,
            "--lr": `${props.lens.radius * 100}vmin`,
          }}
        >
          <canvas
            ref={(el) => soft.push(el)}
            class="sky-canvas sky-soft is-wide"
          />
          <canvas
            ref={(el) => soft.push(el)}
            class="sky-canvas sky-soft is-core"
          />
          <canvas
            ref={(el) => soft.push(el)}
            class="sky-canvas sky-soft is-heart"
          />
          <canvas
            ref={(el) => soft.push(el)}
            class="sky-canvas sky-soft is-deep"
          />
        </div>
      )}
    </div>
  );
}
