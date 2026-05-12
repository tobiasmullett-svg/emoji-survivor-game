import React, { useRef, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import type { LevelUpOption } from '../../engine/types';
import { RARITY_COLORS } from '../../engine/constants';

interface Props {
  options: LevelUpOption[];
  onChoose: (index: number) => void;
}

export default function LevelUpModal({ options, onChoose }: Props) {
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 140, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1500, useNativeDriver: false }),
      ])
    ).start();
  }, [scaleAnim, opacityAnim, glowAnim]);

  const borderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(245,158,11,0.25)', 'rgba(245,158,11,0.6)'],
  });

  return (
    <Animated.View style={[s.overlay, { opacity: opacityAnim }]}>
      <Animated.View style={[s.card, { transform: [{ scale: scaleAnim }], borderColor }]}>
        <Text style={s.title}>LEVEL UP! 🎉</Text>
        <Text style={s.sub}>Choose an upgrade</Text>
        {(options ?? []).map((opt, i) => (
          <Pressable
            key={i}
            onPress={() => onChoose(i)}
            style={({ pressed }) => [
              s.option,
              { borderLeftColor: RARITY_COLORS[opt?.rarity ?? 'common'] ?? '#9CA3AF' },
              pressed && { transform: [{ scale: 0.97 }], backgroundColor: 'rgba(255,255,255,0.1)' },
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
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', zIndex: 50 },
  card: { backgroundColor: 'rgba(15,25,60,0.95)', borderRadius: 20, padding: 24, width: 300, alignItems: 'center', borderWidth: 2, shadowColor: '#F59E0B', shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 0 } },
  title: { color: '#F59E0B', fontSize: 26, fontWeight: '800', marginBottom: 4 },
  sub: { color: '#94A3B8', fontSize: 14, marginBottom: 16 },
  option: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 14, width: '100%', marginBottom: 10, borderLeftWidth: 4 },
  optEmoji: { fontSize: 28, marginRight: 12 },
  optInfo: { flex: 1 },
  optName: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  optDesc: { color: '#94A3B8', fontSize: 13, marginTop: 2 },
  rarity: { fontSize: 10, fontWeight: '700' },
});
