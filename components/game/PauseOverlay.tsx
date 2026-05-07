import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { RunStats } from '../../engine/types';
import { isMuted, setMuted, getVolume, setVolume, loadAudioSettings } from '../../services/audio';

interface Props {
  stats: RunStats | null;
  waveNum: number;
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
}

const VOLUME_STEPS: { label: string; value: number }[] = [
  { label: 'OFF', value: 0 },
  { label: '25', value: 0.25 },
  { label: '50', value: 0.5 },
  { label: '75', value: 0.75 },
  { label: 'MAX', value: 1 },
];

export default function PauseOverlay({ stats, waveNum, onResume, onRestart, onQuit }: Props) {
  const [muted, setMutedState] = useState(false);
  const [volume, setVolumeState] = useState(0.5);
  useEffect(() => {
    let cancelled = false;
    loadAudioSettings().then(() => {
      if (cancelled) return;
      setMutedState(isMuted());
      setVolumeState(getVolume());
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  };
  const pickVolume = (v: number) => {
    setVolume(v);
    setVolumeState(v);
    if (muted && v > 0) {
      setMuted(false);
      setMutedState(false);
    }
  };
  const elapsed = stats ? Math.round((Date.now() - stats.startTime) / 1000) : 0;
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  return (
    <View style={s.overlay}>
      <View style={s.card}>
        <Text style={s.title}>PAUSED</Text>
        <Text style={s.stat}>Wave: {waveNum}</Text>
        <Text style={s.stat}>Kills: {stats?.enemiesKilled ?? 0}</Text>
        <Text style={s.stat}>Time: {mm}:{ss}</Text>
        <Pressable onPress={onResume} style={[s.btn, s.btnPrimary]}><Text style={s.btnText}>RESUME</Text></Pressable>
        <Pressable onPress={onRestart} style={[s.btn, s.btnSecondary]}><Text style={s.btnText}>RESTART</Text></Pressable>
        <Pressable onPress={onQuit} style={s.btn}><Text style={[s.btnText, { color: '#EF4444' }]}>QUIT TO MENU</Text></Pressable>
        <Text style={s.audioLabel}>{muted ? '🔇 Muted' : `🔊 Volume`}</Text>
        <View style={s.volumeRow}>
          {VOLUME_STEPS.map(step => {
            const active = !muted && Math.abs(volume - step.value) < 0.01;
            return (
              <Pressable
                key={step.label}
                onPress={() => pickVolume(step.value)}
                style={[s.volStep, active && s.volStepActive]}
                accessibilityRole="button"
                accessibilityLabel={`Volume ${step.label}`}
              >
                <Text style={[s.volText, active && s.volTextActive]}>{step.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable onPress={toggleMute} style={s.muteBtn}>
          <Text style={s.muteText}>{muted ? 'UNMUTE' : 'MUTE'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 50 },
  card: { backgroundColor: 'rgba(15,25,60,0.95)', borderRadius: 20, padding: 28, width: 300, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(100,150,255,0.15)' },
  title: { color: '#FFF', fontSize: 28, fontWeight: '800', marginBottom: 16 },
  stat: { color: '#94A3B8', fontSize: 15, marginBottom: 6 },
  btn: { width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 10, backgroundColor: 'rgba(255,255,255,0.06)' },
  btnPrimary: { backgroundColor: '#6366F1' },
  btnSecondary: { backgroundColor: 'rgba(99,102,241,0.2)' },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  audioLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '700', marginTop: 16, letterSpacing: 1 },
  volumeRow: { flexDirection: 'row', marginTop: 8, gap: 6 },
  volStep: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', minWidth: 44, alignItems: 'center' },
  volStepActive: { backgroundColor: 'rgba(45,212,191,0.16)', borderColor: '#2DD4BF' },
  volText: { color: '#94A3B8', fontSize: 12, fontWeight: '700' },
  volTextActive: { color: '#CCFBF1' },
  muteBtn: { marginTop: 10, paddingVertical: 6 },
  muteText: { color: '#94A3B8', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
});
