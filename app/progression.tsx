import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { getProgression, buyBonus, BONUS_COSTS, type BonusKey, type ProgressionData } from '../engine/progression';
import { getUnlockedAchievements, ACHIEVEMENTS } from '../engine/achievements';

export default function ProgressionScreen() {
  const router = useRouter();
  const [prog, setProg] = useState<ProgressionData | null>(null);
  const [unlockedCount, setUnlockedCount] = useState(0);

  useEffect(() => {
    getProgression().then(setProg).catch(() => {});
    getUnlockedAchievements().then(a => setUnlockedCount(a.length)).catch(() => {});
  }, []);

  const handleBuy = async (key: BonusKey) => {
    const success = await buyBonus(key);
    if (success) {
      const updated = await getProgression();
      setProg(updated);
    }
  };

  const bonusKeys: { key: BonusKey; label: string; emoji: string }[] = [
    { key: 'extraHp', label: 'Vitality', emoji: '❤️' },
    { key: 'extraSpeed', label: 'Agility', emoji: '💨' },
    { key: 'extraDamage', label: 'Power', emoji: '💪' },
    { key: 'extraLuck', label: 'Fortune', emoji: '🍀' },
  ];

  return (
    <LinearGradient colors={['#050A15', '#0A1628', '#0F1F3D']} style={StyleSheet.absoluteFill}>
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={s.backBtn} accessibilityRole="button">
            <Text style={s.backText}>{'\u2190'}</Text>
          </Pressable>
          <Text style={s.title}>📊 PROGRESS</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={s.content}>
          {/* Stats */}
          <View style={s.statsCard}>
            <Text style={s.pearlText}>🐚 {prog?.pearls ?? 0} Pearls</Text>
            <View style={s.statRow}>
              <Stat label="Total Runs" value={prog?.totalRuns ?? 0} />
              <Stat label="Total Kills" value={prog?.totalKills ?? 0} />
            </View>
            <View style={s.statRow}>
              <Stat label="Highest Wave" value={prog?.highestWave ?? 0} />
              <Stat label="Achievements" value={`${unlockedCount}/${ACHIEVEMENTS.length}`} />
            </View>
          </View>

          {/* Starting Bonuses */}
          <Text style={s.sectionTitle}>Starting Bonuses</Text>
          {bonusKeys.map(bk => {
            const level = prog?.startingBonuses[bk.key] ?? 0;
            const costs = BONUS_COSTS[bk.key];
            const maxed = level >= costs.length;
            const cost = costs[level] ?? 0;
            const canAfford = (prog?.pearls ?? 0) >= cost;
            return (
              <View key={bk.key} style={s.bonusCard}>
                <Text style={s.bonusEmoji}>{bk.emoji}</Text>
                <View style={s.bonusInfo}>
                  <Text style={s.bonusName}>{bk.label}</Text>
                  <Text style={s.bonusLevel}>Level {level}/{costs.length}</Text>
                </View>
                <Pressable
                  onPress={() => !maxed && handleBuy(bk.key)}
                  disabled={maxed || !canAfford}
                  style={[s.buyBtn, (maxed || !canAfford) && s.buyBtnDisabled]}
                >
                  <Text style={s.buyBtnText}>
                    {maxed ? 'MAX' : `🐚 ${cost}`}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={s.statBox}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backText: { color: '#FFF', fontSize: 24 },
  title: { flex: 1, color: '#FFF', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  content: { paddingBottom: 40 },
  statsCard: { backgroundColor: 'rgba(15,25,60,0.7)', borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(100,150,255,0.12)' },
  pearlText: { color: '#F59E0B', fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  statRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
  statBox: { alignItems: 'center', flex: 1 },
  statValue: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  statLabel: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  sectionTitle: { color: '#FFF', fontSize: 16, fontWeight: '700', marginBottom: 12, marginTop: 4 },
  bonusCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(15,25,60,0.6)', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(100,150,255,0.1)' },
  bonusEmoji: { fontSize: 28, marginRight: 12 },
  bonusInfo: { flex: 1 },
  bonusName: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  bonusLevel: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  buyBtn: { backgroundColor: '#6366F1', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  buyBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.08)' },
  buyBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
});
