import { setRng, resetRng } from '../math';
import {
  initGameState,
  updateGame,
  generateLevelUpChoices,
  generateShopItems,
  applyLevelUpChoice,
  applyRelicChoice,
  buyShopItem,
  buyEgg,
  evolveWeapon,
  startNextWave,
  extractHudData,
  resetIdCounter,
  activateAbility,
} from '../GameEngine';
import { WEAPON_EVOLVE_COST, WEAPON_EVOLVE_KILLS, WEAPON_MAX_LEVEL, PICKUP_BASE_RANGE } from '../constants';
import type { Enemy, GamePhase, PetCompanion, PetKind } from '../types';

jest.mock('../../services/audio', () => ({
  playSound: jest.fn(),
}));

const SEED_VALUES = [
  0.12, 0.87, 0.34, 0.56, 0.01, 0.99, 0.45, 0.23, 0.78, 0.60,
  0.33, 0.71, 0.09, 0.50, 0.15, 0.88, 0.42, 0.66, 0.03, 0.77,
  0.25, 0.51, 0.93, 0.18, 0.61, 0.39, 0.84, 0.07, 0.52, 0.73,
  0.29, 0.46, 0.91, 0.14, 0.68, 0.35, 0.82, 0.05, 0.58, 0.20,
  0.44, 0.76, 0.11, 0.55, 0.30, 0.89, 0.02, 0.63, 0.48, 0.95,
];

function makeDeterministic() {
  let idx = 0;
  setRng(() => SEED_VALUES[idx++ % SEED_VALUES.length]);
}

beforeEach(() => {
  resetIdCounter();
  makeDeterministic();
  jest.spyOn(Date, 'now').mockReturnValue(1000000);
});

afterEach(() => {
  resetRng();
  jest.restoreAllMocks();
});

describe('initGameState', () => {
  it('produces identical state across calls with same seed', () => {
    const s1 = initGameState('crab', 800, 600);

    resetIdCounter();
    let idx = 0;
    setRng(() => SEED_VALUES[idx++ % SEED_VALUES.length]);
    const s2 = initGameState('crab', 800, 600);

    expect(s1.player.x).toBe(s2.player.x);
    expect(s1.player.y).toBe(s2.player.y);
    expect(s1.player.hp).toBe(s2.player.hp);
    expect(s1.resourceNodes.length).toBe(s2.resourceNodes.length);
    for (let i = 0; i < s1.resourceNodes.length; i++) {
      expect(s1.resourceNodes[i].x).toBe(s2.resourceNodes[i].x);
      expect(s1.resourceNodes[i].y).toBe(s2.resourceNodes[i].y);
      expect(s1.resourceNodes[i].kind).toBe(s2.resourceNodes[i].kind);
    }
  });

  it('starts on wave 1 in waveAnnounce phase', () => {
    const s = initGameState('crab', 800, 600);
    expect(s.wave.number).toBe(1);
    expect(s.phase).toBe('waveAnnounce');
    expect(s.player.facing).toEqual({ x: 1, y: 0 });
  });

  it('applies starting bonuses', () => {
    const base = initGameState('crab', 800, 600);
    resetIdCounter();
    makeDeterministic();
    const boosted = initGameState('crab', 800, 600, { extraHp: 2, extraDamage: 3 });
    expect(boosted.player.maxHp).toBe(base.player.maxHp + 10);
    expect(boosted.player.damageMult).toBeCloseTo(base.player.damageMult + 0.09);
  });
});

describe('generateLevelUpChoices', () => {
  it('returns exactly 3 deterministic choices', () => {
    const state = initGameState('crab', 800, 600);
    generateLevelUpChoices(state);
    expect(state.levelUpOptions).toHaveLength(3);

    const names1 = state.levelUpOptions.map(o => o.name);
    const rarities1 = state.levelUpOptions.map(o => o.rarity);

    resetIdCounter();
    makeDeterministic();
    const state2 = initGameState('crab', 800, 600);
    generateLevelUpChoices(state2);
    const names2 = state2.levelUpOptions.map(o => o.name);
    const rarities2 = state2.levelUpOptions.map(o => o.rarity);

    expect(names1).toEqual(names2);
    expect(rarities1).toEqual(rarities2);
  });
});

