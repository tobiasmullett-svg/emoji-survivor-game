// Simple Web Audio API synthesizer for game SFX
// No external assets needed — generates sounds procedurally
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

import AsyncStorage from '@react-native-async-storage/async-storage';

type SoundName =
  | 'shoot' | 'shootFast' | 'shootHeavy' | 'melee'
  | 'hit' | 'crit' | 'kill' | 'deepKill' | 'explosion'
  | 'pickup' | 'pickupMat' | 'heal' | 'levelup'
  | 'waveStart' | 'bossWarning' | 'gameOver' | 'victory'
  | 'ability' | 'shopBuy' | 'evolve' | 'error'
  | 'enterWater' | 'exitWater' | 'oxygenTick';

const SETTINGS_KEY = 'emoji_survivor_audio';
const DEFAULT_VOLUME = 0.5; // 0..1, scales the underlying ~0.15 master gain
const BASE_GAIN = 0.15;

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let muted = false;
let lastNativeCue = 0;
let volume = DEFAULT_VOLUME;
let settingsLoaded = false;

/** Underwater bed (web only): two low sines + lowpass, gain follows depth/oxygen. */
let ambientGain: GainNode | null = null;
let ambientOscs: OscillatorNode[] = [];
let ambientLpf: BiquadFilterNode | null = null;
let ambientStarted = false;
let lastAmbientAt = 0;

function effectiveGain(): number {
  return muted ? 0 : BASE_GAIN * volume;
}

function getCtx(): AudioContext | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  if (!ctx) {
    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextCtor) return null;
    ctx = new AudioContextCtor();
    masterGain = ctx.createGain();
    masterGain.gain.value = effectiveGain();
    masterGain.connect(ctx.destination);
  }
  return ctx;
}

function ensureAmbientDrone(): void {
  const c = getCtx();
  if (!c || muted || ambientStarted) return;
  ambientStarted = true;
  ambientGain = c.createGain();
  ambientGain.gain.value = 0;
  ambientLpf = c.createBiquadFilter();
  ambientLpf.type = 'lowpass';
  ambientLpf.frequency.value = 420;
  ambientLpf.Q.value = 0.7;
  ambientGain.connect(ambientLpf);
  ambientLpf.connect(masterGain!);
  const freqs = [58, 86];
  for (const f of freqs) {
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    o.connect(ambientGain);
    o.start();
    ambientOscs.push(o);
  }
}

/** Throttled ambient layer for underwater tension (web only). */
export function setGameAmbient(opts: { inWater: boolean; oxygen01: number }): void {
  if (Platform.OS !== 'web' || muted) return;
  const c = getCtx();
  if (!c) return;
  const now = performance.now();
  if (now - lastAmbientAt < 120) return;
  lastAmbientAt = now;
  ensureAmbientDrone();
  if (!ambientGain) return;
  const t = c.currentTime;
  const oxy = Math.max(0, Math.min(1, opts.oxygen01));
  if (opts.inWater) {
    const base = 0.018 + (1 - oxy) * 0.022;
    ambientGain.gain.cancelScheduledValues(t);
    ambientGain.gain.linearRampToValueAtTime(base, t + 0.08);
    if (ambientLpf) {
      ambientLpf.frequency.cancelScheduledValues(t);
      ambientLpf.frequency.linearRampToValueAtTime(280 + oxy * 220, t + 0.1);
    }
  } else {
    ambientGain.gain.cancelScheduledValues(t);
    ambientGain.gain.linearRampToValueAtTime(0, t + 0.25);
  }
}

export function stopGameAmbient(): void {
  if (Platform.OS !== 'web') return;
  const c = ctx;
  if (!c || !ambientStarted) return;
  try {
    for (const o of ambientOscs) {
      o.stop();
      o.disconnect();
    }
  } catch {
    // already stopped
  }
  ambientOscs = [];
  ambientGain?.disconnect();
  ambientLpf?.disconnect();
  ambientGain = null;
  ambientLpf = null;
  ambientStarted = false;
}

function playNativeCue(name: SoundName): void {
  if (muted || Platform.OS === 'web') return;
  const now = Date.now();
  if (now - lastNativeCue < 45) return;
  lastNativeCue = now;

  if (name === 'error') {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    return;
  }
  if (name === 'levelup' || name === 'evolve' || name === 'victory') {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    return;
  }
  if (name === 'gameOver' || name === 'bossWarning') {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    return;
  }
  if (name === 'crit' || name === 'explosion' || name === 'shootHeavy') {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    return;
  }
  if (name === 'hit' || name === 'melee' || name === 'kill' || name === 'deepKill' || name === 'ability' || name === 'oxygenTick') {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    return;
  }
  if (name === 'enterWater' || name === 'exitWater') {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    return;
  }
  void Haptics.selectionAsync().catch(() => {});
}

function playOsc(freq: number, type: OscillatorType, duration: number, gain: number, slideTo?: number): void {
  const c = getCtx();
  if (!c || muted) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime);
  if (slideTo) {
    osc.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + duration);
  }
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  osc.connect(g);
  g.connect(masterGain!);
  osc.start();
  osc.stop(c.currentTime + duration);
}

