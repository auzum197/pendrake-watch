import { useEffect, useRef } from "react";
import {
  BAYER,
  BAYER8,
  SKY_LEVELS,
  skyPalette,
  toneCurve,
} from "../lib/dither";

export type FillState = { level: number; fade: number };
export type FillPainter = (state: FillState) => void;

const EDGE = 0.4;

export function DitherFill({
  src,
  cell = 2,
  className,
  onReady,
}: {
  src: string;
  cell?: number;
  className?: string;
  onReady: (paint: FillPainter) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const palette = skyPalette();
    const curve = toneCurve();
    const box = el.getBoundingClientRect();
    const cols = Math.max(1, Math.ceil(box.width / cell));
    const rows = Math.max(1, Math.ceil(box.height / cell));
    el.width = cols;
    el.height = rows;
    const out = ctx.createImageData(cols, rows);
    let ready = false;
    let last: FillState = { level: 0, fade: 0 };

    const paint: FillPainter = (state) => {
      last = state;
      if (!ready) return;
      const reach = state.level * (1 + EDGE);
      const keep = 1 - state.fade;
      for (let y = 0; y < rows; y++) {
        const depth = 1 - (y + 0.5) / rows;
        const cover = Math.min(1, Math.max(0, (reach - depth) / EDGE));
        for (let x = 0; x < cols; x++) {
          const rise = (BAYER8[((y & 7) << 3) | (x & 7)] + 0.5) / 64;
          const drop = (BAYER[(((y + 1) & 3) << 2) | ((x + 2) & 3)] + 0.5) / 16;
          out.data[(y * cols + x) * 4 + 3] =
            cover > rise && keep > drop ? 255 : 0;
        }
      }
      ctx.putImageData(out, 0, 0);
    };

    const img = new Image();
    img.onload = () => {
      const scale = Math.max(cols / img.naturalWidth, rows / img.naturalHeight);
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      ctx.drawImage(img, (cols - w) / 2, (rows - h) * 0.66, w, h);
      const source = ctx.getImageData(0, 0, cols, rows).data;
      const top = SKY_LEVELS - 1;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = (y * cols + x) * 4;
          const q = curve[source[i]] * top;
          const base = Math.floor(q);
          const threshold = (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
          const [r, g, b] =
            palette[Math.min(top, base + (q - base > threshold ? 1 : 0))];
          out.data[i] = r;
          out.data[i + 1] = g;
          out.data[i + 2] = b;
        }
      }
      ready = true;
      paint(last);
    };
    img.src = src;

    onReady(paint);
    return () => {
      img.onload = null;
    };
  }, [src, cell, onReady]);

  return <canvas ref={canvas} className={className} aria-hidden />;
}
