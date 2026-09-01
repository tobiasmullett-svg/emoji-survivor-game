import type { Vec2 } from './math';
import type { SoundName } from '../services/audio';
import type { HapticKind } from '../services/haptics';

/**
 * Side effects the engine wants the platform layer to perform after a tick.
 * The engine stays pure by pushing these onto `GameState.events` instead of
 * calling audio/haptics services directly; the UI drains and dispatches them.
 */
export type GameEvent =
  | { kind: 'sound'; id: SoundName }
  | { kind: 'haptic'; id: HapticKind }
  /** Combo tier-up (spec §1.6): fired once per tier reached. UI flashes the screen edge. */
  | { kind: 'comboTierUp'; tier: ComboTier };

export type CharacterId = 'crab' | 'octopus' | 'squid';
export type GamePhase = 'waveAnnounce' | 'playing' | 'collecting' | 'shopping' | 'levelup' | 'relic' | 'paused' | 'gameover';
export type EnemyType = 'chaser' | 'spitter' | 'swarmer' | 'golem' | 'ghost' | 'fireElem' | 'charger' | 'jellyfish' | 'bossKraken' | 'bossLeviathan' | 'bossAbyssalLord' | 'bossTideEmperor';
export type WeaponId = 'stick' | 'sword' | 'claw' | 'pistol' | 'smg' | 'shotgun' | 'crossbow' | 'lightning';
export type ItemId = 'heart' | 'sneakers' | 'muscles' | 'shield' | 'clover' | 'energyDrink' | 'scope' | 'magnet' | 'piggyBank';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';
export type ResourceNodeKind = 'coral' | 'kelp' | 'crystal';
export type PetKind = 'snapper' | 'spark' | 'mender' | 'turtle';
export type RelicId =
  | 'glassTide'
  | 'abyssalMagnet'
  | 'stormCache'
  | 'huntersMark'
  | 'broodCovenant'
  | 'oxygenDebt'
  | 'salvageOath'
  | 'comboEngine'
  // Elemental relics (spec §1.4)
  | 'phoenixEmber'
  | 'glacialCore'
  | 'stormSigil';

/** Spine elements (spec §1.1). 'none' = no elemental identity (untagged). */
export type Element = 'fire' | 'ice' | 'lightning' | 'none';

/**
 * First-class ids for behavioral elemental upgrades (spec §1.3), stored on
 * `GameState.elementUpgrades` so the engine's damage/fire pipeline can query
 * them. Elemental upgrades are *behavioral* (spread, pierce, ignite chance) —
 * they cannot be expressed as `+N stat` closures, hence this dedicated id type.
 */
export type ElementalUpgradeId =
  // Fire (6): Ignition — spread, explode
  | 'igniteChancePlus'
  | 'burnSpread'
  | 'emberTrail'
  | 'explosiveDeath'
  | 'flameReach'
  | 'cauterize'
  // Ice (6): Chill — control, defense
  | 'chillChancePlus'
  | 'deepFreeze'
  | 'iceArmor'
  | 'shatter'
  | 'permafrost'
  | 'coldSnap'
  // Lightning (6): Storm — multi-hit, chain
  | 'chainPlus'
  | 'zapChancePlus'
  | 'overcharge'
  | 'stormField'
  | 'lightningRod'
  | 'static';

/**
 * Elemental tag carried by relics and pet-axis level-up upgrades (spec §1.2/§1.5).
 * 'nature' is the pet-support element: it is NOT a spine element (fire/ice/
 * lightning), it only feeds the nature affinity threshold that scales all pets.
 */
export type ElementTag = Element | 'nature';

/** First-class ids for the 3 pet-support level-up upgrades (spec §1.5). */
export type PetUpgradeId = 'eggChance' | 'petDamage' | 'petAttackSpeed';

/** Combo tier ladder (spec §1.6): bronze → silver → gold → platinum. */
export type ComboTier = 'none' | 'bronze' | 'silver' | 'gold' | 'platinum';

export interface PlayerState {
  x: number; y: number;
  /** Smoothed movement velocity (px/s) — eases toward input direction. */
  moveVx: number; moveVy: number;
  /** Last non-zero movement or aim direction, used by directed actions. */
  facing: Vec2;
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
  oxygen: number;
  maxOxygen: number;
}

export interface WeaponState {
  id: WeaponId;
  cooldownTimer: number;
  rarityMult: number;
  level: number;
  evolved: boolean;
  killCount: number;
}

export interface EquippedItem {
  id: ItemId;
  rarity: Rarity;
}

export type StatusEffectType = 'burn' | 'freeze' | 'poison' | 'stun' | 'bleed';

export interface EnemyStatusEffect {
  type: StatusEffectType;
  timer: number;
  maxTime: number;
  stacks: number;
  damagePerTick?: number;
  /**
   * Countdown to this effect's next damage tick. Owned by the effect itself so
   * that re-applying it (which refreshes `timer`/`maxTime`) never stalls or
   * resets the damage cadence.
   */
  tickTimer?: number;
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
  chargeTimer: number;
  chargeCooldown: number;
  chargeVx: number;
  chargeVy: number;
  fireTrailTimer: number;
  statusEffects: EnemyStatusEffect[];
}

