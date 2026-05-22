// Player profile types — local identity system
export interface PlayerProfile {
  id: string;
  name: string;       // 2-12 chars
  emoji: string;      // Avatar emoji
  createdAt: string;  // ISO date
  lastPlayedAt: string;
}

/** Curated avatar emojis for profile creation */
export const PROFILE_AVATARS = [
  '🦊', '🐺', '🦁', '🐯', '🐻', '🐼',
  '🦈', '🐬', '🐢', '🦅', '🦉', '🐉',
  '🤖', '👽', '👾', '🎮', '🕹️', '⚔️',
  '🔥', '⚡', '💎', '🌟', '🌊', '🍄',
  '🦀', '🐙', '🦑', '🐡', '🐠', '🐟',
];

export const MAX_PROFILES = 5;
export const MIN_NAME_LENGTH = 2;
export const MAX_NAME_LENGTH = 12;

/** Generate a UUID v4 */
export function generateProfileId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
