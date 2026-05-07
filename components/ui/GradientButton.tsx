import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  title: string;
  onPress: () => void;
  colors?: string[];
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
}

export default function GradientButton({
  title, onPress, colors, style, textStyle, disabled,
}: Props) {
  const gradColors = colors ?? ['#6366F1', '#06B6D4'];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.wrapper,
        style,
        pressed && { transform: [{ scale: 0.97 }] },
        disabled && { opacity: 0.5 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <LinearGradient
        colors={gradColors as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.gradient}
      >
        <Text style={[s.text, textStyle]}>{title}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrapper: { borderRadius: 16, overflow: 'hidden' },
  gradient: { paddingVertical: 16, paddingHorizontal: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  text: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', letterSpacing: 1 },
});
