import React, { useRef, useState } from 'react';
import { View, PanResponder, StyleSheet } from 'react-native';

interface Props {
  onInput: (v: { x: number; y: number }) => void;
}

const OUTER_R = 55;
const KNOB_R = 24;
const MAX_D = 40;
// Fraction of MAX_D ignored so resting-thumb jitter doesn't cause drift.
const DEAD_ZONE = 0.12;

export default function VirtualJoystick({ onInput }: Props) {
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => setActive(true),
      onPanResponderMove: (_, gs) => {
        const d = Math.sqrt(gs.dx * gs.dx + gs.dy * gs.dy);
        const cd = Math.min(d, MAX_D);
        const a = Math.atan2(gs.dy, gs.dx);
        const kx = d > 0 ? Math.cos(a) * cd : 0;
        const ky = d > 0 ? Math.sin(a) * cd : 0;
        setKnob({ x: kx, y: ky });
        // Normalize so diagonal movement isn't ~41% faster
        const outX = kx / MAX_D;
        const outY = ky / MAX_D;
        const outLen = Math.sqrt(outX * outX + outY * outY);
        const normX = outLen > 0 ? outX / outLen : 0;
        const normY = outLen > 0 ? outY / outLen : 0;
        // Dead zone, then rescale the remaining travel to the full 0..1 range.
        const scale = outLen <= DEAD_ZONE ? 0 : Math.min((outLen - DEAD_ZONE) / (1 - DEAD_ZONE), 1);
        onInput({ x: normX * scale, y: normY * scale });
      },
      onPanResponderRelease: () => {
        setKnob({ x: 0, y: 0 });
        setActive(false);
        onInput({ x: 0, y: 0 });
      },
      onPanResponderTerminate: () => {
        setKnob({ x: 0, y: 0 });
        setActive(false);
        onInput({ x: 0, y: 0 });
      },
    })
  ).current;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View
        {...pan.panHandlers}
        style={[styles.outer, active && styles.outerActive]}
      >
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
