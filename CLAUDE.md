# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

> **Expo SDK 56.** APIs change between SDK versions — confirm against the versioned docs (https://docs.expo.dev/versions/v56.0.0/) before writing Expo/React Native code rather than relying on memory.

## Commands

```bash
npm install            # install dependencies
npm start              # expo start (dev server + QR/menu)
npm run android        # expo start --android
npm run ios            # expo start --ios
npm run web            # expo start --web
npm run lint           # expo lint
npm run reset-project  # moves starter code to app-example/, scaffolds a blank app/
```

There is no test runner configured. Type-check with `npx tsc --noEmit` (TypeScript is `strict`).

## Architecture

Universal Expo app targeting **iOS, Android, and web** from one codebase.

- **File-based routing** (`expo-router`). Routes live in `src/app/`; `_layout.tsx` is the root layout, and each other file (`index.tsx`, `explore.tsx`) is a screen. `typedRoutes` is on, so route hrefs are type-checked. `scheme` is `finance` for deep linking. Web builds output `static`.
- **Path aliases** (`tsconfig.json`): `@/*` → `src/*`, `@/assets/*` → `assets/*`. Use these in imports, not relative paths.
- **React Compiler is enabled** (`app.json` → `experiments.reactCompiler`). Do not hand-add `useMemo`/`useCallback`/`memo` for performance — the compiler handles memoization.

### Platform-specific files

The most important structural pattern: a module can have a `.web.tsx`/`.web.ts` sibling that Metro picks for web, falling back to the plain file on native. Native and web intentionally diverge here — **edit both when changing shared behavior**:

- `app-tabs.tsx` uses native tab bar (`expo-router/unstable-native-tabs`); `app-tabs.web.tsx` builds a custom top tab list with `expo-router/ui`.
- `use-color-scheme.ts` re-exports React Native's hook; `use-color-scheme.web.ts` adds a hydration guard so static web rendering doesn't flash the wrong theme.
- `animated-icon.tsx` (Reanimated) vs `animated-icon.web.tsx` / `.module.css`.

### Theming

Single source of truth is `src/constants/theme.ts`: `Colors` (light/dark), `Fonts` (per-platform), and the `Spacing` scale (`half`…`six`). Build UI from these primitives rather than hardcoded values.

- `useTheme()` (`src/hooks/use-theme.ts`) resolves the active color set, treating `'unspecified'` as light.
- `ThemedText` and `ThemedView` are the base UI atoms — they consume the theme and expose `type`/`themeColor` variants. Prefer them over raw `Text`/`View`.
