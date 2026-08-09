# Noor — Quran & Prayer

Offline-first Quran companion built with **Expo SDK 57** (React Native, expo-router, TypeScript). Works fully offline for scripture; audio streams or downloads on demand.

## Features

- **Quran** — 114 surahs, juz/page browsing, Uthmani Hafs text, 9 translations, 3 tafsir sources (Ibn Kathir, As-Sa'di, Jalalayn), tajweed coloring, word-by-word, verse sheet (bookmark / note / copy / share), full-text search
- **Memorization mode** — verse-repeat audio (×1/×3/×5/×10), tap-to-hide self-testing, per-verse memorized tracking, per-surah progress grid
- **Audio** — 12 reciters (Alafasy, Al-Dosari, Al-Muaiqly, Al-Ghamdi, Al-Shuraim, Basit, Husary, Minshawi, …), background playback, sleep timer, playback speed, gapless surahs, offline downloads
- **Hadith** — 9 books (Bukhari, Muslim, Nasa'i, Abu Dawud, Tirmidhi, Ibn Majah, Muwatta Malik, Riyad as-Salihin, Nawawi 40), search, bookmarks, share
- **Prayer times** — 11 calculation methods (adhan lib), GPS or manual coordinates, qibla direction
- **Notifications** — per-prayer reminders, athan sounds (Makkah/Hejaz/Ajam/Fajr), offsets, exact-alarm flow on Android, reboot-safe
- **Tools** — Qibla compass, Tasbih counter, Dhikr lists, Hijri calendar + Islamic events, mosque finder (Overpass)
- **i18n** — 7 languages: English, العربية, Türkçe, Bahasa Indonesia, اردو, Français, Deutsch (full RTL support)

## Getting started

```bash
npm install
npx expo start          # dev server (Expo Go / dev client)
npx expo run:android    # native build
```

Data lives in `assets/data/` (bundled gzip SQLite DB, reciter list, adhkar, athan sounds). On first launch the app unpacks `quran.db.gz` into the document directory and gates the UI until ready.

## Verification

```bash
npx tsc --noEmit -p tsconfig.json   # typecheck
npm test                            # unit tests (jest-expo)
npx expo export --platform android  # validates bundling + assets
```

CI (`.github/workflows/ci.yml`) runs typecheck, tests, and an Android export on every push.

## Architecture

```
app/                  expo-router screens (file-based routes)
src/i18n/             i18next: 7 locales, en.ts is the source of truth for keys
src/theme/            design tokens (colors, spacing, typography) + ThemeProvider
src/db/               quran.db (bundled, read-only) + noor-user.db (bookmarks/notes/memorized)
src/store/            zustand persisted settings (expo-sqlite kv-store)
src/services/         prayer times, notifications, audio player + downloads
src/features/         tajweed colorizer
scripts/build-data.mjs  regenerates assets/data/quran.db.gz from sources
```

## Data sources

Quran text & translations: Tanzil / quran-api. Tafsir: public JSON archives. Hadith: HadithsJSONFormat archive. Recitations: mp3quran.net. Adhan: archive.org. App code: MIT.

## Privacy

No accounts, no analytics, no network required for scripture. All user data is local; export or delete it from More → About.
