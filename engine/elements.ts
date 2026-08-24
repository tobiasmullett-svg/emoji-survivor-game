import type { Element, ElementalUpgradeId, Rarity, RelicId, StatusEffectType } from './types';

/**
 * Elemental build data (spec §1.1-§1.2). Pure data only — no behavior.
 *
 * This module is the single home for element identity/display metadata, the
 * 18 behavioral upgrade definitions (spec §1.3) and the threshold economy
 * constants. Behavioral wiring (damage pipeline hooks, threshold activation)
 * lives in `GameEngine.ts`; keep this file side-effect-free and queryable.
 */

/** Display + identity metadata for the three spine elements (spec §1.1 table). */
export const ELEMENT_META: Record<
  Exclude<Element, 'none'>,
  {
    name: string;
    emoji: string;
    color: string;
    status: StatusEffectType;
    identity: string;
  }
> = {
  fire: { name: 'Fire', emoji: '🔥', color: '#EF4444', status: 'burn', identity: 'Ignition — spread, explode' },
  ice: { name: 'Ice', emoji: '❄️', color: '#60A5FA', status: 'freeze', identity: 'Chill — control, defense' },
  lightning: { name: 'Lightning', emoji: '⚡', color: '#FBBF24', status: 'stun', identity: 'Storm — multi-hit, chain' },
};

/** Spine elements in stable display order. */
export const ELEMENT_IDS = ['fire', 'ice', 'lightning'] as const;

/**
 * Threshold economy (spec §1.2): count element-tagged sources owned across
 * weapons + upgrades + relics; at these counts an element's threshold enables.
 */
export const ELEMENT_THRESHOLDS = [2, 4] as const;

/**
 * Damage bonus an element's threshold grants to damage dealt by that element:
 * +10% at 2 owned tags, +25% at 4 owned tags (spec §1.2, "your call, must be
 * real and testable"). 0/1 tags → no bonus.
 */
export function elementalThresholdMult(tags: number): number {
  if (tags >= 4) return 1.25;
  if (tags >= 2) return 1.1;
  return 1;
}

/** Shape of an elemental level-up upgrade (spec §1.3). */
export interface ElementalUpgradeDef {
  id: ElementalUpgradeId;
  element: Exclude<Element, 'none'>;
  name: string;
  emoji: string;
  desc: string;
  rarity: Rarity;
}

/**
 * The 18 behavioral elemental upgrades (spec §1.3), 6 per spine element.
 * Behavior is engine-queried by `id` via `state.elementUpgrades` in the
 * damage/status/fire pipelines — these are definitions + labels only.
 */
export const ELEMENTAL_UPGRADES: Record<ElementalUpgradeId, ElementalUpgradeDef> = {
  // Fire — Ignition: spread, explode
  igniteChancePlus: { id: 'igniteChancePlus', element: 'fire', name: 'Ignite Chance+', emoji: '🔥', desc: 'Fire weapon hits have +45% chance to burn.', rarity: 'common' },
  burnSpread: { id: 'burnSpread', element: 'fire', name: 'Burn Spread', emoji: '🌋', desc: 'Burning enemies ignite nearby enemies on death.', rarity: 'rare' },
  emberTrail: { id: 'emberTrail', element: 'fire', name: 'Ember Trail', emoji: '✨', desc: 'Moving leaves embers that burn nearby enemies.', rarity: 'uncommon' },
  explosiveDeath: { id: 'explosiveDeath', element: 'fire', name: 'Explosive Death', emoji: '💥', desc: 'Burning enemies explode on death, damaging nearby enemies.', rarity: 'rare' },
  flameReach: { id: 'flameReach', element: 'fire', name: 'Flame Reach', emoji: '🎯', desc: '+30% range on fire weapons.', rarity: 'uncommon' },
  cauterize: { id: 'cauterize', element: 'fire', name: 'Cauterize', emoji: '🛡️', desc: 'Burning enemies deal 20% less contact damage to you.', rarity: 'rare' },
  // Ice — Chill: control, defense
  chillChancePlus: { id: 'chillChancePlus', element: 'ice', name: 'Chill Chance+', emoji: '❄️', desc: 'Ice weapon hits have +35% chance to freeze.', rarity: 'common' },
  deepFreeze: { id: 'deepFreeze', element: 'ice', name: 'Deep Freeze', emoji: '🧊', desc: 'Freeze lasts 60% longer.', rarity: 'uncommon' },
  iceArmor: { id: 'iceArmor', element: 'ice', name: 'Ice Armor', emoji: '🛡️', desc: 'Being hit freezes the attacker.', rarity: 'rare' },
  shatter: { id: 'shatter', element: 'ice', name: 'Shatter', emoji: '🔨', desc: 'Frozen enemies take +50% damage from melee.', rarity: 'uncommon' },
  permafrost: { id: 'permafrost', element: 'ice', name: 'Permafrost', emoji: '🌨️', desc: 'Frozen enemies freeze nearby enemies on death.', rarity: 'rare' },
  coldSnap: { id: 'coldSnap', element: 'ice', name: 'Cold Snap', emoji: '💨', desc: 'Dash freezes enemies you pass through.', rarity: 'uncommon' },
  // Lightning — Storm: multi-hit, chain
  chainPlus: { id: 'chainPlus', element: 'lightning', name: 'Chain +1', emoji: '⚡', desc: 'Lightning chains to 1 extra target.', rarity: 'common' },
  zapChancePlus: { id: 'zapChancePlus', element: 'lightning', name: 'Zap Chance+', emoji: '🔌', desc: 'Lightning weapon hits have +35% chance to stun.', rarity: 'common' },
  overcharge: { id: 'overcharge', element: 'lightning', name: 'Overcharge', emoji: '🌩️', desc: 'Crits arc a bolt to a nearby enemy.', rarity: 'rare' },
  stormField: { id: 'stormField', element: 'lightning', name: 'Storm Field', emoji: '🌀', desc: 'A lightning aura periodically zaps enemies near you.', rarity: 'rare' },
  lightningRod: { id: 'lightningRod', element: 'lightning', name: 'Lightning Rod', emoji: '🗼', desc: 'Lightning-struck enemies are marked; the next hit on them crits.', rarity: 'rare' },
  static: { id: 'static', element: 'lightning', name: 'Static', emoji: '🔋', desc: 'Kills refund 2s of ability cooldown.', rarity: 'uncommon' },
};

/** Stable list of all 18 upgrade definitions (for the level-up pool). */
export const ELEMENTAL_UPGRADE_LIST: readonly ElementalUpgradeDef[] = ELEMENT_IDS.flatMap(el =>
  Object.values(ELEMENTAL_UPGRADES).filter(u => u.element === el),
);

/**
 * Element tag each of the 3 elemental relics contributes to the threshold
 * economy (spec §1.2/§1.4). The 8 legacy relics are untagged.
 */
export const ELEMENTAL_RELIC_ELEMENTS: Partial<Record<RelicId, Exclude<Element, 'none'>>> = {
  phoenixEmber: 'fire',
  glacialCore: 'ice',
  stormSigil: 'lightning',
};
