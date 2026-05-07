# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Emoji Survivor is a React Native + Expo (SDK 54) arena survival game targeting iOS, Android, and Web. It is a single-product repo (not a monorepo). There is no backend, database, or external service — the app is entirely client-side with AsyncStorage for persistence.

### Package manager

This project uses **Yarn 4 (Berry)** via corepack. The `packageManager` field in `package.json` is `yarn@4.13.0`. The update script handles `corepack enable` and `corepack prepare` automatically.

### Running the dev server

```
npx expo start --web --port 8081
```

This starts Metro Bundler and serves the web version at `http://localhost:8081`. The initial web bundle takes ~4 seconds. In Cloud Agent VMs, use the `--web` flag since there is no iOS/Android simulator available.

### Type checking

```
npx tsc --noEmit
```

No lint script is configured in `package.json`; TypeScript strict-mode checking is the primary static analysis tool.

### Testing

Jest is configured via `jest-expo` in devDependencies, but no test files currently exist in the codebase.

### Key directories

- `app/` — Expo Router screens (main menu, character select, game, high scores, progression)
- `engine/` — Pure TypeScript game engine (state, loop, math, data, achievements)
- `components/` — React Native UI components (canvas, HUD, joystick, overlays)
- `services/` — Audio (Web Audio synth) and storage (AsyncStorage wrapper)
