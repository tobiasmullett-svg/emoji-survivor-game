import type { CharacterDef, WeaponDef, EnemyDef, ItemDef, WeaponId } from './types';

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'crab', name: 'Crab Commander', emoji: '🦀', desc: 'Balanced warrior (+10% pet dmg)',
    hp: 100, speed: 3, damageMult: 1, armor: 2, dodge: 5, luck: 0,
    harvesting: 0, attackSpeedMult: 1, critChance: 5, startWeapon: 'pistol',
    abilityName: 'Shield', abilityEmoji: '🛡️', abilityDesc: 'Block all damage for 3s',
    abilityCooldown: 30,
  },
  {
    id: 'octopus', name: 'Octopus Assassin', emoji: '🐙', desc: 'Swift striker',
    hp: 70, speed: 4.5, damageMult: 1.15, armor: 0, dodge: 12, luck: 5,
    harvesting: 0, attackSpeedMult: 1.3, critChance: 10, startWeapon: 'claw',
    abilityName: 'Dash', abilityEmoji: '💨', abilityDesc: 'Quick invincible dash',
    abilityCooldown: 20,
  },
  {
    id: 'squid', name: 'Squid Tank', emoji: '🦑', desc: 'Unstoppable force (Thorns passive)',
    hp: 150, speed: 2.5, damageMult: 1.0, armor: 4, dodge: 0, luck: 0,
    harvesting: 5, attackSpeedMult: 0.8, critChance: 3, startWeapon: 'stick',
    abilityName: 'Pulse', abilityEmoji: '💥', abilityDesc: 'AoE damage burst',
    abilityCooldown: 20,
  },
];

export const WEAPONS: Record<string, WeaponDef> = {
  stick: { id: 'stick', name: 'Stick', emoji: '🪵', kind: 'melee', element: 'lightning', damage: 8, range: 55, cooldown: 0.8, projCount: 1, spread: 0, piercing: false, projEmoji: '', projSpeed: 0, chainTargets: 0, desc: 'Basic melee weapon' },
  sword: { id: 'sword', name: 'Sword', emoji: '⚔️', kind: 'melee', element: 'ice', damage: 15, range: 65, cooldown: 1.2, projCount: 1, spread: 0, piercing: false, projEmoji: '', projSpeed: 0, chainTargets: 0, desc: 'Heavy melee slash' },
  claw: { id: 'claw', name: 'Claw', emoji: '🦞', kind: 'melee', element: 'ice', damage: 12, range: 45, cooldown: 0.5, projCount: 1, spread: 0, piercing: false, projEmoji: '', projSpeed: 0, chainTargets: 0, desc: 'Fast melee swipe' },
  pistol: { id: 'pistol', name: 'Pistol', emoji: '🔫', kind: 'ranged', element: 'fire', damage: 8, range: 300, cooldown: 0.68, projCount: 1, spread: 0, piercing: false, projEmoji: '•', projSpeed: 430, chainTargets: 0, desc: 'Reliable ranged weapon' },
  smg: { id: 'smg', name: 'SMG', emoji: '💨', kind: 'ranged', element: 'lightning', damage: 5, range: 250, cooldown: 0.15, projCount: 1, spread: 0.15, piercing: false, projEmoji: '·', projSpeed: 450, chainTargets: 0, desc: 'Rapid fire, slight spread' },
  shotgun: { id: 'shotgun', name: 'Shotgun', emoji: '💥', kind: 'ranged', element: 'fire', damage: 6, range: 150, cooldown: 1.0, projCount: 5, spread: 0.12, piercing: false, projEmoji: '•', projSpeed: 350, chainTargets: 0, desc: '5 pellets in a spread' },
  crossbow: { id: 'crossbow', name: 'Crossbow', emoji: '🏹', kind: 'ranged', element: 'fire', damage: 20, range: 400, cooldown: 1.5, projCount: 1, spread: 0, piercing: true, projEmoji: '→', projSpeed: 500, chainTargets: 0, desc: 'High damage, piercing' },
  lightning: { id: 'lightning', name: 'Lightning', emoji: '⚡', kind: 'special', element: 'lightning', damage: 12, range: 200, cooldown: 0.8, projCount: 1, spread: 0, piercing: false, projEmoji: '⚡', projSpeed: 0, chainTargets: 3, desc: 'Chains to 3 enemies' },
};

