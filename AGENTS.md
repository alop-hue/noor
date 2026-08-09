# Noor — project conventions

## Expo SDK 57 — APIs HAVE CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

Key differences from older SDKs used in this codebase:
- `expo-file-system`: use the new API (`File`, `Directory`, `Paths`, `File.open()`/`FileHandle.writeBytes`, `.uri`, `.exists`). The legacy `expo-file-system/legacy` import is used ONLY for `createDownloadResumable` (audio downloads).
- `expo-sqlite`: `openDatabaseAsync(name, options?, directory?)`; directory may be `Paths.document.uri`. The default export of `expo-sqlite/kv-store` is an AsyncStorage-compatible API (`getItemAsync` etc.) used by zustand persist.
- `expo-audio`: `createAudioPlayer()`, `playbackStatusUpdate` listener, `replace({ uri })`, `seekTo(seconds)`, `setPlaybackRate`.
- `expo-notifications`: scheduling uses `SchedulableTriggerInputTypes.DAILY`; `channelId` goes INSIDE the trigger on Android (`NotificationRequestInput` has no `channelId` field).

## Commands

```bash
npx tsc --noEmit -p tsconfig.json   # typecheck — MUST pass before finishing any change
npm test                            # jest-expo unit tests
npx expo export --platform android  # validates metro bundling + gzip asset packing
```

## Conventions

- **i18n**: every user-facing string goes through `t()`. `src/i18n/locales/en.ts` is the source of truth (`export type Translation = typeof en`); all 6 other locales MUST have identical key trees (the `locales.test.ts` parity test enforces this). Add new keys to all 7 files.
- **Data**: bundled content lives in `assets/data/` (Quran DB is gzip — `.gz` is registered in `metro.config.js` assetExts; never put large data in `src/`). User content (bookmarks, notes, memorized verses) goes to `noor-user.db` via `src/db/userdb.ts`.
- **State**: app settings via zustand + `expo-sqlite/kv-store` persist (`src/store/settings.ts`). Select fields, not the whole store, to avoid re-renders.
- **UI**: use the kit in `src/components/ui` (Text variants, Button, Toggle, Segmented, ListRow). Colors come from `useTheme()`; spacing/radius from `src/theme/tokens`. No hardcoded hex colors in screens.
- **Routing**: file-based under `app/`; typed routes are enabled — prefer typed `router.push('/route')`. Register new routes in the Stack in `app/_layout.tsx` where presentation matters.
- **Audio**: the player is a module singleton in `src/services/audio.ts`; subscribe via `subscribeToPlayer`. Add playback features there, not in screens.
- **Never** commit tokens, keys, or credentials.

## Pitfalls

- An empty `src/app/` directory makes expo-router silently ignore `app/` (it prefers `src/app`). Don't create it.
- The bundled DB inflates to `documentDirectory/quran.db`; re-unpacks when `PRAGMA user_version` changes (bump `DB_VERSION` in `src/db/database.ts` when the schema in `scripts/build-data.mjs` changes).
- Prayer times test args: `computePrayerTimes(method, lat, lng, date)` — method first.
