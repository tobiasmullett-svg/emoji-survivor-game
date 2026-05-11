import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

const HEROES = ['🦀', '🐙', '🦑'];
const MENU_SPARKS = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  left: `${(i * 37) % 96}%`,
  top: `${8 + ((i * 53) % 82)}%`,
  opacity: 0.12 + (i % 4) * 0.05,
}));

export default function MainMenu() {
  const router = useRouter();
  const [heroIdx, setHeroIdx] = useState(0);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => setHeroIdx(i => (i + 1) % 3), 2000);
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.12, duration: 1200, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => { clearInterval(interval); pulse.stop(); };
  }, [scaleAnim]);

  return (
    <LinearGradient colors={['#030712', '#08111F', '#102018']} style={StyleSheet.absoluteFill}>
      {MENU_SPARKS.map(spark => (
        <View
          key={spark.id}
          style={[s.spark, { left: spark.left, top: spark.top, opacity: spark.opacity } as unknown as object]}
        />
      ))}
      <SafeAreaView style={s.safe}>
        <Text style={s.wave}>🌊🌊🌊</Text>
        <Text style={s.title}>EMOJI{"\n"}SURVIVOR</Text>
        <Animated.Text style={[s.hero, { transform: [{ scale: scaleAnim }] }]}>
          {HEROES[heroIdx]}
        </Animated.Text>
        <Pressable
          onPress={() => router.push('/character-select')}
          style={({ pressed }) => [s.btn, s.btnPrimary, pressed && { transform: [{ scale: 0.97 }] }]}
          accessibilityRole="button" accessibilityLabel="Start Game"
        >
          <LinearGradient colors={['#7C3AED', '#14B8A6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.btnGrad}>
            <Text style={s.btnText}>START GAME</Text>
          </LinearGradient>
        </Pressable>
        <Pressable
          onPress={() => router.push('/highscores')}
          style={({ pressed }) => [s.btn, s.btnSecondary, pressed && { opacity: 0.7 }]}
          accessibilityRole="button" accessibilityLabel="High Scores"
        >
          <Text style={s.btnTextSec}>🏆 HIGH SCORES</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/progression')}
          style={({ pressed }) => [s.btn, s.btnSecondary, pressed && { opacity: 0.7 }]}
          accessibilityRole="button" accessibilityLabel="Progress"
        >
          <Text style={s.btnTextSec}>📊 PROGRESS</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/achievements')}
          style={({ pressed }) => [s.btn, s.btnSecondary, pressed && { opacity: 0.7 }]}
          accessibilityRole="button" accessibilityLabel="Achievements"
        >
          <Text style={s.btnTextSec}>🏅 ACHIEVEMENTS</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/settings')}
          style={({ pressed }) => [s.btn, s.btnSecondary, pressed && { opacity: 0.7 }]}
          accessibilityRole="button" accessibilityLabel="Settings"
        >
          <Text style={s.btnTextSec}>⚙️ SETTINGS</Text>
        </Pressable>
        <Text style={s.version}>v1.0.0</Text>
      </SafeAreaView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  spark: { position: 'absolute', width: 3, height: 3, borderRadius: 2, backgroundColor: '#CFFAFE' },
  wave: { fontSize: 32, marginBottom: 8 },
  title: { fontSize: 42, fontWeight: '900', color: '#FFF', textAlign: 'center', letterSpacing: 4, marginBottom: 16, textShadowColor: 'rgba(45,212,191,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 12 },
  hero: { fontSize: 84, marginBottom: 40, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 8 },
  btn: { width: '100%', maxWidth: 280, borderRadius: 14, overflow: 'hidden', marginBottom: 12 },
  btnPrimary: {},
  btnGrad: { paddingVertical: 18, alignItems: 'center', borderRadius: 14 },
  btnText: { color: '#FFF', fontSize: 20, fontWeight: '800', letterSpacing: 2 },
  btnSecondary: { borderWidth: 1, borderColor: 'rgba(45,212,191,0.22)', paddingVertical: 16, alignItems: 'center', borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.035)' },
  btnTextSec: { color: '#94A3B8', fontSize: 16, fontWeight: '600' },
  version: { color: 'rgba(255,255,255,0.2)', fontSize: 12, position: 'absolute', bottom: 20 },
});
