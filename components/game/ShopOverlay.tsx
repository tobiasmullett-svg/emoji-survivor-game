import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import type { GameState } from '../../engine/types';
import { RARITY_COLORS, WEAPON_EVOLVE_KILLS, WEAPON_EVOLVE_COST, WEAPON_MAX_LEVEL } from '../../engine/constants';
import { buyShopItem, rerollShop, healPlayer, buyEgg, trainPets, fusePets, evolveWeapon, getPetSynergies } from '../../engine/GameEngine';
import { WEAPONS, EVOLVED_WEAPONS, ITEM_DEFS } from '../../engine/data';

interface Props {
  gameState: React.RefObject<GameState | null>;
  onNextWave: () => void;
}

const PET_TRAITS: Record<string, string> = {
  snapper: 'Fast bite shots',
  spark: 'Piercing spark shots',
  mender: 'Heals when hurt',
};

const PET_DETAILS: Record<string, { upgrade: string; breed: string }> = {
  snapper: {
    upgrade: 'Training adds bite power and faster boss-focused darts.',
    breed: 'Breed equal Snapper levels for a Prime hunter with heavier bites.',
  },
  spark: {
    upgrade: 'Training makes pierce bolts hit harder and fire more often.',
    breed: 'Breed equal Sparks for a stronger chain child with bigger zaps.',
  },
  mender: {
    upgrade: 'Training improves emergency healing and support shots.',
    breed: 'Breed equal Menders for a stronger healer with better burst recovery.',
  },
};

function getPetCooldown(level: number, kind: string): string {
  const base = kind === 'snapper' ? 0.85 : kind === 'spark' ? 1.2 : 1.5;
  return (base * Math.max(0.62, 1 - (level - 1) * 0.035)).toFixed(2);
}

function getPetRange(kind: string): number {
  if (kind === 'spark') return 180;
  if (kind === 'mender') return 145;
  return 130;
}

