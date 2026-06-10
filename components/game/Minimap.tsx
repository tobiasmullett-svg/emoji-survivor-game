import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { GameState } from '../../engine/types';
import { ARENA_W, ARENA_H, WATER_ZONES } from '../../engine/constants';

interface Props {
  gameState: React.RefObject<GameState | null>;
  size?: number;
}

export default function Minimap({ gameState, size = 120 }: Props) {
  const state = gameState.current;
  if (!state || state.phase === 'gameover' || state.phase === 'paused' || state.phase === 'levelup' || state.phase === 'relic' || state.phase === 'shopping') {
    return null; // Don't render during menus
  }

  const { player, enemies, resourceNodes } = state;
  const scale = size / ARENA_W;

  return (
    <View style={[s.container, { width: size, height: size * (ARENA_H / ARENA_W) }]}>
      {/* Water Zones */}
      {WATER_ZONES.map((w, i) => (
        <View
          key={`water-${i}`}
          style={[
            s.water,
            {
              left: w.x * scale - (w.radius * scale),
              top: w.y * scale - (w.radius * scale),
              width: w.radius * 2 * scale,
              height: w.radius * 2 * scale,
              borderRadius: w.radius * scale,
            }
          ]}
        />
      ))}

      {/* Resource Nodes */}
      {resourceNodes.filter(r => r.alive).map(r => (
        <View
          key={`res-${r.id}`}
          style={[
            s.resource,
            { left: r.x * scale - 1.5, top: r.y * scale - 1.5 }
          ]}
        />
      ))}

      {/* Bosses */}
      {enemies.filter(e => e.alive && e.isBoss).map(b => (
        <View
          key={`boss-${b.id}`}
          style={[
            s.boss,
            { left: b.x * scale - 2, top: b.y * scale - 2 }
          ]}
        />
      ))}

      {/* Player */}
      <View
        style={[
          s.player,
          { left: player.x * scale - 2, top: player.y * scale - 2 }
        ]}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60, // Below the wave info
    right: 20,
    backgroundColor: 'rgba(5, 10, 21, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    overflow: 'hidden',
    zIndex: 10,
  },
  water: {
    position: 'absolute',
    backgroundColor: 'rgba(6, 182, 212, 0.2)', // Cyan-ish translucent
  },
  resource: {
    position: 'absolute',
    width: 3,
    height: 3,
    backgroundColor: '#06B6D4',
    transform: [{ rotate: '45deg' }],
  },
  boss: {
    position: 'absolute',
    width: 4,
    height: 4,
    backgroundColor: '#F59E0B',
    borderRadius: 2,
    borderWidth: 0.5,
    borderColor: '#EF4444',
  },
  player: {
    position: 'absolute',
    width: 4,
    height: 4,
    backgroundColor: '#22C55E',
    borderRadius: 2,
    shadowColor: '#22C55E',
    shadowOpacity: 0.8,
    shadowRadius: 2,
  },
});
