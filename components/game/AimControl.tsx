import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';

interface Props {
  knob: { x: number; y: number };
  active: boolean;
}

const OUTER_R = 55;
const KNOB_R = 24;
const CONTROL_SIZE = OUTER_R * 2;

/** Visual-only aim stick. GameTouchControls owns all mobile touch input. */
export default function AimControl({ knob, active }: Props) {
  const { width } = useWindowDimensions();
  const isNarrow = width < 375;

  return (
    <View
      style={[
        styles.container,
        isNarrow ? styles.narrowContainer : styles.wideContainer,
      ]}
      pointerEvents="none"
    >
      <View style={[styles.outer, active && styles.outerActive]}>
        <View pointerEvents="none" style={styles.crosshair}>
          <View style={styles.crosshairHorizontal} />
          <View style={styles.crosshairVertical} />
          <View style={styles.crosshairCenter} />
        </View>
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
    width: CONTROL_SIZE,
    height: CONTROL_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  // At 375px: movement ends at x=170, aim is x=175..285,
  // and the ability begins at x=291.
  wideContainer: { bottom: 30, right: 90 },
  // On compact widths, keep the full-size aim pad in its own band above the
  // bottom movement/ability controls.
  narrowContainer: { bottom: 190, right: 20 },
  outer: {
    width: OUTER_R * 2,
    height: OUTER_R * 2,
    borderRadius: OUTER_R,
    backgroundColor: 'rgba(251,191,36,0.08)',
    borderWidth: 2,
    borderColor: 'rgba(251,191,36,0.28)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outerActive: {
    backgroundColor: 'rgba(251,191,36,0.16)',
    borderColor: 'rgba(251,191,36,0.72)',
  },
  crosshair: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  crosshairHorizontal: {
    position: 'absolute',
    width: 44,
    height: 1,
    backgroundColor: 'rgba(251,191,36,0.42)',
  },
  crosshairVertical: {
    position: 'absolute',
    width: 1,
    height: 44,
    backgroundColor: 'rgba(251,191,36,0.42)',
  },
  crosshairCenter: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.72)',
  },
  knob: {
    width: KNOB_R * 2,
    height: KNOB_R * 2,
    borderRadius: KNOB_R,
    backgroundColor: 'rgba(251,191,36,0.48)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.38)',
    shadowColor: '#FBBF24',
    shadowOpacity: 0.45,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
});
