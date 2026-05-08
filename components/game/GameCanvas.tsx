import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { GameState } from '../../engine/types';
import { ELITE_EMOJIS, ELITE_COLORS } from '../../engine/data';
import { WATER_ZONES } from '../../engine/constants';

const GRID_STEP = 160;
const GRID_LINES = Array.from({ length: Math.floor(2000 / GRID_STEP) + 1 }, (_, i) => i * GRID_STEP);
const STARS = Array.from({ length: 46 }, (_, i) => ({
  id: i,
  x: (i * 173) % 1960 + 20,
  y: (i * 311) % 1960 + 20,
  size: 1 + (i % 3),
  opacity: 0.12 + (i % 5) * 0.045,
}));
const CURRENTS = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  x: (i * 227) % 1850 + 60,
  y: (i * 149) % 1840 + 80,
  width: 90 + (i % 4) * 28,
  angle: -18 + (i % 5) * 9,
  opacity: 0.05 + (i % 3) * 0.025,
}));
const BUBBLES = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  x: (i * 131) % 1900 + 35,
  y: (i * 211) % 1900 + 35,
  size: 3 + (i % 4),
  speed: 0.28 + (i % 5) * 0.08,
}));
const REEF_PROPS = [
  { id: 1, x: 170, y: 260, emoji: '🪸', size: 30, layer: 0 },
  { id: 2, x: 420, y: 1560, emoji: '🌿', size: 24, layer: 1 },
  { id: 3, x: 820, y: 300, emoji: '🪨', size: 26, layer: 0 },
  { id: 4, x: 1240, y: 1680, emoji: '🪸', size: 34, layer: 1 },
  { id: 5, x: 1620, y: 520, emoji: '🌿', size: 26, layer: 0 },
  { id: 6, x: 1760, y: 1320, emoji: '💠', size: 22, layer: 1 },
  { id: 7, x: 620, y: 1020, emoji: '🪸', size: 24, layer: 0 },
  { id: 8, x: 1420, y: 940, emoji: '🪨', size: 28, layer: 1 },
  { id: 9, x: 920, y: 820, emoji: '🌿', size: 23, layer: 0 },
  { id: 10, x: 1080, y: 1180, emoji: '🪸', size: 26, layer: 1 },
  { id: 11, x: 780, y: 1220, emoji: '💠', size: 20, layer: 0 },
  { id: 12, x: 1200, y: 760, emoji: '🪨', size: 24, layer: 1 },
  { id: 13, x: 300, y: 800, emoji: '🐚', size: 20, layer: 0 },
  { id: 14, x: 1550, y: 200, emoji: '🪸', size: 28, layer: 1 },
  { id: 15, x: 500, y: 1350, emoji: '🌊', size: 22, layer: 0 },
  { id: 16, x: 1700, y: 900, emoji: '🪸', size: 32, layer: 1 },
  { id: 17, x: 100, y: 1700, emoji: '🐚', size: 24, layer: 0 },
  { id: 18, x: 950, y: 1600, emoji: '🌿', size: 28, layer: 1 },
];
const CAUSTIC_LIGHTS = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  x: (i * 293) % 1700 + 150,
  y: (i * 197) % 1700 + 150,
  width: 140 + (i % 3) * 60,
  height: 80 + (i % 4) * 30,
  angle: (i * 37) % 360,
  speed: 0.006 + (i % 3) * 0.003,
  drift: 0.008 + (i % 4) * 0.004,
}));
const KELP_CLUSTERS = Array.from({ length: 10 }, (_, i) => ({
  id: i,
  x: (i * 199) % 1800 + 100,
  y: (i * 263) % 1800 + 100,
  height: 40 + (i % 3) * 16,
  blades: 3 + (i % 3),
  hue: i % 2 === 0 ? 'rgba(34,197,94,0.14)' : 'rgba(20,184,166,0.12)',
}));
const DEPTH_MOTES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  x: (i * 157) % 1920 + 30,
  y: (i * 239) % 1920 + 30,
  size: 2 + (i % 3) * 1.5,
  driftX: 0.012 + (i % 5) * 0.006,
  driftY: 0.008 + (i % 4) * 0.005,
  opacity: 0.06 + (i % 4) * 0.03,
  color: i % 3 === 0 ? '#A78BFA' : i % 3 === 1 ? '#2DD4BF' : '#BAE6FD',
}));
const SAND_BARS = [
  { id: 1, x: 170, y: 180, width: 520, height: 200, rot: -9 },
  { id: 2, x: 1250, y: 150, width: 560, height: 220, rot: 11 },
  { id: 3, x: 210, y: 1280, width: 680, height: 260, rot: 7 },
  { id: 4, x: 1080, y: 1220, width: 700, height: 280, rot: -6 },
  { id: 5, x: 730, y: 760, width: 460, height: 180, rot: 4 },
];

interface Props {
  gameState: React.RefObject<GameState | null>;
  frame: number;
}

function DangerVignette({ frame }: { frame: number }) {
  const pulse = 0.15 + Math.sin(frame * 0.15) * 0.08;
  return (
    <View style={[s.dangerVignette, { borderColor: `rgba(239,68,68,${pulse})` }]} />
  );
}

function CritFlash({ frame }: { frame: number }) {
  const opacity = Math.max(0, 1 - (frame % 20) * 0.15);
  if (opacity <= 0) return null;
  return <View style={[s.critFlash, { opacity }]} />;
}

