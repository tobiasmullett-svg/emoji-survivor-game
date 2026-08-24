import { WEAPONS, EVOLVED_WEAPONS, WEAPON_IDS } from '../data';
import { ELEMENT_META, ELEMENT_IDS, ELEMENT_THRESHOLDS } from '../elements';

const VALID_ELEMENTS = ['fire', 'ice', 'lightning', 'none'];

describe('elemental weapon tags (spec §1.2)', () => {
  it('tags every base weapon with a valid element', () => {
    for (const id of WEAPON_IDS) {
      expect(VALID_ELEMENTS).toContain(WEAPONS[id].element);
    }
  });

  it('keeps every evolved weapon in the same element as its base', () => {
    for (const id of WEAPON_IDS) {
      expect(EVOLVED_WEAPONS[id].element).toBe(WEAPONS[id].element);
    }
  });

  it('tags both the base and evolved weapon sets completely (8 + 8)', () => {
    expect(Object.keys(WEAPONS)).toHaveLength(8);
    expect(Object.keys(EVOLVED_WEAPONS)).toHaveLength(8);
    for (const id of WEAPON_IDS) {
      expect(EVOLVED_WEAPONS[id]).toBeDefined();
    }
  });
});

describe('element data module (spec §1.1)', () => {
  it('defines display metadata for all three spine elements', () => {
    expect(ELEMENT_IDS).toEqual(['fire', 'ice', 'lightning']);
    for (const el of ELEMENT_IDS) {
      const meta = ELEMENT_META[el];
      expect(meta.name).toBeTruthy();
      expect(meta.emoji).toBeTruthy();
      expect(meta.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(['burn', 'freeze', 'stun']).toContain(meta.status);
    }
  });

  it('exposes the 2/4 threshold economy', () => {
    expect(ELEMENT_THRESHOLDS).toEqual([2, 4]);
  });
});
