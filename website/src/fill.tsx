import { onCleanup, onMount } from "solid-js";
import { BAYER, BAYER8, skyPalette, toneCurve } from "./sky";

export type FillState = { level: number; fade: number };

const CELL = 2;
const LEVELS = 6;
const EDGE = 0.4;

export function DitherFill(props: {
  class?: string;
  cell?: number;
  ref?: (paint: (state: FillState) => void) => void;
}) {
  let canvas!: HTMLCanvasElement;

  onMount(() => {
    const ctx = canvas.getContext("2d")!;
    const palette = skyPalette(LEVELS);
    const curve = toneCurve(4, 0.5, 0.8);
    const box = canvas.getBoundingClientRect();
    const cell = props.cell ?? CELL;
    const cols = Math.max(1, Math.ceil(box.width / cell));
    const rows = Math.max(1, Math.ceil(box.height / cell));
    canvas.width = cols;
    canvas.height = rows;
    const out = ctx.createImageData(cols, rows);
    let ready = false;
    let last: FillState = { level: 0, fade: 0 };

    const paint = (state: FillState) => {
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
    img.src = "/sky-still.png";
    img.onload = () => {
      const scale = Math.max(cols / img.naturalWidth, rows / img.naturalHeight);
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      ctx.drawImage(img, (cols - w) / 2, (rows - h) * 0.66, w, h);
      const src = ctx.getImageData(0, 0, cols, rows).data;
      const top = LEVELS - 1;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = (y * cols + x) * 4;
          const q = curve[src[i]] * top;
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

    props.ref?.(paint);
    onCleanup(() => {
      img.onload = null;
    });
  });

  return <canvas ref={canvas} class={props.class} aria-hidden />;
}
