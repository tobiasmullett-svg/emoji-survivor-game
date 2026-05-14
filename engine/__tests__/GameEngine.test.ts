import { setRng, resetRng } from '../math';
import {
  initGameState,
  updateGame,
  generateLevelUpChoices,
  generateShopItems,
  applyLevelUpChoice,
  applyRelicChoice,
  buyShopItem,
  evolveWeapon,
  startNextWave,
  extractHudData,
  resetIdCounter,
} from '../GameEngine';
import { WEAPON_EVOLVE_COST, WEAPON_EVOLVE_KILLS, WEAPON_MAX_LEVEL } from '../constants';

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
});
