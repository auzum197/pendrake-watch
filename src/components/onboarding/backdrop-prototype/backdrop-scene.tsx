// PROTOTYPE: the onboarding backdrop rebuilt from separated layers
// (split-layers.py) with the trees drawn in code and moving in the wind.

import { useEffect, useRef, useState } from "react";
import painting from "@/assets/onboarding-backdrop.jpg";
import sky from "./layers/sky.webp";
import far from "./layers/far.webp";
import near from "./layers/near.webp";
import water from "./layers/water.webp";
import house from "./layers/house.webp";
import ground from "./layers/ground.webp";
import "./backdrop-prototype.css";
import { ditherer } from "./dither";
import { inversion, recolorImage } from "./invert";
import { draw, GROVE, plant, SCENE_H, SCENE_W } from "./trees";

export const LAYERS = [
  { name: "sky", src: sky },
  { name: "far", src: far },
  { name: "near", src: near },
  { name: "water", src: water },
  { name: "house", src: house },
  { name: "ground", src: ground },
] as const;

export type LayerName = (typeof LAYERS)[number]["name"];

const grove = GROVE.map(plant);

let pixels: Promise<ImageData> | undefined;

function paintingPixels() {
  pixels ??= (async () => {
    const img = new Image();
    img.src = painting;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = SCENE_W;
    canvas.height = SCENE_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.drawImage(img, 0, 0);
    return ctx.getImageData(0, 0, SCENE_W, SCENE_H);
  })();
  return pixels;
}

export function TreeCanvas({
  wind,
  dither = false,
  inverted = false,
  className,
}: {
  wind: number;
  dither?: boolean;
  inverted?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    let frame = 0;
    let stopped = false;
    const start = async () => {
      const pixels = await paintingPixels();
      const paint = dither
        ? ditherer(grove, pixels, inverted ? inversion(pixels) : undefined)
        : (c: CanvasRenderingContext2D, t: number, w: number) =>
            draw(c, grove, t, w);
      if (stopped) return;
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
        paint(ctx, 0, 0);
        return;
      }
      frame = requestAnimationFrame(function tick(now) {
        paint(ctx, now / 1000, wind);
        frame = requestAnimationFrame(tick);
      });
    };
    void start();
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
    };
  }, [wind, dither, inverted]);

  return (
    <canvas ref={ref} width={SCENE_W} height={SCENE_H} className={className} />
  );
}

export function BackdropScene({
  wind = 1,
  hidden = [],
  trees = true,
  dither = false,
  inverted = false,
}: {
  wind?: number;
  hidden?: LayerName[];
  trees?: boolean;
  dither?: boolean;
  // Every colour swaps places with its opposite by brightness rank, so the
  // dark frame turns bright and the valley dark, with the painting's palette.
  inverted?: boolean;
}) {
  const [recolored, setRecolored] = useState<Record<string, string>>();

  useEffect(() => {
    if (!inverted) return;
    let stopped = false;
    void (async () => {
      const recolor = inversion(await paintingPixels());
      const srcs = await Promise.all(
        LAYERS.map((l) => recolorImage(l.src, recolor)),
      );
      if (!stopped)
        setRecolored(
          Object.fromEntries(LAYERS.map((l, i) => [l.name, srcs[i]])),
        );
    })();
    return () => {
      stopped = true;
    };
  }, [inverted]);

  const layers = inverted
    ? recolored
      ? LAYERS.map((l) => ({ ...l, src: recolored[l.name] }))
      : []
    : LAYERS;

  return (
    <div className="fixed inset-0 overflow-hidden backdrop-viewport bg-black">
      <div className="backdrop-stage absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        {layers
          .filter((l) => !hidden.includes(l.name))
          .map((l) => (
            <img
              key={l.name}
              src={l.src}
              alt=""
              className="absolute inset-0 size-full"
            />
          ))}
        {trees && (
          <TreeCanvas
            wind={wind}
            dither={dither}
            inverted={inverted}
            className="absolute inset-0 size-full"
          />
        )}
      </div>
    </div>
  );
}
