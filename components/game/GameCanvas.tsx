import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { GameState } from '../../engine/types';

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
  { id: 1, x: 170, y: 260, emoji: '🪸', size: 30 },
  { id: 2, x: 420, y: 1560, emoji: '🌿', size: 24 },
  { id: 3, x: 820, y: 300, emoji: '🪨', size: 26 },
  { id: 4, x: 1240, y: 1680, emoji: '🪸', size: 34 },
  { id: 5, x: 1620, y: 520, emoji: '🌿', size: 26 },
  { id: 6, x: 1760, y: 1320, emoji: '💠', size: 22 },
  { id: 7, x: 620, y: 1020, emoji: '🪸', size: 24 },
  { id: 8, x: 1420, y: 940, emoji: '🪨', size: 28 },
  { id: 9, x: 920, y: 820, emoji: '🌿', size: 23 },
  { id: 10, x: 1080, y: 1180, emoji: '🪸', size: 26 },
  { id: 11, x: 780, y: 1220, emoji: '💠', size: 20 },
  { id: 12, x: 1200, y: 760, emoji: '🪨', size: 24 },
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

  return (
    <View style={s.viewport} pointerEvents="none">
      <View style={[s.world, { transform: [{ translateX: tx }, { translateY: ty }] }]}>
        {/* Arena bg */}
        <View style={[s.arenaBg, { width: arena.width, height: arena.height }]}>
          <View style={s.arenaGlowA} />
          <View style={s.arenaGlowB} />
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
                  top: prop.y + Math.sin((frame + prop.id * 19) * 0.025) * 2,
                  fontSize: prop.size,
                  opacity: 0.18 + Math.sin((frame + prop.id * 13) * 0.02) * 0.03,
                },
              ]}
            >
              {prop.emoji}
            </Text>
          ))}
          {visibleBubbles.map(bubble => {
            const y = ((bubble.y - frame * bubble.speed) % 1960 + 1960) % 1960 + 20;
            return (
              <View
                key={`bubble-${bubble.id}`}
                style={[
                  s.bubble,
                  {
                    left: bubble.x + Math.sin((frame + bubble.id * 7) * 0.035) * 7,
                    top: y,
                    width: bubble.size,
                    height: bubble.size,
                    borderRadius: bubble.size,
                    opacity: 0.08 + (bubble.id % 4) * 0.025,
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
          return (
            <View key={e.id} style={[s.enemyWrap, { left: e.x - e.radius, top: e.y - e.radius - 8 }]}>
              {showTelegraph && (
                <View style={s.telegraphBarBg}>
                  <View style={[s.telegraphBar, { width: `${Math.min(100, Math.max(8, telegraphProg * 100))}%` }]} />
                </View>
              )}
              <Text style={[s.entity, s.enemyEmoji, { fontSize: e.fontSize, opacity: e.flashTimer > 0 ? 0.35 : 1 }]}>
                {e.isBoss ? '👑' : ''}{e.emoji}
              </Text>
              {/* Shield bar */}
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
        {/* Projectiles */}
        {(projectiles ?? []).filter(pr => pr.life > 0 && vis(pr.x, pr.y)).map(pr => (
          <View key={pr.id} style={[s.projectileGlow, { left: pr.x - 8, top: pr.y - 8, borderColor: pr.isEnemy ? 'rgba(34,197,94,0.45)' : 'rgba(245,158,11,0.5)' }]}>
            <View
              style={[
                s.projectileTrail,
                {
                  backgroundColor: pr.isEnemy ? 'rgba(74,222,128,0.55)' : 'rgba(251,191,36,0.7)',
                  transform: [{ rotate: `${Math.atan2(pr.vy, pr.vx)}rad` }],
                },
              ]}
            />
            <Text style={[s.projectileText, { fontSize: pr.isEnemy ? 12 : 11, color: pr.isEnemy ? '#4ADE80' : '#FBBF24' }]}>
              {pr.emoji}
            </Text>
          </View>
        ))}
        {/* Weapon effects */}
        {(effects ?? []).filter(fx => vis(fx.x, fx.y)).map(fx => {
          const prog = 1 - fx.t / fx.maxT;
          if (fx.kind === 'slash') {
            return (
              <View
                key={fx.id}
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
            );
          }
          if (fx.kind === 'muzzle') {
            return (
              <View
                key={fx.id}
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
              <View
                key={fx.id}
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
            );
          }
          if (fx.kind === 'burst') {
            return (
              <View
                key={fx.id}
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
          <View style={s.playerAura} />
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
      {(p.hp / p.maxHp) < 0.32 && <DangerVignette frame={frame} />}
      {state.waveModifier === 'denseFog' && (
        <View style={s.fogOverlay} pointerEvents="none">
          <View style={s.fogVignette} />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  viewport: { ...StyleSheet.absoluteFillObject, overflow: 'hidden', backgroundColor: '#030712' },
  world: { position: 'absolute', left: 0, top: 0 },
  arenaBg: { position: 'absolute', left: 0, top: 0, backgroundColor: '#050A15', borderWidth: 2, borderColor: 'rgba(45,212,191,0.24)', overflow: 'hidden' },
  arenaGlowA: { position: 'absolute', width: 620, height: 620, borderRadius: 310, left: 120, top: 120, backgroundColor: 'rgba(124,58,237,0.1)' },
  arenaGlowB: { position: 'absolute', width: 760, height: 760, borderRadius: 380, right: 120, bottom: 120, backgroundColor: 'rgba(20,184,166,0.08)' },
  currentLine: { position: 'absolute', height: 2, borderRadius: 2, backgroundColor: '#BAE6FD' },
  reefProp: { position: 'absolute', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  bubble: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(186,230,253,0.55)', backgroundColor: 'rgba(186,230,253,0.04)' },
  gridLineV: { position: 'absolute', top: 0, width: 1, backgroundColor: 'rgba(148,163,184,0.055)' },
  gridLineH: { position: 'absolute', left: 0, height: 1, backgroundColor: 'rgba(148,163,184,0.055)' },
  star: { position: 'absolute', backgroundColor: '#E0F2FE' },
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
  telegraphBarBg: { position: 'absolute', top: -8, width: 24, height: 3, borderRadius: 2, backgroundColor: 'rgba(239,68,68,0.18)', overflow: 'hidden' },
  telegraphBar: { height: 3, borderRadius: 2, backgroundColor: '#EF4444' },
  hpBarBg: { width: 30, height: 3, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, marginTop: 2 },
  hpBar: { height: 3, backgroundColor: '#EF4444', borderRadius: 2 },
  playerWrap: { position: 'absolute', alignItems: 'center', width: 48 },
  playerAura: { position: 'absolute', top: 30, width: 42, height: 14, borderRadius: 21, backgroundColor: 'rgba(45,212,191,0.12)' },
  playerEmoji: { fontSize: 40, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.85)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 5 },
  shieldIcon: { position: 'absolute', top: -5, fontSize: 20 },
  petWrap: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  petAttackLine: { position: 'absolute', left: '50%', top: '48%', width: 34, height: 3, borderRadius: 2 },
  petHealBloom: { position: 'absolute', width: '118%', height: '118%', borderRadius: 22, borderWidth: 1 },
  petWake: { position: 'absolute', width: '100%', height: '72%', borderRadius: 16, borderWidth: 1 },
  petEmoji: { fontSize: 20, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.75)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  petBadge: { position: 'absolute', right: -7, bottom: -5, minWidth: 14, height: 14, borderRadius: 7, overflow: 'hidden', color: '#FFF', fontSize: 8, fontWeight: '900', textAlign: 'center', textAlignVertical: 'center' },
  pHpBg: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, marginTop: 2 },
  pHp: { height: 4, backgroundColor: '#22C55E', borderRadius: 2 },
  projectileGlow: { position: 'absolute', width: 16, height: 16, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)' },
  projectileTrail: { position: 'absolute', width: 22, height: 3, borderRadius: 2, left: -14 },
  projectileText: { fontWeight: '900', textAlign: 'center' },
  slashFx: { position: 'absolute', borderTopWidth: 5, borderRightWidth: 2, borderBottomWidth: 0, borderLeftWidth: 0 },
  muzzleFx: { position: 'absolute', height: 4, borderRadius: 3, shadowColor: '#FBBF24', shadowOpacity: 0.7, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  beamFx: { position: 'absolute', height: 3, borderRadius: 3, shadowColor: '#A78BFA', shadowOpacity: 0.8, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  zapFx: { position: 'absolute', borderWidth: 2, backgroundColor: 'rgba(167,139,250,0.08)' },
  healFx: { position: 'absolute', fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.75)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  ringFx: { position: 'absolute', borderWidth: 3, backgroundColor: 'transparent' },
  shieldBarBg: { height: 2, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 1, marginTop: 1 },
  shieldBar: { height: 2, backgroundColor: '#2DD4BF', borderRadius: 1 },
  sparkFx: { position: 'absolute' },
  burstFx: { position: 'absolute', borderWidth: 3, backgroundColor: 'transparent' },
  deathParticle: { position: 'absolute', textAlign: 'center', fontWeight: '800' },
  dangerVignette: { ...StyleSheet.absoluteFillObject, borderWidth: 18, borderColor: 'rgba(239,68,68,0.22)', backgroundColor: 'rgba(127,29,29,0.06)' },
  fogOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 5, pointerEvents: 'none' },
  fogVignette: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(100,120,140,0.15)' },
  dmgNum: { position: 'absolute', fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
});
