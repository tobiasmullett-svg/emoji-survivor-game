// Thin wrapper around expo-haptics that no-ops on web (where the native
// module is unavailable) and silently swallows errors. Designed to be safe
// to call from any path, including the engine.

import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export type HapticKind = 'light' | 'medium' | 'heavy' | 'success' | 'warning';

let enabled = true;

export function setHapticsEnabled(value: boolean): void {
  enabled = value;
}

export function haptic(kind: HapticKind): void {
  if (!enabled) return;
  if (Platform.OS === 'web') return;
  try {
    if (kind === 'success') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }
    if (kind === 'warning') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    const style =
      kind === 'light' ? Haptics.ImpactFeedbackStyle.Light :
      kind === 'medium' ? Haptics.ImpactFeedbackStyle.Medium :
      Haptics.ImpactFeedbackStyle.Heavy;
    void Haptics.impactAsync(style);
  } catch {
    // Silently ignore — haptics are non-essential.
  }
}
