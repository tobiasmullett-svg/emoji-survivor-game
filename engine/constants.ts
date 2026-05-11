export const ARENA_W = 2000;
export const ARENA_H = 2000;

export const COLORS = {
  bg: '#050A15',
  bgMid: '#0A1628',
  bgLight: '#0F1F3D',
  primary: '#6366F1',
  accent: '#06B6D4',
  danger: '#EF4444',
  success: '#22C55E',
  gold: '#F59E0B',
  surface: 'rgba(15, 25, 60, 0.85)',
  surfaceSolid: '#0F193C',
  border: 'rgba(100, 150, 255, 0.15)',
  text: '#FFFFFF',
  textMuted: '#94A3B8',
  rarityCommon: '#9CA3AF',
  rarityUncommon: '#22C55E',
  rarityRare: '#3B82F6',
  rarityLegendary: '#F59E0B',
  eliteFast: '#F472B6',
  eliteTanky: '#60A5FA',
  eliteExplosive: '#FB923C',
  eliteVampiric: '#A78BFA',
  eliteShielded: '#2DD4BF',
} as const;

export const WAVE_BASE_TIME = 34;
export const WAVE_TIME_INC = 2;
export const MAX_WAVES = 20;
export const MAX_ENEMIES = 58;
export const MAX_PROJECTILES = 85;
export const MAX_PICKUPS = 60;
export const MAX_DMG_NUMS = 28;
export const MAX_EFFECTS = 40;
export const MAX_RESOURCE_NODES = 8;
export const MAX_PETS = 5;

export const PICKUP_BASE_RANGE = 60;
export const PICKUP_MAGNET_SPEED = 300;
export const COMBO_TIME = 3.2;
export const COMBO_BONUS_STEP = 8;

export const XP_BASE = 10;
export const XP_INC = 8;

export const INVULN_TIME = 0.5;
export const KB_DECAY = 8;
export const SPAWN_MARGIN = 80;

export const BOSS_WAVES = [5, 10, 15, 20];
export const BOSS_HP_MULT = 9;
export const BOSS_SIZE_MULT = 2;
export const BOSS_DMG_MULT = 2.6;

export const ENEMY_HP_SCALE = 0.14;
export const ENEMY_DMG_SCALE = 0.1;

export const HEAL_BASE_COST = 10;
export const HEAL_WAVE_COST = 3;
export const HEAL_PERCENT = 0.3;
export const REROLL_BASE = 5;
export const REROLL_INC = 3;

export const PRICE_INFLATION = 0.1;
export const COLLECT_TIME = 2;
export const ANNOUNCE_TIME = 1.5;

import type { Rarity } from './types';

export const RARITY_COLORS: Record<Rarity, string> = {
  common: COLORS.rarityCommon,
  uncommon: COLORS.rarityUncommon,
  rare: COLORS.rarityRare,
  legendary: COLORS.rarityLegendary,
};

export const BASE_PRICES: Record<Rarity, number> = {
  common: 10,
  uncommon: 25,
  rare: 50,
  legendary: 100,
};

export const RARITY_WPN_MULT: Record<Rarity, number> = {
  common: 1, uncommon: 1.3, rare: 1.6, legendary: 2,
};

export const RARITY_ITEM_MULT: Record<Rarity, number> = {
  common: 1, uncommon: 1.5, rare: 2.5, legendary: 4,
};

export const ELITE_CHANCE_BASE = 0.03;
export const ELITE_CHANCE_WAVE = 0.015;
export const MAX_ELITE_SHIELD = 40;

export const DEATH_PARTICLE_COUNT = 6;
export const DEATH_PARTICLE_SPEED = 120;
export const HIT_STOP_DURATION = 0.035;
export const CRIT_HIT_STOP = 0.045;
export const KILL_HIT_STOP = 0.06;

export const WAVE_MODIFIERS = ['denseFog', 'doubleSpeed', 'armored', 'rich', 'hazardous', 'swarm', 'elite'] as const;
export const MODIFIER_START_WAVE = 3;

export const WEAPON_EVOLVE_KILLS = 50;
export const WEAPON_EVOLVE_COST = 25;
export const WEAPON_MAX_LEVEL = 5;
export const WEAPON_LEVEL_DAMAGE_BONUS = 0.18;

export const MAX_HAZARDS = 18;
export const HAZARD_BASE_DAMAGE = 7;
export const HAZARD_RADIUS = 42;

export type WaterZone = Readonly<{ x: number; y: number; radius: number }>;
export const WATER_ZONES: readonly WaterZone[] = Object.freeze([
  Object.freeze({ x: 420, y: 520, radius: 220 }),
  Object.freeze({ x: 1520, y: 460, radius: 240 }),
  Object.freeze({ x: 560, y: 1460, radius: 260 }),
  Object.freeze({ x: 1450, y: 1380, radius: 230 }),
  Object.freeze({ x: 1120, y: 800, radius: 150 }),
]);
export type ArenaObstacle = Readonly<{
  x: number;
  y: number;
  rx: number;
  ry: number;
  kind: 'rock' | 'coral' | 'barrel';
}>;
export const ARENA_OBSTACLES: readonly ArenaObstacle[] = Object.freeze([
  Object.freeze({ x: 765, y: 585, rx: 122, ry: 86, kind: 'rock' }),
  Object.freeze({ x: 905, y: 650, rx: 96, ry: 118, kind: 'coral' }),
  Object.freeze({ x: 1660, y: 720, rx: 112, ry: 122, kind: 'rock' }),
  Object.freeze({ x: 1535, y: 1080, rx: 64, ry: 60, kind: 'rock' }),
  Object.freeze({ x: 1680, y: 1185, rx: 72, ry: 58, kind: 'barrel' }),
  Object.freeze({ x: 1240, y: 1410, rx: 116, ry: 94, kind: 'coral' }),
  Object.freeze({ x: 380, y: 1450, rx: 72, ry: 54, kind: 'rock' }),
  Object.freeze({ x: 1580, y: 1840, rx: 138, ry: 76, kind: 'rock' }),
]);
export const PLAYER_MAX_OXYGEN = 100;
export const OXYGEN_DRAIN_PER_SEC = 14;
export const OXYGEN_REGEN_PER_SEC = 24;
export const OXYGEN_DAMAGE_TICK = 7;
export const OXYGEN_DAMAGE_INTERVAL = 0.7;
