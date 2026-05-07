import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { CHARACTERS } from '../engine/data';
import type { CharacterDef } from '../engine/types';
import { getProgression, refreshProgressionUnlocks, selectSkin, type ProgressionData } from '../engine/progression';
import { CHARACTER_SKINS, getDefaultSkinId, getSkinEmoji, getSkinUnlockLabel } from '../engine/skins';

const STAT_BARS: { key: string; label: string; max: number }[] = [
  { key: 'hp', label: 'HP', max: 200 },
  { key: 'speed', label: 'Speed', max: 5 },
  { key: 'damageMult', label: 'Damage', max: 2 },
  { key: 'armor', label: 'Armor', max: 6 },
  { key: 'dodge', label: 'Dodge', max: 20 },
  { key: 'critChance', label: 'Crit', max: 15 },
];

export default function CharacterSelectScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<number>(0);
  const [progression, setProgression] = useState<ProgressionData | null>(null);
  const { width } = useWindowDimensions();

  useEffect(() => {
    refreshProgressionUnlocks().then(setProgression).catch(() => {
      getProgression().then(setProgression).catch(() => {});
    });
  }, []);
  const isWide = width >= 760;
  const cardWidth = isWide ? Math.min(230, (width - 96) / 3) : Math.min(280, width - 56);
  const isCharacterUnlocked = (char: CharacterDef | undefined) => (
    Boolean(char && (progression ? progression.unlockedCharacters.includes(char.id) : char.id === 'crab'))
  );
  const selectedCharacter = CHARACTERS[selected];
  const canStart = isCharacterUnlocked(selectedCharacter);
  const selectedSkinId = selectedCharacter ? (progression?.selectedSkins[selectedCharacter.id] ?? getDefaultSkinId(selectedCharacter.id)) : undefined;

  const handleStart = () => {
    if (selectedCharacter && canStart) {
      router.push({ pathname: '/game', params: { characterId: selectedCharacter.id, skinId: selectedSkinId } });
    }
  };

  const handleSkinSelect = async (skinId: string) => {
    if (!selectedCharacter) return;
    const success = await selectSkin(selectedCharacter.id, skinId);
    if (success) {
      const updated = await getProgression();
      setProgression(updated);
    }
  };

  return (
    <LinearGradient colors={['#050A15', '#0A1628', '#0F1F3D']} style={StyleSheet.absoluteFill}>
      <SafeAreaView style={s.safe}>
        <Text style={s.title}>CHOOSE YOUR FIGHTER</Text>
        <ScrollView
          horizontal={!isWide}
          pagingEnabled={!isWide}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          style={s.scroll}
          contentContainerStyle={[s.scrollContent, isWide && s.scrollContentWide]}
        >
          {(CHARACTERS ?? []).map((c, i) => {
            const unlocked = progression ? progression.unlockedCharacters.includes(c.id) : c.id === 'crab';
            return (
            <Pressable
              key={c.id}
              onPress={() => unlocked && setSelected(i)}
              style={[s.card, { width: cardWidth }, selected === i && s.cardSelected, !unlocked && s.cardLocked]}
              accessibilityRole="button" accessibilityLabel={c.name}
            >
              {!unlocked && (
                <View style={s.lockOverlay}>
                  <Text style={s.lockEmoji}>🔒</Text>
                  <Text style={s.lockText}>Reach Wave {c.id === 'octopus' ? '5' : '10'}</Text>
                </View>
              )}
              <Text style={[s.emoji, !unlocked && { opacity: 0.4 }]}>{getSkinEmoji(c.id, progression?.selectedSkins[c.id])}</Text>
              <Text style={[s.name, !unlocked && { opacity: 0.4 }]}>{c.name}</Text>
              <Text style={[s.desc, !unlocked && { opacity: 0.4 }]}>{c.desc}</Text>
              {/* Stats */}
              {STAT_BARS.map(sb => {
                const val = (c as unknown as Record<string, number>)[sb.key] ?? 0;
                const pct = Math.min(100, (val / sb.max) * 100);
                return (
                  <View key={sb.key} style={s.statRow}>
                    <Text style={s.statLabel}>{sb.label}</Text>
                    <View style={s.barBg}>
                      <View style={[s.barFill, { width: `${pct}%` }]} />
                    </View>
                    <Text style={s.statVal}>{sb.key === 'damageMult' ? `${val}x` : sb.key === 'dodge' || sb.key === 'critChance' ? `${val}%` : String(val)}</Text>
                  </View>
                );
              })}
              {/* Ability */}
              <View style={[s.abilityBox, !unlocked && { opacity: 0.4 }]}>
                <Text style={s.abilityEmoji}>{c.abilityEmoji}</Text>
                <View style={s.abilityInfo}>
                  <Text style={s.abilityName}>{c.abilityName}</Text>
                  <Text style={s.abilityDesc}>{c.abilityDesc}</Text>
                </View>
              </View>
            </Pressable>
            );
          })}
        </ScrollView>
        {selectedCharacter && canStart && (
          <View style={s.skinPanel}>
            <Text style={s.skinTitle}>SKINS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.skinList}>
              {(CHARACTER_SKINS[selectedCharacter.id] ?? []).map(skin => {
                const unlocked = (progression?.unlockedSkins[selectedCharacter.id] ?? []).includes(skin.id);
                const active = selectedSkinId === skin.id;
                return (
                  <Pressable
                    key={skin.id}
                    onPress={() => unlocked && handleSkinSelect(skin.id)}
                    disabled={!unlocked}
                    style={[s.skinChip, active && s.skinChipActive, !unlocked && s.skinChipLocked]}
                    accessibilityRole="button"
                    accessibilityLabel={`${skin.name} skin`}
                  >
                    <Text style={[s.skinEmoji, !unlocked && { opacity: 0.45 }]}>{skin.emoji}</Text>
                    <View style={s.skinInfo}>
                      <Text style={[s.skinName, !unlocked && { opacity: 0.45 }]}>{skin.name}</Text>
                      <Text style={s.skinMeta}>{unlocked ? (active ? 'Equipped' : 'Unlocked') : getSkinUnlockLabel(skin)}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}
        <Pressable
          onPress={handleStart}
          disabled={!canStart}
          style={({ pressed }) => [s.startBtn, !canStart && s.startBtnDisabled, pressed && canStart && { transform: [{ scale: 0.97 }] }]}
          accessibilityRole="button" accessibilityLabel="Begin Run"
        >
          <LinearGradient colors={['#6366F1', '#06B6D4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.startGrad}>
            <Text style={s.startText}>BEGIN RUN</Text>
          </LinearGradient>
        </Pressable>
      </SafeAreaView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, padding: 16 },
  title: { color: '#FFF', fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 16, letterSpacing: 2, textShadowColor: 'rgba(45,212,191,0.35)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 10 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 8, gap: 12, paddingBottom: 10 },
  scrollContentWide: { flexDirection: 'row', justifyContent: 'center', alignItems: 'stretch', width: '100%' },
  card: { backgroundColor: 'rgba(15,25,60,0.72)', borderRadius: 14, padding: 18, marginHorizontal: 6, borderWidth: 2, borderColor: 'rgba(100,150,255,0.1)', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } },
  cardSelected: { borderColor: '#2DD4BF', backgroundColor: 'rgba(45,212,191,0.1)' },
  cardLocked: { borderColor: 'rgba(100,100,100,0.2)', backgroundColor: 'rgba(15,25,60,0.4)' },
  lockOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 10, backgroundColor: 'rgba(5,10,21,0.6)', borderRadius: 14 },
  lockEmoji: { fontSize: 32, marginBottom: 4 },
  lockText: { color: '#94A3B8', fontSize: 12, fontWeight: '700' },
  emoji: { fontSize: 60, marginBottom: 8, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 6 },
  name: { color: '#FFF', fontSize: 20, fontWeight: '800', marginBottom: 4 },
  desc: { color: '#94A3B8', fontSize: 14, marginBottom: 12 },
  statRow: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 6 },
  statLabel: { color: '#94A3B8', fontSize: 12, width: 52 },
  barBg: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, marginHorizontal: 6, overflow: 'hidden' },
  barFill: { height: 6, backgroundColor: '#2DD4BF', borderRadius: 3 },
  statVal: { color: '#FFF', fontSize: 12, fontWeight: '600', width: 38, textAlign: 'right' },
  abilityBox: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 10, width: '100%', marginTop: 10, alignItems: 'center' },
  abilityEmoji: { fontSize: 24, marginRight: 10 },
  abilityInfo: { flex: 1 },
  abilityName: { color: '#FBBF24', fontSize: 13, fontWeight: '700' },
  abilityDesc: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  skinPanel: { backgroundColor: 'rgba(15,25,60,0.6)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(45,212,191,0.14)', padding: 12, marginTop: 12 },
  skinTitle: { color: '#FBBF24', fontSize: 12, fontWeight: '900', letterSpacing: 1, marginBottom: 8 },
  skinList: { gap: 8, paddingRight: 4 },
  skinChip: { minWidth: 156, flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(148,163,184,0.16)', backgroundColor: 'rgba(255,255,255,0.045)', padding: 10 },
  skinChipActive: { borderColor: '#2DD4BF', backgroundColor: 'rgba(45,212,191,0.12)' },
  skinChipLocked: { backgroundColor: 'rgba(15,23,42,0.45)' },
  skinEmoji: { fontSize: 28, marginRight: 10 },
  skinInfo: { flex: 1 },
  skinName: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  skinMeta: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  startBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 16, marginBottom: 8 },
  startBtnDisabled: { opacity: 0.45 },
  startGrad: { paddingVertical: 18, alignItems: 'center', borderRadius: 14 },
  startText: { color: '#FFF', fontSize: 20, fontWeight: '800', letterSpacing: 2 },
});