describe('generateShopItems', () => {
  it('produces deterministic shop slots', () => {
    const state = initGameState('crab', 800, 600);
    generateShopItems(state);
    const slots1 = state.shopSlots.map(s => ({ kind: s.kind, name: s.name, rarity: s.rarity, price: s.price }));

    resetIdCounter();
    makeDeterministic();
    const state2 = initGameState('crab', 800, 600);
    generateShopItems(state2);
    const slots2 = state2.shopSlots.map(s => ({ kind: s.kind, name: s.name, rarity: s.rarity, price: s.price }));

    expect(slots1).toEqual(slots2);
  });

  it('generates 4 shop slots', () => {
    const state = initGameState('crab', 800, 600);
    generateShopItems(state);
    expect(state.shopSlots).toHaveLength(4);
  });
});

describe('updateGame', () => {
  it('transitions from waveAnnounce to playing', () => {
    const state = initGameState('crab', 800, 600);
    expect(state.phase).toBe('waveAnnounce');
    // Fast-forward past announce
    for (let i = 0; i < 120; i++) {
      updateGame(state, 1 / 60, { x: 0, y: 0 });
    }
    expect(state.phase).toBe('playing');
  });

  it('offers a relic after a boss wave collection phase', () => {
    const state = initGameState('crab', 800, 600);
    state.phase = 'collecting';
    state.wave.number = 5;
    state.wave.collectTimer = 0.01;

    updateGame(state, 0.02, { x: 0, y: 0 });

    expect(state.phase).toBe('relic');
    expect(state.relicChoices).toHaveLength(3);
    expect(state.shopSlots).toHaveLength(0);
  });
});

describe('relic choices', () => {
  it('applies a relic and then opens the shop', () => {
    const state = initGameState('crab', 800, 600);
    const startingMaxHp = state.player.maxHp;
    state.wave.number = 5;
    state.relicChoices = [{
      id: 'glassTide',
      emoji: '💎',
      name: 'Glass Tide',
      desc: '+32% weapon damage and +8% attack speed.',
      drawback: '-20 max HP right now.',
      rarity: 'legendary',
    }];

    expect(applyRelicChoice(state, 0)).toBe(true);
    expect(state.relics).toHaveLength(1);
    expect(state.player.maxHp).toBe(startingMaxHp - 20);
    expect(state.phase).toBe('shopping');
    expect(state.shopSlots).toHaveLength(4);
  });
});

describe('extractHudData', () => {
  it('returns consistent snapshot', () => {
    const state = initGameState('octopus', 800, 600);
    const hud = extractHudData(state);
    expect(hud.hp).toBe(state.player.hp);
    expect(hud.maxHp).toBe(state.player.maxHp);
    expect(hud.waveNum).toBe(1);
    expect(hud.level).toBe(1);
    expect(hud.equippedWeapons).toHaveLength(1);
  });
});

describe('weapon shop upgrades', () => {
  it('does not evolve a weapon until it is max level', () => {
    const state = initGameState('crab', 800, 600);
    const weapon = state.player.weapons[0];
    weapon.killCount = WEAPON_EVOLVE_KILLS;
    weapon.level = WEAPON_MAX_LEVEL - 1;
    state.materials = WEAPON_EVOLVE_COST;

    expect(evolveWeapon(state, 0)).toBe(false);
    expect(weapon.evolved).toBe(false);
    expect(state.materials).toBe(WEAPON_EVOLVE_COST);
  });

  it('evolves a max-level weapon with enough kills and materials', () => {
    const state = initGameState('crab', 800, 600);
    const weapon = state.player.weapons[0];
    weapon.killCount = WEAPON_EVOLVE_KILLS;
    weapon.level = WEAPON_MAX_LEVEL;
    state.materials = WEAPON_EVOLVE_COST;

    expect(evolveWeapon(state, 0)).toBe(true);
    expect(weapon.evolved).toBe(true);
    expect(state.materials).toBe(0);
  });

  it('upgrades an owned duplicate weapon instead of adding a second copy', () => {
    const state = initGameState('crab', 800, 600);
    const startingWeapon = state.player.weapons[0];
    state.materials = 100;
    state.shopSlots = [{
      kind: 'weapon',
      weaponId: startingWeapon.id,
      rarity: 'uncommon',
      price: 25,
      bought: false,
      locked: false,
      name: 'Duplicate',
      emoji: '🦀',
      desc: 'Upgrade duplicate',
    }];

    expect(buyShopItem(state, 0)).toBe(true);
    expect(state.player.weapons).toHaveLength(1);
    expect(startingWeapon.level).toBe(2);
    expect(startingWeapon.rarityMult).toBe(1.3);
    expect(state.materials).toBe(75);
    expect(state.shopSlots[0].bought).toBe(true);
  });

  it('applies the magnet item as a percentage of base pickup range', () => {
    const state = initGameState('crab', 800, 600);
    state.materials = 100;
    state.shopSlots = [{
      kind: 'item',
      itemId: 'magnet',
      rarity: 'common',
      price: 10,
      bought: false,
      locked: false,
      name: 'Magnet',
      emoji: '🧲',
      desc: '+15% Pickup Range',
    }];
    const before = state.player.pickupRange;

    expect(buyShopItem(state, 0)).toBe(true);
    expect(state.player.pickupRange).toBeCloseTo(before + PICKUP_BASE_RANGE * 0.15);
  });
});

