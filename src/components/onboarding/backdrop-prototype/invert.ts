// PROTOTYPE: inverts the scene by brightness rank while keeping the painting's
// own colours. A pixel as bright as the q-th quantile of the painting takes the
// most common painting colour at the (1 - q)-th quantile, so the dark frame
// turns bright, the glowing valley turns dark, and every tone still comes from
// the palette.

export type Recolor = (rgb: number[]) => number[];

const luma = (r: number, g: number, b: number) =>
  Math.round(0.299 * r + 0.587 * g + 0.114 * b);

export function inversion(painting: ImageData): Recolor {
  const px = painting.data;
  const counts = new Uint32Array(256);
  const colours = Array.from({ length: 256 }, () => new Map<number, number>());
  for (let p = 0; p < px.length; p += 4) {
    const l = luma(px[p], px[p + 1], px[p + 2]);
    counts[l]++;
    const key = (px[p] << 16) | (px[p + 1] << 8) | px[p + 2];
    colours[l].set(key, (colours[l].get(key) ?? 0) + 1);
  }

  const total = px.length / 4;
  const below = new Uint32Array(257);
  for (let l = 0; l < 256; l++) below[l + 1] = below[l] + counts[l];

  const common = colours.map((m) => {
    let best = -1;
    let most = 0;
    for (const [key, n] of m) {
      if (n > most) {
        most = n;
        best = key;
      }
    }
    return best;
  });

  const table = Array.from({ length: 256 }, (_, l) => {
    const q = (below[l] + below[l + 1]) / 2 / total;
    const target = total * (1 - q);
    let t = 0;
    while (t < 255 && (below[t + 1] < target || common[t] < 0)) t++;
    while (common[t] < 0) t--;
    const key = common[t];
    return [(key >> 16) & 255, (key >> 8) & 255, key & 255];
  });

  return ([r, g, b]) => table[luma(r, g, b)];
}

export async function recolorImage(src: string, recolor: Recolor) {
  const img = new Image();
  img.src = src;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  ctx.drawImage(img, 0, 0);
  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = frame.data;
  for (let p = 0; p < px.length; p += 4) {
    if (px[p + 3] === 0) continue;
    const [r, g, b] = recolor([px[p], px[p + 1], px[p + 2]]);
    px[p] = r;
    px[p + 1] = g;
    px[p + 2] = b;
  }
  ctx.putImageData(frame, 0, 0);
  return canvas.toDataURL();
}
