import React from 'react';
import { render } from '@testing-library/react-native';
import GameCanvas from '../components/game/GameCanvas';
import { initGameState } from '../engine/GameEngine';
import { ARENA_OBSTACLES } from '../engine/constants';
import type { GameState } from '../engine/types';

/**
 * Arena obstacles are solid in the engine but were shipped with no renderer at
 * all, leaving eight invisible walls in the arena. Collision passing is not
 * enough on its own — something has to draw them.
 */
describe('arena obstacle rendering', () => {
  function canvasWithCameraAt(x: number, y: number) {
    const state: GameState = initGameState('crab', 1200, 1200);
    state.camera.x = x;
    state.camera.y = y;
    state.sw = 1200;
    state.sh = 1200;
    const ref = { current: state } as React.RefObject<GameState | null>;
    return render(<GameCanvas gameState={ref} frame={0} />);
  }

  it('draws an obstacle whose body is on screen', () => {
    const target = ARENA_OBSTACLES[0];
    const { queryAllByTestId } = canvasWithCameraAt(target.x, target.y);
    expect(queryAllByTestId(`arena-obstacle-${target.kind}`).length).toBeGreaterThan(0);
  });

  it('draws obstacles of every kind used by the arena', () => {
    for (const kind of new Set(ARENA_OBSTACLES.map(o => o.kind))) {
      const obstacle = ARENA_OBSTACLES.find(o => o.kind === kind)!;
      const { queryAllByTestId } = canvasWithCameraAt(obstacle.x, obstacle.y);
      expect(queryAllByTestId(`arena-obstacle-${kind}`).length).toBeGreaterThan(0);
    }
  });

  it('does not draw obstacles that are far off camera', () => {
    // Guards the viewport cull: without it every obstacle would be built into
    // the ground pass on every frame.
    const { queryAllByTestId } = canvasWithCameraAt(-4000, -4000);
    const drawn = (['rock', 'coral', 'barrel'] as const)
      .flatMap(kind => queryAllByTestId(`arena-obstacle-${kind}`));
    expect(drawn).toHaveLength(0);
  });
});
