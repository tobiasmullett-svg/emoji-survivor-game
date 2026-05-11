import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  onDismiss: () => void;
}

const SLIDES = [
  {
    title: 'Welcome to the Arena',
    emoji: '🦀',
    text: 'Use WASD or the virtual joystick to move. Your character attacks automatically when enemies are in range. Survive until the wave timer runs out.',
  },
  {
    title: 'Gather Materials',
    emoji: '🔩',
    text: 'Defeated enemies drop materials. Collect them to buy new weapons, items, and upgrades between waves.',
  },
  {
    title: 'Water Zones',
    emoji: '🌊',
    text: 'Deep water areas slowly drain your oxygen but often contain valuable resource nodes. Manage your breath carefully!',
  },
  {
    title: 'Weapon Evolution',
    emoji: '✨',
    text: 'Weapons max out at Lv.5. Once maxed, get 50 kills with that weapon to unlock its powerful Evolution in the Shop.',
  },
  {
    title: 'The Brood',
    emoji: '🥚',
    text: 'Find eggs or buy them to hatch companions. Train them to increase their power, or breed matching twins to create Prime variants.',
  },
];

export default function TutorialOverlay({ onDismiss }: Props) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slide = SLIDES[currentSlide];

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(s => s + 1);
    } else {
      onDismiss();
    }
  };

  return (
    <View style={s.overlay}>
      <LinearGradient colors={['rgba(15,25,60,0.95)', 'rgba(5,10,21,0.98)']} style={s.modal}>
        <Text style={s.title}>How to Play</Text>
        
        <View style={s.content}>
          <Text style={s.emoji}>{slide.emoji}</Text>
          <Text style={s.slideTitle}>{slide.title}</Text>
          <Text style={s.slideText}>{slide.text}</Text>
        </View>

        <View style={s.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[s.dot, i === currentSlide && s.dotActive]} />
          ))}
        </View>

        <View style={s.actions}>
          {currentSlide > 0 && (
            <Pressable onPress={() => setCurrentSlide(s => s - 1)} style={[s.btn, s.btnSecondary]}>
              <Text style={s.btnTextSec}>Back</Text>
            </Pressable>
          )}
          <Pressable onPress={handleNext} style={[s.btn, s.btnPrimary, currentSlide === 0 && { flex: 1 }]}>
            <Text style={s.btnTextPri}>
              {currentSlide === SLIDES.length - 1 ? "Let's Go!" : "Next"}
            </Text>
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    borderColor: 'rgba(99,102,241,0.3)',
    shadowColor: '#6366F1',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },
  title: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
    textAlign: 'center',
    textTransform: 'uppercase',
    marginBottom: 24,
  },
  content: {
    alignItems: 'center',
    minHeight: 200,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  slideTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 12,
    textAlign: 'center',
  },
  slideText: {
    color: '#E2E8F0',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    fontWeight: '500',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotActive: {
    backgroundColor: '#6366F1',
    width: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: '#6366F1',
  },
  btnSecondary: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  btnTextPri: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  btnTextSec: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: '700',
  },
});
