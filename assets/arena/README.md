# Arena ground assets (optional Path B)

The default arena uses **code-driven** visuals in `components/game/arena/ArenaBackground.tsx` (SVG + gradients). No bitmap is required.

To add a **baked ground plate** later:

1. Export a **2048×2048** (or **1024×1024**) top-down underwater/sand plate as **WebP** or PNG. Prefer **WebP** under ~800KB for mobile.
2. Place the file here, e.g. `ground-albedo.webp`.
3. In `ArenaBackground.tsx`, wrap or underlay an `Image` / `ImageBackground` from `expo-image` or `react-native` with `width`/`height` matching the arena (`ARENA_W` / `ARENA_H` from `engine/constants.ts`), `resizeMode="cover"`.
4. Keep **gameplay water detection** unchanged: it uses `WATER_ZONES` in `engine/constants.ts` only. Align painted water in the texture with those circles, or leave the texture neutral and keep the SVG water layers.

**Licensing:** If the texture is AI-generated, from a stock site, or third-party, add a `LICENSE` or `CREDITS.txt` next to the file stating terms. CC0/public-domain textures are safest for distribution.
