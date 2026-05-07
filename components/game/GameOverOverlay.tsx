import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { RunStats } from '../../engine/types';

interface Props {
  stats: RunStats | null;
  waveNum: number;
  materials: number;
  playerEmoji: string;
  victory: boolean;
  weapons: { emoji: string }[];
  achievements?: { name: string; emoji: string; description: string }[];
  onRetry: () => void;
  onMenu: () => void;
}

export default function GameOverOverlay({ stats, waveNum, materials, playerEmoji, victory, weapons, achievements = [], onRetry, onMenu }: Props) {
  const endedAtRef = React.useRef(Date.now());
  const elapsed = stats ? Math.round((endedAtRef.current - (stats.startTime ?? endedAtRef.current)) / 1000) : 0;
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  return (
    <View style={s.overlay}>
      <View style={s.card}>
        <Text style={s.emoji}>{playerEmoji} {victory ? '🏆' : '💀'}</Text>
        <Text style={[s.title, victory && { color: '#F59E0B' }]}>{victory ? 'VICTORY!' : 'GAME OVER'}</Text>
        {(achievements ?? []).length > 0 && (
          <View style={s.achievementsBox}>
            <Text style={s.achievementsTitle}>🏅 New Achievements</Text>
            {(achievements ?? []).map((a, i) => (
              <Text key={i} style={s.achievementRow}>{a.emoji} {a.name}</Text>
            ))}
          </View>
        )}
        <View style={s.stats}>
          <Row label="Waves Survived" value={String(waveNum ?? 0)} />
          <Row label="Enemies Killed" value={String(stats?.enemiesKilled ?? 0)} />
          <Row label="Damage Dealt" value={String(stats?.damageDealt ?? 0)} />
          <Row label="Materials" value={String(materials ?? 0)} />
          <Row label="Time" value={`${mm}:${ss}`} />
        </View>
        <View style={s.weaponRow}>
          {(weapons ?? []).map((w, i) => <Text key={i} style={s.weaponEmoji}>{w?.emoji ?? '?'}</Text>)}
        </View>
        <Pressable onPress={onRetry} style={[s.btn, { backgroundColor: '#6366F1' }]}>
          <Text style={s.btnText}>🔄 TRY AGAIN</Text>
        </Pressable>
        <Pressable onPress={onMenu} style={s.btn}>
          <Text style={[s.btnText, { color: '#94A3B8' }]}>🏠 MAIN MENU</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.value}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 50 },
  card: { backgroundColor: 'rgba(15,25,60,0.95)', borderRadius: 20, padding: 28, width: 300, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(100,150,255,0.15)' },
  emoji: { fontSize: 48, marginBottom: 8 },
  title: { color: '#EF4444', fontSize: 28, fontWeight: '800', marginBottom: 16 },
  stats: { width: '100%', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  label: { color: '#94A3B8', fontSize: 14 },
  value: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  weaponRow: { flexDirection: 'row', marginBottom: 16 },
  weaponEmoji: { fontSize: 24, marginHorizontal: 4 },
  achievementsBox: { backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: 10, padding: 10, marginBottom: 12, width: '100%', borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)' },
  achievementsTitle: { color: '#F59E0B', fontSize: 12, fontWeight: '800', marginBottom: 6 },
  achievementRow: { color: '#FFF', fontSize: 13, marginBottom: 3 },
  btn: { width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 8, backgroundColor: 'rgba(255,255,255,0.06)' },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