function makeTestPet(id: number, kind: PetKind, overrides: Partial<PetCompanion> = {}): PetCompanion {
  return {
    id, kind, x: 0, y: 0,
    emoji: '🐚', name: `Pet ${id}`, color: '#2DD4BF', generation: 1,
    attackName: 'Test', trait: 'Test', traitDesc: '',
    level: 1, cooldownTimer: 5, radius: 12, damage: 3,
    attackFlash: 0, action: 'idle', aimAngle: 0,
    perks: [], barrierCooldown: 0,
    ...overrides,
  };
}

function makeTestEnemy(id: number, x: number, y: number, overrides: Partial<Enemy> = {}): Enemy {
  return {
    id, type: 'chaser', x, y,
    hp: 9999, maxHp: 9999, speed: 0, damage: 10,
    radius: 16, emoji: '👾', fontSize: 28, isBoss: false,
    flashTimer: 0, knockbackX: 0, knockbackY: 0,
    attackCooldown: 0, alive: true, elite: 'none',
    shieldHp: 0, maxShieldHp: 0,
    telegraphTimer: 0, telegraphMax: 0, telegraphType: 'none',
    chargeTimer: 0, chargeCooldown: 0, chargeVx: 0, chargeVy: 0,
    fireTrailTimer: 0,
    ...overrides,
  };
}

describe('brood', () => {
  it('refuses egg purchase when the brood is full', () => {
    const state = initGameState('crab', 800, 600);
    state.materials = 999;
    for (let i = 0; i < 5; i++) state.pets.push(makeTestPet(100 + i, 'snapper'));

    expect(buyEgg(state)).toBe(false);
    expect(state.materials).toBe(999);
  });
});

describe('movement smoothing', () => {
  it('ramps to full speed quickly and stops cleanly on release', () => {
    const state = initGameState('crab', 800, 600);
    state.phase = 'playing';
    const p = state.player;
    const dt = 1 / 60;
    const maxSpeed = p.baseSpeed * p.speedMult * 50;

    for (let i = 0; i < 12; i++) updateGame(state, dt, { x: 1, y: 0 });
    expect(p.moveVx).toBeGreaterThan(maxSpeed * 0.9);
    expect(p.x).toBeGreaterThan(1000);

    for (let i = 0; i < 30; i++) updateGame(state, dt, { x: 0, y: 0 });
    expect(p.moveVx).toBe(0);
    expect(p.moveVy).toBe(0);
  });
});

