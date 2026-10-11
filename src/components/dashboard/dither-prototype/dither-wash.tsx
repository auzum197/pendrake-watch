import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { BAYER4, type Bloom, bloomStyle } from "../dither/dither-paint";
import { type Rgb, rgba } from "../dither/palette";

export type WashDirection = "up" | "down" | "left" | "right";

const MAX_COLS = 960;
const MAX_ROWS = 600;

function paintWash(
  canvas: HTMLCanvasElement,
  bloom: HTMLCanvasElement,
  width: number,
  height: number,
  ink: Rgb,
  to: Rgb | null,
  direction: WashDirection,
  cell: number,
  opacity: number,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx || width <= 0 || height <= 0) return;
  const cols = Math.min(MAX_COLS, Math.max(4, Math.round(width / cell)));
  const rows = Math.min(MAX_ROWS, Math.max(4, Math.round(height / cell)));
  canvas.width = cols;
  canvas.height = rows;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const t =
        direction === "up"
          ? 1 - (y + 0.5) / rows
          : direction === "down"
            ? (y + 0.5) / rows
            : direction === "left"
              ? 1 - (x + 0.5) / cols
              : (x + 0.5) / cols;
      const density = 1 - t;
      const lit = density > BAYER4[y & 3][x & 3];
      if (to) {
        ctx.fillStyle = rgba(lit ? ink : to, opacity);
        ctx.fillRect(x, y, 1, 1);
      } else {
        const alpha = (lit ? 0.35 + 0.65 * density : 0.12 * density) * opacity;
        if (alpha <= 0.004) continue;
        ctx.fillStyle = rgba(ink, alpha);
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  const bctx = bloom.getContext("2d");
  if (!bctx) return;
  bloom.width = cols;
  bloom.height = rows;
  bctx.drawImage(canvas, 0, 0);
}

export function DitherWash({
  ink,
  to = null,
  direction = "up",
  cell = 3,
  opacity = 1,
  bloom = "off",
  className,
}: {
  ink: Rgb;
  to?: Rgb | null;
  direction?: WashDirection;
  cell?: number;
  opacity?: number;
  bloom?: Bloom;
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bloomRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const bloomCanvas = bloomRef.current;
    if (!wrap || !canvas || !bloomCanvas) return;
    const paint = () => {
      const box = wrap.getBoundingClientRect();
      paintWash(
        canvas,
        bloomCanvas,
        box.width,
        box.height,
        ink,
        to,
        direction,
        cell,
        opacity,
      );
    };
    paint();
    const ro = new ResizeObserver(paint);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [ink, to, direction, cell, opacity]);

  return (
    <div
      ref={wrapRef}
      aria-hidden
      className={cn(
        "dither-plot pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      <canvas ref={canvasRef} className="dither-crisp" />
      <canvas ref={bloomRef} style={bloomStyle(bloom)} />
    </div>
  );
}
