import { describe, expect, it } from "vitest";
import { buildMorph, circlePath, easeInOut, morphPath } from "./morph";
import { POOL_GLYPHS } from "./pool-glyphs";

// A square with a square hole, wound opposite ways, the shape of an "O".
const RING = "M0 0L100 0L100 100L0 100Z" + "M25 25L25 75L75 75L75 25Z";

describe("buildMorph", () => {
  it("pairs every contour with a target of the same point count", () => {
    const m = buildMorph(RING, [50, 50], 20);
    expect(m.from).toHaveLength(2);
    expect(m.to).toHaveLength(2);
    m.from.forEach((c, i) => expect(m.to[i]).toHaveLength(c.length));
  });

  it("sends the outer contour to the disc and the hole to its centre", () => {
    const m = buildMorph(RING, [50, 50], 20);
    const radius = (pts: [number, number][]) =>
      Math.max(...pts.map(([x, y]) => Math.hypot(x - 50, y - 50)));
    expect(radius(m.to[0])).toBeCloseTo(20, 5);
    expect(radius(m.to[1])).toBeCloseTo(0, 5);
  });

  it("gives each letter of a real word its own slice of the disc", () => {
    const glyph = POOL_GLYPHS.orchard;
    const m = buildMorph(glyph.d, [glyph.advance / 2, -240], 400);
    const onRim = m.to.filter((pts) =>
      pts.some(
        ([x, y]) =>
          Math.abs(Math.hypot(x - glyph.advance / 2, y + 240) - 400) < 1,
      ),
    );
    // O r c h a r d: seven letters, so seven outer contours on the rim.
    expect(onRim).toHaveLength(7);
  });
});

describe("morphPath", () => {
  it("starts on the source polygon and ends on the target", () => {
    const m = buildMorph(RING, [50, 50], 20);
    const at0 = morphPath(m, 0);
    const at1 = morphPath(m, 1);
    expect(
      at0.startsWith(
        `M${m.from[0][0][0].toFixed(1)} ${m.from[0][0][1].toFixed(1)}`,
      ),
    ).toBe(true);
    expect(
      at1.startsWith(
        `M${m.to[0][0][0].toFixed(1)} ${m.to[0][0][1].toFixed(1)}`,
      ),
    ).toBe(true);
    expect((at0.match(/Z/g) ?? []).length).toBe(2);
  });
});

describe("circlePath", () => {
  it("draws two arcs from the leftmost point", () => {
    expect(circlePath([10, 20], 5)).toBe(
      "M5 20a5 5 0 1 0 10 0a5 5 0 1 0 -10 0Z",
    );
  });
});

describe("easeInOut", () => {
  it("is fixed at the ends and symmetric around the middle", () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
    expect(easeInOut(0.5)).toBeCloseTo(0.5, 10);
    expect(easeInOut(0.25) + easeInOut(0.75)).toBeCloseTo(1, 10);
  });
});
