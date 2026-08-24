// Achievement system with in-run and persistent tracking
// Now scoped per player profile.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getActiveProfileId } from '../services/storage';

const LEGACY_KEY = 'emoji_survivor_achievements';

function profileKey(profileId: string): string {
  return `emoji_survivor_achievements_${profileId}`;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  emoji: string;
  condition: (stats: AchievementStats) => boolean;
  pearlReward: number;
}

export interface AchievementStats {
  wave: number;
  kills: number;
  damageDealt: number;
  materials: number;
  time: number;
  comboBest: number;
  elitesKilled: number;
  evolvedWeapons: number;
  noHitRun: boolean;
}

export interface AchievementProgress {
  id: string;
  unlocked: boolean;
  unlockedAt: string | null;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_blood', name: 'First Blood', description: 'Kill your first enemy', emoji: '🩸', condition: s => s.kills >= 1, pearlReward: 2 },
  { id: 'kill_100', name: 'Centurion', description: 'Kill 100 enemies in one run', emoji: '💯', condition: s => s.kills >= 100, pearlReward: 10 },
  { id: 'kill_500', name: 'Massacre', description: 'Kill 500 enemies in one run', emoji: '🔥', condition: s => s.kills >= 500, pearlReward: 25 },
  { id: 'wave_5', name: 'Survivor', description: 'Reach wave 5', emoji: '🌊', condition: s => s.wave >= 5, pearlReward: 5 },
  { id: 'wave_10', name: 'Veteran', description: 'Reach wave 10', emoji: '⚔️', condition: s => s.wave >= 10, pearlReward: 15 },
  { id: 'wave_15', name: 'Legend', description: 'Reach wave 15', emoji: '👑', condition: s => s.wave >= 15, pearlReward: 25 },
  { id: 'wave_20', name: 'Ocean Master', description: 'Complete all 20 waves', emoji: '🏆', condition: s => s.wave >= 20, pearlReward: 50 },
  { id: 'big_combo', name: 'Combo King', description: 'Reach a 32x combo', emoji: '⚡', condition: s => s.comboBest >= 32, pearlReward: 10 },
  { id: 'rich', name: 'Hoarder', description: 'Collect 500 materials in one run', emoji: '💰', condition: s => s.materials >= 500, pearlReward: 10 },
  { id: 'damage_10k', name: 'Destroyer', description: 'Deal 10,000 damage in one run', emoji: '💥', condition: s => s.damageDealt >= 10000, pearlReward: 15 },
  { id: 'elite_hunter', name: 'Elite Hunter', description: 'Kill 10 elite enemies', emoji: '🎯', condition: s => s.elitesKilled >= 10, pearlReward: 15 },
  { id: 'evolver', name: 'Evolver', description: 'Evolve 3 weapons in one run', emoji: '🔮', condition: s => s.evolvedWeapons >= 3, pearlReward: 20 },
  { id: 'speedster', name: 'Speedster', description: 'Reach wave 10 in under 5 minutes', emoji: '⏱️', condition: s => s.wave >= 10 && s.time < 300, pearlReward: 20 },
  { id: 'untouchable', name: 'Untouchable', description: 'Reach wave 5 without taking damage', emoji: '🛡️', condition: s => s.wave >= 5 && s.noHitRun, pearlReward: 25 },
];

/**
 * Resolve the storage key for achievement data.
 * If a profileId is provided, use it directly.
 * Otherwise, look up the active profile. Falls back to legacy key.
 */
async function resolveKey(overrideProfileId?: string): Promise<string> {
  if (overrideProfileId) return profileKey(overrideProfileId);
  const activeId = await getActiveProfileId();
  return activeId ? profileKey(activeId) : LEGACY_KEY;
}

export async function getAchievementProgress(overrideProfileId?: string): Promise<Record<string, AchievementProgress>> {
  try {
    const key = await resolveKey(overrideProfileId);
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function checkAchievements(stats: AchievementStats, overrideProfileId?: string): Promise<Achievement[]> {
  const key = await resolveKey(overrideProfileId);
  const progress = await getAchievementProgress(overrideProfileId);
  const newlyUnlocked: Achievement[] = [];
  
  for (const ach of ACHIEVEMENTS) {
    if (progress[ach.id]?.unlocked) continue;
    if (ach.condition(stats)) {
      progress[ach.id] = { id: ach.id, unlocked: true, unlockedAt: new Date().toISOString() };
      newlyUnlocked.push(ach);
    }
  }
  
  if (newlyUnlocked.length > 0) {
    await AsyncStorage.setItem(key, JSON.stringify(progress));
    const { addPearls } = require('./progression');
    for (const ach of newlyUnlocked) {
      if (ach.pearlReward) await addPearls(ach.pearlReward, overrideProfileId);
    }
  }
  
  return newlyUnlocked;
}

// Synchronous, in-memory check used by the in-game live toast loop.
// Pass the set of already-unlocked ids so we don't re-fire toasts for
// achievements unlocked in previous runs. Mutates the set.
export function checkAchievementsLive(stats: AchievementStats, alreadyUnlocked: Set<string>): Achievement[] {
  const newlyUnlocked: Achievement[] = [];
  for (const ach of ACHIEVEMENTS) {
    if (alreadyUnlocked.has(ach.id)) continue;
    if (ach.condition(stats)) {
      alreadyUnlocked.add(ach.id);
      newlyUnlocked.push(ach);
    }
  }
  return newlyUnlocked;
}

// Persist a list of newly unlocked achievements without re-evaluating
// conditions. Safe to call repeatedly; re-unlocking is a no-op.
export async function persistUnlockedAchievements(achievements: Achievement[], overrideProfileId?: string): Promise<void> {
  if (achievements.length === 0) return;
  try {
    const key = await resolveKey(overrideProfileId);
    const progress = await getAchievementProgress(overrideProfileId);
    const newlyUnlocked: Achievement[] = [];
    for (const a of achievements) {
      if (!progress[a.id]?.unlocked) {
        progress[a.id] = { id: a.id, unlocked: true, unlockedAt: new Date().toISOString() };
        newlyUnlocked.push(a);
      }
    }
    if (newlyUnlocked.length > 0) {
      await AsyncStorage.setItem(key, JSON.stringify(progress));
      const { addPearls } = require('./progression');
      for (const ach of newlyUnlocked) {
        if (ach.pearlReward) await addPearls(ach.pearlReward, overrideProfileId);
      }
    }
  } catch {
    // Silently fail
  }
}

export async function getUnlockedAchievements(overrideProfileId?: string): Promise<Achievement[]> {
  const progress = await getAchievementProgress(overrideProfileId);
  return ACHIEVEMENTS.filter(a => progress[a.id]?.unlocked);
}
