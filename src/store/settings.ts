import AsyncStorage from 'expo-sqlite/kv-store';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemePreference = 'system' | 'light' | 'dark' | 'amoled';
export type AppLang = 'en' | 'ar' | 'tr' | 'id' | 'ur' | 'fr' | 'de';

export type PrayerName = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
export type AdhanSound = 'default' | 'makkah' | 'hejaz' | 'ajam' | 'fajr' | 'alafasy' | 'alafasy_hd' | 'silent' | 'custom';

export interface PrayerNotifyPref {
  enabled: boolean;
  sound: AdhanSound;
  offsetMin: number;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface PrayerSettings {
  method: string;
  coords: Coordinates | null;
  city: string;
  country: string;
  notificationsEnabled: boolean;
  snoozeMin: number;
  notify: Record<PrayerName, PrayerNotifyPref>;
  offsets: Record<PrayerName, number>;
}

export interface PlayerSettings {
  reciterId: string;
  speed: number;
  repeat: 'off' | 'surah' | 'verse';
  gapless: boolean;
  memorizeRepeat: number;
}

export interface LastRead {
  surah: number;
  ayah: number;
  timestamp: number;
}

export const DEFAULT_METHOD = 'MuslimWorldLeague';

export const LANG_EDITIONS: Record<string, string> = {
  en: 'eng-muhammadtaqiudd',
  tr: 'tur-alibulac',
  id: 'ind-kingfahdcomplex',
  fr: 'fra-muhammadhamidul',
  de: 'deu-aburidamuhammad',
  ur: 'urd-ahmedali',
};

const defaultNotify = (): Record<PrayerName, PrayerNotifyPref> => ({
  fajr: { enabled: true, sound: 'default', offsetMin: 0 },
  sunrise: { enabled: false, sound: 'default', offsetMin: 0 },
  dhuhr: { enabled: true, sound: 'default', offsetMin: 0 },
  asr: { enabled: true, sound: 'default', offsetMin: 0 },
  maghrib: { enabled: true, sound: 'default', offsetMin: 0 },
  isha: { enabled: true, sound: 'default', offsetMin: 0 },
});

interface SettingsState {
  theme: ThemePreference;
  language: AppLang | null;
  defaultTranslation: string;
  tajweed: boolean;
  wordByWord: boolean;
  showTranslation: boolean;
  prayer: PrayerSettings;
  audio: PlayerSettings;
  downloads: Record<string, number>;
  tasbihTarget: number;
  tasbihDhikr: string;
  lastRead: LastRead | null;
  onBoarded: boolean;
  setTheme: (t: ThemePreference) => void;
  setLanguage: (l: AppLang) => void;
  setDefaultTranslation: (edition: string) => void;
  setTajweed: (v: boolean) => void;
  setWordByWord: (v: boolean) => void;
  setShowTranslation: (v: boolean) => void;
  setPrayer: (p: Partial<PrayerSettings>) => void;
  setNotifyPref: (name: PrayerName, pref: Partial<PrayerNotifyPref>) => void;
  setAudio: (a: Partial<PlayerSettings>) => void;
  setDownloadProgress: (surah: number, pct: number | null) => void;
  clearDownloads: () => void;
  setTasbihTarget: (n: number) => void;
  setTasbihDhikr: (s: string) => void;
  setLastRead: (surah: number, ayah: number) => void;
  setOnBoarded: (v: boolean) => void;
  reset: () => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      language: null,
      defaultTranslation: 'eng-muhammadtaqiudd',
      tajweed: true,
      wordByWord: false,
      showTranslation: true,
      prayer: {
        method: DEFAULT_METHOD,
        coords: null,
        city: '',
        country: '',
        notificationsEnabled: true,
        snoozeMin: 0,
        notify: defaultNotify(),
        offsets: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
      },
      audio: { reciterId: 'mishary_alafasy', speed: 1, repeat: 'off', gapless: true, memorizeRepeat: 3 },
      downloads: {},
      tasbihTarget: 33,
      tasbihDhikr: 'سُبْحَانَ الله',
      lastRead: null,
      onBoarded: false,
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) =>
        set((s) => ({
          language,
          defaultTranslation: LANG_EDITIONS[language] ?? s.defaultTranslation,
          showTranslation: language !== 'ar',
        })),
      setDefaultTranslation: (defaultTranslation) => set({ defaultTranslation }),
      setTajweed: (tajweed) => set({ tajweed }),
      setWordByWord: (wordByWord) => set({ wordByWord }),
      setShowTranslation: (showTranslation) => set({ showTranslation }),
      setPrayer: (p) => set((s) => ({ prayer: { ...s.prayer, ...p } })),
      setNotifyPref: (name, pref) =>
        set((s) => ({
          prayer: { ...s.prayer, notify: { ...s.prayer.notify, [name]: { ...s.prayer.notify[name], ...pref } } },
        })),
      setAudio: (a) => set((s) => ({ audio: { ...s.audio, ...a } })),
      setDownloadProgress: (surah, pct) =>
        set((s) => {
          const downloads = { ...s.downloads };
          if (pct === null || pct >= 100) delete downloads[String(surah)];
          else downloads[String(surah)] = pct;
          return { downloads };
        }),
      clearDownloads: () => set({ downloads: {} }),
      setTasbihTarget: (tasbihTarget) => set({ tasbihTarget }),
      setTasbihDhikr: (tasbihDhikr) => set({ tasbihDhikr }),
      setLastRead: (surah, ayah) => set({ lastRead: { surah, ayah, timestamp: Date.now() } }),
      setOnBoarded: (onBoarded) => set({ onBoarded }),
      reset: () => set({}),
    }),
    {
      name: 'noor-settings-v1',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    },
  ),
);
