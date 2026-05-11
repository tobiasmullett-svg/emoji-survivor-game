# Arena ground (hybrid)

## `ground-albedo.jpg`

Orthographic top-down sea-floor **hero plate** used as the base layer in [`components/game/arena/ArenaBackground.tsx`](../../components/game/arena/ArenaBackground.tsx).

- **Source:** Fal.ai — **Flux 2 Pro** (user-generated, May 2026). Terms are those of your Fal / model provider account.
- **Gameplay:** Water and oxygen still follow **`WATER_ZONES`** in `engine/constants.ts` only. SVG water rings are drawn on top of this texture.

To replace the plate: overwrite `ground-albedo.jpg` (or add `ground-albedo.webp` and update the `require()` path in `ArenaBackground.tsx`). Prefer keeping **1:1** aspect and **≥1024** width/height so `resizeMode="cover"` stays sharp on a 2000×2000 arena.