describe('independent movement and aim input', () => {
  function makeRangedState() {
    const state = initGameState('crab', 800, 600);
    state.phase = 'playing';
    state.resourceNodes = [];
    state.player.weapons = [{ id: 'pistol', cooldownTimer: 0, rarityMult: 1, level: 1, evolved: false, killCount: 0 }];
    return state;
  }

  it('fires explicit aim opposite the nearest enemy, including into empty space', () => {
    const state = makeRangedState();
    const p = state.player;
    state.enemies = [makeTestEnemy(101, p.x - 120, p.y)];

    updateGame(state, 0, { movement: { x: 0, y: 0 }, aim: { x: 1, y: 0 } });

    expect(state.projectiles).toHaveLength(1);
    expect(state.projectiles[0].vx).toBeGreaterThan(0);
    expect(state.projectiles[0].vy).toBeCloseTo(0);
  });

  it('fires explicit structured aim into genuinely empty space', () => {
    const state = makeRangedState();

    expect(state.enemies).toHaveLength(0);
    expect(state.resourceNodes).toHaveLength(0);
    updateGame(state, 0, { movement: { x: 0, y: 0 }, aim: { x: 1, y: 0 } });

    expect(state.projectiles).toHaveLength(1);
    expect(state.projectiles[0].vx).toBeGreaterThan(0);
    expect(state.projectiles[0].vy).toBeCloseTo(0);
  });

  it.each([
    ['absent aim', { movement: { x: 0, y: 0 } }],
    ['zero aim', { movement: { x: 0, y: 0 }, aim: { x: 0, y: 0 } }],
    ['near-zero aim', { movement: { x: 0, y: 0 }, aim: { x: 0.1, y: 0 } }],
  ])('requires a target for structured %s with zero movement', (_label, input) => {
    const state = makeRangedState();

    updateGame(state, 0, input);

    expect(state.enemies).toHaveLength(0);
    expect(state.resourceNodes).toHaveLength(0);
    expect(state.projectiles).toHaveLength(0);
  });

  it.each([
    ['absent aim', { movement: { x: 0, y: 0 } }],
    ['zero aim', { movement: { x: 0, y: 0 }, aim: { x: 0, y: 0 } }],
    ['near-zero aim', { movement: { x: 0, y: 0 }, aim: { x: 0.1, y: 0 } }],
  ])('keeps auto-targeting for structured %s with zero movement when a target exists', (_label, input) => {
    const state = makeRangedState();
    const p = state.player;
    state.enemies = [makeTestEnemy(105, p.x - 120, p.y)];

    updateGame(state, 0, input);

    expect(state.projectiles).toHaveLength(1);
    expect(state.projectiles[0].vx).toBeLessThan(0);
    expect(state.projectiles[0].vy).toBeCloseTo(0);
  });

  it('keeps legacy zero Vec2 ranged auto-fire pointed at the nearest target', () => {
    const state = makeRangedState();
    const p = state.player;
    state.enemies = [makeTestEnemy(102, p.x - 120, p.y)];

    updateGame(state, 0, { x: 0, y: 0 });

    expect(state.projectiles).toHaveLength(1);
    expect(state.projectiles[0].vx).toBeLessThan(0);
    expect(state.projectiles[0].vy).toBeCloseTo(0);
  });

  it('updates facing from aim, then movement, then keeps the prior direction', () => {
    const state = initGameState('crab', 800, 600);
    state.phase = 'playing';

    updateGame(state, 0, { movement: { x: 1, y: 0 }, aim: { x: 0, y: -2 } });
    expect(state.player.facing).toEqual({ x: 0, y: -1 });

    updateGame(state, 0, { movement: { x: 0, y: 4 }, aim: { x: 0, y: 0 } });
    expect(state.player.facing).toEqual({ x: 0, y: 1 });

    updateGame(state, 0, { movement: { x: 0, y: 0 }, aim: { x: 0, y: 0 } });
    expect(state.player.facing).toEqual({ x: 0, y: 1 });
  });

  it.each<GamePhase>(['waveAnnounce', 'collecting'])('updates facing from structured aim during %s', phase => {
    const state = initGameState('crab', 800, 600);
    state.phase = phase;

    updateGame(state, 0, { movement: { x: -1, y: 0 }, aim: { x: 0, y: 2 } });

    expect(state.player.facing).toEqual({ x: 0, y: 1 });
  });

  it('does not mutate facing outside active movement phases', () => {
    const inactivePhases: GamePhase[] = ['paused', 'gameover', 'levelup', 'relic', 'shopping'];
    for (const phase of inactivePhases) {
      const state = initGameState('crab', 800, 600);
      state.phase = phase;
      state.player.facing = { x: -1, y: 0 };

      updateGame(state, 0, { movement: { x: 0, y: 0 }, aim: { x: 0, y: 1 } });

      expect(state.player.facing).toEqual({ x: -1, y: 0 });
    }
  });
});

