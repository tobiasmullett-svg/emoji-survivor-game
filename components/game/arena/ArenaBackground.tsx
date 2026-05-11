import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, G, Path, RadialGradient, Stop } from 'react-native-svg';
import { WATER_ZONES } from '../../../engine/constants';

/** Hybrid base: Flux-generated orthographic sea floor (see assets/arena/README.md). */
const GROUND_ALBEDO = require('../../../assets/arena/ground-albedo.png');

const GRID_STEP = 160;
const GRID_LINES = Array.from({ length: Math.floor(2000 / GRID_STEP) + 1 }, (_, i) => i * GRID_STEP);

const STARS = Array.from({ length: 46 }, (_, i) => ({
  id: i,
  x: (i * 173) % 1960 + 20,
  y: (i * 311) % 1960 + 20,
  size: 1 + (i % 3),
  opacity: 0.1 + (i % 5) * 0.04,
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

function waterBlobPath(x: number, y: number, r: number, seed: number, frame: number, inset = 0): string {
  const rr = r - inset;
  const wobble = Math.sin(frame * 0.018 + seed * 1.7) * 8;
  const wobbleB = Math.cos(frame * 0.014 + seed * 2.1) * 7;
  const top = y - rr * (0.84 + seed * 0.012) + wobble * 0.3;
  return [
    `M ${x + wobble * 0.5} ${top}`,
    `C ${x + rr * 0.42} ${y - rr * 1.02 + wobbleB} ${x + rr * 0.94} ${y - rr * 0.45} ${x + rr * 0.88 + wobble} ${y + rr * 0.05}`,
    `C ${x + rr * 0.82} ${y + rr * 0.52} ${x + rr * 0.34 + wobbleB} ${y + rr * 0.92} ${x - rr * 0.12} ${y + rr * 0.86}`,
    `C ${x - rr * 0.62 + wobble} ${y + rr * 0.8} ${x - rr * 0.98} ${y + rr * 0.28 + wobbleB} ${x - rr * 0.84} ${y - rr * 0.18}`,
    `C ${x - rr * 0.7} ${y - rr * 0.63} ${x - rr * 0.28 + wobbleB} ${y - rr * 0.82} ${x + wobble * 0.5} ${top}`,
    'Z',
  ].join(' ');
}

function foamPath(x: number, y: number, r: number, seed: number, frame: number): string {
  const shift = Math.sin(frame * 0.025 + seed) * 10;
  return [
    `M ${x - r * 0.54 + shift} ${y - r * 0.48}`,
    `C ${x - r * 0.2} ${y - r * 0.68} ${x + r * 0.28} ${y - r * 0.66} ${x + r * 0.56} ${y - r * 0.35}`,
    `M ${x - r * 0.66} ${y + r * 0.22}`,
    `C ${x - r * 0.34} ${y + r * 0.44} ${x + r * 0.2} ${y + r * 0.48} ${x + r * 0.62} ${y + r * 0.14}`,
  ].join(' ');
}

export interface ArenaBackgroundProps {
  width: number;
  height: number;
  frame: number;
  camera: { x: number; y: number };
  sw: number;
  sh: number;
  simpleMode?: boolean;
}

function ArenaBackground({ width, height, frame, camera, sw, sh, simpleMode = false }: ArenaBackgroundProps) {
  const vMinX = camera.x - sw / 2 - 60;
  const vMaxX = camera.x + sw / 2 + 60;
  const vMinY = camera.y - sh / 2 - 60;
  const vMaxY = camera.y + sh / 2 + 60;
  const vis = (x: number, y: number) => x >= vMinX && x <= vMaxX && y >= vMinY && y <= vMaxY;
  const visRect = (x: number, y: number, w: number, h: number) => (
    x + w >= vMinX && x <= vMaxX && y + h >= vMinY && y <= vMaxY
  );

  const parallaxX = (width * 0.5 - camera.x) * 0.035;
  const parallaxY = (height * 0.5 - camera.y) * 0.035;

  const visibleGridX = GRID_LINES.filter(x => x >= vMinX && x <= vMaxX);
  const visibleGridY = GRID_LINES.filter(y => y >= vMinY && y <= vMaxY);
  const visibleCurrents = CURRENTS.filter(c => visRect(c.x - 30, c.y - 30, c.width + 60, 60));
  const visibleReefProps = REEF_PROPS.filter(p => visRect(p.x - 20, p.y - 20, p.size + 40, p.size + 40));

  return (
    <View style={[styles.arenaBg, { width, height }]}>
      <Image
        source={GROUND_ALBEDO}
        style={[styles.groundImage, { width, height }]}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
      <LinearGradient
        colors={['rgba(2,6,23,0.38)', 'rgba(2,6,23,0.06)', 'rgba(2,6,23,0.05)', 'rgba(2,6,23,0.34)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.35, 0.65, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={[styles.arenaGlowA, { transform: [{ translateX: parallaxX * 0.5 }, { translateY: parallaxY * 0.5 }] }]} />
      <View style={[styles.arenaGlowB, { transform: [{ translateX: -parallaxX * 0.4 }, { translateY: -parallaxY * 0.4 }] }]} />

      <Svg width={width} height={height} style={StyleSheet.absoluteFillObject}>
        <Defs>
          {WATER_ZONES.map((z, i) => (
            <RadialGradient
              key={`wg-${i}`}
              id={`waterFill-${i}`}
              cx={z.x}
              cy={z.y - z.radius * 0.1}
              rx={z.radius * 0.95}
              ry={z.radius * 0.98}
              fx={z.x}
              fy={z.y - z.radius * 0.22}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0%" stopColor="rgb(224,242,254)" stopOpacity={0.16} />
              <Stop offset="32%" stopColor="rgb(34,211,238)" stopOpacity={0.32} />
              <Stop offset="70%" stopColor="rgb(14,116,144)" stopOpacity={0.52} />
              <Stop offset="100%" stopColor="rgb(22,78,99)" stopOpacity={0.66} />
            </RadialGradient>
          ))}
        </Defs>

        {WATER_ZONES.map((z, i) => {
          const pulse = 0.03 * Math.sin(frame * 0.032 + i);
          return (
            <G key={`water-${i}`}>
              <Path
                d={waterBlobPath(z.x, z.y, z.radius, i, frame, 0)}
                fill={`url(#waterFill-${i})`}
                opacity={0.46 + pulse}
              />
              <Path
                d={waterBlobPath(z.x, z.y, z.radius, i, frame, 5)}
                fill="none"
                stroke="rgba(224,242,254,0.22)"
                strokeWidth={2}
                opacity={0.34}
              />
              <Path
                d={foamPath(z.x, z.y, z.radius, i, frame)}
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth={5}
                opacity={0.15}
                strokeLinecap="round"
              />
              <Path
                d={waterBlobPath(z.x, z.y, z.radius, i + 3, frame, 32)}
                fill="none"
                stroke="rgba(45,212,191,0.12)"
                strokeWidth={3}
                opacity={0.16}
              />
            </G>
          );
        })}
      </Svg>

      <View style={[styles.arenaGlowC, {
        left: 600 + Math.sin(frame * 0.005) * 120,
        top: 800 + Math.cos(frame * 0.004) * 90,
      }]} />

      {!simpleMode && CAUSTIC_LIGHTS.map(cl => (
        <View
          key={`cl-${cl.id}`}
          style={[
            styles.causticLight,
            {
              left: cl.x + Math.sin(frame * cl.drift + cl.id) * 40,
              top: cl.y + Math.cos(frame * cl.drift * 0.7 + cl.id * 3) * 30,
              width: cl.width,
              height: cl.height,
              borderRadius: cl.height / 2,
              opacity: 0.04 + Math.sin(frame * cl.speed + cl.id * 2) * 0.018,
              transform: [{ rotate: `${cl.angle + Math.sin(frame * 0.003 + cl.id) * 12}deg` }],
            },
          ]}
        />
      ))}

      <View style={[StyleSheet.absoluteFillObject, { transform: [{ translateX: parallaxX }, { translateY: parallaxY }] }]} pointerEvents="none">
        {!simpleMode && KELP_CLUSTERS.map(kc => (
          <View key={`kc-${kc.id}`} style={[styles.kelpCluster, { left: kc.x, top: kc.y }]}>
            {Array.from({ length: kc.blades }, (_, bi) => {
              const sway = Math.sin((frame + kc.id * 17 + bi * 11) * 0.025) * 8;
              return (
                <View
                  key={bi}
                  style={[
                    styles.kelpBlade,
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
              styles.currentLine,
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
              styles.reefProp,
              {
                left: prop.x,
                top: prop.y + Math.sin((frame + prop.id * 19) * 0.025) * (2 + prop.layer),
                fontSize: prop.size,
                opacity: 0.2 + Math.sin((frame + prop.id * 13) * 0.02) * 0.05 + prop.layer * 0.07,
              },
            ]}
          >
            {prop.emoji}
          </Text>
        ))}
        {!simpleMode && BUBBLES.map(bubble => {
          const bx = bubble.x + Math.sin((frame + bubble.id * 7) * 0.035) * 7;
          const by = ((bubble.y - frame * bubble.speed) % 1960 + 1960) % 1960 + 20;
          if (!vis(bx, by)) return null;
          return (
            <View
              key={`bubble-${bubble.id}`}
              style={[
                styles.bubble,
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
        {!simpleMode && DEPTH_MOTES.map(mote => {
          const mx = mote.x + Math.sin(frame * mote.driftX + mote.id * 5) * 30;
          const my = mote.y + Math.cos(frame * mote.driftY + mote.id * 3) * 25;
          return (
            <View
              key={`mote-${mote.id}`}
              style={[
                styles.depthMote,
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
        {!simpleMode && STARS.filter(star => vis(star.x, star.y)).map(star => (
          <View
            key={star.id}
            style={[
              styles.star,
              {
                left: star.x,
                top: star.y,
                width: star.size,
                height: star.size,
                borderRadius: star.size,
                opacity: Math.min(0.5, star.opacity + ((frame + star.id) % 90 < 45 ? 0.08 : 0)),
              },
            ]}
          />
        ))}
      </View>

      {!simpleMode && visibleGridX.map(x => <View key={`vx-${x}`} style={[styles.gridLineV, { left: x, height }]} />)}
      {!simpleMode && visibleGridY.map(y => <View key={`hy-${y}`} style={[styles.gridLineH, { top: y, width }]} />)}

      <View style={[styles.arenaBorderPulse, {
        width, height,
        borderColor: `rgba(45,212,191,${0.1 + Math.sin(frame * 0.02) * 0.05})`,
      }]} />
    </View>
  );
}

export default React.memo(ArenaBackground);

const styles = StyleSheet.create({
  arenaBg: { position: 'absolute', left: 0, top: 0, borderWidth: 2, borderColor: 'rgba(45,212,191,0.22)', overflow: 'hidden' },
  groundImage: { position: 'absolute', left: 0, top: 0 },
  arenaGlowA: { position: 'absolute', width: 620, height: 620, borderRadius: 310, left: 120, top: 120, backgroundColor: 'rgba(124,58,237,0.06)' },
  arenaGlowB: { position: 'absolute', width: 760, height: 760, borderRadius: 380, right: 120, bottom: 120, backgroundColor: 'rgba(20,184,166,0.05)' },
  arenaGlowC: { position: 'absolute', width: 500, height: 500, borderRadius: 250, backgroundColor: 'rgba(99,102,241,0.05)' },
  causticLight: { position: 'absolute', backgroundColor: 'rgba(186,230,253,0.07)' },
  kelpCluster: { position: 'absolute', width: 30, height: 60, alignItems: 'center' },
  kelpBlade: { position: 'absolute', width: 4, borderRadius: 2, bottom: 0 },
  currentLine: { position: 'absolute', height: 2, borderRadius: 2, backgroundColor: '#BAE6FD' },
  reefProp: { position: 'absolute', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  bubble: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(186,230,253,0.55)', backgroundColor: 'rgba(186,230,253,0.04)' },
  depthMote: { position: 'absolute' },
  gridLineV: { position: 'absolute', top: 0, width: 1, backgroundColor: 'rgba(148,163,184,0.045)' },
  gridLineH: { position: 'absolute', left: 0, height: 1, backgroundColor: 'rgba(148,163,184,0.045)' },
  star: { position: 'absolute', backgroundColor: '#E0F2FE' },
  arenaBorderPulse: { position: 'absolute', left: 0, top: 0, borderWidth: 3, backgroundColor: 'transparent' },
});
