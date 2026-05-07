import AsyncStorage from '@react-native-async-storage/async-storage';
import type { HighScore } from '../engine/types';

const KEY = 'emoji_survivor_scores';

export async function getHighScores(): Promise<HighScore[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveHighScore(score: HighScore): Promise<void> {
  try {
    const scores = await getHighScores();
    scores.push(score);
    scores.sort((a, b) => (b?.wave ?? 0) - (a?.wave ?? 0));
    const top = scores.slice(0, 10);
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
