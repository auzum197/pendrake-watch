import { type CSSProperties, useEffect, useRef } from "react";
import { LifeHash, LifeHashVersion } from "lifehash";

// A v2 LifeHash is a 32x32 grid of cells. The library's own PNG encoder mangles
// the output (noise at module_size 1, a tiled motif above it), so we read its raw
// color grid and paint it ourselves: nearest-neighbor up to a crisp backing
// buffer, which CSS then scales down to the display size.
const GRID = 32;
const SCALE = 8;

type Rgb = [number, number, number];

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
	const rn = r / 255;
	const gn = g / 255;
	const bn = b / 255;
	const max = Math.max(rn, gn, bn);
	const min = Math.min(rn, gn, bn);
	const l = (max + min) / 2;
	const d = max - min;
	if (d === 0) return [0, 0, l];
	const s = d / (1 - Math.abs(2 * l - 1));
	let h: number;
	if (max === rn) h = ((((gn - bn) / d) % 6) + 6) % 6;
	else if (max === gn) h = (bn - rn) / d + 2;
	else h = (rn - gn) / d + 4;
	return [h * 60, s, l];
}

function hslToRgb(h: number, s: number, l: number): Rgb {
	const c = (1 - Math.abs(2 * l - 1)) * s;
	const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
	const m = l - c / 2;
	const [r, g, b] =
		h < 60
			? [c, x, 0]
			: h < 120
				? [x, c, 0]
				: h < 180
					? [0, c, x]
					: h < 240
						? [0, x, c]
						: h < 300
							? [x, 0, c]
							: [c, 0, x];
	return [
		Math.round((r + m) * 255),
		Math.round((g + m) * 255),
		Math.round((b + m) * 255),
	];
}

const toHex = (n: number) => n.toString(16).padStart(2, "0");

const SAT_MIN = 0.25;
const SAT_SCALE = 1;
const L_FLOOR = 0.45;
const L_BUMP = 0;
const L_MAX = 0.7;

const accentCache = new Map<string, string>();

export function lifehashAccent(fingerprint: string): string {
	const cached = accentCache.get(fingerprint);
	if (cached) return cached;

	const { colors } = LifeHash.makeFrom(fingerprint, LifeHashVersion.version2);
	const counts = new Map<string, number>();
	let bestKey: string | null = null;
	let bestCount = 0;
	let vivid: Rgb = [colors[0], colors[1], colors[2]];
	let vividChroma = -1;

	for (let i = 0; i < GRID * GRID; i++) {
		const r = colors[i * 3];
		const g = colors[i * 3 + 1];
		const b = colors[i * 3 + 2];
		const chroma = Math.max(r, g, b) - Math.min(r, g, b);
		if (chroma > vividChroma) {
			vividChroma = chroma;
			vivid = [r, g, b];
		}
		const [, s] = rgbToHsl(r, g, b);
		if (s < SAT_MIN) continue;
		const key = `${r},${g},${b}`;
		const n = (counts.get(key) ?? 0) + 1;
		counts.set(key, n);
		if (n > bestCount) {
			bestCount = n;
			bestKey = key;
		}
	}

	const [r, g, b] = bestKey ? (bestKey.split(",").map(Number) as Rgb) : vivid;
	const [h, s, l] = rgbToHsl(r, g, b);
	const [br, bg, bb] = hslToRgb(
		h,
		Math.min(1, s * SAT_SCALE),
		Math.min(L_MAX, Math.max(l, L_FLOOR) + L_BUMP),
	);
	const color = `#${toHex(br)}${toHex(bg)}${toHex(bb)}`;
	accentCache.set(fingerprint, color);
	return color;
}

// The deterministic icon for a Wallet, rendered from its fingerprint with the
// Blockchain Commons LifeHash algorithm (CONTEXT.md). The same fingerprint always
// yields the same mark, so a Wallet stays recognizable across the app.
export function LifeHashIcon({
	fingerprint,
	className,
	style,
}: {
	fingerprint: string;
	className?: string;
	style?: CSSProperties;
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
			style={style}
		/>
	);
}
