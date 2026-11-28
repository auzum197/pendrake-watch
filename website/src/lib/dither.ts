export type Rgb = [number, number, number];

export const SKY_STOPS: Rgb[] = [
  [3, 14, 54],
  [9, 44, 139],
  [39, 104, 219],
  [237, 245, 255],
];

export const SKY_LEVELS = 6;

export const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

export const BAYER8 = Array.from({ length: 64 }, (_, i) => {
  const x = i & 7;
  const y = i >> 3;
  return (
    BAYER[((y & 3) << 2) | (x & 3)] * 4 + BAYER[((y >> 2) << 2) | (x >> 2)] / 4
  );
});

export function skyPalette(levels = SKY_LEVELS): Rgb[] {
  return Array.from({ length: levels }, (_, i) => {
    const seg = (i / (levels - 1)) * (SKY_STOPS.length - 1);
    const k = Math.min(SKY_STOPS.length - 2, Math.floor(seg));
    const f = seg - k;
    const a = SKY_STOPS[k];
    const b = SKY_STOPS[k + 1];
    return [0, 1, 2].map((c) => Math.round(a[c] + (b[c] - a[c]) * f)) as Rgb;
  });
}

export function toneCurve(strength = 4, mid = 0.5, gamma = 0.8) {
  const s = (x: number) => 1 / (1 + Math.exp(strength * (mid - x)));
  const lo = s(0);
  const hi = s(1);
  return Float32Array.from({ length: 256 }, (_, i) => {
    const contrast = (s(i / 255) - lo) / (hi - lo);
    return Math.pow(contrast, 1 / gamma);
  });
}

export const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
