import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";

const SRC = process.argv[2];
const OUTDIR = process.argv[3];
const N = 1024;

const corners = {
  tl: [0x60, 0xb9, 0xcf],
  tr: [0x42, 0x65, 0xdb],
  bl: [0x04, 0x56, 0x8b],
  br: [0x08, 0x0f, 0x11],
};

// Dragon-free background: bilinear blend of the four sampled corners.
const bg = Buffer.alloc(N * N * 3);
for (let y = 0; y < N; y++) {
  const fy = y / (N - 1);
  for (let x = 0; x < N; x++) {
    const fx = x / (N - 1);
    const o = (y * N + x) * 3;
    for (let ch = 0; ch < 3; ch++) {
      const top = corners.tl[ch] * (1 - fx) + corners.tr[ch] * fx;
      const bot = corners.bl[ch] * (1 - fx) + corners.br[ch] * fx;
      bg[o + ch] = Math.round(top * (1 - fy) + bot * fy);
    }
  }
}
await mkdir(`${OUTDIR}/Assets`, { recursive: true });
await sharp(bg, { raw: { width: N, height: N, channels: 3 } })
  .png()
  .toFile(`${OUTDIR}/Assets/background.png`);

// Dragon layer: soft alpha keyed off luminance (white art on blue field).
// Stretch grayscale so ~178 -> 0 and ~216 -> 255 for anti-aliased edges.
const slope = 255 / (216 - 178);
const mask = await sharp(SRC)
  .greyscale()
  .linear(slope, -178 * slope)
  .toColourspace("b-w")
  .png()
  .toBuffer();

const white = await sharp({
  create: { width: N, height: N, channels: 3, background: { r: 255, g: 255, b: 255 } },
})
  .png()
  .toBuffer();

await sharp(white)
  .joinChannel(mask)
  .png()
  .toFile(`${OUTDIR}/Assets/dragon.png`);

console.log("layers written to", OUTDIR);
