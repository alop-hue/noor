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

export type WirdGoal = 'pages' | 'juz' | 'surahs';

export interface DailyWird {
  enabled: boolean;
  goal: WirdGoal;
  target: number;
  completed: number;
  lastDate: string;
  totalPages: number;
  streak: number;
  readSurahs: number[];
  readPages: number[];
  readJuz: number[];
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
  dailyWird: DailyWird;
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
  setDailyWird: (w: Partial<DailyWird>) => void;
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
      dailyWird: { enabled: false, goal: 'pages', target: 4, completed: 0, lastDate: '', totalPages: 0, streak: 0, readSurahs: [], readPages: [], readJuz: [] },
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
      setLastRead: (surah, ayah) => set((s) => {
        const today = new Date().toISOString().slice(0, 10);
        let dailyWird = s.dailyWird;
        if (dailyWird.enabled && dailyWird.lastDate === today) {
          const goal = dailyWird.goal;
          if (goal === 'surahs') {
            if (!dailyWird.readSurahs.includes(surah)) {
              dailyWird = { ...dailyWird, readSurahs: [...dailyWird.readSurahs, surah], completed: dailyWird.completed + 1 };
            }
          } else if (goal === 'pages') {
            const page = (surah - 1) * 10 + Math.ceil(ayah / 10);
            if (!dailyWird.readPages.includes(page)) {
              dailyWird = { ...dailyWird, readPages: [...dailyWird.readPages, page], completed: dailyWird.completed + 1 };
            }
          } else if (goal === 'juz') {
            const juz = Math.min(30, Math.ceil(surah / 4));
            if (!dailyWird.readJuz.includes(juz)) {
              dailyWird = { ...dailyWird, readJuz: [...dailyWird.readJuz, juz], completed: dailyWird.completed + 1 };
            }
          }
        } else if (dailyWird.enabled && dailyWird.lastDate !== today) {
          const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
          const streak = dailyWird.lastDate === yesterday ? dailyWird.streak + 1 : 1;
          dailyWird = { ...dailyWird, lastDate: today, completed: 0, readSurahs: [], readPages: [], readJuz: [], streak };
        }
        return { lastRead: { surah, ayah, timestamp: Date.now() }, dailyWird };
      }),
      setDailyWird: (w) => set((s) => ({ dailyWird: { ...s.dailyWird, ...w } })),
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
