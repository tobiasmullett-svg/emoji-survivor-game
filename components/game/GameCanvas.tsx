import React, { useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Ellipse } from 'react-native-svg';
import type {
  GameState,
  Enemy,
  Pickup,
  ResourceNode,
  PetCompanion,
  HazardZone,
  HatchAnimation,
} from '../../engine/types';
import { ELITE_EMOJIS, ELITE_COLORS } from '../../engine/data';
import type { ArenaObstacle } from '../../engine/constants';
import { CRIT_HIT_STOP, ARENA_OBSTACLES } from '../../engine/constants';
import { getPickupRange } from '../../engine/GameEngine';
import ArenaBackground from './arena/ArenaBackground';
import WeaponIcon, { hasWeaponIcon } from './WeaponIcon';

interface Props {
  gameState: React.RefObject<GameState | null>;
  frame: number;
}

/**
 * Ground shadow ellipse (spec Phase 2 #1): one semi-transparent ellipse under
 * every entity, offset a few px below it, sized to the entity radius. Small
 * entities get a smaller *and* slightly darker shadow so they stay grounded.
 * Pure draw code — no engine involvement.
 */
function GroundShadow({ x, y, radius, opacity }: { x: number; y: number; radius: number; opacity?: number }) {
  const w = Math.max(12, radius * 1.9);
  const h = Math.max(5, radius * 0.42);
  const o = opacity ?? Math.min(0.34, Math.max(0.16, 0.34 - radius * 0.004));
  return (
    <View
      pointerEvents="none"
      style={[
        s.groundShadow,
        {
          left: x - w / 2,
          top: y + Math.max(4, radius * 0.55) - h / 2,
          width: w,
          height: h,
          borderRadius: h / 2,
          opacity: o,
        },
      ]}
    />
  );
}

/**
 * Parallax background (spec Phase 2 #3). Three precomputed layers (built once
 * at module load — zero per-frame array allocation), each drawn behind the
 * entities and moving at a different fraction of the camera:
 *   distant silhouette band (slow), mid rocks/coral (medium),
 *   foreground seaweed/debris (fast, sways/drifts past the camera).
 * Layer content lives in the same world coordinate space as the arena; each
 * layer counter-translates by camera * (1 - factor) so its features slide at
 * `factor` × camera speed.
 */
const PARALLAX_DISTANT = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  x: (i * 397 + 53) % 2300 - 150,
  y: (i * 263 + 71) % 2300 - 150,
  w: 70 + (i % 5) * 26,
  h: 24 + (i % 4) * 12,
  // Fully rounded: a stadium/rounded-rect silhouette reads as a UI panel lying
  // on the sand rather than as distant scenery.
  r: 0.5,
  // Low alpha: this layer was tuned against the old flat #050A15 background,
  // where a near-opaque navy shape read as a distant silhouette. On the sand
  // ground albedo it reads as a grey blob instead, so it now only darkens.
  o: 0.06 + (i % 3) * 0.03,
}));
const PARALLAX_MID = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  x: (i * 293 + 19) % 2150 - 75,
  y: (i * 191 + 43) % 2150 - 75,
  emoji: ['🪨', '🪸', '🐚', '🪨', '🪸', '🌊'][i % 6],
  size: 22 + (i % 4) * 6,
  o: 0.32 + (i % 3) * 0.09,
}));
const PARALLAX_FORE = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  x: (i * 349 + 11) % 2150 - 75,
  y: (i * 227 + 97) % 2150 - 75,
  emoji: ['🌿', '🍃', '🌿', '🪸', '💧', '🌊', '🐙', '⚓'][i % 8],
  size: 26 + (i % 4) * 7,
  o: 0.55 + (i % 3) * 0.12,
  sway: 0.012 + (i % 5) * 0.004,
  amp: 5 + (i % 4) * 3,
}));

/**
 * Y-sorted ground pass (spec Phase 2 #2): entities are drawn sorted by world y
 * (bottom = in front) so overlap reads as depth. Particles/effects
 * (projectiles, fx, death particles, dmg numbers) are NOT part of this pass —
 * they still draw on top.
 */