export default function GameCanvas({ gameState, frame }: Props) {
  const state = gameState?.current;
  if (!state) return <View style={s.viewport} />;

  const { player: p, enemies, projectiles, pickups, resourceNodes, pets, dmgNums, effects, deathParticles, hazards, camera, shake, arena, sw, sh } = state;
  const tx = -camera.x + sw / 2 + (shake?.x ?? 0);
  const ty = -camera.y + sh / 2 + (shake?.y ?? 0);
  const vMinX = camera.x - sw / 2 - 60;
  const vMaxX = camera.x + sw / 2 + 60;
  const vMinY = camera.y - sh / 2 - 60;
  const vMaxY = camera.y + sh / 2 + 60;
  const vis = (x: number, y: number) => x >= vMinX && x <= vMaxX && y >= vMinY && y <= vMaxY;
  const visRect = (x: number, y: number, width: number, height: number) => (
    x + width >= vMinX && x <= vMaxX && y + height >= vMinY && y <= vMaxY
  );
  const visibleGridX = GRID_LINES.filter(x => x >= vMinX && x <= vMaxX);
  const visibleGridY = GRID_LINES.filter(y => y >= vMinY && y <= vMaxY);
  const visibleCurrents = CURRENTS.filter(current => visRect(current.x - 30, current.y - 30, current.width + 60, 60));
  const visibleReefProps = REEF_PROPS.filter(prop => visRect(prop.x - 20, prop.y - 20, prop.size + 40, prop.size + 40));
  const visibleStars = STARS.filter(star => vis(star.x, star.y));
  const visibleBubbles = BUBBLES.filter(bubble => {
    const y = ((bubble.y - frame * bubble.speed) % 1960 + 1960) % 1960 + 20;
    return vis(bubble.x, y);
  });
  const showCritFlash = state.hitStop > 0.06;

  return (
    <View style={s.viewport} pointerEvents="none">
      <View style={[s.world, { transform: [{ translateX: tx }, { translateY: ty }] }]}>
        {/* Arena bg */}
        <View style={[s.arenaBg, { width: arena.width, height: arena.height }]}>
          <View style={s.arenaGlowA} />
          <View style={s.arenaGlowB} />
          {SAND_BARS.map(bar => (
            <View
              key={`sand-${bar.id}`}
              style={[
                s.sandPatch,
                {
                  left: bar.x,
                  top: bar.y,
                  width: bar.width,
                  height: bar.height,
                  borderRadius: Math.round(bar.height * 0.52),
                  transform: [{ rotate: `${bar.rot}deg` }],
                },
              ]}
            />
          ))}
          {WATER_ZONES.map((zone, i) => (
            <View
              key={`water-${i}`}
              style={[
                s.waterZone,
                {
                  left: zone.x - zone.radius,
                  top: zone.y - zone.radius,
                  width: zone.radius * 2,
                  height: zone.radius * 2,
                  borderRadius: zone.radius,
                  opacity: 0.2 + Math.sin(frame * 0.035 + i) * 0.04,
                },
              ]}
            >
              <View style={s.waterZoneInner} />
            </View>
          ))}
          <View style={[s.arenaGlowC, {
            left: 600 + Math.sin(frame * 0.005) * 120,
            top: 800 + Math.cos(frame * 0.004) * 90,
          }]} />
          {/* Caustic light rays */}
          {CAUSTIC_LIGHTS.map(cl => (
            <View
              key={`cl-${cl.id}`}
              style={[
                s.causticLight,
                {
                  left: cl.x + Math.sin(frame * cl.drift + cl.id) * 40,
                  top: cl.y + Math.cos(frame * cl.drift * 0.7 + cl.id * 3) * 30,
                  width: cl.width,
                  height: cl.height,
                  borderRadius: cl.height / 2,
                  opacity: 0.035 + Math.sin(frame * cl.speed + cl.id * 2) * 0.02,
                  transform: [{ rotate: `${cl.angle + Math.sin(frame * 0.003 + cl.id) * 12}deg` }],
                },
              ]}
            />
          ))}
          {/* Kelp clusters */}
          {KELP_CLUSTERS.map(kc => (
            <View key={`kc-${kc.id}`} style={[s.kelpCluster, { left: kc.x, top: kc.y }]}>
              {Array.from({ length: kc.blades }, (_, bi) => {
                const sway = Math.sin((frame + kc.id * 17 + bi * 11) * 0.025) * 8;
                return (
                  <View
                    key={bi}
                    style={[
                      s.kelpBlade,
                      {
                        height: kc.height + bi * 6,
                        backgroundColor: kc.hue,
                        left: bi * 5 - (kc.blades * 2.5),
                        transform: [{ rotate: `${sway + (bi - 1) * 3}deg` }, { translateY: -kc.height / 2 }],
                      },
                    ]}
                  />
                );
              })}
            </View>
          ))}
          {visibleCurrents.map(current => (
            <View
              key={`cur-${current.id}`}
              style={[
                s.currentLine,
                {
                  left: current.x,
                  top: current.y + Math.sin((frame + current.id * 17) * 0.018) * 14,
                  width: current.width,
                  opacity: current.opacity,
                  transform: [
                    { rotate: `${current.angle}deg` },
                    { translateX: Math.sin((frame + current.id * 11) * 0.022) * 18 },
                  ],
                },
              ]}
            />
          ))}
          {visibleReefProps.map(prop => (
            <Text
              key={`reef-${prop.id}`}
              style={[
                s.reefProp,
                {
                  left: prop.x,
                  top: prop.y + Math.sin((frame + prop.id * 19) * 0.025) * (2 + prop.layer),
                  fontSize: prop.size,
                  opacity: 0.18 + Math.sin((frame + prop.id * 13) * 0.02) * 0.05 + prop.layer * 0.06,
                },
              ]}
            >
              {prop.emoji}
            </Text>
          ))}
          {BUBBLES.map(bubble => {
            const bx = bubble.x + Math.sin((frame + bubble.id * 7) * 0.035) * 7;
            const by = ((bubble.y - frame * bubble.speed) % 1960 + 1960) % 1960 + 20;
            if (!vis(bx, by)) return null;
            return (
              <View
                key={`bubble-${bubble.id}`}
                style={[
                  s.bubble,
                  {
                    left: bx,
                    top: by,
                    width: bubble.size,
                    height: bubble.size,
                    borderRadius: bubble.size,
                    opacity: 0.08 + (bubble.id % 4) * 0.025,
                  },
                ]}
              />
            );
          })}
          {/* Depth motes */}
          {DEPTH_MOTES.map(mote => {
            const mx = mote.x + Math.sin(frame * mote.driftX + mote.id * 5) * 30;
            const my = mote.y + Math.cos(frame * mote.driftY + mote.id * 3) * 25;
            return (
              <View
                key={`mote-${mote.id}`}
                style={[
                  s.depthMote,
                  {
                    left: mx,
                    top: my,
                    width: mote.size,
                    height: mote.size,
                    borderRadius: mote.size,
                    backgroundColor: mote.color,
                    opacity: mote.opacity + Math.sin(frame * 0.03 + mote.id) * 0.02,
                  },
                ]}
              />
            );
          })}
          {visibleGridX.map(x => <View key={`vx-${x}`} style={[s.gridLineV, { left: x, height: arena.height }]} />)}
          {visibleGridY.map(y => <View key={`hy-${y}`} style={[s.gridLineH, { top: y, width: arena.width }]} />)}
          {visibleStars.map(star => (
            <View
              key={star.id}
              style={[
                s.star,
                {
                  left: star.x,
                  top: star.y,
                  width: star.size,
                  height: star.size,
                  borderRadius: star.size,
                  opacity: Math.min(0.55, star.opacity + ((frame + star.id) % 90 < 45 ? 0.08 : 0)),
                },
              ]}
            />
          ))}
          {/* Arena border pulse */}
          <View style={[s.arenaBorderPulse, {
            width: arena.width, height: arena.height,
            borderColor: `rgba(45,212,191,${0.12 + Math.sin(frame * 0.02) * 0.06})`,
          }]} />
        </View>
        {/* Hazards */}
        {(hazards ?? []).filter(h => vis(h.x, h.y)).map(h => {
          const pulse = 0.5 + Math.sin(h.pulse) * 0.18;
          return (
            <View key={h.id} style={[s.hazardWrap, { left: h.x - h.radius, top: h.y - h.radius, width: h.radius * 2, height: h.radius * 2, borderRadius: h.radius }]}>
              <View style={[s.hazardPulse, { opacity: pulse, width: h.radius * 2, height: h.radius * 2, borderRadius: h.radius }]} />
              <Text style={s.hazardEmoji}>{h.emoji}</Text>
            </View>
          );
        })}
        {/* Resource nodes */}
        {(resourceNodes ?? []).filter(n => n.alive && vis(n.x, n.y)).map(node => (
          <View key={node.id} style={[s.nodeWrap, { left: node.x - node.radius, top: node.y - node.radius }]}>
            <View style={[s.nodeGlow, { width: node.radius * 2.2, height: node.radius * 2.2, borderRadius: node.radius * 1.1 }]} />
            <Text style={[s.nodeEmoji, { fontSize: node.radius * 1.55, opacity: node.flashTimer > 0 ? 0.45 : 1 }]}>
              {node.emoji}
            </Text>
            {node.hp < node.maxHp && (
              <View style={s.nodeHpBg}>
                <View style={[s.nodeHp, { width: `${Math.max(0, (node.hp / node.maxHp) * 100)}%` }]} />
              </View>
            )}
          </View>
        ))}
        {/* Pickups */}
        {(pickups ?? []).map(pk => {
          if (!vis(pk.x, pk.y)) return null;
          return (
            <Text
              key={pk.id}
              style={[
                s.entity,
                s.pickup,
                { left: pk.x - 8, top: pk.y - 8 + Math.sin((frame + pk.id) * 0.12) * 2, fontSize: 14 },
              ]}
            >
              {pk.emoji}
            </Text>
          );
        })}
        {/* Enemies */}
        {(enemies ?? []).filter(e => e?.alive && vis(e.x, e.y)).map(e => {
          const showTelegraph = e.telegraphTimer > 0 && e.telegraphType === 'attack';
          const telegraphProg = showTelegraph ? 1 - (e.telegraphTimer / e.telegraphMax) : 0;
          const isElite = e.elite !== 'none';
          return (
            <View key={e.id} style={[s.enemyWrap, { left: e.x - e.radius, top: e.y - e.radius - 8 }]}>
              {isElite && (
                <View style={[s.eliteAura, {
                  width: e.radius * 2.6,
                  height: e.radius * 2.6,
                  borderRadius: e.radius * 1.3,
                  top: 8 - e.radius * 0.3,
                  left: -e.radius * 0.3,
                  opacity: 0.2 + Math.sin(frame * 0.1 + e.id) * 0.08,
                  borderColor: e.elite === 'fast' ? '#F472B6' : e.elite === 'tanky' ? '#60A5FA' : e.elite === 'explosive' ? '#FB923C' : e.elite === 'vampiric' ? '#A78BFA' : '#2DD4BF',
                }]} />
              )}
              {showTelegraph && (
                <View style={s.telegraphBarBg}>
                  <View style={[s.telegraphBar, { width: `${Math.min(100, Math.max(8, telegraphProg * 100))}%` }]} />
                </View>
              )}
              <Text style={[s.entity, s.enemyEmoji, { fontSize: e.fontSize, opacity: e.flashTimer > 0 ? 0.35 : 1 }]}>
                {e.isBoss ? '👑' : ''}{e.emoji}
              </Text>
              {e.shieldHp > 0 && (
                <View style={[s.shieldBarBg, { width: e.radius * 2 }]}>
                  <View style={[s.shieldBar, { width: `${Math.max(0, (e.shieldHp / e.maxShieldHp) * 100)}%` }]} />
                </View>
              )}
              {e.hp < e.maxHp && (
                <View style={s.hpBarBg}>
                  <View style={[s.hpBar, { width: `${Math.max(0, (e.hp / e.maxHp) * 100)}%` }]} />
                </View>
              )}
            </View>
          );
        })}
        {/* Projectiles with afterimage trails */}
        {(projectiles ?? []).filter(pr => pr.life > 0 && vis(pr.x, pr.y)).map(pr => {
          const isEvolved = !pr.isEnemy && pr.emoji === '🔥' || pr.emoji === '🌩️' || pr.emoji === '⇒';
          const angle = Math.atan2(pr.vy, pr.vx);
          const speed = Math.sqrt(pr.vx * pr.vx + pr.vy * pr.vy);
          const trailLen = Math.min(3, Math.max(1, Math.floor(speed / 200)));
          return (
            <React.Fragment key={pr.id}>
              {/* Afterimage ghost copies */}
              {trailLen >= 2 && (
                <View style={[s.projectileGhost, {
                  left: pr.x - 8 - Math.cos(angle) * 12,
                  top: pr.y - 8 - Math.sin(angle) * 12,
                  borderColor: pr.isEnemy ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.2)',
                }]}>
                  <Text style={[s.projectileText, { fontSize: 9, color: pr.isEnemy ? 'rgba(74,222,128,0.3)' : 'rgba(251,191,36,0.35)' }]}>
                    {pr.emoji}
                  </Text>
                </View>
              )}
              {trailLen >= 3 && (
                <View style={[s.projectileGhost, {
                  left: pr.x - 8 - Math.cos(angle) * 24,
                  top: pr.y - 8 - Math.sin(angle) * 24,
                  borderColor: 'transparent',
                }]}>
                  <Text style={[s.projectileText, { fontSize: 8, color: pr.isEnemy ? 'rgba(74,222,128,0.15)' : 'rgba(251,191,36,0.18)' }]}>
                    {pr.emoji}
                  </Text>
                </View>
              )}
              {/* Main projectile */}
              <View style={[
                s.projectileGlow,
                {
                  left: pr.x - 8, top: pr.y - 8,
                  borderColor: pr.isEnemy ? 'rgba(34,197,94,0.45)' : isEvolved ? 'rgba(245,158,11,0.7)' : 'rgba(245,158,11,0.5)',
                },
                isEvolved && s.projectileEvolved,
              ]}>
                <View
                  style={[
                    s.projectileTrail,
                    {
                      backgroundColor: pr.isEnemy ? 'rgba(74,222,128,0.55)' : isEvolved ? 'rgba(245,158,11,0.85)' : 'rgba(251,191,36,0.7)',
                      width: isEvolved ? 28 : 22,
                      transform: [{ rotate: `${angle}rad` }],
                    },
                  ]}
                />
                <Text style={[s.projectileText, {
                  fontSize: pr.isEnemy ? 12 : isEvolved ? 13 : 11,
                  color: pr.isEnemy ? '#4ADE80' : '#FBBF24',
                }]}>
                  {pr.emoji}
                </Text>
              </View>
            </React.Fragment>
          );
        })}
        {/* Weapon effects */}
        {(effects ?? []).filter(fx => vis(fx.x, fx.y)).map(fx => {
          const prog = 1 - fx.t / fx.maxT;
          if (fx.kind === 'slash') {
            return (
              <React.Fragment key={fx.id}>
                <View
                  style={[
                    s.slashFx,
                    {
                      left: fx.x - fx.radius,
                      top: fx.y - fx.radius,
                      width: fx.radius * 2,
                      height: fx.radius * 2,
                      borderRadius: fx.radius,
                      borderColor: fx.color,
                      opacity: 1 - prog,
                      transform: [{ rotate: `${fx.angle}rad` }, { scale: 0.75 + prog * 0.35 }],
                    },
                  ]}
                />
                {/* Secondary arc for bigger slashes */}
                {fx.radius > 40 && (
                  <View
                    style={[
                      s.slashFx,
                      {
                        left: fx.x - fx.radius * 0.8,
                        top: fx.y - fx.radius * 0.8,
                        width: fx.radius * 1.6,
                        height: fx.radius * 1.6,
                        borderRadius: fx.radius * 0.8,
                        borderColor: fx.color,
                        opacity: (1 - prog) * 0.5,
                        transform: [{ rotate: `${fx.angle + 0.3}rad` }, { scale: 0.6 + prog * 0.5 }],
                      },
                    ]}
                  />
                )}
              </React.Fragment>
            );
          }
          if (fx.kind === 'muzzle') {
            return (
              <React.Fragment key={fx.id}>
                <View
                  style={[
                    s.muzzleFx,
                    {
                      left: fx.x - fx.radius / 2,
                      top: fx.y - 2,
                      width: fx.radius,
                      backgroundColor: fx.color,
                      opacity: 1 - prog,
                      transform: [{ rotate: `${fx.angle}rad` }, { scaleX: 1 + prog * 0.8 }],
                    },
                  ]}
                />
                {/* Muzzle spark */}
                <View
                  style={[
                    s.muzzleSpark,
                    {
                      left: fx.x - 4,
                      top: fx.y - 4,
                      opacity: (1 - prog) * 0.7,
                      backgroundColor: fx.color,
                      transform: [{ scale: 1 + prog * 1.5 }],
                    },
                  ]}
                />
              </React.Fragment>
            );
          }
          if (fx.kind === 'beam') {
            return (
              <View
                key={fx.id}
                style={[
                  s.beamFx,
                  {
                    left: fx.x,
                    top: fx.y - 2,
                    width: fx.radius,
                    backgroundColor: fx.color,
                    opacity: 0.65 * (1 - prog),
                    transform: [{ rotate: `${fx.angle}rad` }, { scaleX: 1 + prog * 0.25 }],
                  },
                ]}
              />
            );
          }
          if (fx.kind === 'ring') {
            return (
              <View
                key={fx.id}
                style={[
                  s.ringFx,
                  {
                    left: fx.x - fx.radius * (0.5 + prog),
                    top: fx.y - fx.radius * (0.5 + prog),
                    width: fx.radius * (1 + prog * 2),
                    height: fx.radius * (1 + prog * 2),
                    borderRadius: fx.radius * (1 + prog),
                    opacity: 1 - prog,
                    borderColor: fx.color,
                  },
                ]}
              />
            );
          }
          if (fx.kind === 'heal') {
            return (
              <Text
                key={fx.id}
                style={[
                  s.healFx,
                  {
                    left: fx.x - fx.radius * 0.4,
                    top: fx.y - fx.radius * 0.7 - prog * 16,
                    color: fx.color,
                    opacity: 1 - prog,
                    fontSize: 16 + prog * 12,
                    transform: [{ scale: 0.75 + prog * 0.55 }],
                  },
                ]}
              >
                ✚
              </Text>
            );
          }
          if (fx.kind === 'spark') {
            return (
              <React.Fragment key={fx.id}>
                <View
                  style={[
                    s.sparkFx,
                    {
                      left: fx.x - 3,
                      top: fx.y - 3,
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: fx.color,
                      opacity: 1 - prog,
                      transform: [{ scale: 1 + prog * 2 }],
                    },
                  ]}
                />
                {/* Spark rays */}
                {[0, 1.047, 2.094, 3.14, 4.19, 5.24].map((a, ri) => (
                  <View
                    key={`sr-${fx.id}-${ri}`}
                    style={[
                      s.sparkRay,
                      {
                        left: fx.x,
                        top: fx.y - 1,
                        width: 8 + prog * 6,
                        backgroundColor: fx.color,
                        opacity: (1 - prog) * 0.6,
                        transform: [{ rotate: `${a + prog}rad` }],
                      },
                    ]}
                  />
                ))}
              </React.Fragment>
            );
          }
          if (fx.kind === 'burst') {
            return (
              <React.Fragment key={fx.id}>
                <View
                  style={[
                    s.burstFx,
                    {
                      left: fx.x - fx.radius * (0.3 + prog * 0.7),
                      top: fx.y - fx.radius * (0.3 + prog * 0.7),
                      width: fx.radius * (0.6 + prog * 1.4),
                      height: fx.radius * (0.6 + prog * 1.4),
                      borderRadius: fx.radius,
                      borderColor: fx.color,
                      opacity: 1 - prog,
                    },
                  ]}
                />
                {/* Inner burst glow */}
                <View
                  style={[
                    s.burstInner,
                    {
                      left: fx.x - fx.radius * (0.15 + prog * 0.35),
                      top: fx.y - fx.radius * (0.15 + prog * 0.35),
                      width: fx.radius * (0.3 + prog * 0.7),
                      height: fx.radius * (0.3 + prog * 0.7),
                      borderRadius: fx.radius * 0.5,
                      backgroundColor: fx.color,
                      opacity: (1 - prog) * 0.15,
                    },
                  ]}
                />
              </React.Fragment>
            );
          }
          return (
            <View
              key={fx.id}
              style={[
                s.zapFx,
                {
                  left: fx.x - fx.radius / 2,
                  top: fx.y - fx.radius / 2,
                  width: fx.radius,
                  height: fx.radius,
                  borderRadius: fx.radius / 2,
                  borderColor: fx.color,
                  opacity: 1 - prog,
                  transform: [{ scale: 0.45 + prog * 0.85 }],
                },
              ]}
            />
          );
        })}
        {/* Player */}
        <View style={[s.playerWrap, { left: p.x - 24, top: p.y - 32 }]}>
          {state.inWater && <View style={s.playerWaterRing} />}
          <View style={s.playerAura} />
          {/* Player ground glow ring */}
          <View style={[s.playerGroundGlow, {
            opacity: 0.12 + Math.sin(frame * 0.06) * 0.04,
          }]} />
          <Text style={[s.playerEmoji, p.invulnTimer > 0 && { opacity: 0.5 }]}>{p.emoji}</Text>
          <View style={s.pHpBg}>
            <View style={[s.pHp, { width: `${Math.max(0, (p.hp / p.maxHp) * 100)}%` }]} />
          </View>
          {p.abilityActive && <Text style={s.shieldIcon}>{'\u{1F6E1}\uFE0F'}</Text>}
        </View>
        {/* Companions */}
        {(pets ?? []).filter(pet => vis(pet.x, pet.y)).map(pet => {
          const pulse = 1 + Math.sin((frame + pet.id * 9) * 0.12) * 0.06;
          const size = 24 + Math.min(10, pet.level * 1.1);
          const flashScale = 1 + pet.attackFlash * 0.18;
          const isPrime = pet.generation >= 3;
          const isHighLevel = pet.level >= 5;
          return (
            <View
              key={pet.id}
              style={[
                s.petWrap,
                {
                  left: pet.x - size / 2,
                  top: pet.y - size / 2 + Math.sin((frame + pet.id) * 0.08) * 2,
                  width: size,
                  height: size,
                  transform: [{ scale: pulse * flashScale }],
                },
              ]}
            >
              {/* Prime aura glow */}
              {isPrime && (
                <View style={[s.primeAura, {
                  width: size * 1.6,
                  height: size * 1.6,
                  borderRadius: size * 0.8,
                  borderColor: `${pet.color}88`,
                  backgroundColor: `${pet.color}15`,
                  opacity: 0.6 + Math.sin(frame * 0.08 + pet.id) * 0.2,
                }]} />
              )}
              {/* High-level glow */}
              {isHighLevel && !isPrime && (
                <View style={[s.highLevelGlow, {
                  width: size * 1.3,
                  height: size * 1.3,
                  borderRadius: size * 0.65,
                  backgroundColor: `${pet.color}10`,
                  borderColor: `${pet.color}44`,
                }]} />
              )}
              {pet.attackFlash > 0 && (
                <View
                  style={[
                    pet.action === 'heal' ? s.petHealBloom : s.petAttackLine,
                    {
                      backgroundColor: `${pet.color}${pet.action === 'heal' ? '22' : 'AA'}`,
                      borderColor: `${pet.color}77`,
                      opacity: pet.attackFlash,
                      transform: pet.action === 'heal' ? [{ scale: 1 + (1 - pet.attackFlash) * 0.8 }] : [{ rotate: `${pet.aimAngle}rad` }, { scaleX: 1 + (1 - pet.attackFlash) * 0.8 }],
                    },
                  ]}
                />
              )}
              <View style={[s.petWake, { backgroundColor: `${pet.color}18`, borderColor: `${pet.color}55` }]} />
              <Text style={[s.petEmoji, { fontSize: 18 + Math.min(8, pet.level) }]}>{pet.emoji}</Text>
              {pet.level > 1 && <Text style={[s.petBadge, { backgroundColor: pet.color }]}> {pet.level} </Text>}
              {/* Perk count indicator */}
              {(pet.perks?.length ?? 0) > 0 && (
                <View style={[s.perkDots]}>
                  {pet.perks.map((pk, pi) => (
                    <View key={pi} style={[s.perkDot, { backgroundColor: pet.color }]} />
                  ))}
                </View>
              )}
            </View>
          );
        })}
        {/* Death particles */}
        {(deathParticles ?? []).filter(dp => vis(dp.x, dp.y)).map(dp => {
          const prog = 1 - (dp.t / dp.maxT);
          return (
            <Text
              key={dp.id}
              style={[
                s.deathParticle,
                {
                  left: dp.x - dp.size / 2,
                  top: dp.y - dp.size / 2,
                  fontSize: dp.size,
                  opacity: 1 - prog,
                  color: dp.color,
                  transform: [{ scale: 1 - prog * 0.5 }, { rotate: `${prog * 360}deg` }],
                },
              ]}
            >
              {dp.emoji}
            </Text>
          );
        })}
        {/* Damage numbers */}
        {(dmgNums ?? []).filter(d => vis(d.x, d.y)).map(d => {
          const prog = 1 - (d.t / d.maxT);
          return (
            <Text key={d.id} style={[s.dmgNum, {
              left: d.x - 15, top: d.y - prog * 40,
              opacity: 1 - prog, color: d.color,
              fontSize: d.color === '#F59E0B' ? 20 : 16,
              transform: [{ scale: 1 + (d.color === '#F59E0B' ? 0.3 : 0) * Math.sin(prog * Math.PI) }],
            }]}>{d.text}</Text>
          );
        })}
      </View>
      <OffScreenMarkers state={state} />
      {(p.hp / p.maxHp) < 0.32 && <DangerVignette frame={frame} />}
      {showCritFlash && <CritFlash frame={frame} />}
      {state.waveModifier === 'denseFog' && (
        <View style={s.fogOverlay} pointerEvents="none">
          <View style={s.fogVignette} />
        </View>
      )}
    </View>
  );
}

