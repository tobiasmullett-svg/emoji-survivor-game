import type { Vec2 } from './math';

export type CharacterId = 'crab' | 'octopus' | 'squid';
export type GamePhase = 'waveAnnounce' | 'playing' | 'collecting' | 'shopping' | 'levelup' | 'paused' | 'gameover';
export type EnemyType = 'chaser' | 'spitter' | 'swarmer' | 'golem' | 'ghost' | 'fireElem';
export type WeaponId = 'stick' | 'sword' | 'claw' | 'pistol' | 'smg' | 'shotgun' | 'crossbow' | 'lightning';
export type ItemId = 'heart' | 'sneakers' | 'muscles' | 'shield' | 'clover' | 'energyDrink' | 'scope' | 'magnet' | 'piggyBank';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';
export type ResourceNodeKind = 'coral' | 'kelp' | 'crystal';
export type PetKind = 'snapper' | 'spark' | 'mender';

export interface PlayerState {
  x: number; y: number;
  hp: number; maxHp: number;
  baseSpeed: number; speedMult: number;
  damageMult: number; armor: number;
  dodge: number; luck: number;
  harvesting: number; attackSpeedMult: number;
  critChance: number; pickupRange: number;
  characterId: CharacterId; emoji: string;
  weapons: WeaponState[];
  items: EquippedItem[];
  xp: number; level: number; xpToNext: number;
  abilityCooldown: number; abilityMaxCooldown: number;
  abilityActive: boolean; abilityTimer: number;
  invulnTimer: number;
  radius: number;
}

export interface WeaponState {
  id: WeaponId;
  cooldownTimer: number;
  rarityMult: number;
  evolved: boolean;
  killCount: number;
}

export interface EquippedItem {
  id: ItemId;
  rarity: Rarity;
}

export interface Enemy {
  id: number; type: EnemyType;
  x: number; y: number;
  hp: number; maxHp: number;
  speed: number; damage: number;
  radius: number; emoji: string;
  fontSize: number; isBoss: boolean;
  flashTimer: number;
  knockbackX: number; knockbackY: number;
  attackCooldown: number; alive: boolean;
  elite: EliteModifier;
  shieldHp: number;
  maxShieldHp: number;
  telegraphTimer: number;
  telegraphMax: number;
  telegraphType: 'none' | 'attack' | 'charge';
}

export interface Projectile {
  id: number;
  x: number; y: number;
  vx: number; vy: number;
  damage: number; emoji: string;
  radius: number; piercing: boolean;
  hitIds: number[];
  life: number; maxLife: number;
  isEnemy: boolean;
  sourceWeaponIndex?: number;
}

export interface Pickup {
  id: number;
  x: number; y: number;
  type: 'material' | 'xp' | 'heal' | 'egg';
  value: number; emoji: string;
}

export interface ResourceNode {
  id: number;
  x: number; y: number;
  kind: ResourceNodeKind;
  hp: number; maxHp: number;
  radius: number;
  emoji: string;
  alive: boolean;
  flashTimer: number;
}

export interface PetPerk {
  id: string;
  name: string;
  emoji: string;
  desc: string;
}

export interface PetCompanion {
  id: number;
  kind: PetKind;
  x: number; y: number;
  emoji: string;
  name: string;
  color: string;
  generation: number;
  attackName: string;
  trait: string;
  traitDesc: string;
  level: number;
  cooldownTimer: number;
  radius: number;
  damage: number;
  attackFlash: number;
  action: 'idle' | 'attack' | 'heal';
  aimAngle: number;
  perks: PetPerk[];
}

export interface DmgNum {
  id: number;
  x: number; y: number;
  text: string; color: string;
  t: number; maxT: number;
}

export interface VisualFx {
  id: number;
  x: number; y: number;
  kind: 'slash' | 'muzzle' | 'zap' | 'ring' | 'spark' | 'burst' | 'smoke' | 'beam' | 'heal';
  color: string;
  angle: number;
  radius: number;
  t: number; maxT: number;
}

export interface DeathParticle {
  id: number;
  x: number; y: number;
  vx: number; vy: number;
  emoji: string;
  size: number;
  t: number; maxT: number;
  color: string;
}

export interface HazardZone {
  id: number;
  x: number; y: number;
  radius: number;
  damage: number;
  pulse: number;
  emoji: string;
}

