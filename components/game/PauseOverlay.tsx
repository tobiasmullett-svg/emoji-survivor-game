import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { RunStats } from '../../engine/types';
import { isMuted, setMuted } from '../../services/audio';

interface Props {
  stats: RunStats | null;
  waveNum: number;
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
}

export default function PauseOverlay({ stats, waveNum, onResume, onRestart, onQuit }: Props) {
  const [muted, setMutedState] = useState(false);
  useEffect(() => { setMutedState(isMuted()); }, []);
  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
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
        <Pressable onPress={toggleMute} style={s.muteBtn}>
          <Text style={s.muteText}>{muted ? '🔇 UNMUTE' : '🔊 MUTE'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 50 },
  card: { backgroundColor: 'rgba(15,25,60,0.95)', borderRadius: 20, padding: 28, width: 280, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(100,150,255,0.15)' },
  title: { color: '#FFF', fontSize: 28, fontWeight: '800', marginBottom: 16 },
  stat: { color: '#94A3B8', fontSize: 15, marginBottom: 6 },
  btn: { width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 10, backgroundColor: 'rgba(255,255,255,0.06)' },
  btnPrimary: { backgroundColor: '#6366F1' },
  btnSecondary: { backgroundColor: 'rgba(99,102,241,0.2)' },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  muteBtn: { marginTop: 12, paddingVertical: 8 },
  muteText: { color: '#94A3B8', fontSize: 13 },
});
