import React from 'react';
import { Image, type ImageSourcePropType, type ImageStyle, type StyleProp } from 'react-native';
import type { WeaponId } from '../../engine/types';

const BASE_WEAPON_ICONS: Partial<Record<WeaponId, ImageSourcePropType>> = {
  stick: require('../../assets/weapons/icons/stick.png'),
  sword: require('../../assets/weapons/icons/sword.png'),
  claw: require('../../assets/weapons/icons/claw.png'),
  pistol: require('../../assets/weapons/icons/pistol.png'),
  smg: require('../../assets/weapons/icons/smg.png'),
  shotgun: require('../../assets/weapons/icons/shotgun.png'),
  crossbow: require('../../assets/weapons/icons/crossbow.png'),
  lightning: require('../../assets/weapons/icons/lightning.png'),
};

export function getWeaponIconSource(id: WeaponId | string | undefined, evolved = false): ImageSourcePropType | undefined {
  if (!id) return undefined;
  // Evolved-specific art can be added later. For now the base sprite keeps
  // upgraded weapons visually richer than falling back to emoji.
  return BASE_WEAPON_ICONS[id as WeaponId];
}

export function hasWeaponIcon(id: WeaponId | string | undefined, evolved = false): boolean {
  return Boolean(getWeaponIconSource(id, evolved));
}

interface Props {
  id: WeaponId | string | undefined;
  evolved?: boolean;
  size?: number;
  style?: StyleProp<ImageStyle>;
}

export default function WeaponIcon({ id, evolved = false, size = 36, style }: Props) {
  const source = getWeaponIconSource(id, evolved);
  if (!source) return null;
  return (
    <Image
      source={source}
      resizeMode="contain"
      style={[{ width: size, height: size }, style]}
      accessibilityIgnoresInvertColors
    />
  );
}
