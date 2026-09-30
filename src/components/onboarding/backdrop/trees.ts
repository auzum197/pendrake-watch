export const SCENE_W = 1717;
export const SCENE_H = 916;

type Leaf = {
  dx: number;
  dy: number;
  size: number;
  phase: number;
  tone: number;
};

type Branch = {
  len: number;
  width: number;
  angle: number;
  flex: number;
  phase: number;
  leaves: Leaf[];
  children: Branch[];
};

export type TreeSpec = {
  x: number;
  y: number;
  height: number;
  width: number;
  lean: number;
  seed: number;
  habit: "tall" | "round";
  depth: number;
  foliage: number;
};

export type Tree = { spec: TreeSpec; root: Branch };

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = ReturnType<typeof mulberry32>;

const between = (rng: Rng, lo: number, hi: number) => lo + rng() * (hi - lo);

function gauss(rng: Rng) {
  return (
    Math.sqrt(-2 * Math.log(rng() || 1e-9)) * Math.cos(2 * Math.PI * rng())
  );
}

function clump(rng: Rng, count: number, radius: number): Leaf[] {
  return Array.from({ length: count }, () => ({
    dx: gauss(rng) * radius,
    dy: gauss(rng) * radius * 0.7,
    size: rng() < 0.2 ? 2 : 1.4,
    phase: rng() * Math.PI * 2,
    tone: rng(),
  }));
}

function grow(
  rng: Rng,
  spec: TreeSpec,
  depth: number,
  len: number,
  width: number,
  angle: number,
): Branch {
  const level = spec.depth - depth;
  const branch: Branch = {
    len,
    width,
    angle,
    flex: 0.004 + level * 0.006,
    phase: rng() * Math.PI * 2,
    leaves: [],
    children: [],
  };

  if (depth <= 3) {
    const count = Math.round(
      spec.foliage * between(rng, 0.5, 1.2) * (depth === 0 ? 1 : 0.45),
    );
    branch.leaves = clump(rng, count, len * 0.5 + 4);
  }
  if (depth === 0) return branch;

  const tall = spec.habit === "tall";
  branch.children.push(
    grow(
      rng,
      spec,
      depth - 1,
      len * between(rng, tall ? 0.82 : 0.7, tall ? 0.95 : 0.8),
      width * 0.72,
      between(rng, -0.18, 0.18) - angle * (tall ? 0.35 : 0.1),
    ),
  );

  const sides = tall ? (rng() < 0.75 ? 1 : 2) : rng() < 0.6 ? 2 : 1;
  const first = rng() < 0.5 ? 1 : -1;
  for (let i = 0; i < sides; i++) {
    const side = i === 0 ? first : -first;
    branch.children.push(
      grow(
        rng,
        spec,
        Math.max(0, depth - (tall ? 2 : 1)),
        len * between(rng, tall ? 0.5 : 0.6, tall ? 0.8 : 0.85),
        width * 0.55,
        side * between(rng, tall ? 0.55 : 0.35, tall ? 1.15 : 0.9),
      ),
    );
  }

  return branch;
}

export function plant(spec: TreeSpec): Tree {
  const rng = mulberry32(spec.seed);
  const r = spec.habit === "tall" ? 0.885 : 0.75;
  const segment = (spec.height * (1 - r)) / (1 - r ** (spec.depth + 1));
  return {
    spec,
    root: grow(rng, spec, spec.depth, segment, spec.width, spec.lean),
  };
}

export const GROVE: TreeSpec[] = [
  {
    x: 228,
    y: 545,
    height: 510,
    width: 9,
    lean: -0.04,
    seed: 11,
    habit: "tall",
    depth: 9,
    foliage: 55,
  },
  {
    x: 268,
    y: 540,
    height: 480,
    width: 8,
    lean: 0.06,
    seed: 23,
    habit: "tall",
    depth: 9,
    foliage: 55,
  },
  {
    x: 312,
    y: 548,
    height: 380,
    width: 7,
    lean: 0.22,
    seed: 37,
    habit: "tall",
    depth: 8,
    foliage: 50,
  },
  {
    x: 150,
    y: 520,
    height: 170,
    width: 4,
    lean: -0.15,
    seed: 5,
    habit: "round",
    depth: 6,
    foliage: 26,
  },
  {
    x: 410,
    y: 560,
    height: 120,
    width: 4,
    lean: 0.12,
    seed: 71,
    habit: "round",
    depth: 6,
    foliage: 24,
  },
  {
    x: 1336,
    y: 560,
    height: 140,
    width: 5,
    lean: 0.02,
    seed: 97,
    habit: "round",
    depth: 7,
    foliage: 18,
  },
  {
    x: 1064,
    y: 585,
    height: 65,
    width: 2.5,
    lean: -0.1,
    seed: 131,
    habit: "round",
    depth: 5,
    foliage: 4,
  },
];

function gust(t: number, x: number) {
  const s = Math.sin(t * 0.21 - x * 0.0015);
  return s > 0 ? s ** 3 : 0;
}

const INK = ["#010210", "#02041a", "#050a2c"];

export function draw(
  ctx: CanvasRenderingContext2D,
  trees: Tree[],
  t: number,
  wind: number,
) {
  const strokes = new Map<number, Path2D>();
  const leaves: number[][] = INK.map(() => []);

  for (const { spec, root } of trees) {
    const g = gust(t, spec.x);
    const walk = (b: Branch, x: number, y: number, parent: number) => {
      const sway =
        Math.sin(t * 0.9 + b.phase + spec.x * 0.004) * 0.6 +
        Math.sin(t * 2.3 + b.phase * 1.7) * 0.2 +
        g * 1.1;
      const angle = parent + b.angle + wind * b.flex * sway;
      const ex = x + Math.sin(angle) * b.len;
      const ey = y - Math.cos(angle) * b.len;

      const width = Math.max(1, Math.round(b.width * 2) / 2);
      let path = strokes.get(width);
      if (!path) {
        path = new Path2D();
        strokes.set(width, path);
      }
      path.moveTo(x, y);
      path.lineTo(ex, ey);

      for (const leaf of b.leaves) {
        const flutter = wind * (0.5 + g) * Math.sin(t * 5 + leaf.phase);
        leaves[Math.floor(leaf.tone * INK.length)].push(
          ex + leaf.dx + flutter,
          ey + leaf.dy + flutter * 0.4,
          leaf.size,
        );
      }

      for (const child of b.children) walk(child, ex, ey, angle);
    };
    walk(root, spec.x, spec.y, 0);
  }

  ctx.clearRect(0, 0, SCENE_W, SCENE_H);
  ctx.lineCap = "round";
  ctx.strokeStyle = INK[0];
  for (const [width, path] of strokes) {
    ctx.lineWidth = width;
    ctx.stroke(path);
  }
  leaves.forEach((rects, i) => {
    ctx.fillStyle = INK[i];
    for (let k = 0; k < rects.length; k += 3) {
      ctx.fillRect(rects[k], rects[k + 1], rects[k + 2], rects[k + 2]);
    }
  });
}