function playNoise(duration: number, gain: number): void {
  const c = getCtx();
  if (!c || muted) return;
  const bufferSize = c.sampleRate * duration;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const noise = c.createBufferSource();
  noise.buffer = buffer;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  noise.connect(g);
  g.connect(masterGain!);
  noise.start();
}

export function playSound(name: SoundName): void {
  if (Platform.OS !== 'web') {
    playNativeCue(name);
    return;
  }
  switch (name) {
    case 'shoot':
      playOsc(800, 'square', 0.08, 0.3, 400);
      break;
    case 'shootFast':
      playOsc(1200, 'square', 0.05, 0.2, 600);
      break;
    case 'shootHeavy':
      playOsc(300, 'sawtooth', 0.2, 0.25, 100);
      break;
    case 'melee':
      playOsc(200, 'sawtooth', 0.1, 0.2, 50);
      playNoise(0.1, 0.15);
      break;
    case 'hit':
      playOsc(150, 'square', 0.06, 0.2, 80);
      break;
    case 'crit':
      playOsc(600, 'square', 0.15, 0.3, 1200);
      playOsc(800, 'sine', 0.1, 0.2, 1600);
      break;
    case 'kill':
      playOsc(400, 'sine', 0.2, 0.25, 800);
      break;
    case 'deepKill':
      playOsc(320, 'sine', 0.18, 0.22, 520);
      playOsc(660, 'sine', 0.12, 0.12, 990);
      playNoise(0.06, 0.06);
      break;
    case 'explosion':
      playNoise(0.3, 0.4);
      playOsc(100, 'sawtooth', 0.3, 0.3, 30);
      break;
    case 'pickup':
      playOsc(880, 'sine', 0.1, 0.2, 1760);
      break;
    case 'pickupMat':
      playOsc(660, 'sine', 0.08, 0.15, 1320);
      break;
    case 'heal':
      playOsc(440, 'sine', 0.15, 0.2, 880);
      playOsc(554, 'sine', 0.15, 0.15, 1108);
      break;
    case 'levelup':
      playOsc(523, 'sine', 0.15, 0.25, 1046);
      playOsc(659, 'sine', 0.15, 0.25, 1318);
      playOsc(784, 'sine', 0.2, 0.25, 1568);
      break;
    case 'waveStart':
      playOsc(330, 'sawtooth', 0.3, 0.2, 660);
      break;
    case 'bossWarning':
      playOsc(200, 'sawtooth', 0.5, 0.25, 80);
      playOsc(200, 'square', 0.5, 0.15, 80);
      break;
    case 'gameOver':
      playOsc(400, 'sawtooth', 0.4, 0.25, 100);
      playOsc(300, 'sawtooth', 0.4, 0.25, 80);
      playOsc(200, 'sawtooth', 0.5, 0.25, 60);
      break;
    case 'victory':
      playOsc(523, 'sine', 0.2, 0.2, 1046);
      playOsc(659, 'sine', 0.2, 0.2, 1318);
      playOsc(784, 'sine', 0.2, 0.2, 1568);
      playOsc(1047, 'sine', 0.4, 0.25, 2093);
      break;
    case 'ability':
      playOsc(300, 'sine', 0.3, 0.3, 900);
      break;
    case 'shopBuy':
      playOsc(600, 'sine', 0.1, 0.2, 1200);
      break;
    case 'evolve':
      playOsc(400, 'square', 0.2, 0.3, 1600);
      playOsc(600, 'sine', 0.3, 0.25, 1800);
      break;
    case 'error':
      playOsc(150, 'square', 0.1, 0.15, 100);
      break;
    case 'enterWater':
      playOsc(220, 'sine', 0.2, 0.12, 440);
      playOsc(330, 'sine', 0.15, 0.08, 660);
      playNoise(0.04, 0.04);
      break;
    case 'exitWater':
      playOsc(520, 'sine', 0.12, 0.14, 780);
      playOsc(390, 'sine', 0.1, 0.1, 520);
      break;
    case 'oxygenTick':
      playOsc(165, 'sine', 0.14, 0.14, 95);
      playNoise(0.05, 0.07);
      break;
  }
}

export function setMuted(value: boolean): void {
  muted = value;
  if (masterGain) masterGain.gain.value = effectiveGain();
  void AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ muted, volume })).catch(() => {});
}

export function isMuted(): boolean {
  return muted;
}

export function setVolume(value: number): void {
  volume = Math.max(0, Math.min(1, value));
  if (masterGain) masterGain.gain.value = effectiveGain();
  void AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ muted, volume })).catch(() => {});
}

export function getVolume(): number {
  return volume;
}

// Loads persisted mute + volume. Safe to call multiple times — only loads
// once. Should be invoked early in app boot (called by resumeAudio()).
export async function loadAudioSettings(): Promise<void> {
  if (settingsLoaded) return;
  settingsLoaded = true;
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { muted?: boolean; volume?: number };
    if (typeof parsed.muted === 'boolean') muted = parsed.muted;
    if (typeof parsed.volume === 'number') volume = Math.max(0, Math.min(1, parsed.volume));
    if (masterGain) masterGain.gain.value = effectiveGain();
  } catch {
    // Silently fall back to defaults
  }
}

export function resumeAudio(): void {
  void loadAudioSettings();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume();
  }
}