export default function ShopOverlay({ gameState, onNextWave }: Props) {
  const [, force] = useState(0);
  const [broodNotice, setBroodNotice] = useState('');
  const state = gameState?.current;
  if (!state) return null;
  const { shopSlots, materials, player, wave, rerollCost, healCost } = state;
  const canHeal = player.hp < player.maxHp;
  const eggCost = 18 + state.pets.length * 6 + wave.number * 2;
  const trainCost = 10 + state.pets.reduce((sum, pet) => sum + pet.level * 4, 0);
  const canTrain = state.pets.length > 0 && state.pets.some(pet => pet.level < 9);
  const canFuse = state.pets.some((pet, idx) => state.pets.some((other, otherIdx) => idx !== otherIdx && other.kind === pet.kind && other.level === pet.level));
  const synergies = getPetSynergies(state.pets);
  const readyWeapons = player.weapons
    .map((weapon, index) => ({ weapon, index }))
    .filter(({ weapon }) => !weapon.evolved && weapon.killCount >= WEAPON_EVOLVE_KILLS);

  return (
    <View style={s.overlay}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        <Text style={s.title}>🏪 SHOP - Wave {wave?.number ?? 0} Complete!</Text>
        <Text style={s.matText}>🔩 {materials ?? 0}</Text>
        {/* Items grid */}
        <View style={s.grid}>
          {(shopSlots ?? []).map((slot, i) => {
            const rc = RARITY_COLORS[slot?.rarity ?? 'common'] ?? '#9CA3AF';
            const existingWeapon = slot?.kind === 'weapon' && slot.weaponId
              ? player.weapons.find(w => w.id === slot.weaponId)
              : undefined;
            const canUpgradeWeapon = Boolean(existingWeapon && (existingWeapon.level ?? 1) < WEAPON_MAX_LEVEL);
            const evolutionReady = Boolean(existingWeapon && !existingWeapon.evolved && (existingWeapon.level ?? 1) >= WEAPON_MAX_LEVEL && existingWeapon.killCount >= WEAPON_EVOLVE_KILLS);
            const duplicateBlocked = Boolean(existingWeapon && !canUpgradeWeapon && !evolutionReady);
            const weaponSlotBlocked = slot?.kind === 'weapon' && !existingWeapon && player.weapons.length >= 6;
            const disabled = Boolean(slot?.bought || (materials ?? 0) < (slot?.price ?? 999) || weaponSlotBlocked || duplicateBlocked);
            return (
              <Pressable
                key={i}
                onPress={() => { if (buyShopItem(state, i)) force(n => n + 1); }}
                disabled={disabled}
                style={[s.itemCard, { borderColor: evolutionReady ? '#F59E0B' : canUpgradeWeapon ? '#22C55E' : rc }, (slot?.bought || weaponSlotBlocked || duplicateBlocked) && s.itemBought, (evolutionReady || canUpgradeWeapon) && s.evolutionCard]}
                accessibilityRole="button"
                accessibilityLabel={slot?.name ?? ''}
              >
                <Text style={s.itemEmoji}>{slot?.emoji ?? '?'}</Text>
                <Text style={s.itemName}>{slot?.name ?? 'Unknown'}</Text>
                <Text style={s.itemDesc}>{evolutionReady ? 'Evolve owned weapon' : canUpgradeWeapon ? `Upgrade to Lv ${(existingWeapon?.level ?? 1) + 1}` : duplicateBlocked ? 'Max level' : weaponSlotBlocked ? 'Weapon slots full' : slot?.desc ?? ''}</Text>
                <Text style={[s.itemRarity, { color: evolutionReady ? '#F59E0B' : canUpgradeWeapon ? '#22C55E' : rc }]}>{evolutionReady ? 'EVOLUTION' : canUpgradeWeapon ? `LEVEL ${(existingWeapon?.level ?? 1) + 1}` : (slot?.rarity ?? 'common').toUpperCase()}</Text>
                {!slot?.bought && (
                  <Text style={[s.price, ((materials ?? 0) < (slot?.price ?? 0) || weaponSlotBlocked || duplicateBlocked) && { color: '#EF4444' }]}>
                    🔩{slot?.price ?? 0}
                  </Text>
                )}
                {slot?.bought && <Text style={s.soldText}>SOLD</Text>}
              </Pressable>
            );
          })}
        </View>
        {/* Actions */}
        <View style={s.actions}>
          <Pressable
            onPress={() => { if (rerollShop(state)) force(n => n + 1); }}
            disabled={(materials ?? 0) < (rerollCost ?? 5)}
            style={[s.actionBtn, (materials ?? 0) < (rerollCost ?? 5) && s.disabled]}
          >
            <Text style={s.actionText}>🎲 Reroll (🔩{rerollCost ?? 5})</Text>
          </Pressable>
          <Pressable
            onPress={() => { if (healPlayer(state)) force(n => n + 1); }}
            disabled={!canHeal || (materials ?? 0) < (healCost ?? 10)}
            style={[s.actionBtn, (!canHeal || (materials ?? 0) < (healCost ?? 10)) && s.disabled]}
          >
            <Text style={s.actionText}>{'\u2764\uFE0F'} Heal 30% (🔩{healCost ?? 10})</Text>
          </Pressable>
        </View>
        {/* Brood */}
        <View style={s.broodHeader}>
          <Text style={s.invTitle}>Brood Family ({state.pets.length}/5)</Text>
          <Text style={s.broodHint}>Train levels everyone. Breed matching kind + level into one stronger child.</Text>
        </View>
        {broodNotice.length > 0 && (
          <View style={s.notice}>
            <Text style={s.noticeText}>{broodNotice}</Text>
          </View>
        )}
        {synergies.length > 0 && (
          <View style={s.synergyPanel}>
            <Text style={s.synergyTitle}>⚡ Active Synergies</Text>
            {synergies.map(syn => (
              <Text key={syn.kind} style={s.synergyText}>
                {syn.count}× {syn.kind.charAt(0).toUpperCase() + syn.kind.slice(1)} → +{syn.bonusPct}% damage
              </Text>
            ))}
          </View>
        )}
        <View style={s.petRow}>
          {state.pets.length === 0 ? (
            <Text style={s.emptyPetText}>Find eggs in the arena or buy one here.</Text>
          ) : state.pets.map(pet => {
            const detail = PET_DETAILS[pet.kind];
            const nextPower = pet.level >= 9 ? 'Max trained' : `Next: Pow ${Math.round(pet.damage + 1 + Math.floor((pet.level + 1) / 4))}`;
            const nextPerkLevel = [3, 5, 7].find(l => l > pet.level);
            return (
              <View key={pet.id} style={[
                s.petSlot,
                { borderColor: pet.color ?? 'rgba(45,212,191,0.18)', backgroundColor: `${pet.color ?? '#2DD4BF'}18` },
                pet.generation >= 3 && s.petSlotPrime,
              ]}>
                <View style={s.petEmojiCol}>
                  <Text style={s.petEmoji}>{pet.emoji}</Text>
                  {pet.generation >= 3 && <Text style={s.primeLabel}>PRIME</Text>}
                </View>
                <View style={s.petInfo}>
                  <View style={s.petNameRow}>
                    <Text style={s.petName}>{pet.name}</Text>
                    <Text style={[s.generationTag, { backgroundColor: pet.color ?? '#2DD4BF' }]}>Gen {pet.generation ?? 1}</Text>
                  </View>
                  <Text style={s.petLevel}>Lv.{pet.level} · Pow {Math.round(pet.damage)} · {getPetCooldown(pet.level, pet.kind)}s · R{getPetRange(pet.kind)}</Text>
                  <Text style={s.petTrait}>{pet.attackName}: {PET_TRAITS[pet.kind] ?? 'Companion'}</Text>
                  {(pet.perks?.length ?? 0) > 0 && (
                    <View style={s.perkRow}>
                      {pet.perks.map(pk => (
                        <View key={pk.id} style={[s.perkChip, { borderColor: `${pet.color}55` }]}>
                          <Text style={s.perkChipText}>{pk.emoji} {pk.name}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {nextPerkLevel && (
                    <Text style={s.nextPerkText}>🔮 Lv.{nextPerkLevel}: new perk</Text>
                  )}
                  <Text style={s.petUpgrade}>{nextPower} · {detail?.upgrade ?? 'Training improves this child.'}</Text>
                </View>
              </View>
            );
          })}
        </View>
        {state.pets.length > 0 && (
          <View style={s.familyPanel}>
            <Text style={s.familyTitle}>Family Upgrades</Text>
            <Text style={s.familyText}>Training cost: 🔩{trainCost}. Every trained child gets +1 level, more power, larger presence, and a faster attack rhythm.</Text>
            <Text style={s.familyText}>Breeding cost: based on the pair level. Matching twins become one higher-generation child with +2 levels and inherited power.</Text>
            <Text style={s.familyText}>Perks unlock at Lv.3, 5, and 7. Each pet type gets unique abilities at these milestones.</Text>
            <Text style={s.familyText}>Synergy: 2+ of the same kind gives all pets of that type a damage bonus.</Text>
          </View>
        )}
        <View style={s.actions}>
          <Pressable
            onPress={() => {
              if (buyEgg(state)) {
                const newest = state.pets[state.pets.length - 1];
                setBroodNotice(newest ? `${newest.name} joined the brood` : '+12 overflow materials');
                force(n => n + 1);
              }
            }}
            disabled={(materials ?? 0) < eggCost}
            style={[s.actionBtn, (materials ?? 0) < eggCost && s.disabled]}
          >
            <Text style={s.actionText}>🥚 Egg (🔩{eggCost})</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              if (trainPets(state)) {
                setBroodNotice(`Training complete: +1 level for each child`);
                force(n => n + 1);
              }
            }}
            disabled={!canTrain || (materials ?? 0) < trainCost}
            style={[s.actionBtn, (!canTrain || (materials ?? 0) < trainCost) && s.disabled]}
          >
            <Text style={s.actionText}>✨ Train +1 Lv (🔩{trainCost})</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              if (fusePets(state)) {
                setBroodNotice('Breeding worked: one stronger child remains');
                force(n => n + 1);
              }
            }}
            disabled={!canFuse}
            style={[s.actionBtn, !canFuse && s.disabled]}
          >
            <Text style={s.actionText}>🔗 Breed Pair</Text>
          </Pressable>
        </View>
        {/* Inventory */}
        <Text style={s.invTitle}>Equipped Weapons ({player?.weapons?.length ?? 0}/6)</Text>
        <View style={s.invRow}>
          {(player?.weapons ?? []).map((w, i) => {
            const progress = w.evolved ? 100 : Math.min(100, (w.killCount / WEAPON_EVOLVE_KILLS) * 100);
            const ready = !w.evolved && w.killCount >= WEAPON_EVOLVE_KILLS;
            return (
              <View key={i} style={[s.invSlot, w?.evolved && s.invSlotEvolved, ready && s.invSlotReady]}>
                <Text style={s.invEmoji}>{getWeaponEmoji(w?.id, w?.evolved)}</Text>
                <Text style={s.weaponLevel}>Lv {w.level ?? 1}</Text>
                {!w.evolved && <Text style={s.killText}>{Math.min(w.killCount, WEAPON_EVOLVE_KILLS)}/{WEAPON_EVOLVE_KILLS}</Text>}
                {!w.evolved && <View style={[s.invProgress, { width: `${progress}%` }]} />}
              </View>
            );
          })}
        </View>
        {/* Equipped items inventory */}
        {(player?.items?.length ?? 0) > 0 && (
          <>
            <Text style={s.invTitle}>Equipped Items</Text>
            <View style={s.itemInvRow}>
              {(player?.items ?? []).map((it, i) => {
                const def = ITEM_DEFS.find(d => d.id === it.id);
                const rc = RARITY_COLORS[it.rarity] ?? '#9CA3AF';
                return (
                  <View key={i} style={[s.itemInvSlot, { borderColor: rc }]}>
                    <Text style={s.itemInvEmoji}>{def?.emoji ?? '?'}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}
        {readyWeapons.length > 0 && (
          <View style={s.evolutionLab}>
            <Text style={s.evolutionTitle}>🔮 Evolution Lab</Text>
            {readyWeapons.map(({ weapon, index }) => {
              const evolved = EVOLVED_WEAPONS[weapon.id];
              const affordable = materials >= WEAPON_EVOLVE_COST;
              return (
                <Pressable
                  key={`${weapon.id}-${index}`}
                  onPress={() => { if (evolveWeapon(state, index)) force(n => n + 1); }}
                  disabled={!affordable}
                  style={[s.evolveBtn, !affordable && s.disabled]}
                >
                  <Text style={s.evolveText}>{WEAPONS[weapon.id]?.emoji ?? '?'} → {evolved?.emoji ?? '✨'} {evolved?.name ?? 'Evolved'} (🔩{WEAPON_EVOLVE_COST})</Text>
                </Pressable>
              );
            })}
          </View>
        )}
        {/* Next wave */}
        <Pressable onPress={onNextWave} style={s.nextBtn}>
          <Text style={s.nextText}>NEXT WAVE {'\u25B6\uFE0F'}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const getWeaponEmoji = (id: string, evolved: boolean) => {
  if (evolved) return EVOLVED_WEAPONS[id]?.emoji ?? '❓';
  return WEAPONS[id]?.emoji ?? '❓';
};

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5,10,21,0.95)', zIndex: 50 },
  scroll: { flex: 1 },
  content: { padding: 20, paddingTop: 50, paddingBottom: 40 },
  title: { color: '#FFF', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  matText: { color: '#F59E0B', fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  itemCard: { width: '48%', backgroundColor: 'rgba(15,25,60,0.8)', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 2, alignItems: 'center' },
  evolutionCard: { backgroundColor: 'rgba(245,158,11,0.12)', shadowColor: '#F59E0B', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  itemBought: { opacity: 0.4 },
  itemEmoji: { fontSize: 36, marginBottom: 6 },
  itemName: { color: '#FFF', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  itemDesc: { color: '#94A3B8', fontSize: 12, textAlign: 'center', marginTop: 4 },
  itemRarity: { fontSize: 10, fontWeight: '700', marginTop: 4 },
  price: { color: '#FFF', fontSize: 14, fontWeight: '700', marginTop: 6 },
  soldText: { color: '#94A3B8', fontSize: 14, fontWeight: '700', marginTop: 6 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  actionBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 12, marginHorizontal: 4, alignItems: 'center' },
  actionText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  disabled: { opacity: 0.4 },
  broodHeader: { marginTop: 16, marginBottom: 6 },
  broodHint: { color: '#64748B', fontSize: 11, fontWeight: '700', lineHeight: 15 },
  invTitle: { color: '#94A3B8', fontSize: 13, marginTop: 16, marginBottom: 6 },
  invRow: { flexDirection: 'row' },
  invSlot: { width: 44, height: 44, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 6, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  invSlotEvolved: { borderWidth: 2, borderColor: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.1)' },
  invSlotReady: { borderWidth: 2, borderColor: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.16)' },
  invProgress: { position: 'absolute', bottom: 0, left: 0, height: 3, backgroundColor: '#F59E0B' },
  invEmoji: { fontSize: 18, zIndex: 2 },
  killText: { position: 'absolute', bottom: 4, color: '#FFF', fontSize: 7, fontWeight: '800', zIndex: 2, textShadowColor: '#000', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  weaponLevel: { position: 'absolute', top: 2, right: 3, color: '#A7F3D0', fontSize: 7, fontWeight: '900', zIndex: 3, textShadowColor: '#000', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  itemInvRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  itemInvSlot: { width: 32, height: 32, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  itemInvEmoji: { fontSize: 18 },
  evolutionLab: { marginTop: 14, borderRadius: 14, padding: 12, backgroundColor: 'rgba(245,158,11,0.1)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.28)' },
  evolutionTitle: { color: '#F59E0B', fontSize: 14, fontWeight: '900', marginBottom: 8 },
  evolveBtn: { backgroundColor: 'rgba(245,158,11,0.18)', borderRadius: 10, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: 'rgba(245,158,11,0.35)' },
  evolveText: { color: '#FFF', fontSize: 13, fontWeight: '800', textAlign: 'center' },
  notice: { backgroundColor: 'rgba(45,212,191,0.1)', borderRadius: 9, borderWidth: 1, borderColor: 'rgba(45,212,191,0.25)', paddingHorizontal: 10, paddingVertical: 7, marginBottom: 8 },
  noticeText: { color: '#CCFBF1', fontSize: 12, fontWeight: '800', textAlign: 'center' },
  petRow: { flexDirection: 'row', alignItems: 'stretch', minHeight: 42, marginBottom: 8, flexWrap: 'wrap' },
  petSlot: { width: '100%', minHeight: 96, borderRadius: 10, alignItems: 'center', marginBottom: 8, borderWidth: 1, flexDirection: 'row', padding: 10 },
  petSlotPrime: { borderWidth: 2, shadowColor: '#F59E0B', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  petEmojiCol: { alignItems: 'center', marginRight: 10 },
  petEmoji: { fontSize: 30 },
  primeLabel: { color: '#F59E0B', fontSize: 8, fontWeight: '900', marginTop: 2 },
  petInfo: { flex: 1 },
  petNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  petName: { color: '#FFF', fontSize: 12, fontWeight: '900' },
  generationTag: { color: '#FFF', fontSize: 9, fontWeight: '900', overflow: 'hidden', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  petLevel: { color: '#CCFBF1', fontSize: 10, fontWeight: '800', marginTop: 2 },
  petTrait: { color: '#E0F2FE', fontSize: 10, fontWeight: '800', marginTop: 3 },
  petDesc: { color: '#94A3B8', fontSize: 10, fontWeight: '600', marginTop: 2, lineHeight: 14 },
  perkRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4, gap: 4 },
  perkChip: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: 'rgba(255,255,255,0.04)' },
  perkChipText: { color: '#E0F2FE', fontSize: 9, fontWeight: '800' },
  nextPerkText: { color: '#A78BFA', fontSize: 9, fontWeight: '700', marginTop: 3 },
  synergyPanel: { backgroundColor: 'rgba(99,102,241,0.1)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(99,102,241,0.25)', padding: 10, marginBottom: 8 },
  synergyTitle: { color: '#A78BFA', fontSize: 12, fontWeight: '900', marginBottom: 4 },
  synergyText: { color: '#E0F2FE', fontSize: 11, fontWeight: '700', marginTop: 2 },
  petUpgrade: { color: '#FBBF24', fontSize: 10, fontWeight: '800', marginTop: 3, lineHeight: 14 },
  familyPanel: { backgroundColor: 'rgba(15,23,42,0.64)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(148,163,184,0.14)', padding: 10, marginBottom: 8 },
  familyTitle: { color: '#FFF', fontSize: 12, fontWeight: '900', marginBottom: 4 },
  familyText: { color: '#94A3B8', fontSize: 10, fontWeight: '700', lineHeight: 14, marginTop: 2 },
  emptyPetText: { color: '#94A3B8', fontSize: 12 },
  nextBtn: { backgroundColor: '#6366F1', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
  nextText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
});
