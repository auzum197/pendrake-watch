import { useMemo } from "react";
import "./sync-viz.css";

// A schematic of the note-commitment Merkle tree. Shielded outputs are appended
// as leaves left to right, and the highlighted frontier is the authentication path
// from the last appended leaf up to the root. The fixed 16-leaf depth is a
// legible stand-in. The real commitment counts are shown numerically alongside, so
// the small tree never implies a false scale.

const LEAVES = 16;
const LEVELS = 5; // leaves + 4 internal rows up to the root
const W = 320;
const H = 150;
const PAD_X = 16;
const PAD_TOP = 14;
const PAD_BOTTOM = 18;

type Node = { level: number; index: number; x: number; y: number };

function layout(): Node[][] {
  const rowGap = (H - PAD_TOP - PAD_BOTTOM) / (LEVELS - 1);
  const leafGap = (W - 2 * PAD_X) / (LEAVES - 1);
  const rows: Node[][] = [];
  for (let level = 0; level < LEVELS; level++) {
    const count = LEAVES >> level;
    const y = H - PAD_BOTTOM - level * rowGap;
    const row: Node[] = [];
    for (let index = 0; index < count; index++) {
      const x =
        level === 0
          ? PAD_X + index * leafGap
          : (rows[level - 1][index * 2].x + rows[level - 1][index * 2 + 1].x) / 2;
      row.push({ level, index, x, y });
    }
    rows.push(row);
  }
  return rows;
}

export function MerkleTree({
  frac,
  pulseSeq,
  pulseMs = 650,
  active,
  synced,
  total,
  scanned,
}: {
  frac: number;
  pulseSeq: number;
  pulseMs?: number;
  active: boolean;
  synced: boolean;
  total?: number;
  scanned?: number;
}) {
  const rows = useMemo(layout, []);
  const filled = Math.max(0, Math.min(LEAVES, Math.round(frac * LEAVES)));
  const lastLeaf = filled - 1;

  // Frontier node per level: the ancestor of the last filled leaf.
  const frontier = useMemo(() => {
    const set = new Set<string>();
    if (lastLeaf < 0) return set;
    for (let level = 0; level < LEVELS; level++) {
      set.add(`${level}:${lastLeaf >> level}`);
    }
    return set;
  }, [lastLeaf]);

  const covered = (level: number, index: number) =>
    ((index + 1) << level) <= filled;

  const edges: { x1: number; y1: number; x2: number; y2: number; on: boolean; front: boolean }[] = [];
  for (let level = 1; level < LEVELS; level++) {
    for (const node of rows[level]) {
      for (const childIdx of [node.index * 2, node.index * 2 + 1]) {
        const child = rows[level - 1][childIdx];
        edges.push({
          x1: node.x,
          y1: node.y,
          x2: child.x,
          y2: child.y,
          on: covered(level, node.index) && covered(child.level, child.index),
          front:
            frontier.has(`${level}:${node.index}`) &&
            frontier.has(`${child.level}:${child.index}`),
        });
      }
    }
  }

  const accent = synced ? "text-green-500" : "text-violet-500";

  return (
    <figure className="flex flex-col gap-1">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={`w-full ${active ? "opacity-100" : "opacity-70"} transition-opacity duration-300`}
        role="img"
        aria-label="Note-commitment tree"
      >
        {/* base edges */}
        {edges.map((e, i) => (
          <line
            key={`e${i}`}
            x1={e.x1}
            y1={e.y1}
            x2={e.x2}
            y2={e.y2}
            className={e.on ? `${accent} opacity-70` : "text-border opacity-60"}
            stroke="currentColor"
            strokeWidth={e.on ? 1.4 : 1}
            style={{ transition: "stroke-width 300ms var(--ease-out-strong)" }}
          />
        ))}

        {/* frontier glow: re-keyed each commit so the flash plays once, its
            duration eased from that batch's measured insert_tree time */}
        <g
          key={pulseSeq}
          className="sync-tree-pulse"
          style={{ animationDuration: `${pulseMs}ms` }}
        >
          {edges
            .filter((e) => e.front)
            .map((e, i) => (
              <line
                key={`f${i}`}
                x1={e.x1}
                y1={e.y1}
                x2={e.x2}
                y2={e.y2}
                className={accent}
                stroke="currentColor"
                strokeWidth={3}
                strokeLinecap="round"
              />
            ))}
        </g>

        {/* internal nodes */}
        {rows.slice(1).flatMap((row) =>
          row.map((node) => {
            const front = frontier.has(`${node.level}:${node.index}`);
            const on = covered(node.level, node.index);
            return (
              <circle
                key={`n${node.level}-${node.index}`}
                cx={node.x}
                cy={node.y}
                r={node.level === LEVELS - 1 ? 4.5 : 3.4}
                className={
                  front
                    ? accent
                    : on
                      ? `${accent} opacity-80`
                      : "text-muted-foreground opacity-30"
                }
                fill="currentColor"
                style={{ transition: "opacity 300ms var(--ease-out-strong)" }}
              />
            );
          }),
        )}

        {/* leaves */}
        {rows[0].map((leaf) => {
          const on = leaf.index < filled;
          const front = leaf.index === lastLeaf;
          return (
            <rect
              key={`l${leaf.index}`}
              x={leaf.x - 4.5}
              y={leaf.y - 4.5}
              width={9}
              height={9}
              rx={1.5}
              className={
                front
                  ? accent
                  : on
                    ? `${accent} opacity-80`
                    : "text-muted-foreground opacity-25"
              }
              fill="currentColor"
              style={{ transition: "opacity 250ms var(--ease-out-strong)" }}
            />
          );
        })}
      </svg>
      <figcaption className="text-[11px] text-muted-foreground tabular-nums">
        {synced ? (
          "Note-commitment tree · complete"
        ) : (
          <>
            Appending commitments to the note tree
            {total ? ` · ${(scanned ?? 0).toLocaleString()}/${total.toLocaleString()}` : ""}
          </>
        )}
      </figcaption>
    </figure>
  );
}