export interface Projectile {
  id: number;
  x: number; y: number;
  /** Position before the latest move, for swept (anti-tunneling) hit tests. */
  prevX?: number; prevY?: number;
  vx: number; vy: number;
  damage: number; emoji: string;
  radius: number; piercing: boolean;
  hitIds: number[];
  life: number; maxLife: number;
  isEnemy: boolean;
  sourceWeaponIndex?: number;
  /** Pet that fired this projectile, for on-hit perk effects. */
  sourcePetId?: number;
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
  /** Seconds until the mend_shield barrier can absorb another hit. */
  barrierCooldown: number;
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

export interface HatchAnimation {
  id: number;
  x: number; y: number;
  petEmoji: string;
  petColor: string;
  petName: string;
  timer: number;
  maxTimer: number;
}

export interface PendingHatch {
  animId: number;
  kind: PetKind;
  name: string;
  spawnX: number;
  spawnY: number;
}

export interface HazardZone {
  id: number;
  x: number; y: number;
  radius: number;
  damage: number;
  pulse: number;
  emoji: string;
  /** If set, hazard expires after this many seconds. Undefined = permanent. */
  life?: number;
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
  /** Elemental tag of the upgrade (spec §1.2); set on pet-axis options ('nature'). */
  element?: ElementTag;
  /** Pet-support upgrade id (spec §1.5); set when the option is a pet upgrade. */
  petUpgradeId?: PetUpgradeId;
  /** Elemental upgrade id (spec §1.3); set when the option is an elemental upgrade. */
  elementalUpgradeId?: ElementalUpgradeId;
}

export interface RelicChoice {
  id: RelicId;
  emoji: string;
  name: string;
  desc: string;
  drawback: string;
  rarity: Rarity;
  /** Elemental tag (spec §1.2/§1.4); set on the 3 elemental relics. */
  element?: ElementTag;
}

export interface RunRelic extends RelicChoice {
  wave: number;
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
  hatchAnimations: HatchAnimation[];
  pendingHatches: PendingHatch[];
  hazards: HazardZone[];
  wave: WaveState;
  camera: Vec2;
  materials: number;
  combo: { count: number; timer: number; best: number; tierRewarded: number };
  shake: { x: number; y: number; timer: number; intensity: number };
  phase: GamePhase;
  prevPhase: GamePhase;
  stats: RunStats;
  shopSlots: ShopSlot[];
  levelUpOptions: LevelUpOption[];
  _levelUpApply: Array<(p: PlayerState) => void>;
  /**
   * Behavioral elemental upgrades owned this run (spec §1.3). First-class so
   * the damage/fire pipeline can query them — NOT hidden in `_levelUpApply`.
   * Ids come from `ElementalUpgradeId`; empty until the upgrades system is wired.
   */
  elementUpgrades: ElementalUpgradeId[];
  /** Enemy ids marked by Lightning Rod (spec §1.3); next hit on them crits. */
  lightningRodMarks: number[];
  /** Tick accumulator for Ember Trail burn patches (spec §1.3). */
  emberTrailTimer: number;
  /** Tick accumulator for Storm Field aura pulses (spec §1.3). */
  stormFieldTimer: number;
  /** Pet-support level-up upgrades owned this run (spec §1.5), ids from `PetUpgradeId`. */
  petUpgrades: PetUpgradeId[];
  relics: RunRelic[];
  relicChoices: RelicChoice[];
  rerollCost: number;
  healCost: number;
  arena: { width: number; height: number };
  sw: number; sh: number;
  cleanupCounter: number;
  victory: boolean;
  hitStop: number;
  waveModifier: WaveModifier;
  modifierAnnounceTimer: number;
  time: number;
  inWater: boolean;
  /** Previous frame water state for enter/exit audio edges. */
  prevInWater: boolean;
  oxygenDamageTimer: number;
  obstacleBumpTimer: number;
  /** Min spacing between crit-triggered freeze frames, so rapid crit builds don't judder. */
  critStopCooldown: number;
  /** Sound/haptic side effects queued this tick, drained by the UI layer. */
  events: GameEvent[];
}

/** Separate movement and optional manual aiming input for a game tick. */
export interface GameInput {
  movement: Vec2;
  aim?: Vec2;
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
  element: Element;
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
  comboCount: number; comboTimer: number; comboMaxTime: number; bestCombo: number;
  comboTier?: ComboTier;
  petCount: number; resourceCount: number;
  phase: GamePhase;
  equippedWeapons: { id: WeaponId; emoji: string; evolved: boolean; killCount: number; evolveKills: number; level: number; maxLevel: number }[];
  relics?: { id: RelicId; emoji: string; name: string }[];
  waveModifier?: WaveModifier;
  modifierAnnounceTimer?: number;
  petSynergies?: { kind: PetKind; count: number; bonusPct: number }[];
  /** Nature affinity tags owned (spec §1.5): pet-support upgrades + nature pets. */
  natureTags?: number;
  /** Nature affinity damage bonus % applied to all pets (spec §1.5). */
  natureBonusPct?: number;
  oxygen?: number;
  maxOxygen?: number;
  inWater?: boolean;
  bossHp?: number;
  bossMaxHp?: number;
  bossShieldHp?: number;
  bossMaxShieldHp?: number;
  bossEmoji?: string;
}

export interface HighScore {
  emoji: string; name: string;
  wave: number; kills: number;
  score: number;
  date: string; time: number;
  /** Player profile name (added in profile system update) */
  profileName?: string;
  /** Player profile avatar emoji */
  profileEmoji?: string;
}
