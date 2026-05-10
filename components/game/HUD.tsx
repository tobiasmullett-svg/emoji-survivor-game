import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { HudData } from '../../engine/types';
import { MODIFIER_NAMES } from '../../engine/data';

interface Props { data: HudData; onPause: () => void }

export default function HUD({ data, onPause }: Props) {
  const hpPct = data?.maxHp ? Math.max(0, (data.hp / data.maxHp) * 100) : 0;
  const oxygenPct = data?.maxOxygen ? Math.max(0, (data.oxygen ?? 0) / data.maxOxygen * 100) : 0;
  const xpPct = data?.xpToNext ? Math.max(0, (data.xp / data.xpToNext) * 100) : 0;
  const wavePct = data?.waveMaxTime ? Math.max(0, (data.waveTimer / data.waveMaxTime) * 100) : 0;
  const comboActive = (data?.comboCount ?? 0) >= 3 && (data?.comboTimer ?? 0) > 0;
  const showModifier = (data?.modifierAnnounceTimer ?? 0) > 0;
  const showOxygen = (data?.inWater ?? false) || oxygenPct < 99;
  return (
    <View style={s.container} pointerEvents="box-none">
      {/* XP bar top */}
      <View style={s.xpBarBg}>
        <View style={[s.xpBar, { width: `${xpPct}%` }]} />
        <Text style={s.xpText}>Lv {data?.level ?? 1}</Text>
      </View>
      {/* Top row */}
      <View style={s.topRow}>
        {/* HP */}
        <View style={s.hpSection}>
          <View style={s.hpBarBg2}>
            <View style={[s.hpBar2, { width: `${hpPct}%` }]} />
          </View>
          <Text style={s.hpText}>{Math.ceil(data?.hp ?? 0)}/{data?.maxHp ?? 0}</Text>
          {(data?.armor ?? 0) > 0 && <Text style={s.armorText}>{'\u{1F6E1}\uFE0F'} {data.armor}</Text>}
        </View>
        {/* Wave */}
        <View style={s.waveSection}>
          <Text style={s.waveText}>Wave {data?.waveNum ?? 1}</Text>
          <View style={s.waveBarBg}>
            <View style={[s.waveBar, { width: `${wavePct}%` }]} />
          </View>
          <Text style={s.timerText}>{Math.ceil(data?.waveTimer ?? 0)}s</Text>
        </View>
        {/* Materials + pause */}
        <View style={s.rightSection}>
          <Text style={s.matText}>🔩{data?.materials ?? 0}</Text>
          {(data?.petCount ?? 0) > 0 && <Text style={s.petText}>🥚{data.petCount}/5</Text>}
          <Pressable onPress={onPause} style={s.pauseBtn} accessibilityLabel="Pause" accessibilityRole="button">
            <Text style={s.pauseIcon}>{'\u23F8\uFE0F'}</Text>
          </Pressable>
        </View>
      </View>
      {showOxygen && (
        <View style={s.oxygenSection}>
          <Text style={s.oxygenLabel}>O2</Text>
          <View style={s.oxygenBarBg}>
            <View style={[s.oxygenBar, { width: `${oxygenPct}%` }]} />
          </View>
          <Text style={[s.oxygenText, oxygenPct < 25 && s.oxygenTextDanger]}>
            {Math.ceil(data?.oxygen ?? 0)}
          </Text>
        </View>
      )}
      {/* Weapons */}
      <View style={s.weaponRow}>
        {(data?.equippedWeapons ?? []).map((w, i) => {
          const progress = w.evolved ? 100 : Math.min(100, (w.killCount / w.evolveKills) * 100);
          const ready = !w.evolved && w.killCount >= w.evolveKills;
          return (
            <View key={i} style={[s.weaponSlot, w.evolved && s.weaponSlotEvolved, ready && s.weaponSlotReady]}>
              <Text style={s.weaponEmoji}>{w?.emoji ?? '?'}</Text>
              <Text style={s.weaponLevel}>Lv {w.level ?? 1}</Text>
              {!w.evolved && <View style={[s.weaponProgress, { width: `${progress}%` }]} />}
            </View>
          );
        })}
      </View>
      {/* Stacked banners — combo, objective, modifier — to avoid overlap */}
      <View style={s.bannerStack} pointerEvents="none">
        {comboActive && (
          <View style={s.comboPill}>
            <Text style={s.comboText}>{data.comboCount}x</Text>
            <View style={s.comboTimerBg}>
              <View style={[s.comboTimerFill, { width: `${Math.max(0, Math.min(100, (data.comboTimer / 3.2) * 100))}%` }]} />
            </View>
          </View>
        )}
        {showModifier && data?.waveModifier && data.waveModifier !== 'none' && (
          <View style={s.modifierBanner}>
            <Text style={s.modifierText}>{MODIFIER_NAMES[data.waveModifier] ?? data.waveModifier}</Text>
          </View>
        )}
        {(data?.resourceCount ?? 0) > 0 && (
          <View style={s.objectivePill}>
            <Text style={s.objectiveText}>💠 {data.resourceCount} caches</Text>
          </View>
        )}
        {(data?.petSynergies?.length ?? 0) > 0 && (
          <View style={s.synergyPill}>
            {data.petSynergies!.map(syn => (
              <Text key={syn.kind} style={s.synergyPillText}>⚡{syn.bonusPct}%</Text>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20 },
  xpBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center' },
  xpBar: { height: 6, backgroundColor: '#7C3AED' },
  xpText: { position: 'absolute', right: 8, fontSize: 10, color: '#FFF', fontWeight: '700' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 8 },
  hpSection: { flex: 1 },
  hpBarBg2: { height: 10, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 5, overflow: 'hidden' },
  hpBar2: { height: 10, backgroundColor: '#FB7185', borderRadius: 5 },
  hpText: { color: '#FFF', fontSize: 11, fontWeight: '700', marginTop: 2, textShadowColor: 'rgba(0,0,0,0.65)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  armorText: { color: '#94A3B8', fontSize: 11 },
  waveSection: { flex: 1, alignItems: 'center', marginHorizontal: 8 },
  waveText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  waveBarBg: { height: 5, width: '100%', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, marginTop: 3 },
  waveBar: { height: 5, backgroundColor: '#2DD4BF', borderRadius: 3 },
  timerText: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  rightSection: { flex: 1, alignItems: 'flex-end' },
  oxygenSection: { alignSelf: 'center', width: '54%', minWidth: 176, maxWidth: 320, marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, backgroundColor: 'rgba(8,47,73,0.5)', borderWidth: 1, borderColor: 'rgba(125,211,252,0.2)' },
  oxygenLabel: { color: '#7DD3FC', fontSize: 10, fontWeight: '900', width: 20 },
  oxygenBarBg: { flex: 1, height: 4, borderRadius: 3, backgroundColor: 'rgba(125,211,252,0.14)', overflow: 'hidden' },
  oxygenBar: { height: 4, borderRadius: 3, backgroundColor: '#38BDF8' },
  oxygenText: { color: '#BAE6FD', fontSize: 10, fontWeight: '900', width: 26, textAlign: 'right' },
  oxygenTextDanger: { color: '#FB7185' },
  matText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  petText: { color: '#CCFBF1', fontSize: 12, fontWeight: '800', marginTop: 2 },
  pauseBtn: { marginTop: 4, padding: 4, minWidth: 34, alignItems: 'center' },
  pauseIcon: { fontSize: 22, color: '#FFF' },
  weaponRow: { flexDirection: 'row', paddingHorizontal: 12, marginTop: 4 },
  weaponSlot: { width: 28, height: 28, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginRight: 4, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  weaponSlotEvolved: { borderColor: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.12)' },
  weaponSlotReady: { borderColor: '#F59E0B', shadowColor: '#F59E0B', shadowOpacity: 0.6, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  weaponProgress: { position: 'absolute', left: 0, bottom: 0, height: 3, backgroundColor: '#F59E0B' },
  weaponEmoji: { fontSize: 16, zIndex: 2 },
  weaponLevel: { position: 'absolute', right: 1, top: 0, color: '#A7F3D0', fontSize: 7, fontWeight: '900', zIndex: 3, textShadowColor: '#000', textShadowRadius: 2 },
  bannerStack: { alignItems: 'center', marginTop: 8, gap: 6 },
  comboPill: { minWidth: 76, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: 'rgba(45,212,191,0.16)', borderWidth: 1, borderColor: 'rgba(45,212,191,0.5)', alignItems: 'center' },
  comboText: { color: '#CCFBF1', fontSize: 15, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  comboTimerBg: { width: 54, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.16)', marginTop: 3, overflow: 'hidden' },
  comboTimerFill: { height: 3, borderRadius: 2, backgroundColor: '#2DD4BF' },
  objectivePill: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10, backgroundColor: 'rgba(15,23,42,0.72)', borderWidth: 1, borderColor: 'rgba(125,211,252,0.22)' },
  objectiveText: { color: '#BAE6FD', fontSize: 11, fontWeight: '800' },
  modifierBanner: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12, backgroundColor: 'rgba(245,158,11,0.2)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.5)' },
  modifierText: { color: '#F59E0B', fontSize: 13, fontWeight: '800', textTransform: 'capitalize' },
  synergyPill: { position: 'absolute', right: 12, top: 78, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, backgroundColor: 'rgba(99,102,241,0.16)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.35)', flexDirection: 'row', gap: 6 },
  synergyPillText: { color: '#A78BFA', fontSize: 11, fontWeight: '800' },
});
