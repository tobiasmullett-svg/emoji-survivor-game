import React from 'react';
import { View, StyleSheet } from 'react-native';

interface Props {
  knob: { x: number; y: number };
  active: boolean;
}

const OUTER_R = 55;
const KNOB_R = 24;

/** Visual-only movement stick. GameTouchControls owns all mobile touch input. */
export default function VirtualJoystick({ knob, active }: Props) {
  return (
    <View style={styles.container} pointerEvents="none">
      <View style={[styles.outer, active && styles.outerActive]}>
        <View
          style={[
            styles.knob,
            { transform: [{ translateX: knob.x }, { translateY: knob.y }] },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  outer: {
    width: OUTER_R * 2,
    height: OUTER_R * 2,
    borderRadius: OUTER_R,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outerActive: {
    backgroundColor: 'rgba(45,212,191,0.12)',
    borderColor: 'rgba(45,212,191,0.55)',
  },
  knob: {
    width: KNOB_R * 2,
    height: KNOB_R * 2,
    borderRadius: KNOB_R,
    backgroundColor: 'rgba(255,255,255,0.42)',
    shadowColor: '#2DD4BF',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
});
