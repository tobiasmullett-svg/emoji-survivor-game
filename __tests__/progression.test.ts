jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

import { calculatePearls, unlockEarnedSkins, type ProgressionData } from '../engine/progression';
import { getDefaultSkinId } from '../engine/skins';

function makeProgression(overrides: Partial<ProgressionData> = {}): ProgressionData {
  return {
    pearls: 0,
    totalRuns: 0,
    totalKills: 0,
    totalWaves: 0,
    highestWave: 0,
    unlockedCharacters: ['crab'],
    unlockedSkins: {
      crab: [getDefaultSkinId('crab')],
      octopus: [getDefaultSkinId('octopus')],
      squid: [getDefaultSkinId('squid')],
    },
    selectedSkins: {
      crab: getDefaultSkinId('crab'),
      octopus: getDefaultSkinId('octopus'),
      squid: getDefaultSkinId('squid'),
    },
    startingBonuses: {
      extraHp: 0,
      extraSpeed: 0,
      extraDamage: 0,
      extraLuck: 0,
    },
    ...overrides,
  };
}

describe('progression rewards', () => {
  it('calculates pearls from wave, kills, and long survival time', () => {
    expect(calculatePearls(5, 49, 299)).toBe(14);
    expect(calculatePearls(5, 50, 301)).toBe(20);
  });

  it('unlocks milestone skins without unlocking pearl-purchased skins', () => {
    const prog = makeProgression({ highestWave: 15 });
    const newSkins = unlockEarnedSkins(prog).map(skin => skin.id);

    expect(newSkins).toEqual(expect.arrayContaining(['crab_reef_guard', 'octopus_midnight', 'squid_royal']));
    expect(prog.unlockedSkins.crab).not.toContain('crab_pearl_knight');
  });
});
