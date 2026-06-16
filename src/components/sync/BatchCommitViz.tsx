import { useMemo } from "react";
import "./sync-viz.css";

// One committing (or waiting) batch as a mini note-commitment tree. While waiting,
// the batch's scanned outputs sit parked above the tree. While committing, they
// drop into the frontier leaf left-to-right as the leaves fill.

const LEAVES = 8;
const LEVELS = 4;
const W = 200;
const H = 78;
const PAD_X = 12;
const PAD_TOP = 10;
const PAD_BOTTOM = 12;

type Node = { x: number; y: number };

function layout(): Node[][] {
  const rowGap = (H - PAD_TOP - PAD_BOTTOM) / (LEVELS - 1);
  const leafGap = (W - 2 * PAD_X) / (LEAVES - 1);
  const rows: Node[][] = [];
  for (let level = 0; level < LEVELS; level++) {
    const count = LEAVES >> level;
    const y = H - PAD_BOTTOM - level * rowGap;
    const row: Node[] = [];
    for (let i = 0; i < count; i++) {
      const x =
        level === 0
          ? PAD_X + i * leafGap
          : (rows[level - 1][i * 2].x + rows[level - 1][i * 2 + 1].x) / 2;
      row.push({ x, y });
    }
    rows.push(row);
  }
  return rows;
}

export function BatchCommitViz({
  committing,
  frac,
}: {
  committing: boolean;
  frac: number;
}) {
  const rows = useMemo(layout, []);
  const filled = committing
    ? Math.max(0, Math.min(LEAVES, Math.round(frac * LEAVES)))
    : 0;
  const dropIdx = Math.min(filled, LEAVES - 1);
  const dropLeftPct = (rows[0][dropIdx].x / W) * 100;
  const leafTopPct = ((H - PAD_BOTTOM) / H) * 100;

  const covered = (level: number, index: number) =>
    ((index + 1) << level) <= filled;

  const edges: { x1: number; y1: number; x2: number; y2: number; on: boolean }[] = [];
  for (let level = 1; level < LEVELS; level++) {
    rows[level].forEach((node, index) => {
      for (const c of [index * 2, index * 2 + 1]) {
        const child = rows[level - 1][c];
        edges.push({
          x1: node.x,
          y1: node.y,
          x2: child.x,
          y2: child.y,
          on: covered(level, index) && covered(level - 1, c),
        });
      }
    });
  }

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden>
        {edges.map((e, i) => (
          <line
            key={`e${i}`}
            x1={e.x1}
            y1={e.y1}
            x2={e.x2}
            y2={e.y2}
            className={e.on ? "text-violet-500 opacity-70" : "text-border opacity-50"}
            stroke="currentColor"
            strokeWidth={1}
          />
        ))}
        {rows.slice(1).flatMap((row, l) =>
          row.map((node, i) => (
            <circle
              key={`n${l}-${i}`}
              cx={node.x}
              cy={node.y}
              r={2.6}
              className={
                covered(l + 1, i)
                  ? "text-violet-500"
                  : "text-muted-foreground opacity-30"
              }
              fill="currentColor"
              style={{ transition: "opacity 250ms var(--ease-out-strong)" }}
            />
          )),
        )}
        {rows[0].map((leaf, i) => (
          <rect
            key={`l${i}`}
            x={leaf.x - 4}
            y={leaf.y - 4}
            width={8}
            height={8}
            rx={1.5}
            className={
              i < filled
                ? i === filled - 1
                  ? "text-violet-400"
                  : "text-violet-500 opacity-85"
                : "text-muted-foreground opacity-25"
            }
            fill="currentColor"
            style={{ transition: "opacity 250ms var(--ease-out-strong)" }}
          />
        ))}
      </svg>

      {committing ? (
        <span
          className="sync-drop pointer-events-none absolute h-2 w-2 rounded-[2px] bg-violet-400 shadow-[0_0_5px_1px_rgba(167,139,250,0.6)]"
          style={{
            left: `calc(${dropLeftPct}% - 4px)`,
            top: `calc(${leafTopPct}% - 16px)`,
            transition: "left 220ms var(--ease-out-strong)",
          }}
        />
      ) : (
        <div className="sync-bob pointer-events-none absolute left-1/2 top-0 flex -translate-x-1/2 gap-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <span
              key={i}
              className="h-2 w-2 rounded-[2px] bg-violet-500/60"
            />
          ))}
        </div>
      )}
    </div>
  );
}
