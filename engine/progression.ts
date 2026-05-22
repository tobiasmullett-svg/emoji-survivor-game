// Meta-progression system — persistent unlocks between runs
// Now scoped per player profile.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CharacterId } from './types';
import { CHARACTER_SKINS, getAllSkins, getDefaultSkinId, getSkinById, type CharacterSkin } from './skins';
import { getActiveProfileId } from '../services/storage';

const LEGACY_KEY = 'emoji_survivor_progression';

function profileKey(profileId: string): string {
  return `emoji_survivor_progression_${profileId}`;
}

export interface ProgressionData {
  pearls: number;
  totalRuns: number;
  totalKills: number;
  totalWaves: number;
  highestWave: number;
  unlockedCharacters: string[];
  unlockedSkins: Record<string, string[]>; // characterId -> skinIds
  selectedSkins: Record<string, string>; // characterId -> skinId
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
};

type StoredProgression = Partial<Omit<ProgressionData, 'startingBonuses'>> & {
  startingBonuses?: Partial<ProgressionData['startingBonuses']>;
};

function ensureSkinCollections(data: StoredProgression): Pick<ProgressionData, 'unlockedSkins' | 'selectedSkins'> {
  const unlockedSkins: Record<string, string[]> = {};
  const selectedSkins: Record<string, string> = {};

  for (const characterId of Object.keys(CHARACTER_SKINS) as CharacterId[]) {
    const defaultSkinId = getDefaultSkinId(characterId);
    const knownSkinIds = new Set(CHARACTER_SKINS[characterId].map(skin => skin.id));
    const savedUnlocked = data.unlockedSkins?.[characterId] ?? [];
    const merged = [defaultSkinId, ...savedUnlocked].filter((skinId, index, all) => (
      knownSkinIds.has(skinId) && all.indexOf(skinId) === index
    ));
    unlockedSkins[characterId] = merged;

    const savedSelected = data.selectedSkins?.[characterId];
    selectedSkins[characterId] = savedSelected && merged.includes(savedSelected) ? savedSelected : defaultSkinId;
  }

  return { unlockedSkins, selectedSkins };
}

function normalizeProgression(data: StoredProgression = {}): ProgressionData {
  const skins = ensureSkinCollections(data);
  return {
    ...DEFAULT_PROGRESSION,
    ...data,
    unlockedCharacters: [...(data.unlockedCharacters ?? DEFAULT_PROGRESSION.unlockedCharacters)],
    unlockedSkins: skins.unlockedSkins,
    selectedSkins: skins.selectedSkins,
    startingBonuses: {
      ...DEFAULT_PROGRESSION.startingBonuses,
      ...(data.startingBonuses ?? {}),
    },
  };
}

/**
 * Resolve the storage key for progression data.
 * If a profileId is provided, use it directly.
 * Otherwise, look up the active profile. Falls back to legacy key.
 */
async function resolveKey(overrideProfileId?: string): Promise<string> {
  if (overrideProfileId) return profileKey(overrideProfileId);
  const activeId = await getActiveProfileId();
  return activeId ? profileKey(activeId) : LEGACY_KEY;
}

export async function getProgression(overrideProfileId?: string): Promise<ProgressionData> {
  try {
    const key = await resolveKey(overrideProfileId);
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return normalizeProgression();
    const parsed = JSON.parse(raw) as StoredProgression;
    return normalizeProgression(parsed);
  } catch {
    return normalizeProgression();
  }
}

export async function saveProgression(data: ProgressionData, overrideProfileId?: string): Promise<void> {
  try {
    const key = await resolveKey(overrideProfileId);
    await AsyncStorage.setItem(key, JSON.stringify(data));
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

export function unlockEarnedSkins(prog: ProgressionData): CharacterSkin[] {
  const newlyUnlocked: CharacterSkin[] = [];
  for (const skin of getAllSkins()) {
    if (skin.unlock.kind === 'pearls') continue;
    const unlocked = prog.unlockedSkins[skin.characterId] ?? [];
    if (unlocked.includes(skin.id)) continue;
    const qualifies = skin.unlock.kind === 'starter'
      || (skin.unlock.kind === 'wave' && prog.highestWave >= (skin.unlock.value ?? 0))
      || (skin.unlock.kind === 'kills' && prog.totalKills >= (skin.unlock.value ?? 0));
    if (qualifies) {
      prog.unlockedSkins[skin.characterId] = [...unlocked, skin.id];
      newlyUnlocked.push(skin);
    }
  }
  return newlyUnlocked;
}

export async function refreshProgressionUnlocks(overrideProfileId?: string): Promise<ProgressionData> {
  const prog = await getProgression(overrideProfileId);
  unlockEarnedSkins(prog);
  await saveProgression(prog, overrideProfileId);
  return prog;
}

export async function addRunToProgression(wave: number, kills: number, time: number, overrideProfileId?: string): Promise<ProgressionData> {
  const prog = await getProgression(overrideProfileId);
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
  unlockEarnedSkins(prog);
  
  await saveProgression(prog, overrideProfileId);
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

export async function buySkin(skinId: string): Promise<boolean> {
  const skin = getSkinById(skinId);
  if (!skin || skin.unlock.kind !== 'pearls') return false;
  const prog = await getProgression();
  if (!prog.unlockedCharacters.includes(skin.characterId)) return false;
  const unlocked = prog.unlockedSkins[skin.characterId] ?? [];
  if (unlocked.includes(skin.id)) return true;
  const cost = skin.unlock.cost ?? 0;
  if (prog.pearls < cost) return false;
  prog.pearls -= cost;
  prog.unlockedSkins[skin.characterId] = [...unlocked, skin.id];
  await saveProgression(prog);
  return true;
}

export async function selectSkin(characterId: CharacterId, skinId: string): Promise<boolean> {
  const skin = getSkinById(skinId);
  if (!skin || skin.characterId !== characterId) return false;
  const prog = await getProgression();
  if (!(prog.unlockedSkins[characterId] ?? []).includes(skinId)) return false;
  prog.selectedSkins[characterId] = skinId;
  await saveProgression(prog);
  return true;
}