export const EVOLVED_WEAPONS: Record<string, WeaponDef> = {
  stick: { id: 'stick', name: 'Thunder Staff', emoji: '🔱', kind: 'melee', element: 'lightning', damage: 18, range: 70, cooldown: 0.7, projCount: 1, spread: 0, piercing: false, projEmoji: '', projSpeed: 0, chainTargets: 0, desc: 'Crackling with energy' },
  sword: { id: 'sword', name: 'Excalibur', emoji: '🗡️', kind: 'melee', element: 'ice', damage: 32, range: 75, cooldown: 1.1, projCount: 1, spread: 0, piercing: false, projEmoji: '', projSpeed: 0, chainTargets: 0, desc: 'Legendary blade' },
  claw: { id: 'claw', name: 'Titan Pincer', emoji: '🦀', kind: 'melee', element: 'ice', damage: 22, range: 55, cooldown: 0.4, projCount: 2, spread: 0.2, piercing: false, projEmoji: '', projSpeed: 0, chainTargets: 0, desc: 'Dual strike fury' },
  pistol: { id: 'pistol', name: 'Hand Cannon', emoji: '🔥', kind: 'ranged', element: 'fire', damage: 18, range: 350, cooldown: 0.6, projCount: 1, spread: 0, piercing: true, projEmoji: '🔥', projSpeed: 480, chainTargets: 0, desc: 'Piercing fire rounds' },
  smg: { id: 'smg', name: 'Minigun', emoji: '🌀', kind: 'ranged', element: 'lightning', damage: 9, range: 280, cooldown: 0.11, projCount: 1, spread: 0.18, piercing: false, projEmoji: '·', projSpeed: 480, chainTargets: 0, desc: 'Bullet hell' },
  shotgun: { id: 'shotgun', name: 'Dragon Breath', emoji: '🐉', kind: 'ranged', element: 'fire', damage: 10, range: 180, cooldown: 0.9, projCount: 7, spread: 0.14, piercing: false, projEmoji: '🔥', projSpeed: 380, chainTargets: 0, desc: '7 flaming pellets' },
  crossbow: { id: 'crossbow', name: 'Ballista', emoji: '🎯', kind: 'ranged', element: 'fire', damage: 40, range: 500, cooldown: 1.3, projCount: 1, spread: 0, piercing: true, projEmoji: '⇒', projSpeed: 600, chainTargets: 0, desc: 'Massive piercing bolt' },
  lightning: { id: 'lightning', name: 'Storm Caller', emoji: '🌩️', kind: 'special', element: 'lightning', damage: 18, range: 250, cooldown: 0.7, projCount: 1, spread: 0, piercing: false, projEmoji: '🌩️', projSpeed: 0, chainTargets: 5, desc: 'Chains to 5 enemies' },
};

export const ELITE_COLORS: Record<string, string> = {
  fast: '#F472B6',
  tanky: '#60A5FA',
  explosive: '#FB923C',
  vampiric: '#A78BFA',
  shielded: '#2DD4BF',
  none: '#9CA3AF',
};

export const ELITE_EMOJIS: Record<string, string> = {
  fast: '💨',
  tanky: '🛡️',
  explosive: '💣',
  vampiric: '🦇',
  shielded: '🔷',
  none: '',
};

export const MODIFIER_NAMES: Record<string, string> = {
  denseFog: '🌫️ Dense Fog',
  doubleSpeed: '⚡ Double Speed',
  armored: '🛡️ Armored',
  rich: '💰 Rich Harvest',
  hazardous: '☠️ Hazardous',
  swarm: '🐛 Swarm',
  elite: '👑 Elite Rising',
  none: 'Normal',
};

export const WEAPON_LIST: WeaponDef[] = Object.values(WEAPONS);
export const WEAPON_IDS: WeaponId[] = Object.keys(WEAPONS) as WeaponId[];

