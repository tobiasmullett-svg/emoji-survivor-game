import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ACHIEVEMENTS, getAchievementProgress, type AchievementProgress } from '../engine/achievements';

export default function AchievementsScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [progress, setProgress] = useState<Record<string, AchievementProgress>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getAchievementProgress().then(setProgress).catch(() => {}).finally(() => setLoaded(true));
    const scrollTimer = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, 0);
    return () => clearTimeout(scrollTimer);
  }, []);

  const unlockedCount = ACHIEVEMENTS.filter(achievement => progress[achievement.id]?.unlocked).length;

  return (
    <LinearGradient colors={['#050A15', '#0A1628', '#0F1F3D']} style={StyleSheet.absoluteFill}>
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Back">
            <Text style={s.backText}>{'\u2190'}</Text>
          </Pressable>
          <Text style={s.title}>🏅 ACHIEVEMENTS</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={s.summaryCard}>
          <Text style={s.summaryValue}>{loaded ? `${unlockedCount}/${ACHIEVEMENTS.length}` : `--/${ACHIEVEMENTS.length}`}</Text>
          <Text style={s.summaryLabel}>Unlocked</Text>
        </View>

        <ScrollView ref={scrollRef} contentContainerStyle={s.list}>
          {!loaded ? (
            <View style={s.loadingCard}>
              <Text style={s.loadingText}>Loading achievement log...</Text>
            </View>
          ) : ACHIEVEMENTS.map(achievement => {
            const itemProgress = progress[achievement.id];
            const unlocked = Boolean(itemProgress?.unlocked);
            return (
              <View key={achievement.id} style={[s.card, !unlocked && s.cardLocked]}>
                <Text style={[s.emoji, !unlocked && s.lockedText]}>{unlocked ? achievement.emoji : '🔒'}</Text>
                <View style={s.info}>
                  <Text style={[s.name, !unlocked && s.lockedText]}>{achievement.name}</Text>
                  <Text style={s.desc}>{achievement.description}</Text>
                  <Text style={s.meta}>
                    {unlocked && itemProgress?.unlockedAt ? `Unlocked ${formatDate(itemProgress.unlockedAt)}` : 'Not unlocked yet'}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'recently';
  return date.toLocaleDateString();
}

const s = StyleSheet.create({
  safe: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backText: { color: '#FFF', fontSize: 24 },
  title: { flex: 1, color: '#FFF', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  summaryCard: { alignItems: 'center', backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(245,158,11,0.22)' },
  summaryValue: { color: '#FBBF24', fontSize: 28, fontWeight: '900' },
  summaryLabel: { color: '#94A3B8', fontSize: 12, marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 },
  list: { paddingBottom: 40 },
  loadingCard: { backgroundColor: 'rgba(15,25,60,0.68)', borderRadius: 14, padding: 18, borderWidth: 1, borderColor: 'rgba(100,150,255,0.12)' },
  loadingText: { color: '#CBD5E1', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(15,25,60,0.68)', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(100,150,255,0.12)' },
  cardLocked: { backgroundColor: 'rgba(15,25,60,0.38)' },
  emoji: { fontSize: 34, width: 46, textAlign: 'center', marginRight: 12 },
  info: { flex: 1 },
  name: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  desc: { color: '#94A3B8', fontSize: 13, marginTop: 3 },
  meta: { color: '#FBBF24', fontSize: 11, marginTop: 6, fontWeight: '700' },
  lockedText: { opacity: 0.45 },
});
