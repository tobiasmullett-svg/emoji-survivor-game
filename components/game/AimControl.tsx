import React, { useRef, useState } from 'react';
import { View, PanResponder, StyleSheet, useWindowDimensions } from 'react-native';

interface Props {
  onInput: (value: { x: number; y: number } | undefined) => void;
}

const OUTER_R = 55;
const KNOB_R = 24;
const MAX_D = 40;
const CONTROL_SIZE = OUTER_R * 2;
// Fraction of MAX_D ignored so resting-thumb jitter does not change aim.
const DEAD_ZONE = 0.12;

export default function AimControl({ onInput }: Props) {
  const { width } = useWindowDimensions();
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const isNarrow = width < 375;

  const clearInput = () => {
    setKnob({ x: 0, y: 0 });
    setActive(false);
    onInput(undefined);
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        // A touch can begin without moving; clear any prior mouse direction so
        // it cannot keep firing while the thumb is resting in the dead zone.
        setKnob({ x: 0, y: 0 });
        setActive(true);
        onInput(undefined);
      },
      onPanResponderMove: (_, gs) => {
        const distance = Math.sqrt(gs.dx * gs.dx + gs.dy * gs.dy);
        const clampedDistance = Math.min(distance, MAX_D);
        const angle = Math.atan2(gs.dy, gs.dx);
        const x = distance > 0 ? Math.cos(angle) * clampedDistance : 0;
        const y = distance > 0 ? Math.sin(angle) * clampedDistance : 0;
        setKnob({ x, y });

        const outputX = x / MAX_D;
        const outputY = y / MAX_D;
        const outputLength = Math.sqrt(outputX * outputX + outputY * outputY);
        if (outputLength <= DEAD_ZONE) {
          onInput(undefined);
          return;
        }

        // Normalize diagonals, then rescale the remaining travel like movement.
        const directionX = outputX / outputLength;
        const directionY = outputY / outputLength;
        const scale = Math.min((outputLength - DEAD_ZONE) / (1 - DEAD_ZONE), 1);
        onInput({ x: directionX * scale, y: directionY * scale });
      },
      onPanResponderRelease: clearInput,
      onPanResponderTerminate: clearInput,
    })
  ).current;

  return (
    <View
      style={[
        styles.container,
        isNarrow ? styles.narrowContainer : styles.wideContainer,
      ]}
      pointerEvents="box-none"
    >
      <View {...pan.panHandlers} style={[styles.outer, active && styles.outerActive]}>
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
  // At 375px: movement responder ends at x=170, aim is x=175..285,
  // and the ability begins at x=291.
  wideContainer: { bottom: 30, right: 90 },
  // On compact widths, keep the full-size aim pad in its own band above the
  // bottom movement/ability controls instead of letting responder bounds meet.
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
