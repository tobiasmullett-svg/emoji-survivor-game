import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { GameState } from '../../engine/types';
import { ELITE_EMOJIS, ELITE_COLORS } from '../../engine/data';
import { PICKUP_BASE_RANGE } from '../../engine/constants';
import ArenaBackground from './arena/ArenaBackground';
import WeaponIcon, { hasWeaponIcon } from './WeaponIcon';

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

  const { player: p, enemies, projectiles, pickups, resourceNodes, pets, dmgNums, effects, deathParticles, hatchAnimations, hazards, camera, shake, arena, sw, sh } = state;
  const tx = -camera.x + sw / 2 + (shake?.x ?? 0);
  const ty = -camera.y + sh / 2 + (shake?.y ?? 0);
  const vMinX = camera.x - sw / 2 - 60;
  const vMaxX = camera.x + sw / 2 + 60;
  const vMinY = camera.y - sh / 2 - 60;
  const vMaxY = camera.y + sh / 2 + 60;
  const vis = (x: number, y: number) => x >= vMinX && x <= vMaxX && y >= vMinY && y <= vMaxY;
  const visibleHazards = (hazards ?? []).filter(h => vis(h.x, h.y));
  const visibleResourceNodes = (resourceNodes ?? []).filter(n => n.alive && vis(n.x, n.y));
  const visiblePickups = (pickups ?? []).filter(pk => vis(pk.x, pk.y));
  const visibleEnemies = (enemies ?? []).filter(e => e?.alive && vis(e.x, e.y));
  const visibleProjectiles = (projectiles ?? []).filter(pr => pr.life > 0 && vis(pr.x, pr.y));
  const visibleEffects = (effects ?? []).filter(fx => vis(fx.x, fx.y));
  const visibleDeathParticles = (deathParticles ?? []).filter(dp => vis(dp.x, dp.y));
  const visibleDmgNums = (dmgNums ?? []).filter(d => vis(d.x, d.y));
  const relicIds = new Set((state.relics ?? []).map(relic => relic.id));
  const effectivePickupRange = p.pickupRange * (relicIds.has('abyssalMagnet') ? 1.9 : 1) * (1 + p.luck * 0.01);
  const crowded = state.wave.number >= 5 || visibleEnemies.length + visibleProjectiles.length > 45 || visibleEffects.length + visibleDmgNums.length > 35;
  const displayProjectiles = crowded ? visibleProjectiles.slice(0, 48) : visibleProjectiles;
  const displayEffects = crowded ? visibleEffects.filter(fx => fx.kind !== 'muzzle' && fx.kind !== 'spark').slice(-14) : visibleEffects;
  const displayDeathParticles = crowded ? visibleDeathParticles.slice(-16) : visibleDeathParticles;
  const displayDmgNums = crowded ? visibleDmgNums.slice(-10) : visibleDmgNums.slice(-22);
  const showProjectileTrails = !crowded && visibleProjectiles.length < 34;
  const showCritFlash = !crowded && state.hitStop > 0.06;
  const bgFrame = Math.floor(frame / (crowded ? 4 : 3));
  const visibleWeaponSprites = (p.weapons ?? []).filter(w => hasWeaponIcon(w.id, w.evolved)).slice(0, crowded ? 2 : 4);

  return (
    <View style={s.viewport} pointerEvents="none">
      <View style={[s.world, { transform: [{ translateX: tx }, { translateY: ty }] }]}>
        <ArenaBackground
          width={arena.width}
          height={arena.height}
          frame={bgFrame}
          camera={camera}
          sw={sw}
          sh={sh}
          simpleMode={crowded}
        />
        {/* Hazards */}
        {visibleHazards.map(h => {
          const pulse = 0.5 + Math.sin(h.pulse) * 0.18;
          return (
            <View key={h.id} style={[s.hazardWrap, { left: h.x - h.radius, top: h.y - h.radius, width: h.radius * 2, height: h.radius * 2, borderRadius: h.radius }]}>
              <View style={[s.hazardPulse, { opacity: pulse, width: h.radius * 2, height: h.radius * 2, borderRadius: h.radius }]} />
              <Text style={s.hazardEmoji}>{h.emoji}</Text>
            </View>
          );
        })}
        {/* Resource nodes */}
        {visibleResourceNodes.map(node => (
          <View key={node.id} style={[s.nodeWrap, { left: node.x - node.radius, top: node.y - node.radius }]}>
            <View style={[
              s.nodeGlow,
              node.kind === 'crystal' && s.nodeGlowCrystal,
              {
                width: node.radius * (node.kind === 'crystal' ? 2.8 : 2.1),
                height: node.radius * (node.kind === 'crystal' ? 2.2 : 1.8),
                borderRadius: node.radius,
                opacity: node.flashTimer > 0 ? 0.75 : 1,
              },
            ]} />
            {node.kind === 'crystal' && <View style={s.nodeSparkle} />}
            <Text style={[s.nodeEmoji, { fontSize: node.radius * 1.65, opacity: node.flashTimer > 0 ? 0.5 : 1 }]}>
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
        {visiblePickups.map(pk => {
          const dx = pk.x - p.x;
          const dy = pk.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const inMagnet = dist < effectivePickupRange && dist > 12;
          const trailColor = pk.type === 'egg' ? 'rgba(251,191,36,0.5)' : pk.type === 'heal' ? 'rgba(34,197,94,0.5)' : 'rgba(45,212,191,0.4)';
          return (
            <React.Fragment key={pk.id}>
              {inMagnet && !crowded && (
                <View style={[s.magnetTrail, {
                  left: pk.x,
                  top: pk.y,
                  width: Math.min(dist * 0.6, 30),
                  backgroundColor: trailColor,
                  transform: [{ rotate: `${Math.atan2(-dy, -dx)}rad` }],
                }]} />
              )}
              <Text
                style={[
                  s.entity,
                  s.pickup,
                  { left: pk.x - 8, top: pk.y - 8 + Math.sin((frame + pk.id) * 0.12) * 2, fontSize: 14 },
                  inMagnet && { transform: [{ scale: 1 + Math.sin(frame * 0.2) * 0.15 }] },
                ]}
              >
                {pk.emoji}
              </Text>
            </React.Fragment>
          );
        })}
        {/* Hatch Animations */}
        {(hatchAnimations ?? []).filter(h => vis(h.x, h.y)).map(h => {
          const prog = 1 - h.timer / h.maxTimer;
          // Phase 0-0.4: egg wobbles with increasing intensity
          // Phase 0.4-0.7: egg cracks, sparks appear
          // Phase 0.7-1.0: egg explodes, pet emoji scales in
          const wobble = prog < 0.4
            ? Math.sin(prog * 80) * (3 + prog * 15)
            : prog < 0.7
              ? Math.sin(prog * 120) * (8 + (prog - 0.4) * 20)
              : 0;
          const eggOpacity = prog < 0.7 ? 1 : Math.max(0, 1 - (prog - 0.7) / 0.15);
          const petScale = prog > 0.7 ? Math.min(1.3, (prog - 0.7) / 0.2) : 0;
          const petOpacity = prog > 0.7 ? Math.min(1, (prog - 0.7) / 0.15) : 0;
          const crackVisible = prog > 0.35 && prog < 0.75;
          return (
            <View key={h.id} style={[s.hatchWrap, { left: h.x - 20, top: h.y - 24 }]}>
              {/* Glow underneath */}
              <View style={[s.hatchGlow, {
                backgroundColor: `${h.petColor}22`,
                borderColor: `${h.petColor}55`,
                opacity: prog,
                transform: [{ scale: 0.8 + prog * 0.8 }],
              }]} />
              {/* Egg emoji - wobbling */}
              {eggOpacity > 0 && (
                <Text style={[s.hatchEgg, {
                  opacity: eggOpacity,
                  transform: [{ translateX: wobble }, { scale: 1 + (prog > 0.5 ? (prog - 0.5) * 0.3 : 0) }],
                }]}>
                  {crackVisible ? '🥚' : '🥚'}
                </Text>
              )}
              {/* Crack lines */}
              {crackVisible && (
                <View style={[s.hatchCracks, { opacity: (prog - 0.35) * 3 }]}>
                  <Text style={s.hatchCrackText}>⚡</Text>
                </View>
              )}
              {/* Pet reveal */}
              {petScale > 0 && (
                <Text style={[s.hatchPetReveal, {
                  opacity: petOpacity,
                  transform: [{ scale: petScale }],
                  textShadowColor: h.petColor,
                }]}>
                  {h.petEmoji}
                </Text>
              )}
            </View>
          );
        })}
        {/* Enemies */}
        {visibleEnemies.map(e => {
          const showTelegraph = e.telegraphTimer > 0 && (e.telegraphType === 'attack' || e.telegraphType === 'charge');
          const telegraphProg = showTelegraph ? 1 - (e.telegraphTimer / e.telegraphMax) : 0;
          const chargeTelegraph = e.telegraphType === 'charge';
          const isElite = e.elite !== 'none';
          const visualFontSize = e.fontSize + (e.isBoss ? 0 : 2);
          return (
            <View key={e.id} style={[s.enemyWrap, { left: e.x - e.radius, top: e.y - e.radius - 8 }]}>
              <View style={[s.enemyShadow, {
                width: e.radius * 1.9,
                height: Math.max(7, e.radius * 0.42),
                borderRadius: e.radius,
                left: e.radius * 0.05,
                top: e.radius + visualFontSize * 0.42,
                opacity: e.flashTimer > 0 ? 0.16 : 0.26,
              }]} />
              {e.flashTimer > 0 && (
                <View style={[s.enemyHitPop, {
                  width: e.radius * 2,
                  height: Math.max(8, e.radius * 0.5),
                  borderRadius: e.radius,
                  top: e.radius + visualFontSize * 0.24,
                  backgroundColor: e.isBoss ? 'rgba(245,158,11,0.28)' : 'rgba(248,113,113,0.24)',
                }]} />
              )}
              {isElite && (!crowded || e.isBoss || e.flashTimer > 0) && (
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
                <View style={[s.telegraphBarBg, chargeTelegraph && s.chargeTelegraphBarBg]}>
                  <View style={[s.telegraphBar, chargeTelegraph && s.chargeTelegraphBar, { width: `${Math.min(100, Math.max(8, telegraphProg * 100))}%` }]} />
                </View>
              )}
              {chargeTelegraph && (
                <View style={[
                  s.chargeWarn,
                  {
                    width: e.radius * 4.8,
                    left: e.radius - e.radius * 2.4,
                    top: e.radius + 8,
                    opacity: 0.3 + telegraphProg * 0.45,
                    transform: [{ rotate: `${Math.atan2(e.chargeVy, e.chargeVx)}rad` }],
                  },
                ]} />
              )}
              <Text style={[s.entity, s.enemyEmoji, e.flashTimer > 0 && s.enemyEmojiHit, { fontSize: visualFontSize, opacity: e.flashTimer > 0 ? 0.45 : 1 }]}>
                {e.isBoss ? '👑' : ''}{e.emoji}
              </Text>
              {e.shieldHp > 0 && (e.isBoss || isElite || e.flashTimer > 0) && (
                <View style={[s.shieldBarBg, { width: e.radius * 2 }]}>
                  <View style={[s.shieldBar, { width: `${Math.max(0, (e.shieldHp / e.maxShieldHp) * 100)}%` }]} />
                </View>
              )}
              {e.hp < e.maxHp && (e.isBoss || isElite || e.flashTimer > 0 || !crowded) && (
                <View style={s.hpBarBg}>
                  <View style={[s.hpBar, { width: `${Math.max(0, (e.hp / e.maxHp) * 100)}%` }]} />
                </View>
              )}
            </View>
          );
        })}
        {/* Projectiles with afterimage trails */}
        {displayProjectiles.map(pr => {
          const isEvolved = !pr.isEnemy && (pr.emoji === '🔥' || pr.emoji === '🌩️' || pr.emoji === '⇒');
          const angle = Math.atan2(pr.vy, pr.vx);
          const speed = Math.sqrt(pr.vx * pr.vx + pr.vy * pr.vy);
          const trailLen = Math.min(3, Math.max(1, Math.floor(speed / 200)));
          return (
            <React.Fragment key={pr.id}>
              {/* Afterimage ghost copies */}
              {showProjectileTrails && trailLen >= 2 && (
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
              {showProjectileTrails && trailLen >= 3 && (
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
        {displayEffects.map(fx => {
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
          if (fx.kind === 'smoke') {
            return (
              <View
                key={fx.id}
                style={[
                  s.smokeFx,
                  {
                    left: fx.x - fx.radius * (0.4 + prog * 0.3),
                    top: fx.y - fx.radius * (0.4 + prog * 0.3),
                    width: fx.radius * (0.8 + prog * 0.6),
                    height: fx.radius * (0.45 + prog * 0.45),
                    borderRadius: fx.radius,
                    backgroundColor: fx.color,
                    opacity: (1 - prog) * 0.18,
                    transform: [{ rotate: `${fx.angle}rad` }, { scale: 0.9 + prog * 0.8 }],
                  },
                ]}
              />
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
          {visibleWeaponSprites.map((weapon, i) => {
            const count = visibleWeaponSprites.length;
            const angle = frame * 0.025 + i * ((Math.PI * 2) / Math.max(1, count));
            const radius = 28 + Math.min(8, count * 2);
            const x = 24 + Math.cos(angle) * radius;
            const y = 23 + Math.sin(angle) * radius * 0.46;
            return (
              <View
                key={`${weapon.id}-${i}`}
                style={[
                  s.playerWeaponSprite,
                  {
                    left: x - 14,
                    top: y - 14,
                    opacity: 0.78 + Math.sin(frame * 0.08 + i) * 0.08,
                    transform: [{ rotate: `${angle * 0.4}rad` }, { scale: weapon.evolved ? 1.12 : 1 }],
                  },
                ]}
              >
                <WeaponIcon id={weapon.id} evolved={weapon.evolved} size={28} />
              </View>
            );
          })}
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
        {displayDeathParticles.map(dp => {
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
        {displayDmgNums.map((d, idx) => {
          const prog = 1 - (d.t / d.maxT);
          const isCrit = d.color === '#F59E0B';
          // Bounce-in: scale from 0.4 → 1.25 → 1.0 in first 25% of life
          const bouncePhase = Math.min(1, prog / 0.25);
          const bounceScale = bouncePhase < 0.5
            ? 0.4 + bouncePhase * 2 * 0.85   // 0.4 → 1.25
            : 1.25 - (bouncePhase - 0.5) * 2 * 0.25; // 1.25 → 1.0
          const critPulse = isCrit ? 1 + Math.sin(prog * Math.PI * 3) * 0.12 : 1;
          const drift = ((d.id % 7) - 3) * 2.5; // subtle horizontal spread
          return (
            <Text key={d.id} style={[s.dmgNum, {
              left: d.x - 15 + drift, top: d.y - prog * 40,
              opacity: prog > 0.7 ? 1 - ((prog - 0.7) / 0.3) : 1,
              color: d.color,
              fontSize: isCrit ? 20 : 16,
              transform: [{ scale: bounceScale * critPulse }],
            }]}>{d.text}</Text>
          );
        })}
      </View>
      {state.inWater && !crowded && (
        <View style={s.submergeOverlay} pointerEvents="none">
          <View style={s.submergeVignette} />
        </View>
      )}
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
  submergeOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 3, backgroundColor: 'rgba(8,47,73,0.14)' },
  submergeVignette: { ...StyleSheet.absoluteFillObject, borderWidth: 22, borderColor: 'rgba(14,116,144,0.22)', backgroundColor: 'transparent' },
  entity: { position: 'absolute', textAlign: 'center' },
  hazardWrap: { position: 'absolute', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(251,146,60,0.38)', backgroundColor: 'rgba(251,146,60,0.07)' },
  hazardPulse: { position: 'absolute', borderWidth: 2, borderColor: 'rgba(251,146,60,0.42)', backgroundColor: 'rgba(251,146,60,0.08)' },
  hazardEmoji: { fontSize: 24, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  nodeWrap: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  nodeGlow: { position: 'absolute', backgroundColor: 'rgba(45,212,191,0.08)', borderWidth: 1, borderColor: 'rgba(45,212,191,0.18)' },
  nodeGlowCrystal: { backgroundColor: 'rgba(56,189,248,0.13)', borderColor: 'rgba(186,230,253,0.42)', shadowColor: '#38BDF8', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  nodeSparkle: { position: 'absolute', width: 6, height: 6, borderRadius: 3, right: -7, top: 2, backgroundColor: '#BAE6FD', shadowColor: '#BAE6FD', shadowOpacity: 0.8, shadowRadius: 5, shadowOffset: { width: 0, height: 0 } },
  nodeEmoji: { textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.75)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  nodeHpBg: { width: 34, height: 3, backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 2, marginTop: -1 },
  nodeHp: { height: 3, backgroundColor: '#2DD4BF', borderRadius: 2 },
  pickup: { textShadowColor: 'rgba(45,212,191,0.75)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 6 },
  enemyWrap: { position: 'absolute', alignItems: 'center' },
  enemyShadow: { position: 'absolute', backgroundColor: 'rgba(15,23,42,0.7)' },
  enemyHitPop: { position: 'absolute' },
  enemyEmoji: { textShadowColor: 'rgba(0,0,0,0.95)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 },
  enemyEmojiHit: { textShadowColor: 'rgba(248,250,252,0.9)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 },
  eliteAura: { position: 'absolute', borderWidth: 2, backgroundColor: 'transparent' },
  telegraphBarBg: { position: 'absolute', top: -8, width: 24, height: 3, borderRadius: 2, backgroundColor: 'rgba(239,68,68,0.18)', overflow: 'hidden' },
  telegraphBar: { height: 3, borderRadius: 2, backgroundColor: '#EF4444' },
  chargeTelegraphBarBg: { backgroundColor: 'rgba(56,189,248,0.18)' },
  chargeTelegraphBar: { backgroundColor: '#38BDF8' },
  chargeWarn: { position: 'absolute', height: 4, borderRadius: 3, backgroundColor: '#38BDF8', shadowColor: '#38BDF8', shadowOpacity: 0.6, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  hpBarBg: { width: 30, height: 3, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, marginTop: 2 },
  hpBar: { height: 3, backgroundColor: '#EF4444', borderRadius: 2 },
  playerWrap: { position: 'absolute', alignItems: 'center', width: 48 },
  playerWeaponSprite: { position: 'absolute', width: 28, height: 28, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  playerEmoji: { fontSize: 42, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.95)', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 7 },
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
  smokeFx: { position: 'absolute' },
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
  magnetTrail: { position: 'absolute', height: 3, borderRadius: 2, opacity: 0.6 },
  hatchWrap: { position: 'absolute', width: 40, height: 48, alignItems: 'center', justifyContent: 'center' },
  hatchGlow: { position: 'absolute', width: 48, height: 48, borderRadius: 24, borderWidth: 2 },
  hatchEgg: { fontSize: 28, textAlign: 'center', textShadowColor: 'rgba(251,191,36,0.8)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 },
  hatchCracks: { position: 'absolute', top: 2, right: -4 },
  hatchCrackText: { fontSize: 14, color: '#FBBF24' },
  hatchPetReveal: { position: 'absolute', fontSize: 30, textAlign: 'center', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12 },
});
