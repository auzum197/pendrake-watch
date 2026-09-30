// Path morphing for the pool words in the transaction list. A word outline
// (absolute M/L/Q/C/Z commands, as fontkit emits) is flattened into closed
// polylines, each resampled to the same point count, and paired with a target
// polygon on the disc. The morph is then a plain lerp of point pairs, which is what
// an SVG path morph is under the hood, without a library.
//
// Outer contours each take one wedge of the disc, ordered left to right around it,
// so the letters squeeze inward and meet edge to edge as one shape instead of ten
// rings piling up. Counter contours (the holes in O, a, d, p) shrink to the disc's
// centre and vanish under the nonzero fill rule.

export type Pt = [number, number];

const SAMPLES = 48;
const CURVE_STEPS = 8;
const WEDGE_LAP = 0.08;

function flatten(d: string): Pt[][] {
  const contours: Pt[][] = [];
  let cur: Pt[] = [];
  let pen: Pt = [0, 0];
  const re = /([MLQCZ])([^MLQCZ]*)/g;
  for (const m of d.matchAll(re)) {
    const cmd = m[1];
    const n = m[2].trim().split(/[\s,]+/).filter(Boolean).map(Number);
    switch (cmd) {
      case "M":
        if (cur.length > 1) contours.push(cur);
        pen = [n[0], n[1]];
        cur = [pen];
        break;
      case "L":
        pen = [n[0], n[1]];
        cur.push(pen);
        break;
      case "Q": {
        const [x1, y1, x, y] = n;
        const [x0, y0] = pen;
        for (let i = 1; i <= CURVE_STEPS; i++) {
          const t = i / CURVE_STEPS;
          const u = 1 - t;
          cur.push([
            u * u * x0 + 2 * u * t * x1 + t * t * x,
            u * u * y0 + 2 * u * t * y1 + t * t * y,
          ]);
        }
        pen = [x, y];
        break;
      }
      case "C": {
        const [x1, y1, x2, y2, x, y] = n;
        const [x0, y0] = pen;
        for (let i = 1; i <= CURVE_STEPS; i++) {
          const t = i / CURVE_STEPS;
          const u = 1 - t;
          cur.push([
            u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x,
            u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y,
          ]);
        }
        pen = [x, y];
        break;
      }
      case "Z":
        if (cur.length > 1) contours.push(cur);
        cur = [];
        break;
    }
  }
  if (cur.length > 1) contours.push(cur);
  return contours;
}

function resample(poly: Pt[], count: number): Pt[] {
  const closed = [...poly, poly[0]];
  const seg: number[] = [];
  let total = 0;
  for (let i = 1; i < closed.length; i++) {
    const [ax, ay] = closed[i - 1];
    const [bx, by] = closed[i];
    const len = Math.hypot(bx - ax, by - ay);
    seg.push(len);
    total += len;
  }
  const out: Pt[] = [];
  let i = 0;
  let acc = 0;
  for (let k = 0; k < count; k++) {
    const target = (k / count) * total;
    while (i < seg.length - 1 && acc + seg[i] < target) {
      acc += seg[i];
      i++;
    }
    const f = seg[i] === 0 ? 0 : (target - acc) / seg[i];
    const [ax, ay] = closed[i];
    const [bx, by] = closed[i + 1];
    out.push([ax + (bx - ax) * f, ay + (by - ay) * f]);
  }
  return out;
}

function signedArea(poly: Pt[]): number {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x0, y0] = poly[i];
    const [x1, y1] = poly[(i + 1) % poly.length];
    a += x0 * y1 - x1 * y0;
  }
  return a / 2;
}

function centroidX(poly: Pt[]): number {
  return poly.reduce((s, [x]) => s + x, 0) / poly.length;
}

function rotateToNearest(poly: Pt[], target: Pt): Pt[] {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const d = Math.hypot(poly[i][0] - target[0], poly[i][1] - target[1]);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return [...poly.slice(best), ...poly.slice(0, best)];
}

