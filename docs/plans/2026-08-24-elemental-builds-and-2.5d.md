# Emoji Survivor — Elemental Builds + 2.5D Milestone Spec

> **For the coding agent:** This is the full design spec. Implement it in two phases, task-by-task, with a headless test per new system (see Verification). Typecheck (`npx tsc --noEmit`) and the Jest suite must stay green throughout. Commit after each task with conventional messages.

**Goal:** Make runs player-led and build-defined by adding an elemental affinity system as the build spine (fire / ice / lightning + a late pet/nature axis), then lift presentation from flat 2D to 2.5D-feeling depth layering + camera juice — without rebuilding the engine or adding meta-progression.

**Architecture:** All game logic lives in the pure `engine/` module (side-effect-free, `rng`-injectable, events drained by UI). All new systems go in `engine/` and stay pure. New element data is data-first (tags on existing defs), status effects reuse the existing `EnemyStatusEffect` machinery (`engine/GameEngine.ts:604`), and presentation changes are UI-layer only (`components/game/GameCanvas.tsx`).

**Tech Stack:** React Native + Expo SDK 54, TypeScript strict, pure TS engine, Jest (`jest-expo`) + headless engine tests, Yarn 4.

**Decisions locked by design review (Tobias, 2026-08-24):**
- Improve, **not rebuild**. Engine purity + testability are the asset.
- "Player-led" = **build-defining variety** (runs fork into identities), not just skill expression (manual aim already exists).
- **Mobile-first** (touch twin-stick), web (Vercel/itch) as the demo mirror.
- **2.5D presentation in-engine** — real 3D is a future rebuild trigger, not this milestone.
- Elements are the spine; pets are a real but **late** axis; **within-run only** (no meta-progression).

---

## Current System Map (ground truth)

| System | Where | Notes |
|---|---|---|
| Character defs | `engine/data.ts:3` | 3 chars, each with startWeapon + ability |
| Weapons + evolutions | `engine/data.ts:27-47` | 8 weapons, 8 evolved, `WeaponDef` has no element field |
| Items (stat stickers) | `engine/data.ts:97` | 9 items, all flat stats |
| Level-up options | `engine/GameEngine.ts:2020-2043` | Stat closures via `_levelUpApply`; pool + heal-if-low |
| Stat caps | `engine/GameEngine.ts:2047` | speedMult 2.5 / damageMult 5 / atkSpeed 3 / dodge 60 / crit 100 |
| Relics | `engine/GameEngine.ts:57-122`, offered at `RELIC_OFFER_WAVES = [5,10,15]` (line 50), applied `:2086` | 8 relics, flat mods with drawbacks |
| Status effects | `engine/GameEngine.ts:604-647` | burn/poison DoT ticks wired; freeze/stun checked in enemy update — **sources are under-fed, this is the opportunity** |
| Weapon fire | `engine/GameEngine.ts:910` (`fireWeapons`) | `dealDamage` (`:1052`) takes `sourceWeapon?: WeaponState` — element hooks attach here |
| Pet system | `engine/GameEngine.ts` + `types.ts:140` | snapper/spark/mender, perks, eggs |
| Combo | `engine/GameEngine.ts` (`comboEngine` relic) + HUD tiers | Exists, feels like a side mechanic |
| Camera/juice | `GameState.shake`, `hitStop` | Shake exists; no zoom/parallax |
| Rendering | `components/game/GameCanvas.tsx` (862 lines) | Flat draw order, no shadows, no parallax |
| Tests | `engine/__tests__/`, `__tests__/` | Headless multi-wave smoke sim exists (`setRng` deterministic) |

**Key structural note for the agent:** level-ups are currently stat closures over `PlayerState`. Elemental upgrades are *behavioral* (spread, pierce, ignite chance) — they cannot be expressed as `+N stat` closures. They need a first-class representation: an `ElementalUpgrade` with a `desc` and an id the engine's damage/fire pipeline can query, stored on `GameState` (e.g. `state.elementUpgrades: ElementalUpgradeId[]`), NOT hidden in `_levelUpApply`.

---

## Phase 1 — Elemental Build System

### 1.1 Element model

Three elements, mapping to existing status types:

| Element | Color | Status | Threshold identity |
|---|---|---|---|
| 🔥 Fire | `#EF4444` | burn (DoT) | Ignition — spread, explode |
| ❄️ Ice | `#60A5FA` | freeze (slow/root) | Chill — control, defense |
| ⚡ Lightning | `#FBBF24` | stun (chain) | Storm — multi-hit, chain |

(Poison stays as pet/nature status; not a spine element this milestone.)

