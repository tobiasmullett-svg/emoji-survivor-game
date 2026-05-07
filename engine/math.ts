export interface Vec2 { x: number; y: number }

export const v2 = (x: number, y: number): Vec2 => ({ x, y });
export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (v: Vec2, s: number): Vec2 => ({ x: v.x * s, y: v.y * s });
export const len = (v: Vec2): number => Math.sqrt(v.x * v.x + v.y * v.y);
export const norm = (v: Vec2): Vec2 => {
  const l = len(v);
  return l > 0 ? { x: v.x / l, y: v.y / l } : { x: 0, y: 0 };
};
export const dist = (a: Vec2, b: Vec2): number => len(sub(a, b));
export const clamp = (val: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, val));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
let _rngFn: () => number = Math.random;

/** Replace the underlying uniform [0,1) source (e.g. for deterministic tests). */
export function setRng(fn: () => number): void { _rngFn = fn; }
/** Restore the default Math.random source. */
export function resetRng(): void { _rngFn = Math.random; }

export const rng = (lo: number, hi: number): number => _rngFn() * (hi - lo) + lo;
export const rngInt = (lo: number, hi: number): number => Math.floor(rng(lo, hi + 1));
export const angle2v = (a: number): Vec2 => ({ x: Math.cos(a), y: Math.sin(a) });
export const v2angle = (v: Vec2): number => Math.atan2(v.y, v.x);
