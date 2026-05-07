import { Vec2, dist, norm, sub, clamp, rng, rngInt, angle2v, v2angle, len, lerp } from './math';
import type {
  GameState, PlayerState, Enemy, Projectile, Pickup, DmgNum, ResourceNode, PetCompanion, PetKind, PetPerk,
  CharacterId, GamePhase, WeaponId, ItemId, Rarity, WeaponState,
  ShopSlot, LevelUpOption, HudData, WaveState,
} from './types';
import { CHARACTERS, WEAPONS, EVOLVED_WEAPONS, ENEMY_DEFS, ITEM_DEFS, WEAPON_IDS, ELITE_COLORS, ELITE_EMOJIS, MODIFIER_NAMES } from './data';
import { playSound } from '../services/audio';
import { haptic } from '../services/haptics';
import {
  ARENA_W, ARENA_H, WAVE_BASE_TIME, WAVE_TIME_INC, MAX_WAVES,
  MAX_ENEMIES, MAX_PROJECTILES, MAX_PICKUPS, MAX_DMG_NUMS, MAX_EFFECTS,
  MAX_RESOURCE_NODES, MAX_PETS,
  PICKUP_BASE_RANGE, PICKUP_MAGNET_SPEED, XP_BASE, XP_INC,
  INVULN_TIME, KB_DECAY, SPAWN_MARGIN, BOSS_WAVES, BOSS_HP_MULT,
  BOSS_SIZE_MULT, BOSS_DMG_MULT, ENEMY_HP_SCALE, ENEMY_DMG_SCALE,
  HEAL_BASE_COST, HEAL_WAVE_COST, HEAL_PERCENT, REROLL_BASE, REROLL_INC,
  PRICE_INFLATION, COLLECT_TIME, ANNOUNCE_TIME,
  BASE_PRICES, RARITY_WPN_MULT, RARITY_ITEM_MULT,
  COMBO_TIME, COMBO_BONUS_STEP,
  ELITE_CHANCE_BASE, ELITE_CHANCE_WAVE, MAX_ELITE_SHIELD,
  DEATH_PARTICLE_COUNT, DEATH_PARTICLE_SPEED,
  HIT_STOP_DURATION, CRIT_HIT_STOP, KILL_HIT_STOP,
  WAVE_MODIFIERS, MODIFIER_START_WAVE,
  WEAPON_EVOLVE_KILLS, WEAPON_EVOLVE_COST,
  MAX_HAZARDS, HAZARD_BASE_DAMAGE, HAZARD_RADIUS,
} from './constants';

const ENEMY_DEF_BY_TYPE = new Map(ENEMY_DEFS.map(def => [def.type, def]));
const SEPARATION_CELL_SIZE = 64;
const RESOURCE_NODE_DEFS = {
  coral: { emoji: '🪸', hp: 28, radius: 20, mats: [5, 9] },
  kelp: { emoji: '🌿', hp: 18, radius: 18, mats: [3, 6] },
  crystal: { emoji: '💠', hp: 36, radius: 18, mats: [7, 12] },
} as const;
const PET_DEFS: Record<PetKind, { emoji: string; name: string; damage: number; cooldown: number; range: number; projEmoji: string; color: string; attackName: string; trait: string; traitDesc: string }> = {
  snapper: { emoji: '🦐', name: 'Snapper', damage: 5, cooldown: 0.85, range: 130, projEmoji: '›', color: '#FB7185', attackName: 'Bite Dart', trait: 'Hunter', traitDesc: 'Fast single-target shots. Trains into rapid boss damage.' },
  spark: { emoji: '🪼', name: 'Spark', damage: 4, cooldown: 1.2, range: 180, projEmoji: '✦', color: '#A78BFA', attackName: 'Static Pierce', trait: 'Chain', traitDesc: 'Piercing bolts with a zap burst on impact.' },
  mender: { emoji: '🐚', name: 'Mender', damage: 3, cooldown: 1.5, range: 145, projEmoji: '✚', color: '#2DD4BF', attackName: 'Tide Mend', trait: 'Healer', traitDesc: 'Heals you when hurt; otherwise fires soft support shots.' },
};
const PET_MAX_LEVEL = 9;
const BOSS_EXTRA_TIME = 18;

// ═══ PET PERKS ═══
const PET_PERK_DEFS: Record<PetKind, { level: number; perk: PetPerk }[]> = {
  snapper: [
    { level: 3, perk: { id: 'snap_rapid', name: 'Rapid Fire', emoji: '💨', desc: '+20% attack speed' } },
    { level: 5, perk: { id: 'snap_focus', name: 'Boss Focus', emoji: '🎯', desc: '+40% damage vs bosses' } },
    { level: 7, perk: { id: 'snap_double', name: 'Double Dart', emoji: '⚡', desc: 'Fires two projectiles' } },
  ],
  spark: [
    { level: 3, perk: { id: 'spark_range', name: 'Long Arc', emoji: '📡', desc: '+30% range' } },
    { level: 5, perk: { id: 'spark_chain', name: 'Chain Zap', emoji: '🔗', desc: 'Piercing bolts zap nearby enemies' } },
    { level: 7, perk: { id: 'spark_overload', name: 'Overload', emoji: '💥', desc: 'Crits deal area damage' } },
  ],
  mender: [
    { level: 3, perk: { id: 'mend_regen', name: 'Regen Aura', emoji: '💚', desc: 'Passive heal-over-time' } },
    { level: 5, perk: { id: 'mend_shield', name: 'Barrier', emoji: '🛡️', desc: 'Absorbs one hit every 8s' } },
    { level: 7, perk: { id: 'mend_revive', name: 'Second Wind', emoji: '🌊', desc: 'Emergency burst heal at low HP' } },
  ],
};

function getPetPerks(kind: PetKind, level: number): PetPerk[] {
  return (PET_PERK_DEFS[kind] ?? []).filter(p => level >= p.level).map(p => p.perk);
}

function hasPerk(pet: PetCompanion, perkId: string): boolean {
  return pet.perks.some(p => p.id === perkId);
}

/** Count pets of each kind; 2+ of same kind triggers a synergy bonus. */
export function getPetSynergies(pets: PetCompanion[]): { kind: PetKind; count: number; bonusPct: number }[] {
  const counts = new Map<PetKind, number>();
  for (const p of pets) counts.set(p.kind, (counts.get(p.kind) ?? 0) + 1);
  const synergies: { kind: PetKind; count: number; bonusPct: number }[] = [];
  for (const [kind, count] of counts) {
    if (count >= 2) synergies.push({ kind, count, bonusPct: 15 + (count - 2) * 10 });
  }
  return synergies;
}

function isBossWave(waveNumber: number): boolean {
  return BOSS_WAVES.includes(waveNumber);
}

function getWaveDuration(waveNumber: number): number {
  return WAVE_BASE_TIME + (waveNumber - 1) * WAVE_TIME_INC + (isBossWave(waveNumber) ? BOSS_EXTRA_TIME : 0);
}

// ═══ ID Generator ═══
let _nid = 1;
const nid = () => _nid++;

// ═══ Rarity Roll ═══
function rollRarity(luck: number): Rarity {
  const r = rng(0, 100);
  const leg = 3 + luck * 0.3;
  const rar = 12 + luck * 0.7;
  const unc = 25 + luck * 1;
  if (r < leg) return 'legendary';
  if (r < leg + rar) return 'rare';
  if (r < leg + rar + unc) return 'uncommon';
  return 'common';
}

// ═══ INIT ═══
export function initGameState(charId: CharacterId, sw: number, sh: number, startingBonuses?: { extraHp?: number; extraSpeed?: number; extraDamage?: number; extraLuck?: number }): GameState {
  const cDef = CHARACTERS.find(c => c.id === charId) ?? CHARACTERS[0];
  const wDef = WEAPONS[cDef.startWeapon];
  const cx = ARENA_W / 2;
  const cy = ARENA_H / 2;
  const state: GameState = {
    player: {
      x: cx, y: cy,
      hp: cDef.hp + (startingBonuses?.extraHp ?? 0) * 5,
      maxHp: cDef.hp + (startingBonuses?.extraHp ?? 0) * 5,
      baseSpeed: cDef.speed,
      speedMult: 1 + (startingBonuses?.extraSpeed ?? 0) * 0.03,
      damageMult: cDef.damageMult + (startingBonuses?.extraDamage ?? 0) * 0.03,
      armor: cDef.armor,
      dodge: cDef.dodge,
      luck: cDef.luck + (startingBonuses?.extraLuck ?? 0) * 2,
      harvesting: cDef.harvesting, attackSpeedMult: cDef.attackSpeedMult,
      critChance: cDef.critChance, pickupRange: PICKUP_BASE_RANGE,
      characterId: charId, emoji: cDef.emoji,
      weapons: [{ id: cDef.startWeapon, cooldownTimer: 0, rarityMult: 1, evolved: false, killCount: 0 }],
      items: [], xp: 0, level: 1, xpToNext: XP_BASE,
      abilityCooldown: 0, abilityMaxCooldown: cDef.abilityCooldown,
      abilityActive: false, abilityTimer: 0, invulnTimer: 0, radius: 20,
    },
    enemies: [], projectiles: [], pickups: [], resourceNodes: [], pets: [], dmgNums: [], effects: [], deathParticles: [], hazards: [],
    wave: {
      number: 1, timer: getWaveDuration(1), maxTime: getWaveDuration(1),
      spawnTimer: 0.35, spawnInterval: 1.05,
      enemiesSpawned: 0, enemiesKilled: 0,
      announceTimer: ANNOUNCE_TIME, collectTimer: 0,
      bossSpawned: false, maxSpawns: 36,
    },
    camera: { x: cx, y: cy },
    materials: 0,
    combo: { count: 0, timer: 0, best: 0 },
    shake: { x: 0, y: 0, timer: 0, intensity: 0 },
    phase: 'waveAnnounce', prevPhase: 'waveAnnounce',
    stats: { enemiesKilled: 0, damageDealt: 0, damageTaken: 0, materialsCollected: 0, elitesKilled: 0, weaponsEvolved: 0, wasHit: false, startTime: Date.now() },
    shopSlots: [], levelUpOptions: [], _levelUpApply: [],
    rerollCost: REROLL_BASE,
    healCost: HEAL_BASE_COST,
    arena: { width: ARENA_W, height: ARENA_H },
    sw, sh, nextId: 100, cleanupCounter: 0, victory: false,
    hitStop: 0,
    waveModifier: 'none',
    modifierAnnounceTimer: 0,
    time: 0,
  };
  spawnResourceNodes(state, 5);
  return state;
}

