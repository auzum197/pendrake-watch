import sharp from "sharp";

// Rounds and insets the source art on Apple's icon grid and writes the master.
// `pnpm icons` then hands it to `tauri icon`.
const SRC = "src-tauri/app-icon-square.png";
const OUT = "src-tauri/app-icon.png";

const CANVAS = 1024;
const BODY = 824;
const MARGIN = (CANVAS - BODY) / 2;
const RADIUS = 185.4;

const cornerMask = Buffer.from(
  `<svg width="${BODY}" height="${BODY}"><rect width="${BODY}" height="${BODY}" rx="${RADIUS}" ry="${RADIUS}"/></svg>`,
);

const roundedBody = await sharp(SRC)
  .resize(BODY, BODY, { fit: "cover" })
  .composite([{ input: cornerMask, blend: "dest-in" }])
  .png()
  .toBuffer();

await sharp({
  create: { width: CANVAS, height: CANVAS, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite([{ input: roundedBody, top: MARGIN, left: MARGIN }])
  .png()
  .toFile(OUT);

console.log(`wrote ${OUT}`);