export const ENEMY_DEFS: EnemyDef[] = [
  { type: 'chaser', emoji: '👾', hp: 28, speed: 72, damage: 6, radius: 16, fontSize: 28, ranged: false, attackRange: 0, attackCooldown: 0, projEmoji: '', spawnWeight: 46, minWave: 1 },
  { type: 'spitter', emoji: '🦠', hp: 22, speed: 48, damage: 9, radius: 14, fontSize: 26, ranged: true, attackRange: 185, attackCooldown: 1.8, projEmoji: '🟢', spawnWeight: 22, minWave: 3 },
  { type: 'swarmer', emoji: '🐛', hp: 12, speed: 118, damage: 4, radius: 10, fontSize: 20, ranged: false, attackRange: 0, attackCooldown: 0, projEmoji: '', spawnWeight: 32, minWave: 6 },
  { type: 'charger', emoji: '🦈', hp: 46, speed: 62, damage: 13, radius: 18, fontSize: 31, ranged: false, attackRange: 0, attackCooldown: 0, projEmoji: '', spawnWeight: 14, minWave: 7 },
  { type: 'jellyfish', emoji: '🪼', hp: 35, speed: 55, damage: 8, radius: 16, fontSize: 30, ranged: false, attackRange: 0, attackCooldown: 0, projEmoji: '', spawnWeight: 18, minWave: 8 },
  { type: 'golem', emoji: '🪨', hp: 80, speed: 30, damage: 15, radius: 24, fontSize: 36, ranged: false, attackRange: 0, attackCooldown: 0, projEmoji: '', spawnWeight: 10, minWave: 10 },
  { type: 'ghost', emoji: '👻', hp: 25, speed: 70, damage: 7, radius: 14, fontSize: 26, ranged: false, attackRange: 0, attackCooldown: 0, projEmoji: '', spawnWeight: 15, minWave: 13 },
  { type: 'fireElem', emoji: '🔥', hp: 30, speed: 50, damage: 6, radius: 16, fontSize: 28, ranged: false, attackRange: 0, attackCooldown: 0, projEmoji: '', spawnWeight: 15, minWave: 16 },
  // Bosses (spawn weight 0 means they only spawn via script)
  { type: 'bossKraken', emoji: '🐙', hp: 800, speed: 35, damage: 20, radius: 32, fontSize: 48, ranged: false, attackRange: 0, attackCooldown: 0, projEmoji: '', spawnWeight: 0, minWave: 99 },
  { type: 'bossLeviathan', emoji: '🐉', hp: 1500, speed: 45, damage: 25, radius: 32, fontSize: 48, ranged: false, attackRange: 0, attackCooldown: 0, projEmoji: '', spawnWeight: 0, minWave: 99 },
  { type: 'bossAbyssalLord', emoji: '👑', hp: 3000, speed: 30, damage: 30, radius: 36, fontSize: 52, ranged: false, attackRange: 0, attackCooldown: 0, projEmoji: '', spawnWeight: 0, minWave: 99 },
  { type: 'bossTideEmperor', emoji: '🌊', hp: 5000, speed: 40, damage: 40, radius: 40, fontSize: 60, ranged: false, attackRange: 0, attackCooldown: 0, projEmoji: '', spawnWeight: 0, minWave: 99 },
];

export const ITEM_DEFS: ItemDef[] = [
  { id: 'heart', name: 'Heart', emoji: '❤️', desc: '+{n} Max HP', baseAmount: 10, stat: 'maxHp' },
  { id: 'sneakers', name: 'Sneakers', emoji: '🏃', desc: '+{n}% Speed', baseAmount: 10, stat: 'speed' },
  { id: 'muscles', name: 'Muscles', emoji: '💪', desc: '+{n}% Damage', baseAmount: 8, stat: 'damage' },
  { id: 'shield', name: 'Shield', emoji: '🛡️', desc: '+{n} Armor', baseAmount: 3, stat: 'armor' },
  { id: 'clover', name: 'Clover', emoji: '🍀', desc: '+{n} Luck', baseAmount: 5, stat: 'luck' },
  { id: 'energyDrink', name: 'Energy Drink', emoji: '⚡', desc: '+{n}% Atk Speed', baseAmount: 10, stat: 'attackSpeed' },
  { id: 'scope', name: 'Scope', emoji: '🎯', desc: '+{n}% Crit Chance', baseAmount: 5, stat: 'critChance' },
  { id: 'magnet', name: 'Magnet', emoji: '🧲', desc: '+{n}% Pickup Range', baseAmount: 15, stat: 'pickupRange' },
  { id: 'piggyBank', name: 'Piggy Bank', emoji: '💰', desc: '+{n} Harvesting', baseAmount: 3, stat: 'harvesting' },
];