// ═══ MAIN UPDATE ═══
export function updateGame(state: GameState, dt: number, input: Vec2): void {
  if (state.phase === 'waveAnnounce') { updateAnnounce(state, dt); return; }
  if (state.phase === 'collecting') { updateCollecting(state, dt, input); return; }
  if (state.phase !== 'playing') return;

  // Hit stop / freeze frames
  if (state.hitStop > 0) {
    state.hitStop = Math.max(0, state.hitStop - dt);
    // Still update visual-only elements during hit stop
    updateDmgNums(state, dt);
    updateEffects(state, dt);
    updateDeathParticles(state, dt);
    updateShake(state, dt);
    return;
  }

  // Game time only advances during active play, so paused/hit-stopped
  // visuals (ghost wobble, pet orbit) freeze cleanly.
  state.time += dt;
  if (state.modifierAnnounceTimer > 0) {
    state.modifierAnnounceTimer = Math.max(0, state.modifierAnnounceTimer - dt);
  }

  updatePlayer(state, dt, input);
  updateAbilityTimer(state, dt);
  updateEnemies(state, dt);
  updateResourceNodes(state, dt);
  updatePets(state, dt);
  fireWeapons(state, dt);
  updateProjectiles(state, dt);
  checkProjectileHits(state);
  checkEnemyPlayerHits(state);
  updatePickups(state, dt);
  checkPickupCollection(state);
  updateHazards(state, dt);
  updateDmgNums(state, dt);
  updateEffects(state, dt);
  updateDeathParticles(state, dt);
  updateCombo(state, dt);
  updateShake(state, dt);
  updateWaveTimer(state, dt);
  spawnEnemies(state, dt);
  updateCamera(state, input);
  state.cleanupCounter++;
  if (state.cleanupCounter >= 60) { cleanup(state); state.cleanupCounter = 0; }
  checkLevelUp(state);
  checkDeath(state);
}

function updateResourceNodes(state: GameState, dt: number): void {
  for (const node of state.resourceNodes) {
    if (node.flashTimer > 0) node.flashTimer = Math.max(0, node.flashTimer - dt);
  }
}

// ═══ ANNOUNCE ═══
function updateAnnounce(state: GameState, dt: number): void {
  state.wave.announceTimer -= dt;
  if (state.modifierAnnounceTimer > 0) state.modifierAnnounceTimer -= dt;
  if (state.wave.announceTimer <= 0) {
    state.phase = 'playing';
  }
}

function rollWaveModifier(state: GameState): void {
  if (state.wave.number < MODIFIER_START_WAVE) {
    state.waveModifier = 'none';
    return;
  }
  if (rng(0, 1) < 0.35) {
    state.waveModifier = WAVE_MODIFIERS[rngInt(0, WAVE_MODIFIERS.length - 1)];
    state.modifierAnnounceTimer = 2.5;
  } else {
    state.waveModifier = 'none';
  }
}

// ═══ COLLECTING ═══
function updateCollecting(state: GameState, dt: number, input: Vec2): void {
  updatePlayer(state, dt, input);
  const p = state.player;
  for (const pk of state.pickups) {
    const d = norm(sub({ x: p.x, y: p.y }, { x: pk.x, y: pk.y }));
    const spd = PICKUP_MAGNET_SPEED * 3;
    pk.x += d.x * spd * dt;
    pk.y += d.y * spd * dt;
  }
  checkPickupCollection(state);
  updateDmgNums(state, dt);
  updateCamera(state, input);
  state.wave.collectTimer -= dt;
  if (state.wave.collectTimer <= 0) {
    state.pickups = [];
    generateShopItems(state);
    state.healCost = HEAL_BASE_COST + state.wave.number * HEAL_WAVE_COST;
    state.rerollCost = REROLL_BASE;
    state.phase = 'shopping';
  }
}

// ═══ PLAYER ═══
function updatePlayer(state: GameState, dt: number, input: Vec2): void {
  const p = state.player;
  const speed = p.baseSpeed * p.speedMult * 50;
  p.x += input.x * speed * dt;
  p.y += input.y * speed * dt;
  // Knockback decay
  if (Math.abs(p.invulnTimer) > 0) {
    p.invulnTimer = Math.max(0, p.invulnTimer - dt);
  }
  // Clamp to arena
  p.x = clamp(p.x, p.radius, state.arena.width - p.radius);
  p.y = clamp(p.y, p.radius, state.arena.height - p.radius);
  // Ability cooldown
  if (p.abilityCooldown > 0) p.abilityCooldown = Math.max(0, p.abilityCooldown - dt);
}

function updateAbilityTimer(state: GameState, dt: number): void {
  const p = state.player;
  if (p.abilityActive) {
    p.abilityTimer -= dt;
    if (p.abilityTimer <= 0) {
      p.abilityActive = false;
      p.abilityTimer = 0;
    }
  }
}

// ═══ ENEMIES ═══
function updateEnemies(state: GameState, dt: number): void {
  const p = state.player;
  for (const e of state.enemies) {
    if (!e.alive) continue;
    // Knockback
    if (Math.abs(e.knockbackX) > 0.5 || Math.abs(e.knockbackY) > 0.5) {
      e.x += e.knockbackX * dt * 60;
      e.y += e.knockbackY * dt * 60;
      e.knockbackX *= (1 - KB_DECAY * dt);
      e.knockbackY *= (1 - KB_DECAY * dt);
    }
    // Flash timer
    if (e.flashTimer > 0) e.flashTimer -= dt;
    // Telegraph timer
    if (e.telegraphTimer > 0) {
      e.telegraphTimer -= dt;
      if (e.telegraphTimer <= 0 && e.telegraphType === 'attack') {
        // Execute telegraphed attack
        const eDef = ENEMY_DEF_BY_TYPE.get(e.type);
        if (eDef && eDef.ranged) {
          const dir = norm({ x: p.x - e.x, y: p.y - e.y });
          if (state.projectiles.length < MAX_PROJECTILES) {
            state.projectiles.push({
              id: nid(), x: e.x, y: e.y,
              vx: dir.x * 200, vy: dir.y * 200,
              damage: e.damage, emoji: eDef.projEmoji || '🟢',
              radius: 6, piercing: false, hitIds: [],
              life: 2, maxLife: 2, isEnemy: true,
            });
          }
        }
        e.telegraphType = 'none';
      }
      continue; // Don't move while telegraphing
    }
    // AI
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 1) continue;
    const eDef = ENEMY_DEF_BY_TYPE.get(e.type);
    if (!eDef) continue;
    
    // Apply modifier speed changes
    let speedMult = 1;
    if (state.waveModifier === 'doubleSpeed') speedMult = 1.5;
    if (state.waveModifier === 'armored') speedMult = 0.75;
    
    // Ranged enemies stop at range
    if (eDef.ranged && d < eDef.attackRange) {
      // Telegraph before attack
      e.attackCooldown -= dt;
      if (e.attackCooldown <= 0) {
        e.attackCooldown = eDef.attackCooldown;
        e.telegraphTimer = 0.4;
        e.telegraphMax = 0.4;
        e.telegraphType = 'attack';
      }
    } else {
      // Move toward player
      let nx = dx / d;
      let ny = dy / d;
      // Ghost wobble (uses engine time so it freezes during pause/hitstop)
      if (e.type === 'ghost') {
        const wobble = Math.sin(state.time * 3 + e.id * 7) * 0.6;
        const a = Math.atan2(ny, nx) + wobble;
        nx = Math.cos(a);
        ny = Math.sin(a);
      }
      e.x += nx * e.speed * speedMult * dt;
      e.y += ny * e.speed * speedMult * dt;
    }
    // Clamp
    e.x = clamp(e.x, 5, state.arena.width - 5);
    e.y = clamp(e.y, 5, state.arena.height - 5);
  }
  separateEnemies(state);
}

