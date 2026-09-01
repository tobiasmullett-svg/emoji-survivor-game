import { setRng, resetRng } from '../math';
import { initGameState, updateGame, applyStatusEffect, resetIdCounter } from '../GameEngine';
import type { GameState, Enemy, StatusEffectType } from '../types';

jest.mock('../../services/audio', () => ({ playSound: jest.fn() }));

const DT = 1 / 60;

/**
 * A run with no weapons and the enemy parked far from the player, so the only
 * thing that can move its HP is the status effect under test.
 */
function isolatedRun(): { state: GameState; enemy: Enemy } {
  const state = initGameState('crab', 800, 600);
  state.phase = 'playing';
  state.player.weapons = [];
  state.player.x = 100;
  state.player.y = 100;
  const enemy: Enemy = {
    id: 9999, type: 'chaser', x: 900, y: 900, hp: 1_000_000, maxHp: 1_000_000,
    speed: 0, damage: 0, radius: 16, emoji: '👾', fontSize: 28,
    isBoss: false, flashTimer: 0, knockbackX: 0, knockbackY: 0,
    attackCooldown: 999, alive: true, elite: 'none', shieldHp: 0, maxShieldHp: 0,
    telegraphTimer: 0, telegraphMax: 0, telegraphType: 'none',
    chargeTimer: 0, chargeCooldown: 0, chargeVx: 0, chargeVy: 0,
    fireTrailTimer: 0, statusEffects: [],
  };
  state.enemies.push(enemy);
  return { state, enemy };
}

/** Run `seconds` of simulation, re-applying `type` every `reapplyEvery` s. */
function damageOver(
  seconds: number,
  type: StatusEffectType,
  duration: number,
  perTick: number,
  reapplyEvery: number | null,
): number {
  const { state, enemy } = isolatedRun();
  const startHp = enemy.hp;
  let t = 0;
  let nextApply = 0;
  applyStatusEffect(enemy, type, duration, perTick);
  if (reapplyEvery !== null) nextApply = reapplyEvery;
  while (t < seconds && enemy.alive) {
    if (reapplyEvery !== null && t >= nextApply) {
      applyStatusEffect(enemy, type, duration, perTick);
      nextApply = t + reapplyEvery;
    }
    updateGame(state, DT, { x: 0, y: 0 });
    t += DT;
  }
  return startHp - enemy.hp;
}

beforeEach(() => {
  setRng(() => 0.5);
  resetIdCounter();
});

afterEach(() => {
  resetRng();
});

describe('damage-over-time cadence', () => {
  it('ticks a burn on its own schedule, ~2 ticks per second', () => {
    // 4s burn at 10/tick, ticking every 0.5s → 8 ticks.
    expect(damageOver(4, 'burn', 4, 10, null)).toBe(80);
  });

  it('does not stall when the effect is re-applied', () => {
    // Regression: the tick gate used to derive elapsed time from
    // `maxTime - timer`. Re-applying reset both, so the effect went silent for
    // the length of its previous elapsed time — the faster you re-ignited, the
    // less damage burn dealt, and a fast fire weapon dealt none at all.
    const once = damageOver(6, 'burn', 4, 10, null);
    const slowRefresh = damageOver(6, 'burn', 4, 10, 2.0);
    const fastRefresh = damageOver(6, 'burn', 4, 10, 0.3);

    expect(slowRefresh).toBeGreaterThan(once);
    expect(fastRefresh).toBeGreaterThan(slowRefresh);
  });

  it('applies poison on the same cadence as burn', () => {
    expect(damageOver(4, 'poison', 4, 10, null)).toBe(80);
  });
});

describe('bleed', () => {
  it('deals its damage over time rather than per frame', () => {
    // 5s at 4/tick, one stack → 10 ticks → 40 damage.
    expect(damageOver(5, 'bleed', 5, 4, null)).toBe(40);
  });

  it('deals the same damage whether or not the target is being knocked back', () => {
    // Regression: bleed used to be applied from the knockback branch of
    // `updateEnemies`, and `dealDamage` re-armed the knockback impulse on every
    // hit. That kept the enemy in the knockback branch forever, so bleed became
    // a ~288 dmg/sec self-sustaining loop that also shoved the target across
    // the arena.
    const still = isolatedRun();
    const knocked = isolatedRun();
    knocked.enemy.knockbackX = 6;

    for (const { state, enemy } of [still, knocked]) {
      applyStatusEffect(enemy, 'bleed', 5, 4);
      for (let t = 0; t < 5; t += DT) updateGame(state, DT, { x: 0, y: 0 });
    }

    expect(knocked.enemy.hp).toBe(still.enemy.hp);
    expect(Math.abs(knocked.enemy.knockbackX)).toBeLessThan(0.5); // decayed to rest
  });
});

describe('lightning rod marks', () => {
  it('releases the mark when the marking hit is itself lethal', () => {
    // Regression: a mark is only consumed by a *subsequent* hit, but it is
    // applied inside the same `dealDamage` call that can kill the target. An
    // enemy marked by the blow that kills it used to leave its id in
    // `lightningRodMarks` for the rest of the run — an unbounded list that
    // `dealDamage` then scans on every hit.
    const { state, enemy } = isolatedRun();
    state.elementUpgrades.push('lightningRod');
    state.player.weapons.push({
      id: 'lightning', cooldownTimer: 0, rarityMult: 1, level: 1, evolved: false, killCount: 0,
    });
    // In range of the lightning weapon (200) and weak enough to die in one hit.
    enemy.x = state.player.x + 60;
    enemy.y = state.player.y;
    enemy.hp = 1;
    enemy.maxHp = 1;

    updateGame(state, DT, { x: 0, y: 0 });

    expect(enemy.alive).toBe(false);
    expect(state.lightningRodMarks).not.toContain(enemy.id);
  });
});
