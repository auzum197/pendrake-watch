import { useEffect, useRef } from "react";
import painting from "@/assets/onboarding-backdrop.jpg";
import sky from "./layers/sky.webp";
import far from "./layers/far.webp";
import near from "./layers/near.webp";
import water from "./layers/water.webp";
import house from "./layers/house.webp";
import ground from "./layers/ground.webp";
import { ditherer } from "./dither";
import { GROVE, plant, SCENE_H, SCENE_W } from "./trees";
import "./onboarding-backdrop.css";

const LAYERS = [sky, far, near, water, house, ground];
const WIND = 1.5;

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

function Trees() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    let frame = 0;
    let stopped = false;
    void paintingPixels().then((pixels) => {
      if (stopped) return;
      const paint = ditherer(grove, pixels);
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
        paint(ctx, 0, 0);
        return;
      }
      frame = requestAnimationFrame(function tick(now) {
        paint(ctx, now / 1000, WIND);
        frame = requestAnimationFrame(tick);
      });
    });
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      width={SCENE_W}
      height={SCENE_H}
      className="absolute inset-0 size-full"
    />
  );
}

export function OnboardingBackdrop({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`onboarding-backdrop pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`}
    >
      <div className="onboarding-backdrop-stage absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        {LAYERS.map((src) => (
          <img
            key={src}
            src={src}
            alt=""
            draggable={false}
            className="absolute inset-0 size-full"
          />
        ))}
        <Trees />
      </div>
    </div>
  );
}
