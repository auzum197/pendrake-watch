import sharp from "sharp";

// Rounds and insets the source art on Apple's icon grid, adds a top sheen, and
// writes the lit master. `pnpm icons` then hands it to `tauri icon`.
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

const rounded = await sharp({
  create: { width: CANVAS, height: CANVAS, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite([{ input: roundedBody, top: MARGIN, left: MARGIN }])
  .png()
  .toBuffer();

// Top-down sheen, confined to the rounded body so corners stay clean.
const bodyMask = Buffer.from(
  `<svg width="${CANVAS}" height="${CANVAS}"><rect x="${MARGIN}" y="${MARGIN}" width="${BODY}" height="${BODY}" rx="${RADIUS}" ry="${RADIUS}" fill="#fff"/></svg>`,
);
const sheen = Buffer.from(
  `<svg width="${CANVAS}" height="${CANVAS}"><defs>` +
    `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#fff" stop-opacity="0.5"/>` +
    `<stop offset="0.35" stop-color="#fff" stop-opacity="0.12"/>` +
    `<stop offset="0.6" stop-color="#fff" stop-opacity="0"/>` +
    `</linearGradient></defs>` +
    `<rect width="${CANVAS}" height="${CANVAS}" fill="url(#g)"/></svg>`,
);
const sheenClipped = await sharp(sheen)
  .composite([{ input: bodyMask, blend: "dest-in" }])
  .png()
  .toBuffer();

await sharp(rounded)
  .modulate({ brightness: 1.06 })
  .composite([{ input: sheenClipped, blend: "soft-light" }])
  .png()
  .toFile(OUT);

console.log(`wrote ${OUT}`);