function OffScreenMarkers({ state }: { state: GameState }) {
  const { camera, sw, sh, enemies, resourceNodes, pickups } = state;
  const halfW = sw / 2 - 28;
  const halfH = sh / 2 - 28;
  const cx = camera.x;
  const cy = camera.y;
  const isOnScreen = (x: number, y: number) =>
    Math.abs(x - cx) < halfW && Math.abs(y - cy) < halfH;

  type Marker = { x: number; y: number; emoji: string; color: string; priority: number };
  const candidates: Marker[] = [];
  for (const e of enemies) {
    if (!e.alive || isOnScreen(e.x, e.y)) continue;
    if (e.isBoss) {
      candidates.push({ x: e.x, y: e.y, emoji: '👑', color: '#F59E0B', priority: 0 });
    } else if (e.elite !== 'none') {
      candidates.push({ x: e.x, y: e.y, emoji: ELITE_EMOJIS[e.elite] ?? '⭐', color: ELITE_COLORS[e.elite] ?? '#EF4444', priority: 1 });
    }
  }
  for (const node of resourceNodes) {
    if (!node.alive || node.kind !== 'crystal' || isOnScreen(node.x, node.y)) continue;
    candidates.push({ x: node.x, y: node.y, emoji: '💠', color: '#2DD4BF', priority: 2 });
  }
  for (const pk of pickups) {
    if (pk.type !== 'egg' || isOnScreen(pk.x, pk.y)) continue;
    candidates.push({ x: pk.x, y: pk.y, emoji: '🥚', color: '#FBBF24', priority: 3 });
  }
  if (candidates.length === 0) return null;
  // Stable priority sort, cap to 6 markers to avoid edge clutter.
  candidates.sort((a, b) => a.priority - b.priority);
  const markers = candidates.slice(0, 6);

  return (
    <>
      {markers.map((m, i) => {
        const dx = m.x - cx;
        const dy = m.y - cy;
        const angle = Math.atan2(dy, dx);
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        // Project the angle ray onto the screen-space bounded rect.
        const t = Math.min(
          Math.abs(cosA) > 0.001 ? halfW / Math.abs(cosA) : Infinity,
          Math.abs(sinA) > 0.001 ? halfH / Math.abs(sinA) : Infinity,
        );
        const sx = sw / 2 + cosA * t;
        const sy = sh / 2 + sinA * t;
        return (
          <View key={`marker-${i}`} style={[s.marker, { left: sx - 16, top: sy - 16, borderColor: m.color }]}>
            <Text style={[s.markerText, { transform: [{ rotate: `${angle}rad` }] }]}>{'\u25B6'}</Text>
            <Text style={s.markerEmoji}>{m.emoji}</Text>
          </View>
        );
      })}
    </>
  );
}