/**
 * Arena obstacles are solid: the engine pushes players, enemies and projectiles
 * out of these ellipses (`engine/arena.ts`). They previously had no renderer at
 * all, so the arena contained eight invisible walls that bumped you — complete
 * with a screen shake — against nothing on screen.
 *
 * Drawn deliberately opaque, with a rim and a recognisable emoji, so they read
 * as objects standing on the sea floor rather than as flat translucent shapes.
 */
const OBSTACLE_STYLES: Record<ArenaObstacle['kind'], {
  fill: string; stroke: string; highlight: string; emoji: string;
}> = {
  rock: { fill: 'rgba(51,65,85,0.94)', stroke: 'rgba(148,163,184,0.55)', highlight: 'rgba(148,163,184,0.20)', emoji: '🪨' },
  coral: { fill: 'rgba(136,45,23,0.92)', stroke: 'rgba(251,146,60,0.55)', highlight: 'rgba(251,146,60,0.20)', emoji: '🪸' },
  barrel: { fill: 'rgba(68,64,60,0.94)', stroke: 'rgba(168,162,158,0.55)', highlight: 'rgba(214,211,209,0.18)', emoji: '🛢️' },
};

/** One obstacle: contact shadow, solid ellipse body, lit top face, emoji. */
function ObstacleSprite({ o }: { o: ArenaObstacle }) {
  const style = OBSTACLE_STYLES[o.kind];
  // Padding keeps the 2px stroke from being clipped by the SVG viewport.
  const pad = 4;
  const cx = o.rx + pad;
  const cy = o.ry + pad;
  return (
    // testID is how the render test identifies an obstacle: the rock and coral
    // emoji also appear in the background decor, so matching on emoji alone
    // cannot distinguish a drawn obstacle from scenery.
    <View pointerEvents="none" testID={`arena-obstacle-${o.kind}`}>
      <View
        style={[s.obstacleShadow, {
          left: o.x - o.rx * 0.98,
          top: o.y + o.ry * 0.30,
          width: o.rx * 1.96,
          height: o.ry * 0.60,
          borderRadius: o.ry * 0.30,
        }]}
      />
      <Svg
        width={o.rx * 2 + pad * 2}
        height={o.ry * 2 + pad * 2}
        style={[s.obstacleBody, { left: o.x - o.rx - pad, top: o.y - o.ry - pad }]}
      >
        <Ellipse cx={cx} cy={cy} rx={o.rx} ry={o.ry} fill={style.fill} stroke={style.stroke} strokeWidth={2} />
        {/* Offset upward so the object reads as lit from above, matching the
            ground-shadow convention used for entities. */}
        <Ellipse cx={cx} cy={cy - o.ry * 0.30} rx={o.rx * 0.70} ry={o.ry * 0.46} fill={style.highlight} />
      </Svg>
      <Text
        style={[s.obstacleEmoji, {
          left: o.x - o.rx,
          top: o.y - o.ry * 0.62,
          width: o.rx * 2,
          fontSize: Math.min(o.rx, o.ry) * 1.15,
        }]}
      >
        {style.emoji}
      </Text>
    </View>
  );
}

type GroundItem =
  | { kind: 'obstacle'; key: string; y: number; o: ArenaObstacle }
  | { kind: 'hazard'; key: string; y: number; h: HazardZone }
  | { kind: 'node'; key: string; y: number; n: ResourceNode }
  | { kind: 'pickup'; key: string; y: number; pk: Pickup }
  | { kind: 'hatch'; key: string; y: number; h: HatchAnimation }
  | { kind: 'enemy'; key: string; y: number; e: Enemy }
  | { kind: 'player'; key: string; y: number }
  | { kind: 'pet'; key: string; y: number; pet: PetCompanion };

function DangerVignette({ frame }: { frame: number }) {
  const pulse = 0.15 + Math.sin(frame * 0.15) * 0.08;
  return (
    <View style={[s.dangerVignette, { borderColor: `rgba(239,68,68,${pulse})` }]} />
  );
}