describe('directed abilities', () => {
  it.each([{ x: 0, y: 0 }, { x: 0.1, y: 0 }])('keeps fresh Octopus legacy input %o targeting the nearest enemy', input => {
    const state = initGameState('octopus', 800, 600);
    state.phase = 'playing';
    const p = state.player;
    const startX = p.x;
    state.enemies = [makeTestEnemy(103, p.x - 300, p.y)];

    activateAbility(state, input);

    expect(p.x).toBeLessThan(startX);
  });

  it('uses the legacy no-target fallback to dash exactly right', () => {
    const state = initGameState('octopus', 800, 600);
    state.phase = 'playing';
    const p = state.player;
    const startX = p.x;
    const startY = p.y;

    expect(state.enemies).toHaveLength(0);
    activateAbility(state, { x: 0, y: 0 });

    expect(p.x).toBe(startX + 150);
    expect(p.y).toBe(startY);
  });

  it('uses remembered facing before nearest enemies for structured zero movement', () => {
    const state = initGameState('octopus', 800, 600);
    state.phase = 'playing';
    const p = state.player;
    const startY = p.y;
    p.facing = { x: 0, y: -1 };
    state.enemies = [makeTestEnemy(104, p.x - 300, p.y)];

    activateAbility(state, { movement: { x: 0, y: 0 } });

    expect(p.x).toBeCloseTo(state.arena.width / 2);
    expect(p.y).toBeLessThan(startY);
  });

  it('uses structured aim before conflicting movement for Octopus dash direction', () => {
    const state = initGameState('octopus', 800, 600);
    state.phase = 'playing';
    const p = state.player;
    const startX = p.x;

    activateAbility(state, { movement: { x: -1, y: 0 }, aim: { x: 1, y: 0 } });

    expect(p.x).toBeGreaterThan(startX);
  });

  it('uses nonzero structured movement before remembered facing for Octopus dash direction', () => {
    const state = initGameState('octopus', 800, 600);
    state.phase = 'playing';
    const p = state.player;
    const startX = p.x;
    p.facing = { x: -1, y: 0 };

    activateAbility(state, { movement: { x: 1, y: 0 } });

    expect(p.x).toBeGreaterThan(startX);
  });

  it('uses remembered facing before a nearby enemy for structured zero movement', () => {
    const state = initGameState('octopus', 800, 600);
    state.phase = 'playing';
    const p = state.player;
    const startY = p.y;
    p.facing = { x: 0, y: -1 };
    state.enemies = [makeTestEnemy(106, p.x - 300, p.y)];

    activateAbility(state, { movement: { x: 0, y: 0 } });

    expect(p.y).toBeLessThan(startY);
  });

  it('uses a nearby enemy after a structured zero facing direction for Octopus dash direction', () => {
    const state = initGameState('octopus', 800, 600);
    state.phase = 'playing';
    const p = state.player;
    const startX = p.x;
    p.facing = { x: 0, y: 0 };
    state.enemies = [makeTestEnemy(107, p.x - 300, p.y)];

    activateAbility(state, { movement: { x: 0, y: 0 } });

    expect(p.x).toBeLessThan(startX);
  });

  it('uses right when structured input, facing, and nearby enemies provide no Octopus dash direction', () => {
    const state = initGameState('octopus', 800, 600);
    state.phase = 'playing';
    const p = state.player;
    const startX = p.x;
    p.facing = { x: 0, y: 0 };
    state.enemies = [];

    activateAbility(state, { movement: { x: 0, y: 0 } });

    expect(p.x).toBeGreaterThan(startX);
  });
});

describe('pet perks', () => {
  it('mend_shield barrier absorbs one enemy contact hit', () => {
    const state = initGameState('crab', 800, 600);
    state.phase = 'playing';
    const p = state.player;
    p.dodge = 0;
    state.pets.push(makeTestPet(9001, 'mender', {
      x: p.x, y: p.y, level: 5,
      perks: [{ id: 'mend_shield', name: 'Barrier', emoji: '🛡️', desc: 'Absorbs one hit every 8s' }],
    }));
    const enemy = makeTestEnemy(9002, p.x, p.y, { damage: 25 });
    state.enemies.push(enemy);
    const hpBefore = p.hp;

    updateGame(state, 1 / 60, { x: 0, y: 0 });

    expect(p.hp).toBe(hpBefore);
    expect(state.pets[0].barrierCooldown).toBeGreaterThan(0);
    expect(p.invulnTimer).toBeGreaterThan(0);
  });
});
