import type { CSSProperties } from "react";
import { type Rgb, rgba } from "./palette";

export type DitherVariant = "gradient" | "dotted" | "hatched" | "solid";
export type Bloom = "off" | "low" | "high" | "aura";

export const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((row) => row.map((v) => (v + 0.5) / 16));

const OFF_TIER = 0.4;
const EDGE_ALPHA = 0.72;

export const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

export function paintColumn(
  ctx: CanvasRenderingContext2D,
  x: number,
  top: number,
  floor: number,
  ink: Rgb,
  variant: DitherVariant,
  intensity: number,
) {
  const t = Math.round(top);
  const f = Math.round(floor);
  const depth = f - t;
  if (depth <= 0) {
    ctx.fillStyle = rgba(ink, EDGE_ALPHA);
    ctx.fillRect(x, t, 1, 1);
    return;
  }
  const bias = variant === "dotted" ? 0.12 : 0;
  for (let y = t; y < f; y++) {
    const density = (y - t) / depth;
    if (variant === "hatched" && ((x + y) & 3) >= 2) continue;
    const lit =
      variant === "solid" ||
      density > BAYER4[y & 3][x & 3] - 0.1 * intensity - bias;
    if (variant === "dotted" && !lit) continue;
    const k = (0.3 + density * 0.7) * (1 + 0.22 * intensity);
    ctx.fillStyle = rgba(ink, clamp01(lit ? k : k * OFF_TIER));
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.fillStyle = rgba(ink, EDGE_ALPHA);
  ctx.fillRect(x, t, 1, 1);
  if (depth > 1) {
    ctx.fillStyle = rgba(ink, EDGE_ALPHA * 0.5);
    ctx.fillRect(x, t + 1, 1, 1);
  }
}

const BLOOM: Record<
  Exclude<Bloom, "off">,
  { blur: number; brightness: number; opacity: number; saturate: number }
> = {
  low: { blur: 3, brightness: 1.35, opacity: 0.7, saturate: 1.4 },
  high: { blur: 5, brightness: 1.5, opacity: 0.78, saturate: 1.5 },
  aura: { blur: 15, brightness: 2.9, opacity: 0.1, saturate: 3 },
};

export function bloomStyle(bloom: Bloom): CSSProperties {
  if (bloom === "off") return { opacity: 0 };
  const cfg = BLOOM[bloom];
  return {
    filter: `blur(${cfg.blur}px) brightness(${cfg.brightness}) saturate(${cfg.saturate})`,
    opacity: cfg.opacity,
    mixBlendMode: "plus-lighter",
  };
}

export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
