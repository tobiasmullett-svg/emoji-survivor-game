import AsyncStorage from '@react-native-async-storage/async-storage';
import type { HighScore } from '../engine/types';
import { calculateRunScore } from '../engine/scoring';

const KEY = 'emoji_survivor_scores';

export async function getHighScores(): Promise<HighScore[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
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
    await AsyncStorage.setItem(KEY, JSON.stringify(top));
  } catch {
    // Silently fail
  }
}

export async function clearHighScores(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // Silently fail
  }
}
