import { useEffect, useRef } from "react";
import { LifeHash, LifeHashVersion } from "lifehash";

// A v2 LifeHash is a 32x32 grid of cells. The library's own PNG encoder mangles
// the output (noise at module_size 1, a tiled motif above it), so we read its raw
// color grid and paint it ourselves: nearest-neighbor up to a crisp backing
// buffer, which CSS then scales down to the display size.
const GRID = 32;
const SCALE = 8;

// The deterministic icon for a Wallet, rendered from its fingerprint with the
// Blockchain Commons LifeHash algorithm (CONTEXT.md). The same fingerprint always
// yields the same mark, so a Wallet stays recognizable across the app.
export function LifeHashIcon({
  fingerprint,
  className,
}: {
  fingerprint: string;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const { colors } = LifeHash.makeFrom(fingerprint, LifeHashVersion.version2);
    const cells = new ImageData(GRID, GRID);
    for (let i = 0; i < GRID * GRID; i++) {
      cells.data[i * 4] = colors[i * 3];
      cells.data[i * 4 + 1] = colors[i * 3 + 1];
      cells.data[i * 4 + 2] = colors[i * 3 + 2];
      cells.data[i * 4 + 3] = 255;
    }

    // putImageData ignores scaling, so stamp the grid at native size on a scratch
    // canvas and draw it up with smoothing off for square, even cells.
    const tile = document.createElement("canvas");
    tile.width = GRID;
    tile.height = GRID;
    const tileCtx = tile.getContext("2d");
    if (!tileCtx) return;
    tileCtx.putImageData(cells, 0, 0);

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tile, 0, 0, canvas.width, canvas.height);
  }, [fingerprint]);

  return (
    <canvas
      ref={ref}
      width={GRID * SCALE}
      height={GRID * SCALE}
      aria-hidden
      className={className}
    />
  );
}
