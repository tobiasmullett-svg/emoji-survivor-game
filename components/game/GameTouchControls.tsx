import React, { useEffect, useRef, useState } from 'react';
import {
  GestureResponderEvent,
  PanResponder,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import type { Vec2 } from '../../engine/math';
import VirtualJoystick from './VirtualJoystick';
import AimControl from './AimControl';
import AbilityButton from './AbilityButton';

const PAD_RADIUS = 55;
const MAX_STICK_DISTANCE = 40;
const DEAD_ZONE = 0.12;
const ZERO_VECTOR: Vec2 = { x: 0, y: 0 };

export type TouchRole = 'movement' | 'aim' | 'ability' | 'ignored';

export interface TouchPoint {
  identifier: string;
  x: number;
  y: number;
}

interface CircleRegion {
  centerX: number;
  centerY: number;
  radius: number;
}

interface RectRegion {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ControlLayout {
  movement: CircleRegion;
  aim: CircleRegion;
  ability: RectRegion;
}

export interface StickVector {
  knob: Vec2;
  input: Vec2;
  active: boolean;
}

interface TrackedTouch {
  identifier: string;
  start: TouchPoint;
  current: TouchPoint;
}

interface Props {
  emoji: string;
  cooldown: number;
  maxCooldown: number;
  onMovementInput: (value: Vec2) => void;
  onAimInput: (value: Vec2 | undefined) => void;
  onActivateAbility: () => void;
}

/**
 * Returns the actual visible input regions. The movement container remains
 * 150px at bottom:30/left:20 while its responsive hit target is the visible
 * 110px pad. At 375px wide the aim pad remains x=175..285.
 */
export function getControlLayout(width: number, height: number): ControlLayout {
  const aimCenterX = width < 375 ? width - 75 : width - 145;
  const aimCenterY = height - (width < 375 ? 245 : 85);
  return {
    movement: { centerX: 95, centerY: height - 105, radius: PAD_RADIUS },
    aim: { centerX: aimCenterX, centerY: aimCenterY, radius: PAD_RADIUS },
    ability: { left: width - 84, top: height - 104, width: 64, height: 64 },
  };
}

/** Classify a new touch once, before it is allowed to control any input. */
export function classifyTouch(layout: ControlLayout, touch: TouchPoint): TouchRole {
  const inCircle = (circle: CircleRegion) => {
    const x = touch.x - circle.centerX;
    const y = touch.y - circle.centerY;
    return x * x + y * y <= circle.radius * circle.radius;
  };
  const inRect = (rect: RectRegion) => (
    touch.x >= rect.left
    && touch.x <= rect.left + rect.width
    && touch.y >= rect.top
    && touch.y <= rect.top + rect.height
  );

  if (inCircle(layout.movement)) return 'movement';
  if (inCircle(layout.aim)) return 'aim';
  if (inRect(layout.ability)) return 'ability';
  return 'ignored';
}

/**
 * Convert one touch's own start/current positions into the visible knob
 * displacement and a dead-zone-rescaled, normalized game input. It never uses
 * PanResponder's centroid-based gestureState.
 */
export function getStickVector(start: TouchPoint, current: TouchPoint): StickVector {
  const dx = current.x - start.x;
  const dy = current.y - start.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const clampedDistance = Math.min(distance, MAX_STICK_DISTANCE);
  const ratio = distance > 0 ? clampedDistance / distance : 0;
  const knob = { x: dx * ratio, y: dy * ratio };
  const outputLength = clampedDistance / MAX_STICK_DISTANCE;

  if (outputLength <= DEAD_ZONE) {
    return { knob, input: ZERO_VECTOR, active: false };
  }

  const directionX = knob.x / clampedDistance;
  const directionY = knob.y / clampedDistance;
  const scale = Math.min((outputLength - DEAD_ZONE) / (1 - DEAD_ZONE), 1);
  return {
    knob,
    input: { x: directionX * scale, y: directionY * scale },
    active: true,
  };
}

function eventTouches(event: GestureResponderEvent): TouchPoint[] {
  return Array.from(event.nativeEvent.changedTouches).map(touch => ({
    identifier: touch.identifier,
    x: touch.pageX,
    y: touch.pageY,
  }));
}

/**
 * The sole mobile gameplay responder. It tracks every changed native touch by
 * identifier, so movement, aim, and ability can run concurrently without JS
 * responder ownership changing between individual controls.
 */
export default function GameTouchControls({
  emoji,
  cooldown,
  maxCooldown,
  onMovementInput,
  onAimInput,
  onActivateAbility,
}: Props) {
  const { width, height } = useWindowDimensions();
  const layoutRef = useRef(getControlLayout(width, height));
  layoutRef.current = getControlLayout(width, height);
  const callbacksRef = useRef({ onMovementInput, onAimInput, onActivateAbility });
  callbacksRef.current = { onMovementInput, onAimInput, onActivateAbility };

  const rolesRef = useRef(new Map<string, TouchRole>());
  const movementTouchRef = useRef<TrackedTouch | null>(null);
  const aimTouchRef = useRef<TrackedTouch | null>(null);
  const [movementKnob, setMovementKnob] = useState<Vec2>(ZERO_VECTOR);
  const [aimKnob, setAimKnob] = useState<Vec2>(ZERO_VECTOR);
  const [movementActive, setMovementActive] = useState(false);
  const [aimActive, setAimActive] = useState(false);

  const clearAllInputs = () => {
    rolesRef.current.clear();
    movementTouchRef.current = null;
    aimTouchRef.current = null;
    setMovementKnob(ZERO_VECTOR);
    setAimKnob(ZERO_VECTOR);
    setMovementActive(false);
    setAimActive(false);
    callbacksRef.current.onMovementInput(ZERO_VECTOR);
    callbacksRef.current.onAimInput(undefined);
  };

  const startTouch = (touch: TouchPoint) => {
    // onTouchStart and onPanResponderGrant can report the first touch; process
    // it once so an ability is never activated twice for the same identifier.
    if (rolesRef.current.has(touch.identifier)) return;

    let role = classifyTouch(layoutRef.current, touch);
    if (role === 'movement' && movementTouchRef.current) role = 'ignored';
    if (role === 'aim' && aimTouchRef.current) role = 'ignored';
    rolesRef.current.set(touch.identifier, role);

    if (role === 'movement') {
      movementTouchRef.current = { identifier: touch.identifier, start: touch, current: touch };
      setMovementKnob(ZERO_VECTOR);
      setMovementActive(true);
      callbacksRef.current.onMovementInput(ZERO_VECTOR);
    } else if (role === 'aim') {
      aimTouchRef.current = { identifier: touch.identifier, start: touch, current: touch };
      setAimKnob(ZERO_VECTOR);
      setAimActive(true);
      callbacksRef.current.onAimInput(undefined);
    } else if (role === 'ability') {
      callbacksRef.current.onActivateAbility();
    }
  };

  const moveTouch = (touch: TouchPoint) => {
    const role = rolesRef.current.get(touch.identifier);
    if (role === 'movement') {
      const tracked = movementTouchRef.current;
      if (!tracked || tracked.identifier !== touch.identifier) return;
      tracked.current = touch;
      const vector = getStickVector(tracked.start, touch);
      setMovementKnob(vector.knob);
      callbacksRef.current.onMovementInput(vector.input);
    } else if (role === 'aim') {
      const tracked = aimTouchRef.current;
      if (!tracked || tracked.identifier !== touch.identifier) return;
      tracked.current = touch;
      const vector = getStickVector(tracked.start, touch);
      setAimKnob(vector.knob);
      callbacksRef.current.onAimInput(vector.active ? vector.input : undefined);
    }
  };

  const endTouch = (touch: TouchPoint) => {
    const role = rolesRef.current.get(touch.identifier);
    rolesRef.current.delete(touch.identifier);

    if (role === 'movement' && movementTouchRef.current?.identifier === touch.identifier) {
      movementTouchRef.current = null;
      setMovementKnob(ZERO_VECTOR);
      setMovementActive(false);
      callbacksRef.current.onMovementInput(ZERO_VECTOR);
    } else if (role === 'aim' && aimTouchRef.current?.identifier === touch.identifier) {
      aimTouchRef.current = null;
      setAimKnob(ZERO_VECTOR);
      setAimActive(false);
      callbacksRef.current.onAimInput(undefined);
    }
  };

  const handleTouchStart = (event: GestureResponderEvent) => {
    eventTouches(event).forEach(startTouch);
  };
  const handleTouchMove = (event: GestureResponderEvent) => {
    eventTouches(event).forEach(moveTouch);
  };
  const handleTouchEnd = (event: GestureResponderEvent) => {
    eventTouches(event).forEach(endTouch);
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: event => eventTouches(event)
        .some(touch => classifyTouch(layoutRef.current, touch) !== 'ignored'),
      onMoveShouldSetPanResponder: () => false,
      onPanResponderGrant: handleTouchStart,
      onPanResponderMove: handleTouchMove,
      onPanResponderRelease: handleTouchEnd,
      onPanResponderTerminate: clearAllInputs,
      onPanResponderTerminationRequest: () => true,
    })
  ).current;

  useEffect(() => clearAllInputs, []);

  return (
    <View
      {...pan.panHandlers}
      style={styles.coordinator}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <VirtualJoystick knob={movementKnob} active={movementActive} />
      <AimControl knob={aimKnob} active={aimActive} />
      <AbilityButton emoji={emoji} cooldown={cooldown} maxCooldown={maxCooldown} />
    </View>
  );
}

const styles = StyleSheet.create({
  coordinator: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
});
