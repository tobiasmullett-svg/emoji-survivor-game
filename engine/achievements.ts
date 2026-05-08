// Achievement system with in-run and persistent tracking
import AsyncStorage from '@react-native-async-storage/async-storage';

const ACHIEVEMENTS_KEY = 'emoji_survivor_achievements';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  emoji: string;
  condition: (stats: AchievementStats) => boolean;
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
  { id: 'first_blood', name: 'First Blood', description: 'Kill your first enemy', emoji: '🩸', condition: s => s.kills >= 1 },
  { id: 'kill_100', name: 'Centurion', description: 'Kill 100 enemies in one run', emoji: '💯', condition: s => s.kills >= 100 },
  { id: 'kill_500', name: 'Massacre', description: 'Kill 500 enemies in one run', emoji: '🔥', condition: s => s.kills >= 500 },
  { id: 'wave_5', name: 'Survivor', description: 'Reach wave 5', emoji: '🌊', condition: s => s.wave >= 5 },
  { id: 'wave_10', name: 'Veteran', description: 'Reach wave 10', emoji: '⚔️', condition: s => s.wave >= 10 },
  { id: 'wave_15', name: 'Legend', description: 'Reach wave 15', emoji: '👑', condition: s => s.wave >= 15 },
  { id: 'wave_20', name: 'Ocean Master', description: 'Complete all 20 waves', emoji: '🏆', condition: s => s.wave >= 20 },
  { id: 'big_combo', name: 'Combo King', description: 'Reach a 32x combo', emoji: '⚡', condition: s => s.comboBest >= 32 },
  { id: 'rich', name: 'Hoarder', description: 'Collect 500 materials in one run', emoji: '💰', condition: s => s.materials >= 500 },
  { id: 'damage_10k', name: 'Destroyer', description: 'Deal 10,000 damage in one run', emoji: '💥', condition: s => s.damageDealt >= 10000 },
  { id: 'elite_hunter', name: 'Elite Hunter', description: 'Kill 10 elite enemies', emoji: '🎯', condition: s => s.elitesKilled >= 10 },
  { id: 'evolver', name: 'Evolver', description: 'Evolve 3 weapons in one run', emoji: '🔮', condition: s => s.evolvedWeapons >= 3 },
  { id: 'speedster', name: 'Speedster', description: 'Reach wave 10 in under 5 minutes', emoji: '⏱️', condition: s => s.wave >= 10 && s.time < 300 },
  { id: 'untouchable', name: 'Untouchable', description: 'Reach wave 5 without taking damage', emoji: '🛡️', condition: s => s.wave >= 5 && s.noHitRun },
];

export async function getAchievementProgress(): Promise<Record<string, AchievementProgress>> {
  try {
    const raw = await AsyncStorage.getItem(ACHIEVEMENTS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function checkAchievements(stats: AchievementStats): Promise<Achievement[]> {
  const progress = await getAchievementProgress();
  const newlyUnlocked: Achievement[] = [];
  
  for (const ach of ACHIEVEMENTS) {
    if (progress[ach.id]?.unlocked) continue;
    if (ach.condition(stats)) {
      progress[ach.id] = { id: ach.id, unlocked: true, unlockedAt: new Date().toISOString() };
      newlyUnlocked.push(ach);
    }
  }
  
  if (newlyUnlocked.length > 0) {
    await AsyncStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(progress));
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
export async function persistUnlockedAchievements(achievements: Achievement[]): Promise<void> {
  if (achievements.length === 0) return;
  try {
    const progress = await getAchievementProgress();
    let changed = false;
    for (const a of achievements) {
      if (!progress[a.id]?.unlocked) {
        progress[a.id] = { id: a.id, unlocked: true, unlockedAt: new Date().toISOString() };
        changed = true;
      }
    }
    if (changed) await AsyncStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(progress));
  } catch {
    // Silently fail
  }
}

export async function getUnlockedAchievements(): Promise<Achievement[]> {
  const progress = await getAchievementProgress();
  return ACHIEVEMENTS.filter(a => progress[a.id]?.unlocked);
}