function CritFlash({ hitStop }: { hitStop: number }) {
  // Fade with the remaining hit-stop so the flash decays deterministically.
  const opacity = Math.min(1, hitStop / CRIT_HIT_STOP);
  if (opacity <= 0) return null;
  return <View style={[s.critFlash, { opacity }]} />;
}

export default function GameCanvas({ gameState, frame }: Props) {
  const state = gameState?.current;
  // ── Camera juice state (Phase 2 #4): render-time only, engine untouched. ──
  // Boss zoom punch: rising edge of wave.bossSpawned triggers a ~1s zoom pulse.
  const prevBossSpawned = useRef(false);
  const bossZoomStart = useRef(-1e9);
  // Dash / pulse kick: abilityCooldown jumping from ~0 to max is the engine's
  // only activation signal (octopus dash, squid pulse).
  const prevAbilityCd = useRef(0);
  const kickStart = useRef(-1e9);
  const kickDir = useRef<{ x: number; y: number } | null>(null);
  const prevPlayerPos = useRef<{ x: number; y: number } | null>(null);
  const nowMs = Date.now();
  const ms = (start: number) => (nowMs - start) / 1000;
  if (!state) return <View style={s.viewport} />;

  const { player: p, enemies, projectiles, pickups, resourceNodes, pets, dmgNums, effects, deathParticles, hatchAnimations, hazards, camera, shake, arena, sw, sh } = state;

  // ── Camera juice (Phase 2 #4): render-time transforms, no engine mutation. ──
  // Boss zoom punch — rising edge of bossSpawned triggers a ~1s zoom pulse.
  const bossSpawned = state.wave?.bossSpawned ?? false;
  if (bossSpawned && !prevBossSpawned.current) bossZoomStart.current = nowMs;
  prevBossSpawned.current = bossSpawned;
  const zoomT = ms(bossZoomStart.current);
  const zoomPunch = zoomT < 1 ? Math.sin(zoomT * Math.PI) * 0.1 : 0; // 10% peak, ease in+out

  // Dash / pulse kick — abilityCooldown jump ~0→max is the activation signal.
  const abilityCd = p?.abilityCooldown ?? 0;
  const abilityMax = p?.abilityMaxCooldown ?? 0;
  if (abilityCd > 0 && abilityCd > (prevAbilityCd.current ?? 0) * 1.5 && abilityCd >= abilityMax * 0.9) {
    kickStart.current = nowMs;
    const pos = { x: p.x, y: p.y };
    if (prevPlayerPos.current && (p.characterId === 'octopus' || p.characterId === 'squid')) {
      const dx = pos.x - prevPlayerPos.current.x;
      const dy = pos.y - prevPlayerPos.current.y;
      const len = Math.hypot(dx, dy);
      kickDir.current = len > 1 ? { x: dx / len, y: dy / len } : null;
      if (!kickDir.current) {
        // Squid pulse is radial — aim kick toward the nearest alive enemy.
        let nearest: Enemy | null = null;
        let best = 600;
        for (const e of enemies ?? []) {
          if (!e?.alive) continue;
          const d = Math.hypot(e.x - pos.x, e.y - pos.y);
          if (d < best) { best = d; nearest = e; }
        }
        kickDir.current = nearest ? { x: (nearest.x - pos.x) / best, y: (nearest.y - pos.y) / best } : null;
      }
    }
  }
  prevAbilityCd.current = abilityCd;
  if (p) prevPlayerPos.current = { x: p.x, y: p.y };

  const kickT = ms(kickStart.current);
  const kickDur = p?.characterId === 'octopus' ? 0.3 : 0.28;
  const kickScale = kickT < kickDur ? 1 - (kickT / kickDur) : 0; // ease-out quad
  const kickMag = p?.characterId === 'octopus' ? 11 : 9;
  const kickX = (kickDir.current?.x ?? 0) * kickMag * kickScale;
  const kickY = (kickDir.current?.y ?? 0) * kickMag * kickScale;

  const tx = -camera.x + sw / 2 + (shake?.x ?? 0) + kickX;
  const ty = -camera.y + sh / 2 + (shake?.y ?? 0) + kickY;
  const zoomScale = 1 + zoomPunch;
  const vMinX = camera.x - sw / 2 - 60;
  const vMaxX = camera.x + sw / 2 + 60;
  const vMinY = camera.y - sh / 2 - 60;
  const vMaxY = camera.y + sh / 2 + 60;
  const vis = (x: number, y: number) => x >= vMinX && x <= vMaxX && y >= vMinY && y <= vMaxY;
  // Obstacles are large enough that their centre can be off-screen while part
  // of the body is still visible, so they need a rect test, not a point test.
  const visRect = (x: number, y: number, w: number, h: number) => (
    x + w >= vMinX && x <= vMaxX && y + h >= vMinY && y <= vMaxY
  );
  const visibleHazards = (hazards ?? []).filter(h => vis(h.x, h.y));
  const visibleResourceNodes = (resourceNodes ?? []).filter(n => n.alive && vis(n.x, n.y));
  const visiblePickups = (pickups ?? []).filter(pk => vis(pk.x, pk.y));
  const visibleEnemies = (enemies ?? []).filter(e => e?.alive && vis(e.x, e.y));
  const visibleProjectiles = (projectiles ?? []).filter(pr => pr.life > 0 && vis(pr.x, pr.y));
  const visibleEffects = (effects ?? []).filter(fx => vis(fx.x, fx.y));
  const visibleDeathParticles = (deathParticles ?? []).filter(dp => vis(dp.x, dp.y));
  const visibleDmgNums = (dmgNums ?? []).filter(d => vis(d.x, d.y));
  const visibleHatches = (hatchAnimations ?? []).filter(h => vis(h.x, h.y));
  const visiblePets = (pets ?? []).filter(pet => vis(pet.x, pet.y));
  const effectivePickupRange = getPickupRange(state);
  // Degrade detail based on what's actually on screen, not the wave number.
  const crowded = visibleEnemies.length + visibleProjectiles.length > 45 || visibleEffects.length + visibleDmgNums.length > 35;
  const displayProjectiles = crowded ? visibleProjectiles.slice(0, 48) : visibleProjectiles;
  const displayEffects = crowded ? visibleEffects.filter(fx => fx.kind !== 'muzzle' && fx.kind !== 'spark').slice(-14) : visibleEffects;
  const displayDeathParticles = crowded ? visibleDeathParticles.slice(-16) : visibleDeathParticles;
  const displayDmgNums = crowded ? visibleDmgNums.slice(-10) : visibleDmgNums.slice(-22);
  const showProjectileTrails = !crowded && visibleProjectiles.length < 34;
  const showCritFlash = !crowded && state.hitStop > 0.06;
  const bgFrame = Math.floor(frame / (crowded ? 4 : 3));
  const visibleWeaponSprites = (p.weapons ?? []).filter(w => hasWeaponIcon(w.id, w.evolved)).slice(0, crowded ? 2 : 4);

  // Build the Y-sorted ground pass once per frame: every grounded entity is
  // pushed with its world y, then sorted ascending so the bottom-most draws
  // last (in front). Ties are broken by key for a deterministic order.
  const groundItems: GroundItem[] = [];
  // Obstacles join the Y-sort rather than sitting in the background layer, so
  // an entity below one draws in front of it and an entity above draws behind.
  for (let i = 0; i < ARENA_OBSTACLES.length; i++) {
    const o = ARENA_OBSTACLES[i];
    if (!visRect(o.x - o.rx, o.y - o.ry, o.rx * 2, o.ry * 2)) continue;
    groundItems.push({ kind: 'obstacle', key: `obstacle-${i}`, y: o.y, o });
  }
  for (const h of visibleHazards) groundItems.push({ kind: 'hazard', key: `hazard-${h.id}`, y: h.y, h });
  for (const n of visibleResourceNodes) groundItems.push({ kind: 'node', key: `node-${n.id}`, y: n.y, n });
  for (const pk of visiblePickups) groundItems.push({ kind: 'pickup', key: `pickup-${pk.id}`, y: pk.y, pk });
  for (const h of visibleHatches) groundItems.push({ kind: 'hatch', key: `hatch-${h.id}`, y: h.y, h });
  for (const e of visibleEnemies) groundItems.push({ kind: 'enemy', key: `enemy-${e.id}`, y: e.y, e });
  groundItems.push({ kind: 'player', key: 'player', y: p.y });
  for (const pet of visiblePets) groundItems.push({ kind: 'pet', key: `pet-${pet.id}`, y: pet.y, pet });
  groundItems.sort((a, b) => a.y - b.y || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));

  function renderGroundItem(item: GroundItem): React.ReactNode {
    switch (item.kind) {
      case 'obstacle':
        return <ObstacleSprite key={item.key} o={item.o} />;
      case 'hazard': {
        const h = item.h;
        const pulse = 0.5 + Math.sin(h.pulse) * 0.18;
        return (
          <View key={item.key} style={[s.hazardWrap, { left: h.x - h.radius, top: h.y - h.radius, width: h.radius * 2, height: h.radius * 2, borderRadius: h.radius }]}>
            <View style={[s.hazardPulse, { opacity: pulse, width: h.radius * 2, height: h.radius * 2, borderRadius: h.radius }]} />
            <Text style={s.hazardEmoji}>{h.emoji}</Text>
          </View>
        );
      }
      case 'node': {
        const node = item.n;
        return (
          <React.Fragment key={item.key}>
            <GroundShadow x={node.x} y={node.y} radius={node.radius * 0.9} />
            <View style={[s.nodeWrap, { left: node.x - node.radius, top: node.y - node.radius }]}>
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
          </React.Fragment>
        );
      }
      case 'pickup': {
        const pk = item.pk;
        const dx = pk.x - p.x;
        const dy = pk.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const inMagnet = dist < effectivePickupRange && dist > 12;
        const trailColor = pk.type === 'egg' ? 'rgba(251,191,36,0.5)' : pk.type === 'heal' ? 'rgba(34,197,94,0.5)' : 'rgba(45,212,191,0.4)';
        return (
          <React.Fragment key={item.key}>
            {inMagnet && !crowded && (
              <View style={[s.magnetTrail, {
                left: pk.x,
                top: pk.y,
                width: Math.min(dist * 0.6, 30),
                backgroundColor: trailColor,
                transform: [{ rotate: `${Math.atan2(-dy, -dx)}rad` }],
              }]} />
            )}
            <GroundShadow x={pk.x} y={pk.y} radius={6.5} />
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
      }
      case 'hatch': {
        const h = item.h;
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
          <React.Fragment key={item.key}>
            <GroundShadow x={h.x} y={h.y} radius={13} />
            <View style={[s.hatchWrap, { left: h.x - 20, top: h.y - 24 }]}>
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
          </React.Fragment>
        );
      }
      case 'enemy': {
        const e = item.e;
        const showTelegraph = e.telegraphTimer > 0 && (e.telegraphType === 'attack' || e.telegraphType === 'charge');
        const telegraphProg = showTelegraph ? 1 - (e.telegraphTimer / e.telegraphMax) : 0;
        const chargeTelegraph = e.telegraphType === 'charge';
        const isElite = e.elite !== 'none';
        const visualFontSize = e.fontSize + (e.isBoss ? 0 : 2);
        return (
          <React.Fragment key={item.key}>
            <GroundShadow x={e.x} y={e.y} radius={e.radius * 1.05} opacity={e.flashTimer > 0 ? 0.14 : undefined} />
            <View style={[s.enemyWrap, { left: e.x - e.radius, top: e.y - e.radius - 8 }]}>
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
          </React.Fragment>
        );
      }
      case 'player': {
        return (
          <React.Fragment key={item.key}>
            <GroundShadow x={p.x} y={p.y} radius={p.radius * 1.05} />
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
          </React.Fragment>
        );
      }
      case 'pet': {
        const pet = item.pet;
        const pulse = 1 + Math.sin((frame + pet.id * 9) * 0.12) * 0.06;
        const size = 24 + Math.min(10, pet.level * 1.1);
        const flashScale = 1 + pet.attackFlash * 0.18;
        const isPrime = pet.generation >= 3;
        const isHighLevel = pet.level >= 5;
        return (
          <React.Fragment key={item.key}>
            <GroundShadow x={pet.x} y={pet.y} radius={pet.radius * 1.1} />
            <View
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
          </React.Fragment>
        );
      }
      default:
        return null;
    }
  }

  return (
    <View style={s.viewport} pointerEvents="none">
      <View style={[s.world, { transform: [
        { translateX: tx }, { translateY: ty },
        { translateX: sw / 2 }, { translateY: sh / 2 },
        { scale: zoomScale },
        { translateX: -sw / 2 }, { translateY: -sh / 2 },
      ] }]}>
        <ArenaBackground
          width={arena.width}
          height={arena.height}
          frame={bgFrame}
          camera={camera}
          sw={sw}
          sh={sh}
          simpleMode={crowded}
        />
        {/* Parallax background (Phase 2 #3): distant → mid → foreground, all
            behind entities. Each layer counter-translates against the camera
            so it slides at its own fraction of the camera speed. */}
        <View pointerEvents="none" style={[s.parallaxLayer, { transform: [{ translateX: camera.x * 0.85 }, { translateY: camera.y * 0.85 }] }]}>
          {PARALLAX_DISTANT.map(d => (
            <View key={`pd-${d.id}`} style={[s.silhouetteBlob, {
              left: d.x,
              top: d.y,
              width: d.w,
              height: d.h,
              borderRadius: d.h * d.r,
              opacity: d.o,
            }]} />
          ))}
        </View>
        <View pointerEvents="none" style={[s.parallaxLayer, { transform: [{ translateX: camera.x * 0.55 }, { translateY: camera.y * 0.55 }] }]}>
          {PARALLAX_MID.map(m => (
            <Text key={`pm-${m.id}`} style={[s.midProp, {
              left: m.x,
              top: m.y + Math.sin((frame + m.id * 13) * 0.02) * 2,
              fontSize: m.size,
              opacity: m.o,
            }]}>{m.emoji}</Text>
          ))}
        </View>
        <View pointerEvents="none" style={[s.parallaxLayer, { transform: [{ translateX: camera.x * 0.08 }, { translateY: camera.y * 0.08 }] }]}>
          {PARALLAX_FORE.map(f => (
            <Text key={`pf-${f.id}`} style={[s.foreProp, {
              left: f.x + Math.sin(frame * f.sway + f.id * 3) * f.amp,
              top: f.y + Math.cos(frame * f.sway * 0.7 + f.id * 5) * f.amp * 0.5,
              fontSize: f.size,
              opacity: f.o,
            }]}>{f.emoji}</Text>
          ))}
        </View>
        {/* Ground pass — Y-sorted entities (Phase 2 #2) */}
        {groundItems.map(item => renderGroundItem(item))}
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
      {showCritFlash && <CritFlash hitStop={state.hitStop} />}
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
  groundShadow: { position: 'absolute', backgroundColor: 'rgba(2,6,23,0.55)' },
  obstacleShadow: { position: 'absolute', backgroundColor: 'rgba(2,6,23,0.42)' },
  obstacleBody: { position: 'absolute' },
  obstacleEmoji: { position: 'absolute', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.55)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 5 },
  parallaxLayer: { position: 'absolute', left: 0, top: 0 },
  // No border: the outline was the main thing making these read as panels.
  silhouetteBlob: { position: 'absolute', backgroundColor: 'rgba(2,6,23,0.75)' },
  midProp: { position: 'absolute', textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  foreProp: { position: 'absolute', textShadowColor: 'rgba(0,0,0,0.7)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 5 },
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