const s = StyleSheet.create({
  viewport: { ...StyleSheet.absoluteFillObject, overflow: 'hidden', backgroundColor: '#030712' },
  world: { position: 'absolute', left: 0, top: 0 },
  arenaBg: { position: 'absolute', left: 0, top: 0, backgroundColor: '#050A15', borderWidth: 2, borderColor: 'rgba(45,212,191,0.24)', overflow: 'hidden' },
  arenaGlowA: { position: 'absolute', width: 620, height: 620, borderRadius: 310, left: 120, top: 120, backgroundColor: 'rgba(124,58,237,0.1)' },
  arenaGlowB: { position: 'absolute', width: 760, height: 760, borderRadius: 380, right: 120, bottom: 120, backgroundColor: 'rgba(20,184,166,0.08)' },
  sandPatch: { position: 'absolute', backgroundColor: 'rgba(250,204,21,0.09)', borderWidth: 1, borderColor: 'rgba(234,179,8,0.16)' },
  waterZone: { position: 'absolute', borderWidth: 2, borderColor: 'rgba(56,189,248,0.35)', backgroundColor: 'rgba(14,116,144,0.18)', alignItems: 'center', justifyContent: 'center' },
  waterZoneInner: { width: '72%', height: '72%', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(125,211,252,0.22)', backgroundColor: 'rgba(30,64,175,0.12)' },
  arenaGlowC: { position: 'absolute', width: 500, height: 500, borderRadius: 250, backgroundColor: 'rgba(99,102,241,0.06)' },
  causticLight: { position: 'absolute', backgroundColor: 'rgba(186,230,253,0.06)' },
  kelpCluster: { position: 'absolute', width: 30, height: 60, alignItems: 'center' },
  kelpBlade: { position: 'absolute', width: 4, borderRadius: 2, bottom: 0 },
  currentLine: { position: 'absolute', height: 2, borderRadius: 2, backgroundColor: '#BAE6FD' },
  reefProp: { position: 'absolute', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  bubble: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(186,230,253,0.55)', backgroundColor: 'rgba(186,230,253,0.04)' },
  depthMote: { position: 'absolute' },
  gridLineV: { position: 'absolute', top: 0, width: 1, backgroundColor: 'rgba(148,163,184,0.055)' },
  gridLineH: { position: 'absolute', left: 0, height: 1, backgroundColor: 'rgba(148,163,184,0.055)' },
  star: { position: 'absolute', backgroundColor: '#E0F2FE' },
  arenaBorderPulse: { position: 'absolute', left: 0, top: 0, borderWidth: 3, backgroundColor: 'transparent' },
  entity: { position: 'absolute', textAlign: 'center' },
  hazardWrap: { position: 'absolute', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(251,146,60,0.38)', backgroundColor: 'rgba(251,146,60,0.07)' },
  hazardPulse: { position: 'absolute', borderWidth: 2, borderColor: 'rgba(251,146,60,0.42)', backgroundColor: 'rgba(251,146,60,0.08)' },
  hazardEmoji: { fontSize: 24, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  nodeWrap: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  nodeGlow: { position: 'absolute', backgroundColor: 'rgba(45,212,191,0.08)', borderWidth: 1, borderColor: 'rgba(45,212,191,0.18)' },
  nodeEmoji: { textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.75)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  nodeHpBg: { width: 34, height: 3, backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 2, marginTop: -1 },
  nodeHp: { height: 3, backgroundColor: '#2DD4BF', borderRadius: 2 },
  pickup: { textShadowColor: 'rgba(45,212,191,0.75)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 6 },
  enemyWrap: { position: 'absolute', alignItems: 'center' },
  enemyEmoji: { textShadowColor: 'rgba(0,0,0,0.85)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  eliteAura: { position: 'absolute', borderWidth: 2, backgroundColor: 'transparent' },
  telegraphBarBg: { position: 'absolute', top: -8, width: 24, height: 3, borderRadius: 2, backgroundColor: 'rgba(239,68,68,0.18)', overflow: 'hidden' },
  telegraphBar: { height: 3, borderRadius: 2, backgroundColor: '#EF4444' },
  hpBarBg: { width: 30, height: 3, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, marginTop: 2 },
  hpBar: { height: 3, backgroundColor: '#EF4444', borderRadius: 2 },
  playerWrap: { position: 'absolute', alignItems: 'center', width: 48 },
  playerWaterRing: { position: 'absolute', top: 20, width: 60, height: 24, borderRadius: 30, borderWidth: 1, borderColor: 'rgba(125,211,252,0.7)', backgroundColor: 'rgba(14,116,144,0.2)' },
  playerAura: { position: 'absolute', top: 30, width: 42, height: 14, borderRadius: 21, backgroundColor: 'rgba(45,212,191,0.12)' },
  playerGroundGlow: { position: 'absolute', top: 22, width: 56, height: 22, borderRadius: 28, backgroundColor: 'rgba(45,212,191,0.08)', borderWidth: 1, borderColor: 'rgba(45,212,191,0.1)' },
  playerEmoji: { fontSize: 40, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.85)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 5 },
  shieldIcon: { position: 'absolute', top: -5, fontSize: 20 },
  petWrap: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  primeAura: { position: 'absolute', borderWidth: 2, alignSelf: 'center' },
  highLevelGlow: { position: 'absolute', borderWidth: 1, alignSelf: 'center' },
  petAttackLine: { position: 'absolute', left: '50%', top: '48%', width: 34, height: 3, borderRadius: 2 },
  petHealBloom: { position: 'absolute', width: '118%', height: '118%', borderRadius: 22, borderWidth: 1 },
  petWake: { position: 'absolute', width: '100%', height: '72%', borderRadius: 16, borderWidth: 1 },
  petEmoji: { fontSize: 20, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.75)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  petBadge: { position: 'absolute', right: -7, bottom: -5, minWidth: 14, height: 14, borderRadius: 7, overflow: 'hidden', color: '#FFF', fontSize: 8, fontWeight: '900', textAlign: 'center', textAlignVertical: 'center' },
  perkDots: { position: 'absolute', left: -4, top: -3, flexDirection: 'row', gap: 2 },
  perkDot: { width: 4, height: 4, borderRadius: 2 },
  pHpBg: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, marginTop: 2 },
  pHp: { height: 4, backgroundColor: '#22C55E', borderRadius: 2 },
  projectileGlow: { position: 'absolute', width: 16, height: 16, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)' },
  projectileEvolved: { borderWidth: 2, backgroundColor: 'rgba(245,158,11,0.08)', shadowColor: '#F59E0B', shadowOpacity: 0.5, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
  projectileGhost: { position: 'absolute', width: 14, height: 14, borderRadius: 7, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  projectileTrail: { position: 'absolute', height: 3, borderRadius: 2, left: -14 },
  projectileText: { fontWeight: '900', textAlign: 'center' },
  slashFx: { position: 'absolute', borderTopWidth: 5, borderRightWidth: 2, borderBottomWidth: 0, borderLeftWidth: 0 },
  muzzleFx: { position: 'absolute', height: 4, borderRadius: 3, shadowColor: '#FBBF24', shadowOpacity: 0.7, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  muzzleSpark: { position: 'absolute', width: 8, height: 8, borderRadius: 4 },
  beamFx: { position: 'absolute', height: 3, borderRadius: 3, shadowColor: '#A78BFA', shadowOpacity: 0.8, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  zapFx: { position: 'absolute', borderWidth: 2, backgroundColor: 'rgba(167,139,250,0.08)' },
  healFx: { position: 'absolute', fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.75)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  ringFx: { position: 'absolute', borderWidth: 3, backgroundColor: 'transparent' },
  shieldBarBg: { height: 2, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 1, marginTop: 1 },
  shieldBar: { height: 2, backgroundColor: '#2DD4BF', borderRadius: 1 },
  sparkFx: { position: 'absolute' },
  sparkRay: { position: 'absolute', height: 2, borderRadius: 1 },
  burstFx: { position: 'absolute', borderWidth: 3, backgroundColor: 'transparent' },
  burstInner: { position: 'absolute' },
  deathParticle: { position: 'absolute', textAlign: 'center', fontWeight: '800' },
  dangerVignette: { ...StyleSheet.absoluteFillObject, borderWidth: 18, borderColor: 'rgba(239,68,68,0.22)', backgroundColor: 'rgba(127,29,29,0.06)' },
  critFlash: { ...StyleSheet.absoluteFillObject, borderWidth: 6, borderColor: 'rgba(245,158,11,0.35)', backgroundColor: 'rgba(245,158,11,0.03)' },
  fogOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 5, pointerEvents: 'none' },
  fogVignette: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(100,120,140,0.15)' },
  dmgNum: { position: 'absolute', fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  marker: { position: 'absolute', width: 32, height: 32, borderRadius: 16, borderWidth: 2, backgroundColor: 'rgba(15,23,42,0.78)', alignItems: 'center', justifyContent: 'center', zIndex: 8 },
  markerEmoji: { position: 'absolute', fontSize: 16, textAlign: 'center' },
  markerText: { position: 'absolute', fontSize: 10, color: '#FFF', fontWeight: '900', top: -8, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
});
