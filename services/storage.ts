import AsyncStorage from '@react-native-async-storage/async-storage';
import type { HighScore } from '../engine/types';
import { calculateRunScore } from '../engine/scoring';
import type { PlayerProfile } from '../engine/profileTypes';
import { generateProfileId, MAX_PROFILES } from '../engine/profileTypes';

// ────────────────────────────────────────────
// High Scores (unchanged interface, now supports profile fields)
// ────────────────────────────────────────────

const SCORES_KEY = 'emoji_survivor_scores';

export async function getHighScores(): Promise<HighScore[]> {
  try {
    const raw = await AsyncStorage.getItem(SCORES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? sortHighScores(parsed.map(normalizeHighScore)) : [];
  } catch {
    return [];
  }
}

export function normalizeHighScore(score: HighScore): HighScore {
  return {
    ...score,
    score: score.score ?? calculateRunScore(score),
  };
}

export function sortHighScores(scores: HighScore[]): HighScore[] {
  return [...scores].sort((a, b) => (
    (b.score ?? calculateRunScore(b)) - (a.score ?? calculateRunScore(a))
    || (b.wave ?? 0) - (a.wave ?? 0)
    || (b.kills ?? 0) - (a.kills ?? 0)
    || (b.time ?? 0) - (a.time ?? 0)
  ));
}

export async function saveHighScore(score: HighScore): Promise<void> {
  try {
    const scores = await getHighScores();
    scores.push(normalizeHighScore(score));
    const top = sortHighScores(scores).slice(0, 10);
    await AsyncStorage.setItem(SCORES_KEY, JSON.stringify(top));
  } catch {
    // Silently fail
  }
}

export async function clearHighScores(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SCORES_KEY);
  } catch {
    // Silently fail
  }
}

// ────────────────────────────────────────────
// Player Profiles
// ────────────────────────────────────────────

const PROFILES_KEY = 'emoji_survivor_profiles';
const ACTIVE_PROFILE_KEY = 'emoji_survivor_active_profile';

export async function getProfiles(): Promise<PlayerProfile[]> {
  try {
    const raw = await AsyncStorage.getItem(PROFILES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveProfiles(profiles: PlayerProfile[]): Promise<void> {
  try {
    await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  } catch {
    // Silently fail
  }
}

export async function createProfile(name: string, emoji: string): Promise<PlayerProfile | null> {
  const profiles = await getProfiles();
  if (profiles.length >= MAX_PROFILES) return null;

  const now = new Date().toISOString();
  const profile: PlayerProfile = {
    id: generateProfileId(),
    name: name.trim(),
    emoji,
    createdAt: now,
    lastPlayedAt: now,
  };

  profiles.push(profile);
  await saveProfiles(profiles);
  return profile;
}

export async function deleteProfile(id: string): Promise<boolean> {
  const profiles = await getProfiles();
  const filtered = profiles.filter(p => p.id !== id);
  if (filtered.length === profiles.length) return false;

  await saveProfiles(filtered);

  // If the deleted profile was active, clear active
  const activeId = await getActiveProfileId();
  if (activeId === id) {
    await AsyncStorage.removeItem(ACTIVE_PROFILE_KEY);
  }

  // Clean up profile-scoped data
  try {
    await AsyncStorage.multiRemove([
      `emoji_survivor_progression_${id}`,
      `emoji_survivor_achievements_${id}`,
    ]);
  } catch {
    // Best effort cleanup
  }

  return true;
}

export async function updateProfile(id: string, updates: Partial<Pick<PlayerProfile, 'name' | 'emoji' | 'lastPlayedAt'>>): Promise<boolean> {
  const profiles = await getProfiles();
  const idx = profiles.findIndex(p => p.id === id);
  if (idx === -1) return false;

  profiles[idx] = { ...profiles[idx], ...updates };
  await saveProfiles(profiles);
  return true;
}

export async function getActiveProfileId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(ACTIVE_PROFILE_KEY);
  } catch {
    return null;
  }
}

export async function setActiveProfileId(id: string): Promise<void> {
  try {
    await AsyncStorage.setItem(ACTIVE_PROFILE_KEY, id);
  } catch {
    // Silently fail
  }
}

export async function getActiveProfile(): Promise<PlayerProfile | null> {
  const activeId = await getActiveProfileId();
  if (!activeId) return null;
  const profiles = await getProfiles();
  return profiles.find(p => p.id === activeId) ?? null;
}

/**
 * Migrate anonymous data into a profile. Called once when the first profile is
 * created, if legacy (non-profile-scoped) data exists.
 */
export async function migrateAnonymousDataToProfile(profileId: string): Promise<void> {
  try {
    // Migrate progression
    const legacyProgression = await AsyncStorage.getItem('emoji_survivor_progression');
    if (legacyProgression) {
      const profileKey = `emoji_survivor_progression_${profileId}`;
      const existing = await AsyncStorage.getItem(profileKey);
      if (!existing) {
        await AsyncStorage.setItem(profileKey, legacyProgression);
      }
    }

    // Migrate achievements
    const legacyAchievements = await AsyncStorage.getItem('emoji_survivor_achievements');
    if (legacyAchievements) {
      const profileKey = `emoji_survivor_achievements_${profileId}`;
      const existing = await AsyncStorage.getItem(profileKey);
      if (!existing) {
        await AsyncStorage.setItem(profileKey, legacyAchievements);
      }
    }
  } catch {
    // Best effort migration
  }
}
