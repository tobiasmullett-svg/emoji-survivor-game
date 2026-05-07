import type { CharacterId } from './types';

export type SkinUnlockKind = 'starter' | 'wave' | 'kills' | 'pearls';

export interface CharacterSkin {
  id: string;
  characterId: CharacterId;
  name: string;
  emoji: string;
  description: string;
  unlock: {
    kind: SkinUnlockKind;
    value?: number;
    cost?: number;
  };
}

export const CHARACTER_SKINS: Record<CharacterId, CharacterSkin[]> = {
  crab: [
    {
      id: 'crab_classic',
      characterId: 'crab',
      name: 'Classic Commander',
      emoji: '🦀',
      description: 'The original arena survivor.',
      unlock: { kind: 'starter' },
    },
    {
      id: 'crab_reef_guard',
      characterId: 'crab',
      name: 'Reef Guard',
      emoji: '🪸',
      description: 'Earned by reaching wave 3.',
      unlock: { kind: 'wave', value: 3 },
    },
    {
      id: 'crab_pearl_knight',
      characterId: 'crab',
      name: 'Pearl Knight',
      emoji: '🐚',
      description: 'A premium shell for seasoned survivors.',
      unlock: { kind: 'pearls', cost: 15 },
    },
  ],
  octopus: [
    {
      id: 'octopus_classic',
      characterId: 'octopus',
      name: 'Classic Assassin',
      emoji: '🐙',
      description: 'Swift, slippery, and dangerous.',
      unlock: { kind: 'starter' },
    },
    {
      id: 'octopus_midnight',
      characterId: 'octopus',
      name: 'Midnight Ink',
      emoji: '🪼',
      description: 'Earned by reaching wave 8.',
      unlock: { kind: 'wave', value: 8 },
    },
    {
      id: 'octopus_sunlit',
      characterId: 'octopus',
      name: 'Sunlit Ink',
      emoji: '🌞',
      description: 'Bought with pearls after unlocking Octopus.',
      unlock: { kind: 'pearls', cost: 25 },
    },
  ],
  squid: [
    {
      id: 'squid_classic',
      characterId: 'squid',
      name: 'Classic Tank',
      emoji: '🦑',
      description: 'Slow, sturdy, and stubborn.',
      unlock: { kind: 'starter' },
    },
    {
      id: 'squid_royal',
      characterId: 'squid',
      name: 'Royal Squid',
      emoji: '👑',
      description: 'Earned by reaching wave 15.',
      unlock: { kind: 'wave', value: 15 },
    },
    {
      id: 'squid_kraken',
      characterId: 'squid',
      name: 'Tiny Kraken',
      emoji: '🐲',
      description: 'Bought with pearls after unlocking Squid.',
      unlock: { kind: 'pearls', cost: 35 },
    },
  ],
};

const ALL_SKINS = Object.values(CHARACTER_SKINS).flat();

export function getAllSkins(): CharacterSkin[] {
  return ALL_SKINS;
}

export function getDefaultSkinId(characterId: CharacterId): string {
  return CHARACTER_SKINS[characterId][0].id;
}

export function getSkinById(skinId: string | undefined): CharacterSkin | undefined {
  if (!skinId) return undefined;
  return ALL_SKINS.find(skin => skin.id === skinId);
}

export function getSkinEmoji(characterId: CharacterId, skinId: string | undefined): string {
  const skin = getSkinById(skinId);
  return skin?.characterId === characterId ? skin.emoji : CHARACTER_SKINS[characterId][0].emoji;
}

export function getSkinUnlockLabel(skin: CharacterSkin): string {
  if (skin.unlock.kind === 'starter') return 'Unlocked';
  if (skin.unlock.kind === 'wave') return `Reach wave ${skin.unlock.value ?? 0}`;
  if (skin.unlock.kind === 'kills') return `${skin.unlock.value ?? 0} total kills`;
  return `🐚 ${skin.unlock.cost ?? 0}`;
}
