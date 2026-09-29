import painting from "@/assets/onboarding-backdrop.jpg";
import { INK_H, INK_W, inker } from "./ink";
import { context, GROVE, plant, SCENE_H, SCENE_W } from "./trees";

// blur is the CSS blur radius converted to scene pixels
export type TreesMessage =
  | { canvas: OffscreenCanvas; still: boolean }
  | { blur: number }
  | { run: boolean };

const WIND = 1.5;
const FRAME = 1000 / 15;

async function pixels() {
  const bitmap = await createImageBitmap(await (await fetch(painting)).blob());
  const ctx = context(new OffscreenCanvas(SCENE_W, SCENE_H), {
    willReadFrequently: true,
  });
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return ctx.getImageData(0, 0, SCENE_W, SCENE_H);
}

async function start(canvas: OffscreenCanvas, still: boolean) {
  canvas.width = INK_W;
  canvas.height = INK_H;
  const ctx = context(canvas);
  const ink = inker(GROVE.map(plant), await pixels());
  const wind = still ? 0 : WIND;
  let clock = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const paint = () => ink.paint(ctx, clock / 1000, wind);
  const tick = () => {
    clock += FRAME;
    paint();
    timer = setTimeout(tick, FRAME);
  };

  return {
    blur(sigma: number) {
      ink.blur(sigma);
      paint();
    },
    run(on: boolean) {
      clearTimeout(timer);
      timer = on && !still ? setTimeout(tick, FRAME) : undefined;
    },
  };
}

let scene: ReturnType<typeof start>;

addEventListener("message", async ({ data }: MessageEvent<TreesMessage>) => {
  if ("canvas" in data) {
    scene = start(data.canvas, data.still);
    return;
  }
  const trees = await scene;
  if ("blur" in data) trees.blur(data.blur);
  else trees.run(data.run);
});
