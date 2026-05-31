import {
  isInArenaObstacle,
  resolveArenaObstacleCollision,
  findNearestOpenPoint,
  isInWater,
} from '../arena';
import { ARENA_OBSTACLES, WATER_ZONES, ARENA_W, ARENA_H } from '../constants';

const ARENA = { width: ARENA_W, height: ARENA_H };

describe('isInArenaObstacle', () => {
  it('detects a point at the centre of an obstacle', () => {
    const o = ARENA_OBSTACLES[0];
    expect(isInArenaObstacle(o.x, o.y)).toBe(true);
  });

  it('returns false for empty space', () => {
    // Arena origin corner is clear of every obstacle in the layout.
    expect(isInArenaObstacle(10, 10)).toBe(false);
  });

  it('treats radius as inflating the obstacle', () => {
    // Use the isolated obstacle (others overlap their neighbours) so the
    // assertion is about radius inflation alone.
    const o = ARENA_OBSTACLES[7];
    // A point just outside the bare ellipse on the +x axis...
    const justOutside = o.x + o.rx + 5;
    expect(isInArenaObstacle(justOutside, o.y, 0)).toBe(false);
    // ...is inside once the mover's radius is accounted for.
    expect(isInArenaObstacle(justOutside, o.y, 20)).toBe(true);
  });
});

describe('resolveArenaObstacleCollision', () => {
  it('pushes a point out to the obstacle boundary', () => {
    // Isolated obstacle: the 2-pass resolver only guarantees a clear result
    // when obstacles don't overlap one another.
    const o = ARENA_OBSTACLES[7];
    const resolved = resolveArenaObstacleCollision(o.x, o.y, 10);
    expect(isInArenaObstacle(resolved.x, resolved.y, 10)).toBe(false);
  });

  it('leaves clear points untouched', () => {
    const resolved = resolveArenaObstacleCollision(50, 50, 10);
    expect(resolved).toEqual({ x: 50, y: 50 });
  });
});

describe('findNearestOpenPoint', () => {
  it('returns an in-bounds, obstacle-free point when starting inside an obstacle', () => {
    const o = ARENA_OBSTACLES[1];
    const p = findNearestOpenPoint(ARENA, o.x, o.y, 16);
    expect(isInArenaObstacle(p.x, p.y, 16)).toBe(false);
    expect(p.x).toBeGreaterThanOrEqual(16);
    expect(p.x).toBeLessThanOrEqual(ARENA_W - 16);
    expect(p.y).toBeGreaterThanOrEqual(16);
    expect(p.y).toBeLessThanOrEqual(ARENA_H - 16);
  });
});

describe('isInWater', () => {
  it('detects the centre of a water zone', () => {
    const z = WATER_ZONES[0];
    expect(isInWater(z.x, z.y)).toBe(true);
  });

  it('returns false just outside a zone and true just inside', () => {
    const z = WATER_ZONES[0];
    expect(isInWater(z.x + z.radius + 5, z.y)).toBe(false);
    expect(isInWater(z.x + z.radius - 5, z.y)).toBe(true);
  });
});
