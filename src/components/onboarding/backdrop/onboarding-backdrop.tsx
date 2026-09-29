import { useEffect, useRef } from "react";
import sky from "./layers/sky.webp";
import far from "./layers/far.webp";
import near from "./layers/near.webp";
import water from "./layers/water.webp";
import house from "./layers/house.webp";
import ground from "./layers/ground.webp";
import { SCENE_W } from "./trees";
import type { TreesMessage } from "./trees.worker";
import "./onboarding-backdrop.css";

const LAYERS = [sky, far, near, water, house, ground];
const BLUR = 12;

// A worker draws the trees into a transferred canvas, blurred to match the
// layers, so nothing here runs per frame.
function Trees() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const canvas = document.createElement("canvas");
    canvas.className = "size-full";
    el.append(canvas);
    const worker = new Worker(new URL("./trees.worker.ts", import.meta.url), {
      type: "module",
    });
    const send = (msg: TreesMessage, transfer: Transferable[] = []) =>
      worker.postMessage(msg, transfer);

    const offscreen = canvas.transferControlToOffscreen();
    send(
      {
        canvas: offscreen,
        still: matchMedia("(prefers-reduced-motion: reduce)").matches,
      },
      [offscreen],
    );

    const resize = new ResizeObserver(([entry]) =>
      send({ blur: (BLUR * SCENE_W) / entry.contentRect.width }),
    );
    resize.observe(canvas);

    const run = () =>
      send({
        run: document.visibilityState === "visible" && document.hasFocus(),
      });
    run();
    addEventListener("focus", run);
    addEventListener("blur", run);
    document.addEventListener("visibilitychange", run);

    return () => {
      worker.terminate();
      resize.disconnect();
      removeEventListener("focus", run);
      removeEventListener("blur", run);
      document.removeEventListener("visibilitychange", run);
      canvas.remove();
    };
  }, []);

  return <div ref={host} className="absolute inset-0" />;
}

export function OnboardingBackdrop({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`onboarding-backdrop pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`}
    >
      <div className="onboarding-backdrop-stage absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="absolute inset-0" style={{ filter: `blur(${BLUR}px)` }}>
          {LAYERS.map((src) => (
            <img
              key={src}
              src={src}
              alt=""
              draggable={false}
              className="absolute inset-0 size-full"
            />
          ))}
        </div>
        <Trees />
      </div>
    </div>
  );
}
