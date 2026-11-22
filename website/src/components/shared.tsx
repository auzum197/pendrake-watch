import { LifeHash, LifeHashVersion } from "lifehash";
import { useEffect, useRef, type Ref } from "react";
import appIcon from "@/assets/app-icon.png?url";

export function AppIcon({ className }: { className?: string }) {
  return <img src={appIcon} alt="" draggable={false} className={className} />;
}

export function Notice({
  title,
  body,
  className,
  ref,
}: {
  title: string;
  body: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}) {
  return (
    <div
      ref={ref}
      className={`notice relative ${className ?? ""}`}
      role="status"
    >
      <div className="notice-icon">
        <img src={appIcon} alt="" draggable={false} />
      </div>
      <div className="min-w-0">
        <div className="notice-app">Pendrake Watch</div>
        <div className="notice-title">{title}</div>
        <div className="notice-body">{body}</div>
      </div>
      <span className="notice-time">now</span>
    </div>
  );
}

const GRID = 32;

export function LifeHashIcon({
  fingerprint,
  size,
  className,
}: {
  fingerprint: string;
  size: number;
  className?: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    const { colors } = LifeHash.makeFrom(fingerprint, LifeHashVersion.version2);
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
    tile.getContext("2d")?.putImageData(cells, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tile, 0, 0, ctx.canvas.width, ctx.canvas.height);
  }, [fingerprint]);

  return (
    <canvas
      ref={canvas}
      width={GRID * 8}
      height={GRID * 8}
      aria-hidden
      className={className}
      style={{ width: size, height: size }}
    />
  );
}
