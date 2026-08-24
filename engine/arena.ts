import { Vec2, clamp } from './math';
import { ARENA_OBSTACLES, WATER_ZONES } from './constants';

/**
 * Arena geometry helpers: obstacle collision and water-zone tests.
 *
 * These are pure functions of position + static arena layout (no GameState,
 * no randomness, no I/O), which keeps them trivially testable and free of
 * circular dependencies on the simulation core.
 */

/** True if a circle of `radius` at (x,y) overlaps any solid arena obstacle. */
export function isInArenaObstacle(x: number, y: number, radius = 0): boolean {
  for (const obstacle of ARENA_OBSTACLES) {
    const rx = obstacle.rx + radius;
    const ry = obstacle.ry + radius;
    const nx = (x - obstacle.x) / rx;
    const ny = (y - obstacle.y) / ry;
    if (nx * nx + ny * ny < 1) return true;
  }
  return false;
}

/** Push (x,y) out of any obstacle it overlaps, returning a resolved point. */
export function resolveArenaObstacleCollision(x: number, y: number, radius: number): Vec2 {
  let px = x;
  let py = y;
  for (let pass = 0; pass < 2; pass++) {
    for (const obstacle of ARENA_OBSTACLES) {
      const rx = obstacle.rx + radius;
      const ry = obstacle.ry + radius;
      const nx = (px - obstacle.x) / rx;
      const ny = (py - obstacle.y) / ry;
      const d2 = nx * nx + ny * ny;
      if (d2 >= 1) continue;
      if (d2 < 0.0001) {
        px = obstacle.x + rx;
        py = obstacle.y;
        continue;
      }
      const d = Math.sqrt(d2);
      px = obstacle.x + (nx / d) * rx;
      py = obstacle.y + (ny / d) * ry;
    }
  }
  return { x: px, y: py };
}

/**
 * Find an open (non-obstacle, in-bounds) point near (x,y), searching outward
 * in rings if the resolved point is still blocked. `arena` supplies the
 * playfield bounds to clamp against.
 */
export function findNearestOpenPoint(
  arena: { width: number; height: number },
  x: number,
  y: number,
  radius: number,
): Vec2 {
  let point = resolveArenaObstacleCollision(x, y, radius);
  point.x = clamp(point.x, radius, arena.width - radius);
  point.y = clamp(point.y, radius, arena.height - radius);
  if (!isInArenaObstacle(point.x, point.y, radius)) return point;
  for (let ring = 1; ring <= 4; ring++) {
    const step = 28 * ring;
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI * 2 * i) / 10;
      const candidate = resolveArenaObstacleCollision(
        clamp(x + Math.cos(a) * step, radius, arena.width - radius),
        clamp(y + Math.sin(a) * step, radius, arena.height - radius),
        radius,
      );
      candidate.x = clamp(candidate.x, radius, arena.width - radius);
      candidate.y = clamp(candidate.y, radius, arena.height - radius);
      if (!isInArenaObstacle(candidate.x, candidate.y, radius)) return candidate;
    }
  }
  return point;
}

/** True if (x,y) lies inside any water zone. */
export function isInWater(x: number, y: number): boolean {
  for (const zone of WATER_ZONES) {
    const dx = x - zone.x;
    const dy = y - zone.y;
    if (dx * dx + dy * dy <= zone.radius * zone.radius) return true;
  }
  return false;
}
