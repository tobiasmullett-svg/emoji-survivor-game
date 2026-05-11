import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { setMuted, isMuted, setVolume, getVolume } from '../services/audio';
import AsyncStorage from '@react-native-async-storage/async-storage';

const VOLUME_STEPS = [0, 0.15, 0.3, 0.5, 0.7, 0.85, 1.0];

export default function SettingsScreen() {
  const router = useRouter();
  const [muted, setMutedState] = useState(isMuted());
  const [volume, setVolumeState] = useState(getVolume());
  const [cleared, setCleared] = useState(false);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  };

  const handleVolumeStep = (step: number) => {
    const v = VOLUME_STEPS[step] ?? 0.5;
    setVolume(v);
    setVolumeState(v);
  };

  const currentStep = VOLUME_STEPS.reduce((best, v, i) => 
    Math.abs(v - volume) < Math.abs(VOLUME_STEPS[best] - volume) ? i : best
  , 0);

  const handleClearData = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Clear all save data? This cannot be undone.\n\nThis will reset high scores, progression, achievements, and settings.')) {
        clearAllData();
      }
    } else {
      Alert.alert(
        'Clear Save Data',
        'This will reset high scores, progression, achievements, and settings. This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Clear', style: 'destructive', onPress: clearAllData },
        ]
      );
    }
  };

  const clearAllData = async () => {
    try {
      await AsyncStorage.clear();
      setCleared(true);
      setTimeout(() => setCleared(false), 3000);
    } catch {
      // Silently fail
    }
  };

  return (
    <LinearGradient colors={['#030712', '#08111F', '#0F1F3D']} style={StyleSheet.absoluteFill}>
      <SafeAreaView style={s.safe}>
        <Text style={s.title}>⚙️ SETTINGS</Text>

        {/* Volume */}
        <View style={s.section}>
          <Text style={s.label}>Volume</Text>
          <View style={s.volumeRow}>
            {VOLUME_STEPS.map((v, i) => (
              <Pressable
                key={i}
                onPress={() => handleVolumeStep(i)}
                style={[s.volumeStep, i <= currentStep && s.volumeStepActive]}
                accessibilityRole="button"
                accessibilityLabel={`Volume ${Math.round(v * 100)}%`}
              >
                <View style={[s.volumeBar, i <= currentStep && s.volumeBarActive, { height: 8 + i * 4 }]} />
              </Pressable>
            ))}
          </View>
          <Text style={s.volumeLabel}>{Math.round(volume * 100)}%</Text>
        </View>

        {/* Mute */}
        <Pressable onPress={toggleMute} style={[s.optionBtn, muted && s.optionBtnActive]}>
          <Text style={s.optionEmoji}>{muted ? '🔇' : '🔊'}</Text>
          <Text style={[s.optionText, muted && s.optionTextActive]}>
            {muted ? 'Sound OFF' : 'Sound ON'}
          </Text>
        </Pressable>

        {/* Clear data */}
        <View style={s.dangerSection}>
          <Text style={s.dangerLabel}>Danger Zone</Text>
          <Pressable onPress={handleClearData} style={s.dangerBtn}>
            <Text style={s.dangerBtnText}>🗑️ Clear All Save Data</Text>
          </Pressable>
          {cleared && (
            <Text style={s.clearedText}>✅ All data cleared</Text>
          )}
        </View>

        {/* Back */}
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel="Back to Menu"
        >
          <Text style={s.backText}>← BACK</Text>
        </Pressable>
      </SafeAreaView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '900', color: '#FFF', letterSpacing: 3, marginBottom: 40, textShadowColor: 'rgba(45,212,191,0.4)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 10 },
  section: { width: '100%', maxWidth: 320, marginBottom: 28, alignItems: 'center' },
  label: { color: '#94A3B8', fontSize: 14, fontWeight: '800', letterSpacing: 1, marginBottom: 12 },
  volumeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginBottom: 8 },
  volumeStep: { width: 28, alignItems: 'center', justifyContent: 'flex-end', paddingVertical: 8, borderRadius: 6 },
  volumeStepActive: {},
  volumeBar: { width: 12, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.12)' },
  volumeBarActive: { backgroundColor: '#2DD4BF' },
  volumeLabel: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  optionBtn: { width: '100%', maxWidth: 320, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, paddingHorizontal: 20, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(148,163,184,0.18)', backgroundColor: 'rgba(255,255,255,0.04)', marginBottom: 16 },
  optionBtnActive: { borderColor: 'rgba(239,68,68,0.35)', backgroundColor: 'rgba(239,68,68,0.08)' },
  optionEmoji: { fontSize: 24 },
  optionText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  optionTextActive: { color: '#FCA5A5' },
  dangerSection: { width: '100%', maxWidth: 320, marginTop: 28, paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(239,68,68,0.15)', alignItems: 'center' },
  dangerLabel: { color: '#EF4444', fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 12 },
  dangerBtn: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.08)' },
  dangerBtnText: { color: '#FCA5A5', fontSize: 14, fontWeight: '700' },
  clearedText: { color: '#22C55E', fontSize: 13, fontWeight: '700', marginTop: 10 },
  backBtn: { marginTop: 40, paddingVertical: 16, paddingHorizontal: 32, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(45,212,191,0.22)', backgroundColor: 'rgba(255,255,255,0.035)' },
  backText: { color: '#94A3B8', fontSize: 16, fontWeight: '600' },
});
