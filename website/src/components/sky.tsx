import { useEffect, useRef, type CSSProperties } from "react";
import {
  BAYER,
  BAYER8,
  SKY_LEVELS,
  skyPalette,
  smooth,
  toneCurve,
} from "../lib/dither";
import { reducedMotion } from "../lib/motion";
import "../styles/sky.css";

export type Vignette = { from: number; to: number; dim: number; sink: number };
export type Lens = { x: number; y: number; radius: number; power: number };

const SRC_W = 640;
const SRC_H = 360;
const SINK_STEPS = 16;
const SOFT = ["is-wide", "is-core", "is-heart", "is-deep"];

export function Sky({
  video,
  still,
  fallback,
  px = 3,
  band = 0.5,
  vignette,
  lens,
}: {
  video: string;
  still: string;
  fallback: string;
  px?: number;
  band?: number;
  vignette: Vignette;
  lens: Lens;
}) {
  const host = useRef<HTMLDivElement>(null);
  const sharp = useRef<HTMLCanvasElement>(null);
  const soft = useRef<(HTMLCanvasElement | null)[]>([]);

  useEffect(() => {
    const root = host.current;
    const canvas = sharp.current;
    const ctx = canvas?.getContext("2d");
    const small = document.createElement("canvas");
    const sctx = small.getContext("2d", { willReadFrequently: true });
    if (!root || !canvas || !ctx || !sctx) return;
    const copies = soft.current.filter((el) => el !== null);
    const palette = skyPalette();
    const curve = toneCurve();
    const top = SKY_LEVELS - 1;
    const sinkFrom = vignette.from + (vignette.to - vignette.from) * 0.3;

    let source: HTMLVideoElement | HTMLImageElement;
    if (reducedMotion()) {
      source = new Image();
      source.src = still;
    } else {
      source = document.createElement("video");
      source.muted = true;
      source.defaultMuted = true;
      source.autoplay = true;
      source.loop = true;
      source.playsInline = true;
      source.preload = "auto";
      source.className = "sky-source";
      source.src = video;
      root.append(source);
    }
    const film = source instanceof HTMLVideoElement ? source : null;

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
      const box = root.getBoundingClientRect();
      cols = Math.max(1, Math.ceil(box.width / px));
      rows = Math.max(1, Math.ceil(box.height / px));
      for (const el of [small, canvas, ...copies]) {
        el.width = cols;
        el.height = rows;
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
      const diag = Math.hypot(cols, rows);
      const lensX = lens.x * cols;
      const lensY = lens.y * rows;
      const lensR = lens.radius * Math.min(cols, rows);
      for (let y = 0; y < rows; y++) {
        const by = (y & 3) * 4;
        for (let x = 0; x < cols; x++) {
          const i = (y * cols + x) * 4;
          let pick = i;
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
          const p = Math.hypot(cols - x, y) / diag;
          const tone =
            curve[src[pick]] *
            (1 - vignette.dim * smooth(vignette.from, vignette.to, p));
          const sink = vignette.sink * smooth(sinkFrom, vignette.to, p);
          const gate = (BAYER8[((y & 7) << 3) | (x & 7)] + 0.5) / 64;
          const q = tone * top;
          const base = Math.floor(q);
          const threshold = (BAYER[by + (x & 3)] + 0.5) / 16;
          const [r, g, b] =
            palette[Math.min(top, base + (q - base > threshold ? 1 : 0))];
          dst[i] = r;
          dst[i + 1] = g;
          dst[i + 2] = b;
          dst[i + 3] =
            255 - Math.floor(sink * SINK_STEPS + gate) * (255 / SINK_STEPS);
        }
      }
      ctx.putImageData(out, 0, 0);
      for (const el of copies) el.getContext("2d")?.putImageData(out, 0, 0);
      root.dataset.live = "true";
    };

    const loop = () => {
      paint();
      if (!film) return;
      if ("requestVideoFrameCallback" in film)
        handle = film.requestVideoFrameCallback(loop);
      else raf = requestAnimationFrame(loop);
    };

    const resize = new ResizeObserver(() => {
      size();
      paint();
    });
    resize.observe(root);

    const run = () => {
      if (!film) return;
      if (document.visibilityState === "visible") film.play().catch(() => {});
      else film.pause();
    };

    if (film) {
      document.addEventListener("visibilitychange", run);
      addEventListener("pointerup", run, { once: true });
      run();
      loop();
    } else {
      source.addEventListener("load", paint);
    }

    return () => {
      resize.disconnect();
      document.removeEventListener("visibilitychange", run);
      cancelAnimationFrame(raf);
      source.removeEventListener("load", paint);
      if (!film) return;
      removeEventListener("pointerup", run);
      if ("cancelVideoFrameCallback" in film)
        film.cancelVideoFrameCallback(handle);
      film.pause();
      film.remove();
    };
  }, [video, still, px, band, vignette, lens]);

  const place = {
    "--lx": `${lens.x * 100}%`,
    "--ly": `${lens.y * 100}%`,
    "--lr": `${lens.radius * 100}vmin`,
  } as CSSProperties;

  return (
    <div ref={host} className="sky" aria-hidden>
      <img className="sky-fallback" src={fallback} alt="" />
      <canvas ref={sharp} className="sky-canvas" />
      <div className="sky-lens" style={place}>
        {SOFT.map((name, i) => (
          <canvas
            key={name}
            ref={(el) => {
              soft.current[i] = el;
            }}
            className={`sky-canvas sky-soft ${name}`}
          />
        ))}
      </div>
    </div>
  );
}
