import {
  context,
  draw,
  SCENE_H,
  SCENE_W,
  twigs,
  type Ctx,
  type Tree,
} from "./trees";

export const SCALE = 1 / 6;
export const INK_W = Math.ceil(SCENE_W * SCALE);
export const INK_H = Math.ceil(SCENE_H * SCALE);

type Palette = { dark: number[]; light: number[] };

function paletteAt(painting: ImageData, { spec }: Tree): Palette {
  const x0 = Math.max(0, Math.round(spec.x - spec.height * 0.35));
  const x1 = Math.min(SCENE_W, Math.round(spec.x + spec.height * 0.35));
  const y0 = Math.max(0, Math.round(spec.y - spec.height));
  const y1 = Math.min(SCENE_H, Math.round(spec.y - spec.height * 0.4));
  const px = painting.data;
  const samples: number[][] = [];
  for (let j = y0; j < y1; j++) {
    for (let i = x0; i < x1; i++) {
      const p = (j * SCENE_W + i) * 4;
      samples.push([px[p], px[p + 1], px[p + 2]]);
    }
  }
  samples.sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
  const at = (q: number) => samples[Math.floor(samples.length * q)];
  return { dark: at(0.03), light: at(0.2) };
}

function bounds(trees: Tree[], pad: number) {
  let x0 = SCENE_W;
  let y0 = SCENE_H;
  let x1 = 0;
  let y1 = 0;
  for (const { spec } of trees) {
    x0 = Math.min(x0, spec.x - spec.height * 0.7);
    x1 = Math.max(x1, spec.x + spec.height * 0.7);
    y0 = Math.min(y0, spec.y - spec.height * 1.15);
    y1 = Math.max(y1, spec.y + 4);
  }
  const x = Math.max(0, Math.floor((x0 - pad) * SCALE));
  const y = Math.max(0, Math.floor((y0 - pad) * SCALE));
  return {
    x,
    y,
    w: Math.min(INK_W, Math.ceil((x1 + pad) * SCALE)) - x,
    h: Math.min(INK_H, Math.ceil((y1 + pad) * SCALE)) - y,
  };
}

function boxes(sigma: number) {
  let lo = Math.floor(Math.sqrt(4 * sigma * sigma + 1));
  if (lo % 2 === 0) lo--;
  const m = Math.round(
    (12 * sigma * sigma - 3 * lo * lo - 12 * lo - 9) / (-4 * lo - 4),
  );
  return [0, 1, 2].map((i) => ((i < m ? lo : lo + 2) - 1) / 2);
}

function box(
  src: Float32Array,
  dst: Float32Array,
  len: number,
  lines: number,
  step: number,
  stride: number,
  r: number,
) {
  for (let l = 0; l < lines; l++) {
    const o = l * stride;
    let sum = 0;
    for (let i = 0; i < Math.min(r, len); i++) sum += src[o + i * step];
    for (let i = 0; i < len; i++) {
      if (i + r < len) sum += src[o + (i + r) * step];
      dst[o + i * step] = sum / (2 * r + 1);
      if (i >= r) sum -= src[o + (i - r) * step];
    }
  }
}

const ramp = (a: number, lo: number, hi: number) =>
  Math.min(1, Math.max(0, (a - lo) / (hi - lo)));

function band(
  trees: Tree[],
  { dark, light }: Palette,
  sprites: ReturnType<typeof twigs>,
  sigma: number,
) {
  const { x, y, w, h } = bounds(trees, sigma * 3);
  const bctx = context(new OffscreenCanvas(w, h), { willReadFrequently: true });
  const deep = new Float32Array(w * h);
  const pale = new Float32Array(w * h);
  const tmp = new Float32Array(w * h);
  const radii = boxes(sigma * SCALE);

  return (ctx: Ctx, t: number, wind: number) => {
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.clearRect(0, 0, w, h);
    bctx.setTransform(SCALE, 0, 0, SCALE, -x, -y);
    draw(bctx, trees, sprites, t, wind);
    const frame = bctx.getImageData(0, 0, w, h);
    const px = frame.data;

    for (let k = 0; k < w * h; k++) {
      const a = px[k * 4 + 3] / 255;
      const cover = ramp(a, 0, 0.25);
      deep[k] = cover * ramp(a, 0.2, 0.6);
      pale[k] = cover - deep[k];
    }
    for (const plane of [deep, pale]) {
      for (const r of radii) {
        box(plane, tmp, w, h, 1, w, r);
        box(tmp, plane, h, w, w, 1, r);
      }
    }
    for (let k = 0; k < w * h; k++) {
      const a = deep[k] + pale[k];
      const p = k * 4;
      if (a > 0) {
        px[p] = (deep[k] * dark[0] + pale[k] * light[0]) / a;
        px[p + 1] = (deep[k] * dark[1] + pale[k] * light[1]) / a;
        px[p + 2] = (deep[k] * dark[2] + pale[k] * light[2]) / a;
      }
      px[p + 3] = a * 255;
    }

    bctx.putImageData(frame, 0, 0);
    ctx.drawImage(bctx.canvas, x, y);
  };
}

export function inker(trees: Tree[], painting: ImageData) {
  const groups = new Map<string, { palette: Palette; members: Tree[] }>();
  for (const tree of trees) {
    const palette = paletteAt(painting, tree);
    const key = [...palette.dark, ...palette.light].join();
    const group = groups.get(key) ?? { palette, members: [] };
    group.members.push(tree);
    groups.set(key, group);
  }
  const sprites = twigs(trees, SCALE);
  let bands: ReturnType<typeof band>[] = [];
  return {
    blur(sigma: number) {
      bands = [...groups.values()].map((g) =>
        band(g.members, g.palette, sprites, sigma),
      );
    },
    paint(ctx: Ctx, t: number, wind: number) {
      ctx.clearRect(0, 0, INK_W, INK_H);
      for (const paint of bands) paint(ctx, t, wind);
    },
  };
}
