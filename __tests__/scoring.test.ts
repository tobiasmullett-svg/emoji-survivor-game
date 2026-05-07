import { calculateRunScore } from '../engine/scoring';

describe('calculateRunScore', () => {
  it('rewards waves, kills, time, boss clears, and victory', () => {
    expect(calculateRunScore({ wave: 5, kills: 10, time: 30 })).toBe(5650);
    expect(calculateRunScore({ wave: 20, kills: 0, time: 0 })).toBe(25000);
  });

  it('clamps negative values to zero', () => {
    expect(calculateRunScore({ wave: -1, kills: -50, time: -10 })).toBe(0);
  });
});
