import { onCleanup, onMount, type JSX } from "solid-js";
import { LifeHash, LifeHashVersion } from "lifehash";
import appIcon from "@/assets/app-icon.png";

export const reducedMotion = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches;

export function every(ms: number, fn: () => void, after = ms) {
  onMount(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    const timer = setTimeout(() => {
      fn();
      interval = setInterval(fn, ms);
    }, after);
    onCleanup(() => {
      clearTimeout(timer);
      clearInterval(interval);
    });
  });
}

export function AppIcon(props: { class?: string }) {
  return <img src={appIcon} alt="" draggable={false} class={props.class} />;
}

export function Notice(props: {
  title: string;
  body?: string;
  time?: string;
  class?: string;
  style?: JSX.CSSProperties;
  ref?: (el: HTMLDivElement) => void;
}) {
  return (
    <div
      ref={props.ref}
      class={`notice relative ${props.class ?? ""}`}
      style={props.style}
      role="status"
    >
      <div class="notice-icon">
        <img src={appIcon} alt="" draggable={false} />
      </div>
      <div class="min-w-0">
        <div class="notice-app">Pendrake Watch</div>
        <div class="notice-title">{props.title}</div>
        <div class="notice-body">{props.body ?? "Confirmed"}</div>
      </div>
      <span class="notice-time">{props.time ?? "now"}</span>
    </div>
  );
}

const GRID = 32;

export function LifeHashIcon(props: {
  fingerprint: string;
  size: number;
  class?: string;
}) {
  let canvas!: HTMLCanvasElement;

  onMount(() => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { colors } = LifeHash.makeFrom(
      props.fingerprint,
      LifeHashVersion.version2,
    );
    const cells = new ImageData(GRID, GRID);
    for (let i = 0; i < GRID * GRID; i++) {
      cells.data[i * 4] = colors[i * 3];
      cells.data[i * 4 + 1] = colors[i * 3 + 1];
      cells.data[i * 4 + 2] = colors[i * 3 + 2];
      cells.data[i * 4 + 3] = 255;
    }
    const tile = document.createElement("canvas");
    tile.width = GRID;
    tile.height = GRID;
    tile.getContext("2d")!.putImageData(cells, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tile, 0, 0, canvas.width, canvas.height);
  });

  return (
    <canvas
      ref={canvas}
      width={GRID * 8}
      height={GRID * 8}
      aria-hidden
      class={props.class}
      style={{ width: `${props.size}px`, height: `${props.size}px` }}
    />
  );
}
