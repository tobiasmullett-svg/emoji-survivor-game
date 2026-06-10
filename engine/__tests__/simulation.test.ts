// Headless smoke simulation: runs several waves of real gameplay with
// moving input and asserts the state never produces NaN or hangs a phase.
import { initGameState, updateGame, startNextWave, applyLevelUpChoice, applyRelicChoice, extractHudData } from '../GameEngine';

jest.mock('../../services/audio', () => ({ playSound: jest.fn() }));

function assertFinite(label: string, n: number) {
  if (!Number.isFinite(n)) throw new Error(`${label} is not finite: ${n}`);
}

test('headless 8-wave simulation stays sane', () => {
  const state = initGameState('octopus', 800, 600);
  let t = 0;
  const dt = 1 / 60;
  let guard = 0;
  while (state.wave.number <= 8 && state.phase !== 'gameover' && guard < 120000) {
    guard++;
    t += dt;
    const input = { x: Math.sin(t * 0.7), y: Math.cos(t * 0.4) };
    const l = Math.hypot(input.x, input.y) || 1;
    updateGame(state, dt, { x: input.x / l, y: input.y / l });
    if (state.phase === 'levelup') applyLevelUpChoice(state, 0);
    if (state.phase === 'relic') applyRelicChoice(state, 0);
    if (state.phase === 'shopping') startNextWave(state);
    assertFinite('player.hp', state.player.hp);
    assertFinite('player.x', state.player.x);
    assertFinite('player.y', state.player.y);
    assertFinite('materials', state.materials);
    for (const e of state.enemies) {
      assertFinite('enemy.x', e.x);
      assertFinite('enemy.hp', e.hp);
    }
  }
  expect(guard).toBeLessThan(120000);
  const hud = extractHudData(state);
  expect(Number.isFinite(hud.hp)).toBe(true);
  // Either survived to wave 9 or legitimately died along the way.
  expect(state.wave.number >= 2 || state.phase === 'gameover').toBe(true);
}, 60000);
