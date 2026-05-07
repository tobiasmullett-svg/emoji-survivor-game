import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';

interface Props {
  emoji: string;
  cooldown: number;
  maxCooldown: number;
  onPress: () => void;
}

export default function AbilityButton({ emoji, cooldown, maxCooldown, onPress }: Props) {
  const ready = (cooldown ?? 0) <= 0;
  const cdPct = maxCooldown > 0 ? Math.max(0, (cooldown ?? 0) / maxCooldown) : 0;
  return (
    <Pressable
      onPress={onPress}
      disabled={!ready}
      style={[s.btn, !ready && s.btnCd]}
      accessibilityLabel="Ability" accessibilityRole="button"
    >
      {ready && <View style={s.readyGlow} />}
      <Text style={s.emoji}>{emoji ?? '\u2B50'}</Text>
      {!ready && (
        <View style={[s.cdOverlay, { height: `${cdPct * 100}%` }]} />
      )}
      {!ready && <Text style={s.cdText}>{Math.ceil(cooldown ?? 0)}s</Text>}
    </Pressable>
  );
}

const s = StyleSheet.create({
  btn: {
    position: 'absolute', bottom: 40, right: 20, width: 64, height: 64,
    borderRadius: 32, backgroundColor: 'rgba(20,184,166,0.28)',
    borderWidth: 2, borderColor: 'rgba(45,212,191,0.75)',
    alignItems: 'center', justifyContent: 'center', zIndex: 10, overflow: 'hidden',
    shadowColor: '#2DD4BF', shadowOpacity: 0.45, shadowRadius: 12, shadowOffset: { width: 0, height: 0 },
  },
  btnCd: { borderColor: 'rgba(148,163,184,0.3)' },
  readyGlow: { position: 'absolute', width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.08)' },
  emoji: { fontSize: 28, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  cdOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  cdText: { position: 'absolute', fontSize: 11, color: '#FFF', fontWeight: '700' },
});
