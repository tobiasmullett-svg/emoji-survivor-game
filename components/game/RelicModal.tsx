import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { RelicChoice } from '../../engine/types';
import { RARITY_COLORS } from '../../engine/constants';

interface Props {
  options: RelicChoice[];
  onChoose: (index: number) => void;
}

export default function RelicModal({ options, onChoose }: Props) {
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 7, tension: 120, useNativeDriver: true }),
    ]).start();
  }, [opacityAnim, slideAnim]);

  return (
    <Animated.View style={[s.overlay, { opacity: opacityAnim }]}>
      <Animated.View style={[s.panel, { transform: [{ translateY: slideAnim }] }]}>
        <Text style={s.kicker}>BOSS RELIC</Text>
        <Text style={s.title}>Choose a Tide Relic</Text>
        <ScrollView contentContainerStyle={s.optionRow} showsVerticalScrollIndicator={false}>
          {(options ?? []).map((opt, i) => {
            const color = RARITY_COLORS[opt.rarity] ?? '#9CA3AF';
            return (
              <Pressable
                key={opt.id}
                onPress={() => onChoose(i)}
                style={({ pressed }) => [
                  s.option,
                  { borderColor: color },
                  pressed && s.optionPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${opt.name}. ${opt.desc} ${opt.drawback}`}
              >
                <Text style={s.emoji}>{opt.emoji}</Text>
                <Text style={s.name}>{opt.name}</Text>
                <Text style={s.desc}>{opt.desc}</Text>
                <View style={s.tradeoff}>
                  <Text style={s.tradeoffText}>{opt.drawback}</Text>
                </View>
                <Text style={[s.rarity, { color }]}>{opt.rarity.toUpperCase()}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(2,6,23,0.82)', justifyContent: 'center', alignItems: 'center', zIndex: 50, paddingHorizontal: 16 },
  panel: { width: '100%', maxWidth: 740, maxHeight: '88%', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(168,85,247,0.35)', backgroundColor: 'rgba(15,25,60,0.97)', padding: 20, shadowColor: '#A855F7', shadowOpacity: 0.28, shadowRadius: 18, shadowOffset: { width: 0, height: 0 } },
  kicker: { color: '#A78BFA', fontSize: 11, fontWeight: '900', letterSpacing: 2, textAlign: 'center' },
  title: { color: '#FFF', fontSize: 25, fontWeight: '900', textAlign: 'center', marginTop: 4, marginBottom: 16 },
  optionRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  option: { width: 220, minHeight: 232, borderRadius: 12, borderWidth: 2, backgroundColor: 'rgba(255,255,255,0.06)', padding: 14, alignItems: 'center' },
  optionPressed: { transform: [{ scale: 0.98 }], backgroundColor: 'rgba(255,255,255,0.1)' },
  emoji: { fontSize: 38, marginBottom: 8 },
  name: { color: '#FFF', fontSize: 16, fontWeight: '900', textAlign: 'center' },
  desc: { color: '#DDEAFE', fontSize: 12, fontWeight: '700', lineHeight: 17, textAlign: 'center', marginTop: 8 },
  tradeoff: { marginTop: 'auto', paddingHorizontal: 9, paddingVertical: 7, borderRadius: 9, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(248,113,113,0.18)' },
  tradeoffText: { color: '#FCA5A5', fontSize: 11, fontWeight: '800', lineHeight: 15, textAlign: 'center' },
  rarity: { marginTop: 8, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
});
