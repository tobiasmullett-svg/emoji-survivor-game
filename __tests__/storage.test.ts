jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

import { normalizeHighScore, sortHighScores } from '../services/storage';
import type { HighScore } from '../engine/types';

function score(overrides: Partial<HighScore>): HighScore {
  return {
    emoji: '🦀',
    name: 'Crab Commander',
    wave: 1,
    kills: 0,
    score: 0,
    date: '1/1/2026',
    time: 0,
    ...overrides,
  };
}

describe('high score ranking', () => {
  it('normalizes legacy scores that do not have a score value', () => {
    const legacy = { emoji: '🦀', name: 'Crab Commander', wave: 5, kills: 10, date: '1/1/2026', time: 30 } as HighScore;

    expect(normalizeHighScore(legacy).score).toBe(5650);
  });

  it('sorts by score before wave-only ranking', () => {
    const scores = sortHighScores([
      score({ wave: 10, kills: 0, score: 11000 }),
      score({ wave: 8, kills: 400, score: 12800 }),
      score({ wave: 12, kills: 1, score: 12012 }),
    ]);

    expect(scores.map(item => item.wave)).toEqual([8, 12, 10]);
  });
});
