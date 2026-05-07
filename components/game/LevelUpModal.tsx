import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { LevelUpOption } from '../../engine/types';
import { RARITY_COLORS } from '../../engine/constants';

interface Props {
  options: LevelUpOption[];
  onChoose: (index: number) => void;
}

export default function LevelUpModal({ options, onChoose }: Props) {
  return (
    <View style={s.overlay}>
      <View style={s.card}>
        <Text style={s.title}>LEVEL UP! 🎉</Text>
        <Text style={s.sub}>Choose an upgrade</Text>
        {(options ?? []).map((opt, i) => (
          <Pressable
            key={i}
            onPress={() => onChoose(i)}
            style={({ pressed }) => [
              s.option,
              { borderLeftColor: RARITY_COLORS[opt?.rarity ?? 'common'] ?? '#9CA3AF' },
              pressed && { transform: [{ scale: 0.97 }] },
            ]}
            accessibilityRole="button"
            accessibilityLabel={opt?.desc ?? ''}
          >
            <Text style={s.optEmoji}>{opt?.emoji ?? '?'}</Text>
            <View style={s.optInfo}>
              <Text style={s.optName}>{opt?.name ?? 'Unknown'}</Text>
              <Text style={s.optDesc}>{opt?.desc ?? ''}</Text>
            </View>
            <Text style={[s.rarity, { color: RARITY_COLORS[opt?.rarity ?? 'common'] }]}>
              {(opt?.rarity ?? 'common').toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', zIndex: 50 },
  card: { backgroundColor: 'rgba(15,25,60,0.95)', borderRadius: 20, padding: 24, width: 300, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
  title: { color: '#F59E0B', fontSize: 26, fontWeight: '800', marginBottom: 4 },
  sub: { color: '#94A3B8', fontSize: 14, marginBottom: 16 },
  option: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 14, width: '100%', marginBottom: 10, borderLeftWidth: 4 },
  optEmoji: { fontSize: 28, marginRight: 12 },
  optInfo: { flex: 1 },
  optName: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  optDesc: { color: '#94A3B8', fontSize: 13, marginTop: 2 },
  rarity: { fontSize: 10, fontWeight: '700' },
});
