import { draw, SCENE_H, SCENE_W, type Tree } from "./trees";

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

function context(
  canvas: HTMLCanvasElement,
  settings?: CanvasRenderingContext2DSettings,
) {
  const ctx = canvas.getContext("2d", settings);
  if (!ctx) throw new Error("no 2d context");
  return ctx;
}

function band(trees: Tree[], { dark, light }: Palette) {
  const { x, y, w, h } = bounds(trees);
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const octx = context(off, { willReadFrequently: true });

  const noise = new Float32Array(w * h).map(() => Math.random());
  const shade = new Float32Array(w * h).map(() => Math.random());
  const row = new Float32Array(w * h);
  const soft = new Float32Array(w * h);

  const stage = document.createElement("canvas");
  stage.width = w;
  stage.height = h;
  const sctx = context(stage);

  return (ctx: CanvasRenderingContext2D, t: number, wind: number) => {
    octx.setTransform(1, 0, 0, 1, -x, -y);
    draw(octx, trees, t, wind);
    const frame = octx.getImageData(0, 0, w, h);
    const px = frame.data;

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
      const p = k * 4;
      if (a > 0.2 + 0.5 * noise[k]) {
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

export function ditherer(trees: Tree[], painting: ImageData) {
  const groups = new Map<string, { palette: Palette; members: Tree[] }>();
  for (const tree of trees) {
    const palette = paletteAt(painting, tree);
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
