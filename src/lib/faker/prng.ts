// A small deterministic generator (mulberry32) so a seed always yields the same
// Wallet, and FNV-1a to turn a label or UFVK into that seed.

export type Rng = {
  next(): number;
  int(lo: number, hi: number): number;
  pick<T>(xs: readonly T[]): T;
  chance(p: number): boolean;
  gaussian(): number;
  hex(len: number): string;
  chars(alphabet: string, len: number): string;
};

export function hashSeed(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function rng(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const chars = (alphabet: string, len: number) => {
    let out = "";
    for (let i = 0; i < len; i++) {
      out += alphabet[Math.floor(next() * alphabet.length)];
    }
    return out;
  };
  return {
    next,
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    pick: (xs) => xs[Math.floor(next() * xs.length)],
    chance: (p) => next() < p,
    gaussian: () => {
      const u = 1 - next();
      const v = next();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
    hex: (len) => chars("0123456789abcdef", len),
    chars,
  };
}
