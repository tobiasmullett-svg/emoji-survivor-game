import {
  classifyTouch,
  getControlLayout,
  getStickVector,
} from '../components/game/GameTouchControls';

describe('GameTouchControls helpers', () => {
  it('maps visible movement, aim, and ability regions without overlap at 375px', () => {
    const layout = getControlLayout(375, 800);

    expect(classifyTouch(layout, { identifier: 'move', x: 95, y: 695 })).toBe('movement');
    expect(classifyTouch(layout, { identifier: 'aim', x: 230, y: 715 })).toBe('aim');
    expect(classifyTouch(layout, { identifier: 'ability', x: 323, y: 728 })).toBe('ability');
    expect(classifyTouch(layout, { identifier: 'ignored', x: 180, y: 400 })).toBe('ignored');
  });

  it('uses the compact-width aim band above the bottom controls', () => {
    const layout = getControlLayout(360, 800);

    expect(classifyTouch(layout, { identifier: 'aim', x: 285, y: 555 })).toBe('aim');
    expect(classifyTouch(layout, { identifier: 'ability', x: 308, y: 728 })).toBe('ability');
  });

  it('clamps each touch vector and applies the shared dead-zone mapping', () => {
    const start = { identifier: 'move', x: 100, y: 100 };
    const jitter = getStickVector(start, { identifier: 'move', x: 104, y: 100 });
    const halfTravel = getStickVector(start, { identifier: 'move', x: 120, y: 100 });
    const diagonal = getStickVector(start, { identifier: 'move', x: 200, y: 200 });

    expect(jitter.active).toBe(false);
    expect(jitter.input).toEqual({ x: 0, y: 0 });
    expect(halfTravel.knob).toEqual({ x: 20, y: 0 });
    expect(halfTravel.input.x).toBeCloseTo((0.5 - 0.12) / (1 - 0.12));
    expect(halfTravel.input.y).toBe(0);
    expect(diagonal.knob.x).toBeCloseTo(40 / Math.sqrt(2));
    expect(diagonal.knob.y).toBeCloseTo(40 / Math.sqrt(2));
    expect(diagonal.input.x).toBeCloseTo(1 / Math.sqrt(2));
    expect(diagonal.input.y).toBeCloseTo(1 / Math.sqrt(2));
  });
});