**One interaction (the whole system's hook):** *Ignition* — a frozen/chilled enemy that takes fire damage burns at **2× burn rate** for the burn duration. One rule, teaches the entire element system in one screen.

### 1.2 Tags (data-first)

- `WeaponDef` and `EVOLVED_WEAPONS` get an `element: 'fire' | 'ice' | 'lightning' | 'none'` field.
- Re-tag existing weapons with identity over purity (fire: pistol, shotgun, crossbow → fire; ice: sword, claw, stick → ice; lightning: smg, lightning, stick-evolve → lightning, etc. — final assignment: agent proposes, keeps each weapon's evolved form in the same element).
- Level-up upgrades get element tags (see 1.3).
- New elemental relics get tags (see 1.4).
- **Threshold economy:** count element-tagged sources owned across weapons + upgrades + relics. Thresholds at **2** and **4** owned tags per element.

### 1.3 Elemental level-up upgrades (18 total, 6 per element)

Each must be **mechanical**, not `+%`. All live in a new `engine/elements.ts` data module. Each is a `LevelUpOption`-compatible entry with an id + tag + behavior; the engine queries ids in the fire/damage pipeline.

**Fire (6):** Ignite Chance+ (chance to burn on hit), Burn Spread (burn jumps to nearby enemy on kill), Ember Trail (moving leaves burn patches), Explosive Death (burned enemies explode on death), Flame Reach (+range on fire weapons), Cauterize (burning enemies deal less damage to you).

**Ice (6):** Chill Chance+, Deep Freeze (freeze lasts longer), Ice Armor (being hit freezes attackers), Shatter (frozen enemies take bonus damage from melee), Permafrost (freeze spreads on kill), Cold Snap (dash leaves a slow field).

**Lightning (6):** Chain +1, Zap Chance+ (stun on hit), Overcharge (crits chain a bolt), Storm Field (damage aura around player), Lightning Rod (struck enemies are marked, next hit on them crits), Static (kills refund ability cooldown).

(Exact numbers/rarities: agent's call, but each must read as a build-defining choice, and all must respect existing `STAT_CAPS` where they touch stats.)

### 1.4 Elemental relics (3 new, existing 8 untouched)

- 🔥 **Phoenix Ember** (fire): every kill ignites nearby enemies; drawback: -15 max HP.
- ❄️ **Glacial Core** (ice): dash freezes enemies you pass through; drawback: dash cooldown +20%.
- ⚡ **Storm Sigil** (lightning): your ability chains to 2 extra targets; drawback: abilities cost +25% cooldown.

Add to `RELIC_DEFS`, offered from the same waves 5/10/15 pool.

### 1.5 Pet axis (late in Phase 1 — only after 1.1–1.4 are done and tested)

- **Nature element** as the pet-support tag: 3 new pet-support level-up upgrades (e.g. Egg Chance+, Pet Damage+, Pet Attack Speed+ — each mechanical where possible, e.g. "eggs are more likely", "pets target the enemy you aim at").
- **1 new pet kind** (e.g. 🐢 Nature Turtle — slow, tanky, emits a damage-reduction aura; or 🦋 Swift — fast, applies poison). Agent proposes final kit, keeps it within the existing `PetCompanion` shape.
- **Nature affinity threshold** (2/4 tags) that scales all pets (e.g. +15%/+35% pet damage) — gives summoner builds a home without front-loading work.

### 1.6 Combo polish pass (bundled)

- Clearer feedback: combo tier name + progress on every kill milestone (existing tiers bronze→platinum), screen-edge flash at tier-up.
- Combo-driven reward: at tier-up, small heal or pickup burst (agent picks, must be visible and satisfying, must not trivialize).
- Keep `comboEngine` relic behavior intact.

---

## Phase 2 — 2.5D Presentation (UI layer only, `components/game/GameCanvas.tsx` + helpers)

No engine state changes beyond what already exists (`shake`, `hitStop`, `camera`).

1. **Ground shadow ellipses** — one semi-transparent ellipse under every entity (player, enemies, pets, pickups, nodes, bosses), offset by a few px, darker/smaller for small entities. Pure draw code.
2. **Y-sorted render order** — draw entities sorted by `y` (bottom = in front) so overlap reads as depth. Must not break particle/effect layering.
3. **Parallax background** — 2–3 layers: distant silhouette band (slow), mid rocks/coral (medium), foreground seaweed/debris (fast, may drift past camera). Drawn behind entities, cheap (no per-frame allocation churn).
4. **Camera juice (slice of c, skip per-crit FOV pulse):**
   - **Boss-wave zoom punch** — camera zooms in ~10% + existing shake as a boss spawns, eases back over ~1s.
   - **Dash/pulse camera kick** — tiny directional kick on player dash and squid pulse.

Explicitly **out**: per-crit FOV pulse (motion-sickness risk), full lighting/glow pass (mobile-perf risk, future milestone).

---

## Verification (acceptance bar: both)

1. **Automated:** a headless engine test per new system, following the existing pattern (`setRng`, pure engine drive):
   - Element thresholds: owning 2/4 tags of an element enables the threshold (assert via engine state/behavior).
   - Ignition interaction: frozen enemy hit by fire burns at 2× rate.
   - Elemental upgrade behavior: at least one per element asserted mechanically (e.g. chain +1, burn spread, deep freeze duration).
   - Pet axis: nature threshold scales pet damage; new pet spawns and acts.
   - Combo tier-up reward fires once per tier-up.
   - Full suite: `yarn test` green. Typecheck: `npx tsc --noEmit` green.
2. **Manual:** Tobias plays a full run on web (`npx expo start --web --port 8081`) and on device; confirms builds are readable ("this run is a fire build"), thresholds feel like real forks, ignition interaction reads, 2.5D layering reads on phone, no motion sickness from camera juice.

## Out of Scope (explicit)

- No meta-progression (account XP, unlocks, character mastery) — separate pillar, separate spec.
- No real 3D renderer / no new engine.
- No full lighting pass.
- Existing 8 relics, 9 items, 8 weapons keep their identity (retag only).
- No backend / no new dependencies without approval.

## Handoff

Branch: continue on the current worktree (`refactor/engine-purity-and-arena-module` or a fresh `feat/elemental-builds` off it — agent picks, keep commits clean). Do **not** merge or push without Tobias's review. Leave the public web deploy untouched until Phase 1 is playtested.