export interface WaveState {
  number: number;
  timer: number; maxTime: number;
  spawnTimer: number; spawnInterval: number;
  enemiesSpawned: number; enemiesKilled: number;
  announceTimer: number; collectTimer: number;
  bossSpawned: boolean;
  maxSpawns: number;
}

export interface RunStats {
  enemiesKilled: number;
  damageDealt: number;
  damageTaken: number;
  materialsCollected: number;
  elitesKilled: number;
  weaponsEvolved: number;
  wasHit: boolean;
  startTime: number;
  bestCombo: number;
  modifiersSeen: WaveModifier[];
}

export interface ShopSlot {
  kind: 'weapon' | 'item';
  weaponId?: WeaponId;
  itemId?: ItemId;
  rarity: Rarity;
  price: number;
  bought: boolean;
  locked: boolean;
  name: string;
  emoji: string;
  desc: string;
}

export interface LevelUpOption {
  emoji: string;
  name: string;
  desc: string;
  rarity: Rarity;
  index: number;
}

export type EliteModifier = 'fast' | 'tanky' | 'explosive' | 'vampiric' | 'shielded' | 'none';
export type WaveModifier = 'none' | 'denseFog' | 'doubleSpeed' | 'armored' | 'rich' | 'hazardous' | 'swarm' | 'elite';

export interface GameState {
  player: PlayerState;
  enemies: Enemy[];
  projectiles: Projectile[];
  pickups: Pickup[];
  resourceNodes: ResourceNode[];
  pets: PetCompanion[];
  dmgNums: DmgNum[];
  effects: VisualFx[];
  deathParticles: DeathParticle[];
  hazards: HazardZone[];
  wave: WaveState;
  camera: Vec2;
  materials: number;
  combo: { count: number; timer: number; best: number };
  shake: { x: number; y: number; timer: number; intensity: number };
  phase: GamePhase;
  prevPhase: GamePhase;
  stats: RunStats;
  shopSlots: ShopSlot[];
  levelUpOptions: LevelUpOption[];
  _levelUpApply: Array<(p: PlayerState) => void>;
  rerollCost: number;
  healCost: number;
  arena: { width: number; height: number };
  sw: number; sh: number;
  nextId: number;
  cleanupCounter: number;
  victory: boolean;
  hitStop: number;
  waveModifier: WaveModifier;
  modifierAnnounceTimer: number;
  time: number;
}

export interface CharacterDef {
  id: CharacterId; name: string; emoji: string; desc: string;
  hp: number; speed: number; damageMult: number; armor: number;
  dodge: number; luck: number; harvesting: number; attackSpeedMult: number;
  critChance: number; startWeapon: WeaponId;
  abilityName: string; abilityEmoji: string; abilityDesc: string; abilityCooldown: number;
}

export interface WeaponDef {
  id: WeaponId; name: string; emoji: string;
  kind: 'melee' | 'ranged' | 'special';
  damage: number; range: number; cooldown: number;
  projCount: number; spread: number; piercing: boolean;
  projEmoji: string; projSpeed: number;
  chainTargets: number; desc: string;
}

export interface EnemyDef {
  type: EnemyType; emoji: string;
  hp: number; speed: number; damage: number;
  radius: number; fontSize: number;
  ranged: boolean; attackRange: number; attackCooldown: number;
  projEmoji: string; spawnWeight: number; minWave: number;
}

export interface ItemDef {
  id: ItemId; name: string; emoji: string; desc: string;
  baseAmount: number; stat: string;
}

export interface HudData {
  hp: number; maxHp: number; armor: number;
  waveNum: number; waveTimer: number; waveMaxTime: number;
  materials: number; level: number; xp: number; xpToNext: number;
  abilityCd: number; abilityMaxCd: number; abilityEmoji: string;
  comboCount: number; comboTimer: number; bestCombo: number;
  petCount: number; resourceCount: number;
  phase: GamePhase;
  equippedWeapons: { emoji: string; evolved: boolean; killCount: number; evolveKills: number }[];
  waveModifier?: WaveModifier;
  modifierAnnounceTimer?: number;
  petSynergies?: { kind: PetKind; count: number; bonusPct: number }[];
}

export interface HighScore {
  emoji: string; name: string;
  wave: number; kills: number;
  score: number;
  date: string; time: number;
}
