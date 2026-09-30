// PROTOTYPE: repaints the code trees with the backdrop's stipple. The trees are
// drawn off screen, their coverage is softened, and each pixel is thresholded
// against a fixed noise field into a dark ink, a lighter ink, or nothing.
// The noise stays
// put while the trees sway through it, the way the painting's grain does.

import type { Recolor } from "./invert";
import { draw, SCENE_H, SCENE_W, type Tree } from "./trees";

type Palette = { dark: number[]; light: number[] };

// Each tree takes its two inks from the painting where it stands, so it
// matches the shadows and foliage next to it at whatever distance that is.
// Near the front both come out black. Farther back the light ink is the mid
// blue the painted foliage there is dithered with.
function paletteAt(painting: ImageData, { spec }: Tree): Palette {
  const x0 = Math.max(0, Math.round(spec.x - spec.height * 0.35));
  const x1 = Math.min(SCENE_W, Math.round(spec.x + spec.height * 0.35));
  const y0 = Math.max(0, Math.round(spec.y - spec.height));
  // Only the crown. The brush around the base is darker than the tree.
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

function bounds(trees: Tree[]) {
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
  const x = Math.max(0, Math.floor(x0));
  const y = Math.max(0, Math.floor(y0));
  return {
    x,
    y,
    w: Math.min(SCENE_W, Math.ceil(x1)) - x,
    h: Math.min(SCENE_H, Math.ceil(y1)) - y,
  };
}

function band(trees: Tree[], { dark, light }: Palette) {
  const { x, y, w, h } = bounds(trees);
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const octx = off.getContext("2d", { willReadFrequently: true });
  if (!octx) throw new Error("no 2d context");

  const noise = new Float32Array(w * h).map(() => Math.random());
  const shade = new Float32Array(w * h).map(() => Math.random());
  const row = new Float32Array(w * h);
  const soft = new Float32Array(w * h);

  // putImageData replaces pixels, so each band lands on its own canvas and is
  // then composited over the bands behind it.
  const stage = document.createElement("canvas");
  stage.width = w;
  stage.height = h;
  const sctx = stage.getContext("2d");
  if (!sctx) throw new Error("no 2d context");

  return (ctx: CanvasRenderingContext2D, t: number, wind: number) => {
    octx.setTransform(1, 0, 0, 1, -x, -y);
    draw(octx, trees, t, wind);
    const frame = octx.getImageData(0, 0, w, h);
    const px = frame.data;

    // 3x3 box blur of coverage, split into a row pass and a column pass.
    for (let j = 0; j < h; j++) {
      const r = j * w;
      for (let i = 1; i < w - 1; i++) {
        const k = (r + i) * 4 + 3;
        row[r + i] = (px[k - 4] + px[k] + px[k + 4]) / 765;
      }
    }
    for (let j = 1; j < h - 1; j++) {
      for (let i = 0; i < w; i++) {
        const k = j * w + i;
        soft[k] = (row[k - w] + row[k] + row[k + w]) / 3;
      }
    }

    for (let k = 0; k < w * h; k++) {
      const a = soft[k];
      const n = noise[k];
      const p = k * 4;
      if (a > 0.2 + 0.5 * n) {
        // Dense cores go dark, thinner foliage breaks up into the light ink.
        const ink = a > 0.65 + 0.35 * shade[k] ? dark : light;
        px[p] = ink[0];
        px[p + 1] = ink[1];
        px[p + 2] = ink[2];
        px[p + 3] = 255;
      } else {
        px[p + 3] = 0;
      }
    }

    sctx.putImageData(frame, 0, 0);
    ctx.drawImage(stage, x, y);
  };
}

// Trees with the same palette share one dither pass. recolor maps the inks
// the same way the layers were mapped, if they were.
export function ditherer(
  trees: Tree[],
  painting: ImageData,
  recolor: Recolor = (rgb) => rgb,
) {
  const groups = new Map<string, { palette: Palette; members: Tree[] }>();
  for (const tree of trees) {
    const { dark, light } = paletteAt(painting, tree);
    const palette = { dark: recolor(dark), light: recolor(light) };
    const key = [...palette.dark, ...palette.light].join();
    const group = groups.get(key) ?? { palette, members: [] };
    group.members.push(tree);
    groups.set(key, group);
  }
  const bands = [...groups.values()].map((g) => band(g.members, g.palette));
  return (ctx: CanvasRenderingContext2D, t: number, wind: number) => {
    ctx.clearRect(0, 0, SCENE_W, SCENE_H);
    for (const paint of bands) paint(ctx, t, wind);
  };
}