function separateEnemies(state: GameState): void {
  const buckets = new Map<string, Enemy[]>();
  for (const e of state.enemies) {
    if (!e.alive) continue;
    const gx = Math.floor(e.x / SEPARATION_CELL_SIZE);
    const gy = Math.floor(e.y / SEPARATION_CELL_SIZE);
    const key = `${gx},${gy}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(e);
    else buckets.set(key, [e]);
  }

  for (const bucket of buckets.values()) {
    for (const a of bucket) {
      const ax = Math.floor(a.x / SEPARATION_CELL_SIZE);
      const ay = Math.floor(a.y / SEPARATION_CELL_SIZE);
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          const neighbors = buckets.get(`${ax + ox},${ay + oy}`);
          if (!neighbors) continue;
          for (const b of neighbors) {
            if (b.id <= a.id) continue;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const minD = a.radius + b.radius;
            const dd2 = dx * dx + dy * dy;
            if (dd2 >= minD * minD || dd2 <= 0.01) continue;
            const dd = Math.sqrt(dd2);
            const push = (minD - dd) * 0.28;
            const nx = dx / dd;
            const ny = dy / dd;
            a.x -= nx * push;
            a.y -= ny * push;
            b.x += nx * push;
            b.y += ny * push;
          }
        }
      }
    }
  }
}

function updatePets(state: GameState, dt: number): void {
  const p = state.player;
  const synergies = getPetSynergies(state.pets);
  const synergyMap = new Map(synergies.map(s => [s.kind, s.bonusPct]));

  // Mender regen-aura perk: passive heal ticks
  for (const pet of state.pets) {
    if (hasPerk(pet, 'mend_regen') && p.hp < p.maxHp) {
      p.hp = Math.min(p.maxHp, p.hp + dt * 1.5);
    }
  }

  state.pets.forEach((pet, i) => {
    const orbit = state.time * 2 + i * ((Math.PI * 2) / Math.max(1, state.pets.length));
    const levelScale = 1 + Math.min(0.55, (pet.level - 1) * 0.06);
    pet.attackFlash = Math.max(0, pet.attackFlash - dt * 3.5);
    if (pet.attackFlash <= 0) pet.action = 'idle';
    const target = {
      x: p.x + Math.cos(orbit) * (48 + i * 6),
      y: p.y + Math.sin(orbit) * (38 + i * 5),
    };
    pet.x = lerp(pet.x, target.x, 0.12);
    pet.y = lerp(pet.y, target.y, 0.12);
    pet.cooldownTimer = Math.max(0, pet.cooldownTimer - dt);
    if (pet.cooldownTimer > 0) return;
    const def = PET_DEFS[pet.kind];
    const synergyMult = 1 + (synergyMap.get(pet.kind) ?? 0) / 100;

    // Mender second-wind: emergency burst heal at low HP
    if (hasPerk(pet, 'mend_revive') && p.hp < p.maxHp * 0.2 && p.hp > 0) {
      const bigHeal = Math.round(p.maxHp * 0.2);
      p.hp = Math.min(p.maxHp, p.hp + bigHeal);
      pet.cooldownTimer = 8;
      pet.attackFlash = 1;
      pet.action = 'heal';
      addDmgNum(state, p.x, p.y - 40, `🌊+${bigHeal}`, '#2DD4BF');
      addEffect(state, p.x, p.y, 'burst', '#2DD4BF', 0, 60);
      return;
    }

    if (pet.kind === 'mender' && p.hp < p.maxHp) {
      const heal = Math.max(1, Math.round((1 + pet.level * 0.55) * synergyMult));
      p.hp = Math.min(p.maxHp, p.hp + heal);
      pet.cooldownTimer = Math.max(0.85, def.cooldown * (1 - Math.min(0.28, (pet.level - 1) * 0.025)));
      pet.attackFlash = 1;
      pet.action = 'heal';
      pet.aimAngle = v2angle(sub(p, pet));
      addDmgNum(state, p.x + rng(-8, 8), p.y - 34, `+${heal}`, def.color);
      addEffect(state, pet.x, pet.y, 'ring', def.color, 0, 34 + pet.level * 2);
      addEffect(state, p.x, p.y, 'heal', def.color, 0, 30 + pet.level * 2);
      return;
    }
    let attackRange = def.range;
    if (hasPerk(pet, 'spark_range')) attackRange = Math.round(attackRange * 1.3);
    const nearest = findNearest(pet, state.enemies, attackRange);
    if (!nearest || state.projectiles.length >= MAX_PROJECTILES) return;
    const dir = norm(sub(nearest, pet));
    let cdMult = Math.max(0.62, 1 - (pet.level - 1) * 0.035);
    if (hasPerk(pet, 'snap_rapid')) cdMult *= 0.8;
    pet.cooldownTimer = def.cooldown * cdMult;
    pet.attackFlash = 1;
    pet.action = 'attack';
    pet.aimAngle = v2angle(dir);
    addEffect(state, pet.x, pet.y, pet.kind === 'spark' ? 'beam' : 'muzzle', def.color, pet.aimAngle, pet.kind === 'spark' ? Math.min(attackRange, dist(pet, nearest)) : 18);
    if (pet.kind === 'spark') addEffect(state, nearest.x, nearest.y, 'zap', def.color, 0, 24 + pet.level * 2);
    if (pet.kind === 'snapper' && pet.level >= 4) addEffect(state, pet.x, pet.y, 'slash', def.color, pet.aimAngle, 24 + pet.level * 2);
    const baseDmg = pet.damage * p.damageMult * (1 + (pet.level - 1) * 0.32) * synergyMult;
    const projSpeed = pet.kind === 'snapper' ? 420 : 360;
    const shotCount = hasPerk(pet, 'snap_double') ? 2 : 1;
    for (let si = 0; si < shotCount; si++) {
      const spread = shotCount > 1 ? (si - 0.5) * 0.15 : 0;
      const a = pet.aimAngle + spread;
      const d = angle2v(a);
      if (state.projectiles.length >= MAX_PROJECTILES) break;
      state.projectiles.push({
        id: nid(), x: pet.x, y: pet.y,
        vx: d.x * projSpeed, vy: d.y * projSpeed,
        damage: baseDmg,
        emoji: def.projEmoji, radius: 5 * levelScale, piercing: pet.kind === 'spark', hitIds: [],
        life: attackRange / 360, maxLife: attackRange / 360, isEnemy: false,
      });
    }
  });
}

// ═══ WEAPONS ═══
function fireWeapons(state: GameState, dt: number): void {
  const p = state.player;
  for (let weaponIndex = 0; weaponIndex < p.weapons.length; weaponIndex++) {
    const ws = p.weapons[weaponIndex];
    ws.cooldownTimer -= dt;
    if (ws.cooldownTimer > 0) continue;
    const wDef = ws.evolved ? (EVOLVED_WEAPONS[ws.id] ?? WEAPONS[ws.id]) : WEAPONS[ws.id];
    if (!wDef) continue;
    const cd = wDef.cooldown / p.attackSpeedMult;
    if (wDef.kind === 'melee') {
      fireMelee(state, wDef, ws, cd);
    } else if (wDef.kind === 'ranged') {
      fireRanged(state, wDef, ws, cd, weaponIndex);
    } else if (wDef.kind === 'special') {
      fireSpecial(state, wDef, ws, cd);
    }
  }
}

function findNearest(pos: Vec2, enemies: Enemy[], range: number): Enemy | null {
  let best: Enemy | null = null;
  let bestD = range + 1;
  for (const e of enemies) {
    if (!e.alive) continue;
    const d = dist(pos, e);
    if (d < bestD) { bestD = d; best = e; }
  }
  return best;
}

function findNearestNode(pos: Vec2, nodes: ResourceNode[], range: number): ResourceNode | null {
  let best: ResourceNode | null = null;
  let bestD = range + 1;
  for (const node of nodes) {
    if (!node.alive) continue;
    const d = dist(pos, node);
    if (d < bestD) { bestD = d; best = node; }
  }
  return best;
}

function fireMelee(state: GameState, wDef: typeof WEAPONS[string], ws: WeaponState, cd: number): void {
  const p = state.player;
  const nearest = findNearest(p, state.enemies, wDef.range + 10);
  const nearestNode = findNearestNode(p, state.resourceNodes, wDef.range + 10);
  if (!nearest && !nearestNode) return;
  ws.cooldownTimer = cd;
  playSound(ws.evolved ? 'shootHeavy' : 'melee');
  addEffect(state, p.x, p.y, 'slash', '#FBBF24', v2angle(sub(nearest ?? nearestNode ?? p, p)), wDef.range);
  // Hit all enemies in range
  for (const e of state.enemies) {
    if (!e.alive) continue;
    const d = dist(p, e);
    if (d <= wDef.range + e.radius) {
      const strikeMult = ws.evolved ? Math.max(1, wDef.projCount) : 1;
      const dmg = wDef.damage * p.damageMult * ws.rarityMult * strikeMult;
      const isCrit = rng(0, 100) < p.critChance;
      dealDamage(state, e, isCrit ? dmg * 2 : dmg, isCrit, ws);
    }
  }
  for (const node of state.resourceNodes) {
    if (!node.alive) continue;
    if (dist(p, node) <= wDef.range + node.radius) {
      dealNodeDamage(state, node, wDef.damage * p.damageMult * ws.rarityMult);
    }
  }
}

function fireRanged(state: GameState, wDef: typeof WEAPONS[string], ws: WeaponState, cd: number, weaponIndex: number): void {
  const p = state.player;
  const nearest = findNearest(p, state.enemies, wDef.range);
  const nearestNode = findNearestNode(p, state.resourceNodes, wDef.range);
  const target = chooseCloserTarget(p, nearest, nearestNode);
  if (!target) return;
  ws.cooldownTimer = cd;
  const baseDir = norm(sub(target, p));
  const baseAngle = v2angle(baseDir);
  playSound(ws.evolved ? 'shootHeavy' : wDef.id === 'smg' ? 'shootFast' : 'shoot');
  addEffect(state, p.x + baseDir.x * 22, p.y + baseDir.y * 22, 'muzzle', '#FBBF24', baseAngle, 26);
  for (let i = 0; i < wDef.projCount; i++) {
    if (state.projectiles.length >= MAX_PROJECTILES) break;
    const spreadOff = (i - (wDef.projCount - 1) / 2) * wDef.spread;
    const a = baseAngle + spreadOff + rng(-wDef.spread * 0.3, wDef.spread * 0.3);
    const dir = angle2v(a);
    state.projectiles.push({
      id: nid(), x: p.x, y: p.y,
      vx: dir.x * wDef.projSpeed, vy: dir.y * wDef.projSpeed,
      damage: wDef.damage * p.damageMult * ws.rarityMult,
      emoji: wDef.projEmoji, radius: 5, piercing: wDef.piercing,
      hitIds: [], life: wDef.range / wDef.projSpeed, maxLife: wDef.range / wDef.projSpeed,
      isEnemy: false, sourceWeaponIndex: weaponIndex,
    });
  }
}

function chooseCloserTarget(pos: Vec2, enemy: Enemy | null, node: ResourceNode | null): Vec2 | null {
  if (!enemy) return node;
  if (!node) return enemy;
  return dist(pos, node) < dist(pos, enemy) * 0.9 ? node : enemy;
}

function fireSpecial(state: GameState, wDef: typeof WEAPONS[string], ws: WeaponState, cd: number): void {
  const p = state.player;
  const nearest = findNearest(p, state.enemies, wDef.range);
  if (!nearest) return;
  ws.cooldownTimer = cd;
  playSound('shootHeavy');
  // Lightning chain
  const targets: Enemy[] = [nearest];
  let cur = nearest;
  for (let i = 1; i < wDef.chainTargets; i++) {
    let closestE: Enemy | null = null;
    let closestD = 150;
    for (const e of state.enemies) {
      if (!e.alive || targets.includes(e)) continue;
      const d = dist(cur, e);
      if (d < closestD) { closestD = d; closestE = e; }
    }
    if (closestE) { targets.push(closestE); cur = closestE; }
    else break;
  }
  for (const t of targets) {
    const dmg = wDef.damage * p.damageMult * ws.rarityMult;
    const isCrit = rng(0, 100) < p.critChance;
    dealDamage(state, t, isCrit ? dmg * 2 : dmg, isCrit, ws);
    addEffect(state, t.x, t.y, 'zap', '#A78BFA', 0, 36);
  }
}

function dealDamage(state: GameState, enemy: Enemy, dmg: number, isCrit: boolean, sourceWeapon?: WeaponState): void {
  const actual = Math.max(1, Math.round(dmg));
  
  // Sound effects
  if (isCrit) {
    playSound('crit');
  } else {
    playSound('hit');
  }
  
  // Shield absorption for shielded elites
  if (enemy.shieldHp > 0) {
    const absorb = Math.min(enemy.shieldHp, actual);
    enemy.shieldHp -= absorb;
    addDmgNum(state, enemy.x + rng(-8, 8), enemy.y - 20, `-${absorb}`, '#2DD4BF');
    if (enemy.shieldHp <= 0) {
      addEffect(state, enemy.x, enemy.y, 'burst', '#2DD4BF', 0, enemy.radius * 2);
    }
    if (actual <= absorb) return;
  }
  
  enemy.hp -= actual;
  enemy.flashTimer = 0.08;
  state.stats.damageDealt += actual;
  
  // Enhanced screen shake on every hit
  const shakeIntensity = isCrit ? 5 : 2.5;
  const shakeDuration = isCrit ? 0.12 : 0.06;
  if (state.shake.timer < shakeDuration) {
    state.shake = { x: 0, y: 0, timer: shakeDuration, intensity: Math.max(state.shake.intensity, shakeIntensity) };
  }
  
  // Hit stop on crits
  if (isCrit) {
    state.hitStop = Math.max(state.hitStop, CRIT_HIT_STOP);
    addEffect(state, enemy.x, enemy.y, 'spark', '#F59E0B', rng(0, Math.PI * 2), 20);
  }
  
  // Knockback
  const p = state.player;
  const d = dist(p, enemy);
  if (d > 0.1) {
    const push = isCrit ? 10 : 5;
    enemy.knockbackX = ((enemy.x - p.x) / d) * push;
    enemy.knockbackY = ((enemy.y - p.y) / d) * push;
  }
  
  // Vampiric elite healing nearby allies
  if (enemy.elite === 'vampiric' && enemy.hp > 0) {
    for (const e of state.enemies) {
      if (!e.alive || e.id === enemy.id) continue;
      if (dist(enemy, e) < 100 && e.hp < e.maxHp) {
        e.hp = Math.min(e.maxHp, e.hp + Math.max(1, Math.round(actual * 0.15)));
      }
    }
  }
  
  // Damage number
  const dmgText = isCrit ? `💥${actual}` : String(actual);
  addDmgNum(state, enemy.x + rng(-10, 10), enemy.y - 15, dmgText, isCrit ? '#F59E0B' : '#FFFFFF');
  
  if (enemy.hp <= 0) {
    killEnemy(state, enemy, sourceWeapon);
  }
}

function dealNodeDamage(state: GameState, node: ResourceNode, dmg: number): void {
  const actual = Math.max(1, Math.round(dmg));
  node.hp -= actual;
  node.flashTimer = 0.08;
  addDmgNum(state, node.x + rng(-8, 8), node.y - 16, String(actual), '#CCFBF1');
  if (node.hp <= 0) destroyResourceNode(state, node);
}

function destroyResourceNode(state: GameState, node: ResourceNode): void {
  if (!node.alive) return;
  node.alive = false;
  const def = RESOURCE_NODE_DEFS[node.kind];
  const count = rngInt(def.mats[0], def.mats[1]);
  addEffect(state, node.x, node.y, 'ring', '#2DD4BF', 0, 44);
  addDmgNum(state, node.x, node.y - 38, node.kind === 'crystal' ? 'cache!' : 'harvest!', '#2DD4BF');
  for (let i = 0; i < count; i++) {
    dropPickup(state, node.x + rng(-26, 26), node.y + rng(-26, 26), 'material', 1, node.kind === 'crystal' ? '🪙' : '🔩');
  }
  const eggChance = node.kind === 'crystal' ? 34 : node.kind === 'coral' ? 22 : 14;
  if (rng(0, 100) < eggChance + state.player.luck * 0.15) {
    dropPickup(state, node.x + rng(-18, 18), node.y + rng(-18, 18), 'egg', 1, '🥚');
  }
}

function killEnemy(state: GameState, enemy: Enemy, sourceWeapon?: WeaponState): void {
  enemy.alive = false;
  state.stats.enemiesKilled++;
  if (enemy.elite !== 'none') state.stats.elitesKilled++;
  state.wave.enemiesKilled++;
  state.combo.count++;
  state.combo.timer = COMBO_TIME;
  state.combo.best = Math.max(state.combo.best, state.combo.count);
  
  // Hit stop on kill
  state.hitStop = Math.max(state.hitStop, KILL_HIT_STOP);
  
  // Sound and haptics
  if (enemy.isBoss) {
    playSound('explosion');
    haptic('heavy');
  } else if (enemy.elite !== 'none') {
    playSound('kill');
    haptic('light');
  }
  
  // Death particles
  spawnDeathParticles(state, enemy.x, enemy.y, enemy.emoji, enemy.isBoss ? '#F59E0B' : ELITE_COLORS[enemy.elite] ?? '#EF4444', enemy.isBoss ? 12 : DEATH_PARTICLE_COUNT);
  
  // Screen shake on kill
  const killShake = enemy.isBoss ? 10 : enemy.elite !== 'none' ? 6 : 3;
  state.shake = { x: 0, y: 0, timer: enemy.isBoss ? 0.4 : 0.2, intensity: killShake };
  
  // Explosive elite: damage nearby enemies and player
  if (enemy.elite === 'explosive') {
    const blastR = 80;
    addEffect(state, enemy.x, enemy.y, 'ring', '#FB923C', 0, blastR);
    for (const e of state.enemies) {
      if (!e.alive) continue;
      if (dist(enemy, e) < blastR + e.radius) {
        dealDamage(state, e, enemy.maxHp * 0.3, false);
      }
    }
    if (dist(enemy, state.player) < blastR + state.player.radius && state.player.invulnTimer <= 0) {
      const blastDmg = Math.max(1, Math.round(8 - state.player.armor));
      state.player.hp -= blastDmg;
      state.player.invulnTimer = INVULN_TIME;
      state.stats.damageTaken += blastDmg;
      state.stats.wasHit = true;
      addDmgNum(state, state.player.x, state.player.y - 20, String(blastDmg), '#FB923C');
    }
  }
  
  if (state.combo.count % COMBO_BONUS_STEP === 0) {
    addDmgNum(state, enemy.x, enemy.y - 36, `${state.combo.count}x combo`, '#2DD4BF');
    dropPickup(state, enemy.x + rng(-14, 14), enemy.y + rng(-14, 14), 'material', Math.max(2, Math.floor(state.combo.count / COMBO_BONUS_STEP)), '🪙');
  }
  
  // Weapon kill tracking for evolution. Only credit the actual killing weapon.
  if (sourceWeapon && !sourceWeapon.evolved) {
    sourceWeapon.killCount++;
    if (sourceWeapon.killCount === WEAPON_EVOLVE_KILLS) {
      playSound('evolve');
      addDmgNum(state, enemy.x, enemy.y - 50, `${WEAPONS[sourceWeapon.id]?.name ?? 'Weapon'} ready!`, '#F59E0B');
    }
  }
  
  if (!enemy.isBoss && rng(0, 100) < 5 + state.player.luck * 0.08) {
    dropPickup(state, enemy.x + rng(-18, 18), enemy.y + rng(-18, 18), 'heal', Math.max(4, Math.round(state.player.maxHp * 0.06)), '🧡');
  }
  if (!enemy.isBoss && rng(0, 100) < 1.4 + state.player.luck * 0.04) {
    dropPickup(state, enemy.x + rng(-18, 18), enemy.y + rng(-18, 18), 'egg', 1, '🥚');
  }
  
  // Drop pickups
  const richMult = state.waveModifier === 'rich' ? 2 : 1;
  const matCount = (enemy.isBoss ? rngInt(20, 50) : rngInt(1, 3)) * richMult;
  const xpCount = enemy.isBoss ? rngInt(5, 10) : rngInt(1, 2);
  const harvestBonus = 1 + state.player.harvesting * 0.05;
  for (let i = 0; i < matCount; i++) {
    if (!dropPickup(state, enemy.x + rng(-20, 20), enemy.y + rng(-20, 20), 'material', Math.round(1 * harvestBonus), '🔩')) break;
  }
  for (let i = 0; i < xpCount; i++) {
    if (!dropPickup(state, enemy.x + rng(-20, 20), enemy.y + rng(-20, 20), 'xp', enemy.isBoss ? 5 : 1, '💎')) break;
  }
}

function spawnDeathParticles(state: GameState, x: number, y: number, emoji: string, color: string, count: number): void {
  for (let i = 0; i < count; i++) {
    const angle = rng(0, Math.PI * 2);
    const speed = rng(DEATH_PARTICLE_SPEED * 0.3, DEATH_PARTICLE_SPEED);
    state.deathParticles.push({
      id: nid(), x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 30,
      emoji: emoji.length > 2 ? '💥' : emoji,
      size: rng(10, 20),
      t: 0.6, maxT: 0.6,
      color,
    });
  }
}

function updateDeathParticles(state: GameState, dt: number): void {
  for (const p of state.deathParticles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 120 * dt; // gravity
    p.t -= dt;
  }
  state.deathParticles = state.deathParticles.filter(p => p.t > 0);
}

function dropPickup(state: GameState, x: number, y: number, type: Pickup['type'], value: number, emoji: string): boolean {
  if (state.pickups.length >= MAX_PICKUPS) return false;
  state.pickups.push({ id: nid(), x, y, type, value, emoji });
  return true;
}

// ═══ PROJECTILES ═══
function updateProjectiles(state: GameState, dt: number): void {
  for (const proj of state.projectiles) {
    proj.x += proj.vx * dt;
    proj.y += proj.vy * dt;
    proj.life -= dt;
  }
}

function checkProjectileHits(state: GameState): void {
  const p = state.player;
  for (const proj of state.projectiles) {
    if (proj.life <= 0) continue;
    if (proj.isEnemy) {
      // Hit player
      if (dist(proj, p) < p.radius + proj.radius) {
        if (p.invulnTimer <= 0 && !p.abilityActive) {
          const dodgeRoll = rng(0, 100);
          if (dodgeRoll >= p.dodge) {
            const dmg = Math.max(1, Math.round(proj.damage - p.armor));
            p.hp -= dmg;
            p.invulnTimer = INVULN_TIME;
            state.stats.damageTaken += dmg;
            state.stats.wasHit = true;
            addDmgNum(state, p.x, p.y - 20, String(dmg), '#EF4444');
            state.shake = { x: 0, y: 0, timer: 0.15, intensity: 5 };
          } else {
            addDmgNum(state, p.x, p.y - 20, 'DODGE', '#06B6D4');
          }
        }
        proj.life = 0;
      }
    } else {
      // Hit enemies
      for (const e of state.enemies) {
        if (!e.alive) continue;
        if (proj.piercing && proj.hitIds.includes(e.id)) continue;
        if (dist(proj, e) < e.radius + proj.radius) {
          const isCrit = rng(0, 100) < p.critChance;
          const sourceWeapon = proj.sourceWeaponIndex !== undefined ? p.weapons[proj.sourceWeaponIndex] : undefined;
          dealDamage(state, e, isCrit ? proj.damage * 2 : proj.damage, isCrit, sourceWeapon);
          if (proj.piercing) {
            proj.hitIds.push(e.id);
          } else {
            proj.life = 0;
            break;
          }
        }
      }
      if (proj.life <= 0) continue;
      for (const node of state.resourceNodes) {
        if (!node.alive) continue;
        if (dist(proj, node) < node.radius + proj.radius) {
          dealNodeDamage(state, node, proj.damage);
          proj.life = 0;
          break;
        }
      }
    }
  }
}

// ═══ ENEMY-PLAYER COLLISION ═══
function checkEnemyPlayerHits(state: GameState): void {
  const p = state.player;
  if (p.invulnTimer > 0 || p.abilityActive) return;
  for (const e of state.enemies) {
    if (!e.alive) continue;
    const d = dist(p, e);
    if (d < p.radius + e.radius) {
      const dodgeRoll = rng(0, 100);
      if (dodgeRoll >= p.dodge) {
        let dmg = Math.max(1, Math.round(e.damage - p.armor));
        if (state.waveModifier === 'hazardous') dmg = Math.round(dmg * 1.4);
        p.hp -= dmg;
        p.invulnTimer = INVULN_TIME;
        state.stats.damageTaken += dmg;
        state.stats.wasHit = true;
        addDmgNum(state, p.x, p.y - 20, String(dmg), '#EF4444');
        state.shake = { x: 0, y: 0, timer: 0.25, intensity: 7 };
        state.hitStop = Math.max(state.hitStop, HIT_STOP_DURATION);
        haptic('medium');
      } else {
        addDmgNum(state, p.x, p.y - 20, 'DODGE', '#06B6D4');
        p.invulnTimer = 0.2;
      }
      // Push enemy away
      if (d > 0.1) {
        e.knockbackX = ((e.x - p.x) / d) * 6;
        e.knockbackY = ((e.y - p.y) / d) * 6;
      }
    }
  }
}

// ═══ PICKUPS ═══
function updatePickups(state: GameState, dt: number): void {
  const p = state.player;
  const range = p.pickupRange * (1 + p.luck * 0.01);
  for (const pk of state.pickups) {
    const d = dist(p, pk);
    if (d < range) {
      const dir = norm(sub({ x: p.x, y: p.y }, { x: pk.x, y: pk.y }));
      const spd = PICKUP_MAGNET_SPEED;
      pk.x += dir.x * spd * dt;
      pk.y += dir.y * spd * dt;
    }
  }
}

function checkPickupCollection(state: GameState): void {
  const p = state.player;
  const collectR = 25;
  state.pickups = state.pickups.filter(pk => {
    if (dist(p, pk) < collectR) {
      if (pk.type === 'material') {
        state.materials += pk.value;
        state.stats.materialsCollected += pk.value;
        playSound('pickupMat');
      } else if (pk.type === 'xp') {
        p.xp += pk.value;
        playSound('pickup');
      } else if (pk.type === 'heal') {
        p.hp = Math.min(p.maxHp, p.hp + pk.value);
        addDmgNum(state, p.x, p.y - 28, `+${pk.value}`, '#FB7185');
        playSound('heal');
      } else {
        hatchPet(state);
        playSound('pickup');
      }
      return false;
    }
    return true;
  });
}

// ═══ HAZARDS ═══
function spawnHazards(state: GameState, count: number): void {
  state.hazards = [];
  const toSpawn = Math.min(count, MAX_HAZARDS);
  for (let i = 0; i < toSpawn; i++) {
    let x = ARENA_W / 2;
    let y = ARENA_H / 2;
    for (let tries = 0; tries < 30; tries++) {
      x = rng(140, state.arena.width - 140);
      y = rng(140, state.arena.height - 140);
      const farFromPlayer = dist({ x, y }, state.player) > 240;
      const farFromOthers = state.hazards.every(h => dist({ x, y }, h) > HAZARD_RADIUS * 2.8);
      if (farFromPlayer && farFromOthers) break;
    }
    state.hazards.push({
      id: nid(), x, y,
      radius: HAZARD_RADIUS,
      damage: HAZARD_BASE_DAMAGE + Math.floor(state.wave.number * 0.8),
      pulse: rng(0, Math.PI * 2),
      emoji: rng(0, 1) < 0.5 ? '🪸' : '☠️',
    });
  }
}

function updateHazards(state: GameState, dt: number): void {
  if (state.hazards.length === 0) return;
  const p = state.player;
  for (const h of state.hazards) {
    h.pulse += dt * 4;
    if (p.invulnTimer <= 0 && !p.abilityActive && dist(p, h) < p.radius + h.radius * 0.72) {
      const dmg = Math.max(1, Math.round(h.damage - p.armor * 0.5));
      p.hp -= dmg;
      p.invulnTimer = INVULN_TIME;
      state.stats.damageTaken += dmg;
      state.stats.wasHit = true;
      addDmgNum(state, p.x, p.y - 22, String(dmg), '#FB923C');
      addEffect(state, h.x, h.y, 'ring', '#FB923C', 0, h.radius);
      state.shake = { x: 0, y: 0, timer: 0.18, intensity: 6 };
      state.hitStop = Math.max(state.hitStop, HIT_STOP_DURATION);
    }
  }
}

function hatchPet(state: GameState): void {
  const kinds: PetKind[] = ['snapper', 'spark', 'mender'];
  const kind = kinds[rngInt(0, kinds.length - 1)];
  const def = PET_DEFS[kind];
  if (state.pets.length >= MAX_PETS) {
    state.materials += 12;
    addDmgNum(state, state.player.x, state.player.y - 36, '+12 overflow', '#FBBF24');
    return;
  }
  const angle = rng(0, Math.PI * 2);
  const pet: PetCompanion = {
    id: nid(), kind, x: state.player.x + Math.cos(angle) * 42, y: state.player.y + Math.sin(angle) * 42,
    emoji: def.emoji, name: def.name, color: def.color, generation: 1,
    attackName: def.attackName, trait: def.trait, traitDesc: def.traitDesc,
    level: 1, cooldownTimer: rng(0, 0.4), radius: 12, damage: def.damage,
    attackFlash: 0, action: 'idle', aimAngle: 0,
    perks: [],
  };
  state.pets.push(pet);
  addDmgNum(state, state.player.x, state.player.y - 42, `${def.name} joined!`, def.color);
  addEffect(state, pet.x, pet.y, 'ring', def.color, 0, 46);
}

// ═══ EFFECTS ═══
function addDmgNum(state: GameState, x: number, y: number, text: string, color: string): void {
  if (state.dmgNums.length >= MAX_DMG_NUMS) state.dmgNums.shift();
  state.dmgNums.push({ id: nid(), x, y, text, color, t: 0.8, maxT: 0.8 });
}

function updateDmgNums(state: GameState, dt: number): void {
  for (const d of state.dmgNums) d.t -= dt;
  state.dmgNums = state.dmgNums.filter(d => d.t > 0);
}

function addEffect(state: GameState, x: number, y: number, kind: VisualEffectKind, color: string, angle: number, radius: number): void {
  if (state.effects.length >= MAX_EFFECTS) state.effects.shift();
  state.effects.push({ id: nid(), x, y, kind, color, angle, radius, t: 0.22, maxT: 0.22 });
}

type VisualEffectKind = 'slash' | 'muzzle' | 'zap' | 'ring' | 'spark' | 'burst' | 'smoke' | 'beam' | 'heal';

function updateEffects(state: GameState, dt: number): void {
  for (const fx of state.effects) fx.t -= dt;
  state.effects = state.effects.filter(fx => fx.t > 0);
}

function updateCombo(state: GameState, dt: number): void {
  if (state.combo.timer <= 0) return;
  state.combo.timer = Math.max(0, state.combo.timer - dt);
  if (state.combo.timer <= 0) {
    state.combo.count = 0;
  }
}

function updateShake(state: GameState, dt: number): void {
  if (state.shake.timer > 0) {
    state.shake.timer -= dt;
    state.shake.x = rng(-1, 1) * state.shake.intensity;
    state.shake.y = rng(-1, 1) * state.shake.intensity;
  } else {
    state.shake.x = 0;
    state.shake.y = 0;
  }
}

// ═══ WAVES ═══
function updateWaveTimer(state: GameState, dt: number): void {
  state.wave.timer -= dt;
  if (state.wave.timer <= 0) {
    // Boss waves cannot end on a timer expiring — the boss must actually die.
    // Spawning is already gated by maxSpawns so adds will stop naturally.
    if (isBossWave(state.wave.number)) {
      const bossAlive = state.wave.bossSpawned && state.enemies.some(e => e.alive && e.isBoss);
      if (bossAlive) {
        state.wave.timer = 0;
        return;
      }
    }
    endWave(state);
  }
}

function endWave(state: GameState): void {
  // Kill remaining enemies, drop loot
  for (const e of state.enemies) {
    if (e.alive) {
      e.alive = false;
      if (state.pickups.length < MAX_PICKUPS) {
        state.pickups.push({
          id: nid(), x: e.x + rng(-10, 10), y: e.y + rng(-10, 10),
          type: 'material', value: 1, emoji: '🔩',
        });
      }
    }
  }
  state.projectiles = [];
  state.phase = 'collecting';
  state.wave.collectTimer = COLLECT_TIME;
}

// Weighted: vampiric and shielded are noticeably nastier than the rest,
// so they're rarer. Fast and explosive stay common for variety.
const ELITE_WEIGHTS: ReadonlyArray<readonly [string, number]> = [
  ['fast', 30],
  ['explosive', 25],
  ['tanky', 20],
  ['vampiric', 15],
  ['shielded', 10],
];
const ELITE_TOTAL_WEIGHT = ELITE_WEIGHTS.reduce((s, [, w]) => s + w, 0);

function rollElite(state: GameState): string {
  if (state.wave.number < 3) return 'none';
  const chance = ELITE_CHANCE_BASE + (state.wave.number - 3) * ELITE_CHANCE_WAVE;
  if (rng(0, 1) > Math.min(chance, 0.35)) return 'none';
  let roll = rng(0, ELITE_TOTAL_WEIGHT);
  for (const [kind, weight] of ELITE_WEIGHTS) {
    roll -= weight;
    if (roll <= 0) return kind;
  }
  return 'fast';
}

function applyEliteStats(enemy: Enemy, elite: string): void {
  enemy.elite = elite as any;
  switch (elite) {
    case 'fast':
      enemy.speed *= 1.6;
      enemy.emoji = '💨' + enemy.emoji;
      break;
    case 'tanky':
      enemy.maxHp = Math.round(enemy.maxHp * 2.2);
      enemy.hp = enemy.maxHp;
      enemy.emoji = '🛡️' + enemy.emoji;
      break;
    case 'explosive':
      enemy.damage = Math.round(enemy.damage * 1.3);
      enemy.emoji = '💣' + enemy.emoji;
      break;
    case 'vampiric':
      enemy.damage = Math.round(enemy.damage * 1.15);
      enemy.emoji = '🦇' + enemy.emoji;
      break;
    case 'shielded':
      enemy.maxShieldHp = Math.round(MAX_ELITE_SHIELD * (1 + enemy.maxHp / 100));
      enemy.shieldHp = enemy.maxShieldHp;
      enemy.emoji = '🔷' + enemy.emoji;
      break;
  }
}

function spawnEnemies(state: GameState, dt: number): void {
  let aliveCount = 0;
  for (const e of state.enemies) if (e.alive) aliveCount++;
  state.wave.spawnTimer -= dt;
  if (state.wave.spawnTimer > 0) return;

  const available = ENEMY_DEFS.filter(e => e.minWave <= state.wave.number);
  if (available.length === 0) return;
  const totalW = available.reduce((s, e) => s + e.spawnWeight, 0);
  let roll = rng(0, totalW);
  let chosen = available[0];
  for (const e of available) {
    roll -= e.spawnWeight;
    if (roll <= 0) { chosen = e; break; }
  }

  // Boss check
  const isBoss = isBossWave(state.wave.number) && !state.wave.bossSpawned;
  if (!isBoss && aliveCount >= MAX_ENEMIES) return;
  if (!isBoss && state.wave.enemiesSpawned >= state.wave.maxSpawns) return;
  state.wave.spawnTimer = state.wave.spawnInterval;
  if (isBoss) state.wave.bossSpawned = true;
  if (isBoss) {
    chosen = available.reduce((best, candidate) => {
      const bestScore = best.hp + best.damage * 5 + best.radius;
      const candidateScore = candidate.hp + candidate.damage * 5 + candidate.radius;
      return candidateScore > bestScore ? candidate : best;
    }, available[0]);
  }

  // Elite check
  let elite = 'none';
  if (!isBoss && state.waveModifier === 'elite') {
    elite = rng(0, 1) < 0.6 ? rollElite(state) : 'none';
  } else if (!isBoss) {
    elite = rollElite(state);
  }

  const edge = rngInt(0, 3);
  const cam = state.camera;
  const sw2 = state.sw / 2;
  const sh2 = state.sh / 2;
  let sx: number, sy: number;
  switch (edge) {
    case 0: sx = rng(cam.x - sw2 - SPAWN_MARGIN, cam.x + sw2 + SPAWN_MARGIN); sy = cam.y - sh2 - SPAWN_MARGIN; break;
    case 1: sx = cam.x + sw2 + SPAWN_MARGIN; sy = rng(cam.y - sh2 - SPAWN_MARGIN, cam.y + sh2 + SPAWN_MARGIN); break;
    case 2: sx = rng(cam.x - sw2 - SPAWN_MARGIN, cam.x + sw2 + SPAWN_MARGIN); sy = cam.y + sh2 + SPAWN_MARGIN; break;
    default: sx = cam.x - sw2 - SPAWN_MARGIN; sy = rng(cam.y - sh2 - SPAWN_MARGIN, cam.y + sh2 + SPAWN_MARGIN); break;
  }
  sx = clamp(sx, 20, state.arena.width - 20);
  sy = clamp(sy, 20, state.arena.height - 20);

  const hpM = (1.18 + (state.wave.number - 1) * ENEMY_HP_SCALE) * (state.waveModifier === 'armored' ? 1.45 : 1);
  const dmgM = (1.08 + (state.wave.number - 1) * ENEMY_DMG_SCALE) * (state.waveModifier === 'hazardous' ? 1.12 : 1);
  const count = chosen.type === 'swarmer' ? (state.waveModifier === 'swarm' ? 6 : 4) : 1;

  for (let i = 0; i < count; i++) {
    if (aliveCount >= MAX_ENEMIES) break;
    const ox = chosen.type === 'swarmer' ? rng(-30, 30) : 0;
    const oy = chosen.type === 'swarmer' ? rng(-30, 30) : 0;
    const enemy: Enemy = {
      id: nid(), type: chosen.type,
      x: clamp(sx + ox, 20, state.arena.width - 20),
      y: clamp(sy + oy, 20, state.arena.height - 20),
      hp: Math.round(chosen.hp * hpM * (isBoss ? BOSS_HP_MULT : 1)),
      maxHp: Math.round(chosen.hp * hpM * (isBoss ? BOSS_HP_MULT : 1)),
      speed: chosen.speed, damage: Math.round(chosen.damage * dmgM * (isBoss ? BOSS_DMG_MULT : 1)),
      radius: Math.round(chosen.radius * (isBoss ? BOSS_SIZE_MULT : 1)),
      emoji: chosen.emoji,
      fontSize: Math.round(chosen.fontSize * (isBoss ? BOSS_SIZE_MULT : 1)),
      isBoss, flashTimer: 0,
      knockbackX: 0, knockbackY: 0,
      attackCooldown: chosen.attackCooldown,
      alive: true,
      elite: 'none',
      shieldHp: 0, maxShieldHp: 0,
      telegraphTimer: 0, telegraphMax: 0, telegraphType: 'none',
    };
    if (isBoss) {
      enemy.maxShieldHp = Math.round(enemy.maxHp * 0.18);
      enemy.shieldHp = enemy.maxShieldHp;
      enemy.speed *= 1.08;
    }
    if (state.waveModifier === 'armored' && !isBoss) {
      enemy.maxShieldHp = Math.max(enemy.maxShieldHp, Math.round(enemy.maxHp * 0.18));
      enemy.shieldHp = Math.max(enemy.shieldHp, enemy.maxShieldHp);
    }
    if (!isBoss) applyEliteStats(enemy, elite);
    state.enemies.push(enemy);
    aliveCount++;
  }
  state.wave.enemiesSpawned += count;
}

function spawnResourceNodes(state: GameState, count: number): void {
  const aliveCount = state.resourceNodes.filter(n => n.alive).length;
  const toSpawn = Math.max(0, Math.min(count, MAX_RESOURCE_NODES - aliveCount));
  const kinds: ResourceNode['kind'][] = ['coral', 'kelp', 'crystal'];
  for (let i = 0; i < toSpawn; i++) {
    const kind = kinds[rngInt(0, kinds.length - 1)];
    const def = RESOURCE_NODE_DEFS[kind];
    let x = ARENA_W / 2;
    let y = ARENA_H / 2;
    for (let tries = 0; tries < 20; tries++) {
      x = rng(120, state.arena.width - 120);
      y = rng(120, state.arena.height - 120);
      if (dist({ x, y }, state.player) > 220 && state.resourceNodes.every(n => !n.alive || dist({ x, y }, n) > 110)) break;
    }
    state.resourceNodes.push({
      id: nid(), x, y, kind,
      hp: def.hp + state.wave.number * 3,
      maxHp: def.hp + state.wave.number * 3,
      radius: def.radius, emoji: def.emoji, alive: true, flashTimer: 0,
    });
  }
}

// ═══ CAMERA ═══
function updateCamera(state: GameState, input: Vec2): void {
  const p = state.player;
  // Lookahead based on movement direction
  const lookaheadDist = 40;
  const targetX = clamp(p.x + input.x * lookaheadDist, state.sw / 2, state.arena.width - state.sw / 2);
  const targetY = clamp(p.y + input.y * lookaheadDist, state.sh / 2, state.arena.height - state.sh / 2);
  state.camera.x = lerp(state.camera.x, targetX, 0.08);
  state.camera.y = lerp(state.camera.y, targetY, 0.08);
}

// ═══ CLEANUP ═══
function cleanup(state: GameState): void {
  state.enemies = state.enemies.filter(e => e.alive);
  state.projectiles = state.projectiles.filter(p => p.life > 0);
  state.resourceNodes = state.resourceNodes.filter(n => n.alive);
}

// ═══ LEVEL UP ═══
function checkLevelUp(state: GameState): void {
  const p = state.player;
  if (p.xp >= p.xpToNext) {
    p.xp -= p.xpToNext;
    p.level++;
    p.xpToNext = XP_BASE + (p.level - 1) * XP_INC;
    playSound('levelup');
    haptic('success');
    generateLevelUpChoices(state);
    state.prevPhase = state.phase;
    state.phase = 'levelup';
  }
}

type LevelUpPoolEntry = Readonly<{
  stat: string;
  emoji: string;
  name: string;
  amounts: readonly number[];
  fmt: string;
}>;

const LU_POOL: readonly LevelUpPoolEntry[] = Object.freeze([
  Object.freeze({ stat: 'maxHp', emoji: '❤️', name: 'Max HP', amounts: Object.freeze([10, 15, 20, 30]), fmt: '+{n} Max HP' }),
  Object.freeze({ stat: 'speed', emoji: '🏃', name: 'Speed', amounts: Object.freeze([5, 8, 12, 18]), fmt: '+{n}% Speed' }),
  Object.freeze({ stat: 'damage', emoji: '💪', name: 'Damage', amounts: Object.freeze([5, 8, 12, 20]), fmt: '+{n}% Damage' }),
  Object.freeze({ stat: 'armor', emoji: '🛡️', name: 'Armor', amounts: Object.freeze([1, 2, 3, 5]), fmt: '+{n} Armor' }),
  Object.freeze({ stat: 'dodge', emoji: '🌀', name: 'Dodge', amounts: Object.freeze([3, 5, 8, 12]), fmt: '+{n}% Dodge' }),
  Object.freeze({ stat: 'luck', emoji: '🍀', name: 'Luck', amounts: Object.freeze([3, 5, 8, 15]), fmt: '+{n} Luck' }),
  Object.freeze({ stat: 'harvesting', emoji: '💰', name: 'Harvesting', amounts: Object.freeze([3, 5, 8, 12]), fmt: '+{n} Harvesting' }),
  Object.freeze({ stat: 'attackSpeed', emoji: '⚡', name: 'Atk Speed', amounts: Object.freeze([5, 8, 12, 20]), fmt: '+{n}% Atk Speed' }),
  Object.freeze({ stat: 'critChance', emoji: '🎯', name: 'Crit Chance', amounts: Object.freeze([3, 5, 8, 12]), fmt: '+{n}% Crit' }),
]);

// Fisher-Yates shuffle (non-mutating on source)
function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateLevelUpChoices(state: GameState): void {
  const pool: LevelUpPoolEntry[] = [...LU_POOL];
  // Add heal if low HP
  if (state.player.hp < state.player.maxHp * 0.7) {
    pool.push(Object.freeze({ stat: 'heal', emoji: '🧡', name: 'Heal', amounts: Object.freeze([20, 30, 50, 75]), fmt: 'Heal {n}% HP' }));
  }
  const shuffled = shuffle(pool).slice(0, 3);
  const rarities: Rarity[] = ['common', 'uncommon', 'rare', 'legendary'];
  state.levelUpOptions = [];
  state._levelUpApply = [];
  shuffled.forEach((opt, idx) => {
    const rarity = rollRarity(state.player.luck);
    const ri = rarities.indexOf(rarity);
    const amount = opt.amounts[ri] ?? opt.amounts[0];
    const desc = opt.fmt.replace('{n}', String(amount));
    state.levelUpOptions.push({ emoji: opt.emoji, name: opt.name, desc, rarity, index: idx });
    state._levelUpApply.push((p: PlayerState) => {
      applyStatChange(p, opt.stat, amount);
    });
  });
}

// Soft caps prevent late-game stat stacking from trivializing runs.
// Values picked to leave headroom while still ending the power curve.
const STAT_CAPS = {
  speedMult: 2.5,
  damageMult: 5.0,
  attackSpeedMult: 3.0,
  dodge: 60,
  critChance: 100,
} as const;

function applyStatChange(p: PlayerState, stat: string, amount: number): void {
  switch (stat) {
    case 'maxHp': p.maxHp += amount; p.hp += amount; break;
    case 'speed': p.speedMult = Math.min(STAT_CAPS.speedMult, p.speedMult + amount / 100); break;
    case 'damage': p.damageMult = Math.min(STAT_CAPS.damageMult, p.damageMult + amount / 100); break;
    case 'armor': p.armor += amount; break;
    case 'dodge': p.dodge = Math.min(STAT_CAPS.dodge, p.dodge + amount); break;
    case 'luck': p.luck += amount; break;
    case 'harvesting': p.harvesting += amount; break;
    case 'attackSpeed': p.attackSpeedMult = Math.min(STAT_CAPS.attackSpeedMult, p.attackSpeedMult + amount / 100); break;
    case 'critChance': p.critChance = Math.min(STAT_CAPS.critChance, p.critChance + amount); break;
    case 'pickupRange': p.pickupRange += amount; break;
    case 'heal': p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * amount / 100)); break;
  }
}

export function applyLevelUpChoice(state: GameState, index: number): void {
  const fn = state._levelUpApply?.[index];
  if (fn) fn(state.player);
  state.phase = 'playing';
}

// ═══ DEATH ═══
function checkDeath(state: GameState): void {
  if (state.player.hp <= 0) {
    state.player.hp = 0;
    state.phase = 'gameover';
    haptic('warning');
  }
}

// ═══ SHOP ═══
export function generateShopItems(state: GameState): void {
  state.shopSlots = [];
  const waveInf = 1 + state.wave.number * PRICE_INFLATION;
  for (let i = 0; i < 4; i++) {
    const isWeapon = Math.random() < 0.4;
    const rarity = rollRarity(state.player.luck);
    const baseP = BASE_PRICES[rarity] ?? 10;
    const price = Math.round(baseP * waveInf);
    if (isWeapon) {
      const wId = WEAPON_IDS[rngInt(0, WEAPON_IDS.length - 1)];
      const wDef = WEAPONS[wId];
      state.shopSlots.push({
        kind: 'weapon', weaponId: wId, rarity, price, bought: false, locked: false,
        name: wDef?.name ?? 'Unknown', emoji: wDef?.emoji ?? '❓',
        desc: wDef?.desc ?? '',
      });
    } else {
      const iDef = ITEM_DEFS[rngInt(0, ITEM_DEFS.length - 1)];
      const mult = RARITY_ITEM_MULT[rarity] ?? 1;
      const amount = Math.round((iDef?.baseAmount ?? 0) * mult);
      state.shopSlots.push({
        kind: 'item', itemId: iDef?.id, rarity, price, bought: false, locked: false,
        name: iDef?.name ?? 'Unknown', emoji: iDef?.emoji ?? '❓',
        desc: (iDef?.desc ?? '').replace('{n}', String(amount)),
      });
    }
  }
}

function applyEvolution(state: GameState, weaponIndex: number): void {
  const weapon = state.player.weapons[weaponIndex];
  if (!weapon || weapon.evolved) return;
  weapon.evolved = true;
  state.stats.weaponsEvolved++;
  playSound('evolve');
  addDmgNum(state, state.player.x, state.player.y - 50, `${EVOLVED_WEAPONS[weapon.id]?.name ?? 'Weapon'}!`, '#F59E0B');
  addEffect(state, state.player.x, state.player.y, 'burst', '#F59E0B', 0, 70);
  state.shake = { x: 0, y: 0, timer: 0.35, intensity: 6 };
}

export function evolveWeapon(state: GameState, weaponIndex: number): boolean {
  const weapon = state.player.weapons[weaponIndex];
  if (!weapon || weapon.evolved) return false;
  if (weapon.killCount < WEAPON_EVOLVE_KILLS) return false;
  if (state.materials < WEAPON_EVOLVE_COST) return false;
  state.materials -= WEAPON_EVOLVE_COST;
  applyEvolution(state, weaponIndex);
  return true;
}

export function buyShopItem(state: GameState, index: number): boolean {
  const slot = state.shopSlots?.[index];
  if (!slot || slot.bought || state.materials < slot.price) return false;

  // Check for duplicate weapon -> evolve. The shop slot price is the only
  // material cost in this path; we do NOT also charge WEAPON_EVOLVE_COST.
  if (slot.kind === 'weapon' && slot.weaponId) {
    const existing = state.player.weapons.find(w => w.id === slot.weaponId && !w.evolved);
    if (existing && existing.killCount >= WEAPON_EVOLVE_KILLS) {
      state.materials -= slot.price;
      slot.bought = true;
      applyEvolution(state, state.player.weapons.indexOf(existing));
      return true;
    }
    // If it did not evolve, it consumes a weapon slot. Never exceed capacity.
    if (state.player.weapons.length >= 6) return false;
  }

  state.materials -= slot.price;
  slot.bought = true;

  if (slot.kind === 'weapon' && slot.weaponId) {
    state.player.weapons.push({
      id: slot.weaponId, cooldownTimer: 0,
      rarityMult: RARITY_WPN_MULT[slot.rarity] ?? 1,
      evolved: false, killCount: 0,
    });
  } else if (slot.kind === 'item' && slot.itemId) {
    const iDef = ITEM_DEFS.find(i => i.id === slot.itemId);
    if (iDef) {
      const mult = RARITY_ITEM_MULT[slot.rarity] ?? 1;
      const amount = Math.round(iDef.baseAmount * mult);
      applyStatChange(state.player, iDef.stat, amount);
      state.player.items.push({ id: slot.itemId, rarity: slot.rarity });
    }
  }
  return true;
}

export function rerollShop(state: GameState): boolean {
  if (state.materials < state.rerollCost) return false;
  state.materials -= state.rerollCost;
  state.rerollCost += REROLL_INC;
  // Keep locked items
  const locked = state.shopSlots.filter(s => s.locked);
  generateShopItems(state);
  locked.forEach((l, i) => {
    if (i < state.shopSlots.length) state.shopSlots[i] = l;
  });
  return true;
}

export function healPlayer(state: GameState): boolean {
  if (state.materials < state.healCost) return false;
  if (state.player.hp >= state.player.maxHp) return false;
  state.materials -= state.healCost;
  state.player.hp = Math.min(state.player.maxHp, state.player.hp + Math.round(state.player.maxHp * HEAL_PERCENT));
  return true;
}

export function buyEgg(state: GameState): boolean {
  const cost = 18 + state.pets.length * 6 + state.wave.number * 2;
  if (state.materials < cost) return false;
  state.materials -= cost;
  hatchPet(state);
  return true;
}

export function trainPets(state: GameState): boolean {
  if (state.pets.length === 0) return false;
  if (state.pets.every(pet => pet.level >= PET_MAX_LEVEL)) return false;
  const cost = 10 + state.pets.reduce((sum, pet) => sum + pet.level * 4, 0);
  if (state.materials < cost) return false;
  state.materials -= cost;
  for (const pet of state.pets) {
    if (pet.level >= PET_MAX_LEVEL) continue;
    const prevPerks = pet.perks.length;
    pet.level++;
    pet.damage += 1 + Math.floor(pet.level / 4);
    pet.radius = Math.min(18, pet.radius + 0.75);
    pet.cooldownTimer = 0;
    pet.attackFlash = 1;
    pet.action = 'heal';
    pet.perks = getPetPerks(pet.kind, pet.level);
    addEffect(state, pet.x, pet.y, 'ring', pet.color, 0, 34 + pet.level * 3);
    addDmgNum(state, pet.x, pet.y - 28, `Lv.${pet.level}`, pet.color);
    if (pet.perks.length > prevPerks) {
      const newPerk = pet.perks[pet.perks.length - 1];
      addDmgNum(state, pet.x, pet.y - 46, `${newPerk.emoji} ${newPerk.name}!`, '#F59E0B');
    }
  }
  addEffect(state, state.player.x, state.player.y, 'burst', '#2DD4BF', 0, 58);
  addDmgNum(state, state.player.x, state.player.y - 44, 'brood trained +1', '#2DD4BF');
  return true;
}

export function fusePets(state: GameState): boolean {
  const groups = new Map<PetKind, PetCompanion[]>();
  for (const pet of state.pets) {
    const group = groups.get(pet.kind);
    if (group) group.push(pet);
    else groups.set(pet.kind, [pet]);
  }
  for (const group of groups.values()) {
    group.sort((a, b) => a.level - b.level);
    for (let i = 0; i < group.length - 1; i++) {
      const a = group[i];
      const b = group[i + 1];
      if (a.level !== b.level) continue;
      const cost = 8 + a.level * 8;
      if (state.materials < cost) return false;
      state.materials -= cost;
      a.level = Math.min(PET_MAX_LEVEL + 3, a.level + 2);
      a.damage += Math.max(3, Math.round(b.damage * 0.7));
      a.radius = Math.min(20, a.radius + 1.5);
      a.cooldownTimer = 0;
      a.generation = Math.max(a.generation, b.generation) + 1;
      a.name = a.generation >= 3 ? `Prime ${PET_DEFS[a.kind].name}` : `${PET_DEFS[a.kind].name} II`;
      a.attackFlash = 1;
      a.action = 'heal';
      a.perks = getPetPerks(a.kind, a.level);
      state.pets = state.pets.filter(p => p.id !== b.id);
      addDmgNum(state, a.x, a.y - 34, `${a.name} bred Lv.${a.level}`, '#FBBF24');
      addEffect(state, a.x, a.y, 'ring', a.color, 0, 62);
      addEffect(state, a.x, a.y, 'burst', '#FBBF24', 0, 54);
      return true;
    }
  }
  return false;
}

export function startNextWave(state: GameState): void {
  state.wave.number++;
  if (state.wave.number > MAX_WAVES) {
    state.victory = true;
    state.phase = 'gameover';
    return;
  }
  rollWaveModifier(state);
  const bossWave = isBossWave(state.wave.number);
  const waveDuration = getWaveDuration(state.wave.number);
  state.wave.timer = waveDuration;
  state.wave.maxTime = state.wave.timer;
  state.wave.spawnTimer = 0.25;
  
  // Apply modifier effects
  let spawnInterval = Math.max(0.32, 1.02 - state.wave.number * 0.032);
  let maxSpawns = Math.ceil(waveDuration / spawnInterval) + 12 + state.wave.number * 3;
  if (bossWave) {
    spawnInterval *= 0.88;
    maxSpawns += 18;
  }
  switch (state.waveModifier) {
    case 'doubleSpeed':
      spawnInterval *= 0.6;
      break;
    case 'swarm':
      maxSpawns = Math.round(maxSpawns * 1.35);
      spawnInterval *= 0.7;
      break;
    case 'armored':
      maxSpawns = Math.round(maxSpawns * 0.7);
      break;
    case 'rich':
      maxSpawns = Math.round(maxSpawns * 1.2);
      break;
  }
  state.wave.spawnInterval = spawnInterval;
  state.wave.maxSpawns = maxSpawns;
  
  state.wave.enemiesSpawned = 0;
  state.wave.enemiesKilled = 0;
  state.wave.bossSpawned = false;
  state.wave.announceTimer = ANNOUNCE_TIME;
  state.enemies = [];
  state.projectiles = [];
  state.dmgNums = [];
  state.effects = [];
  state.deathParticles = [];
  state.hazards = [];
  state.combo.count = 0;
  state.combo.timer = 0;
  const nodeBonus = state.waveModifier === 'rich' ? 3 : 0;
  spawnResourceNodes(state, 2 + Math.floor(state.wave.number / 3) + nodeBonus);
  if (state.waveModifier === 'hazardous') {
    spawnHazards(state, 5 + Math.floor(state.wave.number / 2));
  }
  state.phase = 'waveAnnounce';
}

// ═══ ABILITY ═══
export function activateAbility(state: GameState, input: Vec2): void {
  const p = state.player;
  if (p.abilityCooldown > 0 || state.phase !== 'playing') return;
  playSound('ability');
  haptic('light');
  switch (p.characterId) {
    case 'crab':
      p.abilityActive = true;
      p.abilityTimer = 3;
      p.abilityCooldown = p.abilityMaxCooldown;
      p.invulnTimer = 3;
      break;
    case 'octopus': {
      p.abilityCooldown = p.abilityMaxCooldown;
      p.invulnTimer = 0.3;
      const dashDist = 150;
      let dir = { x: input.x, y: input.y };
      if (len(dir) < 0.1) {
        const nearest = findNearest(p, state.enemies, 500);
        dir = nearest ? norm(sub(nearest, p)) : { x: 1, y: 0 };
      } else {
        dir = norm(dir);
      }
      p.x = clamp(p.x + dir.x * dashDist, p.radius, state.arena.width - p.radius);
      p.y = clamp(p.y + dir.y * dashDist, p.radius, state.arena.height - p.radius);
      break;
    }
    case 'squid': {
      p.abilityCooldown = p.abilityMaxCooldown;
      const pulseR = 150;
      for (const e of state.enemies) {
        if (!e.alive) continue;
        if (dist(p, e) <= pulseR + e.radius) {
          dealDamage(state, e, 30 * p.damageMult, false);
        }
      }
      state.shake = { x: 0, y: 0, timer: 0.3, intensity: 8 };
      break;
    }
  }
}

// ═══ PAUSE ═══
export function pauseGame(state: GameState): void {
  if (state.phase === 'playing' || state.phase === 'waveAnnounce') {
    state.prevPhase = state.phase;
    state.phase = 'paused';
  }
}

export function resumeGame(state: GameState): void {
  state.phase = state.prevPhase === 'paused' ? 'playing' : (state.prevPhase ?? 'playing');
}

// ═══ HUD EXTRACTION ═══
export function extractHudData(state: GameState): HudData {
  const p = state.player;
  const cDef = CHARACTERS.find(c => c.id === p.characterId);
  return {
    hp: p.hp, maxHp: p.maxHp, armor: p.armor,
    waveNum: state.wave.number, waveTimer: Math.max(0, state.wave.timer),
    waveMaxTime: state.wave.maxTime,
    materials: state.materials, level: p.level, xp: p.xp, xpToNext: p.xpToNext,
    abilityCd: p.abilityCooldown, abilityMaxCd: p.abilityMaxCooldown,
    abilityEmoji: cDef?.abilityEmoji ?? '⭐',
    comboCount: state.combo.count, comboTimer: state.combo.timer, bestCombo: state.combo.best,
    petCount: state.pets.length, resourceCount: state.resourceNodes.filter(n => n.alive).length,
    phase: state.phase,
    equippedWeapons: p.weapons.map(w => ({ 
      emoji: (w.evolved ? EVOLVED_WEAPONS[w.id] : WEAPONS[w.id])?.emoji ?? '❓',
      evolved: w.evolved,
      killCount: w.killCount,
      evolveKills: WEAPON_EVOLVE_KILLS,
    })),
    waveModifier: state.waveModifier,
    modifierAnnounceTimer: state.modifierAnnounceTimer,
    petSynergies: getPetSynergies(state.pets),
  };
}
