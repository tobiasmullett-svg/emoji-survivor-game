// Meta-progression system — persistent unlocks between runs
import AsyncStorage from '@react-native-async-storage/async-storage';

const PROGRESSION_KEY = 'emoji_survivor_progression';

export interface ProgressionData {
  pearls: number;
  totalRuns: number;
  totalKills: number;
  totalWaves: number;
  highestWave: number;
  unlockedCharacters: string[];
  unlockedSkins: Record<string, string[]>; // characterId -> skinIds
  startingBonuses: {
    extraHp: number;
    extraSpeed: number;
    extraDamage: number;
    extraLuck: number;
  };
}

const DEFAULT_PROGRESSION: ProgressionData = {
  pearls: 0,
  totalRuns: 0,
  totalKills: 0,
  totalWaves: 0,
  highestWave: 0,
  unlockedCharacters: ['crab'],
  unlockedSkins: {},
  startingBonuses: {
    extraHp: 0,
    extraSpeed: 0,
    extraDamage: 0,
    extraLuck: 0,
  },
};

type StoredProgression = Partial<Omit<ProgressionData, 'startingBonuses'>> & {
  startingBonuses?: Partial<ProgressionData['startingBonuses']>;
};

function normalizeProgression(data: StoredProgression = {}): ProgressionData {
  return {
    ...DEFAULT_PROGRESSION,
    ...data,
    unlockedCharacters: [...(data.unlockedCharacters ?? DEFAULT_PROGRESSION.unlockedCharacters)],
    unlockedSkins: { ...DEFAULT_PROGRESSION.unlockedSkins, ...(data.unlockedSkins ?? {}) },
    startingBonuses: {
      ...DEFAULT_PROGRESSION.startingBonuses,
      ...(data.startingBonuses ?? {}),
    },
  };
}

export async function getProgression(): Promise<ProgressionData> {
  try {
    const raw = await AsyncStorage.getItem(PROGRESSION_KEY);
    if (!raw) return normalizeProgression();
    const parsed = JSON.parse(raw) as StoredProgression;
    return normalizeProgression(parsed);
  } catch {
    return normalizeProgression();
  }
}

export async function saveProgression(data: ProgressionData): Promise<void> {
  try {
    await AsyncStorage.setItem(PROGRESSION_KEY, JSON.stringify(data));
  } catch {
    // Silently fail
  }
}

export function calculatePearls(wave: number, kills: number, time: number): number {
  const wavePearls = Math.floor(wave * 2);
  const killPearls = Math.floor(kills * 0.1);
  const timeBonus = time > 300 ? 5 : 0;
  return wavePearls + killPearls + timeBonus;
}

export async function addRunToProgression(wave: number, kills: number, time: number): Promise<ProgressionData> {
  const prog = await getProgression();
  prog.totalRuns++;
  prog.totalKills += kills;
  prog.totalWaves += wave;
  prog.highestWave = Math.max(prog.highestWave, wave);
  prog.pearls += calculatePearls(wave, kills, time);
  
  // Unlock characters at milestones
  if (wave >= 5 && !prog.unlockedCharacters.includes('octopus')) {
    prog.unlockedCharacters.push('octopus');
  }
  if (wave >= 10 && !prog.unlockedCharacters.includes('squid')) {
    prog.unlockedCharacters.push('squid');
  }
  
  await saveProgression(prog);
  return prog;
}

export const BONUS_COSTS = {
  extraHp: [5, 10, 15, 20, 25],
  extraSpeed: [5, 10, 15, 20, 25],
  extraDamage: [5, 10, 15, 20, 25],
  extraLuck: [5, 10, 15, 20, 25],
};

export type BonusKey = keyof typeof BONUS_COSTS;

export async function buyBonus(key: BonusKey): Promise<boolean> {
  const prog = await getProgression();
  const currentLevel = prog.startingBonuses[key];
  const costs = BONUS_COSTS[key];
  if (currentLevel >= costs.length) return false;
  const cost = costs[currentLevel];
  if (prog.pearls < cost) return false;
  prog.pearls -= cost;
  prog.startingBonuses[key]++;
  await saveProgression(prog);
  return true;
}
