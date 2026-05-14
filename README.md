# Emoji Survivor

Emoji Survivor is an arena survival roguelite built with Expo, React Native, and Expo Router. Pick a character, survive escalating waves, collect upgrades, discover relics, and push for a better run.

## Play the Web Beta

Play the latest public build here:

https://emoji-survivor-game.vercel.app

Direct game route smoke link:

https://emoji-survivor-game.vercel.app/game?characterId=crab&skinId=crab_classic&runId=public-smoke

## Leave Feedback

Use GitHub Issues so feedback is easy to track:

- Playtest feedback: https://github.com/tobiasmullett-svg/emoji-survivor-game/issues/new?template=playtest-feedback.yml
- Bug report: https://github.com/tobiasmullett-svg/emoji-survivor-game/issues/new?template=bug-report.yml
- Feature idea: https://github.com/tobiasmullett-svg/emoji-survivor-game/issues/new?template=feature-idea.yml
- All open feedback: https://github.com/tobiasmullett-svg/emoji-survivor-game/issues

The repository is private right now, so testers need GitHub access to open issues. If the repo becomes public, anyone with a GitHub account can use these links.

## What To Review

Useful playtest notes include:

- How long you played and which character you used.
- What felt fun, confusing, too easy, or unfair.
- Which upgrade or relic choices felt obvious, boring, or exciting.
- Whether performance felt smooth on your device.
- Any browser, screen size, or control issues.

## Suggest Code Fixes

Small fixes and experiments are welcome through pull requests. Please describe what changed, why it helps the game, and how you tested it. The pull request template will ask for those details.

## Local Development

Install dependencies:

```bash
corepack enable
yarn install --immutable
```

Run the web app:

```bash
npx expo start --web --port 8081
```

Run checks:

```bash
npx tsc --noEmit
yarn test
```

Build the static web export:

```bash
npx expo export --platform web
```