function onArc(c: Pt, r: number, a: number): Pt {
  return [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)];
}

// One slice of the disc: the arc from a0 to a1, then both radii back through the
// centre. A slice covering the full turn is the disc itself.
function wedgePoly(c: Pt, r: number, a0: number, a1: number, count: number): Pt[] {
  const full = Math.abs(a1 - a0) >= Math.PI * 2 - 1e-6;
  if (full) {
    return Array.from({ length: count }, (_, k) => onArc(c, r, a0 + ((a1 - a0) * k) / count));
  }
  const arcN = Math.round(count * 0.6);
  const legN = Math.floor((count - arcN) / 2);
  const out: Pt[] = [];
  for (let k = 0; k < arcN; k++) out.push(onArc(c, r, a0 + ((a1 - a0) * k) / (arcN - 1)));
  const end = onArc(c, r, a1);
  const start = onArc(c, r, a0);
  for (let k = 1; k <= legN; k++) {
    const f = k / (legN + 1);
    out.push([end[0] + (c[0] - end[0]) * f, end[1] + (c[1] - end[1]) * f]);
  }
  out.push(c);
  const backN = count - out.length;
  for (let k = 1; k <= backN; k++) {
    const f = k / (backN + 1);
    out.push([c[0] + (start[0] - c[0]) * f, c[1] + (start[1] - c[1]) * f]);
  }
  return out;
}

export type Morph = {
  from: Pt[][];
  to: Pt[][];
};

// Pairs each contour of a word outline with its disc target. Holes are detected
// by winding relative to the largest contour.
export function buildMorph(d: string, center: Pt, radius: number): Morph {
  const contours = flatten(d).map((c) => resample(c, SAMPLES));
  const areas = contours.map(signedArea);
  const largest = areas.reduce((bi, a, i) => (Math.abs(a) > Math.abs(areas[bi]) ? i : bi), 0);
  const outerSign = Math.sign(areas[largest]);
  const outers = contours
    .map((poly, i) => ({ i, x: centroidX(poly) }))
    .filter(({ i }) => Math.sign(areas[i]) === outerSign)
    .sort((a, b) => a.x - b.x);
  const rank = new Map(outers.map(({ i }, j) => [i, j]));
  const span = (Math.PI * 2) / outers.length;
  const from: Pt[][] = [];
  const to: Pt[][] = [];
  contours.forEach((poly, i) => {
    const j = rank.get(i);
    let target: Pt[];
    if (j === undefined) {
      target = wedgePoly(center, 0, 0, Math.PI * 2, SAMPLES);
    } else {
      // The leftmost letter takes the wedge on the left, the rest follow around.
      // Neighbours overlap by a few degrees so no hairline seam shows between them.
      const a0 = Math.PI + j * span;
      target = wedgePoly(center, radius, a0 - WEDGE_LAP, a0 + span + WEDGE_LAP, SAMPLES);
      if (Math.sign(signedArea(target)) !== Math.sign(areas[i])) target.reverse();
    }
    from.push(rotateToNearest(poly, target[0]));
    to.push(target);
  });
  return { from, to };
}

// Nonzero fill: a hole shrunk to a point contributes nothing.
export function morphPath(m: Morph, t: number): string {
  const parts: string[] = [];
  for (let c = 0; c < m.from.length; c++) {
    const a = m.from[c];
    const b = m.to[c];
    let s = "";
    for (let i = 0; i < a.length; i++) {
      const x = a[i][0] + (b[i][0] - a[i][0]) * t;
      const y = a[i][1] + (b[i][1] - a[i][1]) * t;
      s += `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    parts.push(s + "Z");
  }
  return parts.join("");
}

export function circlePath(c: Pt, r: number): string {
  const [cx, cy] = c;
  return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0Z`;
}

// Strong ease-in-out, the same family as the theme's on-screen movement curve.
export function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
