import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { HighScore } from '../engine/types';
import { getHighScores, clearHighScores } from '../services/storage';

export default function HighScoresScreen() {
  const router = useRouter();
  const [scores, setScores] = useState<HighScore[]>([]);

  useEffect(() => {
    getHighScores().then(setScores).catch(() => {});
  }, []);

  const handleClear = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Clear all high scores?')) {
        clearHighScores().then(() => setScores([])).catch(() => {});
      }
    } else {
      Alert.alert('Clear Scores', 'Clear all high scores?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => clearHighScores().then(() => setScores([])).catch(() => {}) },
      ]);
    }
  };

  return (
    <LinearGradient colors={['#050A15', '#0A1628', '#0F1F3D']} style={StyleSheet.absoluteFill}>
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Back">
            <Text style={s.backText}>{'\u2190'}</Text>
          </Pressable>
          <Text style={s.title}>🏆 HIGH SCORES</Text>
          <View style={{ width: 40 }} />
        </View>
        {(scores?.length ?? 0) === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>👾</Text>
            <Text style={s.emptyText}>No runs yet - go fight some 👾!</Text>
          </View>
        ) : (
          <FlatList
            data={scores ?? []}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item, index }) => (
              <View style={s.row}>
                <Text style={s.rank}>#{index + 1}</Text>
                <Text style={s.rowEmoji}>{item?.emoji ?? '?'}</Text>
                <View style={s.rowInfo}>
                  <Text style={s.rowName}>{item?.name ?? 'Unknown'}</Text>
                  <Text style={s.rowSub}>Wave {item?.wave ?? 0} {'\u00B7'} {item?.kills ?? 0} kills</Text>
                </View>
                <Text style={s.rowDate}>{item?.date ?? ''}</Text>
              </View>
            )}
          />
        )}
        {(scores?.length ?? 0) > 0 && (
          <Pressable onPress={handleClear} style={s.clearBtn}>
            <Text style={s.clearText}>CLEAR SCORES</Text>
          </Pressable>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backText: { color: '#FFF', fontSize: 24 },
  title: { flex: 1, color: '#FFF', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyEmoji: { fontSize: 64, marginBottom: 12 },
  emptyText: { color: '#94A3B8', fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(15,25,60,0.6)', borderRadius: 12, padding: 14, marginBottom: 8 },
  rank: { color: '#F59E0B', fontSize: 16, fontWeight: '800', width: 32 },
  rowEmoji: { fontSize: 28, marginRight: 10 },
  rowInfo: { flex: 1 },
  rowName: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  rowSub: { color: '#94A3B8', fontSize: 13, marginTop: 2 },
  rowDate: { color: '#94A3B8', fontSize: 12 },
  clearBtn: { alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.15)', marginTop: 16 },
  clearText: { color: '#EF4444', fontSize: 14, fontWeight: '700' },
});
