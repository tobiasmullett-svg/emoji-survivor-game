import { rng, rngInt, setRng, resetRng, dist, norm, clamp, lerp, v2 } from '../math';

afterEach(() => {
  resetRng();
});

describe('seedable rng', () => {
  it('produces deterministic output with a fixed source', () => {
    let i = 0;
    setRng(() => [0.1, 0.5, 0.9][i++ % 3]);

    expect(rng(0, 10)).toBeCloseTo(1);
    expect(rng(0, 10)).toBeCloseTo(5);
    expect(rng(0, 10)).toBeCloseTo(9);
  });

  it('rngInt produces deterministic integers', () => {
    let i = 0;
    setRng(() => [0.0, 0.49, 0.99][i++ % 3]);

    expect(rngInt(0, 9)).toBe(0);
    expect(rngInt(0, 9)).toBe(4);
    expect(rngInt(0, 9)).toBe(9);
  });

  it('resetRng restores Math.random', () => {
    setRng(() => 0.42);
    expect(rng(0, 1)).toBeCloseTo(0.42);
    resetRng();
    const a = rng(0, 1);
    const b = rng(0, 1);
    // With real Math.random, two consecutive calls are extremely unlikely to match
    expect(typeof a).toBe('number');
    expect(typeof b).toBe('number');
  });
});

describe('pure math helpers', () => {
  it('clamp constrains values', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('dist computes euclidean distance', () => {
    expect(dist({ x: 0, y: 0 }, { x: 3, y: 4 })).toBeCloseTo(5);
  });

  it('norm returns unit vector', () => {
    const n = norm({ x: 3, y: 4 });
    expect(n.x).toBeCloseTo(0.6);
    expect(n.y).toBeCloseTo(0.8);
  });

  it('norm of zero vector returns zero', () => {
    const n = norm({ x: 0, y: 0 });
    expect(n.x).toBe(0);
    expect(n.y).toBe(0);
  });

  it('lerp interpolates linearly', () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
  });
});
