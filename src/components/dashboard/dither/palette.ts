export type Rgb = [number, number, number];

export const INK = {
  brand: [46, 88, 255],
  orchard: [183, 214, 240],
  sapling: [204, 209, 215],
  ironwood: [53, 233, 175],
  transparent: [255, 199, 92],
  ember: [255, 97, 12],
  grey: [120, 120, 130],
} as const satisfies Record<string, Rgb>;

export type InkName = keyof typeof INK;

export const INK_NAMES = Object.keys(INK) as InkName[];

export const rgba = ([r, g, b]: Rgb, a = 1) => `rgba(${r},${g},${b},${a})`;
