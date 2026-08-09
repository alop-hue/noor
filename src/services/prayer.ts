import { CalculationMethod, Coordinates, HighLatitudeRule, PrayerTimes, Qibla } from 'adhan';

import type { PrayerName } from '../store/settings';

export const PRAYER_NAMES: PrayerName[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

export const METHOD_KEYS = [
  'MuslimWorldLeague',
  'Egyptian',
  'Karachi',
  'UmmAlQura',
  'Dubai',
  'Qatar',
  'Kuwait',
  'Singapore',
  'Tehran',
  'Turkey',
  'ISNA',
] as const;

export function getMethod(key: string) {
  const map: Record<string, () => ReturnType<typeof CalculationMethod.MuslimWorldLeague>> = {
    MuslimWorldLeague: CalculationMethod.MuslimWorldLeague,
    Egyptian: CalculationMethod.Egyptian,
    Karachi: CalculationMethod.Karachi,
    UmmAlQura: CalculationMethod.UmmAlQura,
    Dubai: CalculationMethod.Dubai,
    Qatar: CalculationMethod.Qatar,
    Kuwait: CalculationMethod.Kuwait,
    Singapore: CalculationMethod.Singapore,
    Tehran: CalculationMethod.Tehran,
    Turkey: CalculationMethod.Turkey,
    ISNA: CalculationMethod.NorthAmerica,
  };
  return map[key] ?? CalculationMethod.MuslimWorldLeague;
}

export interface PrayerTimesResult {
  times: Record<PrayerName, Date>;
  next: { name: PrayerName; date: Date } | null;
  remainingMs: number | null;
}

export function computePrayerTimes(
  methodKey: string,
  lat: number,
  lng: number,
  date: Date,
): PrayerTimes {
  const params = getMethod(methodKey)();
  params.highLatitudeRule = HighLatitudeRule.TwilightAngle;
  return new PrayerTimes(new Coordinates(lat, lng), date, params);
}

export function toTimesMap(times: PrayerTimes): Record<PrayerName, Date> {
  return {
    fajr: times.fajr,
    sunrise: times.sunrise,
    dhuhr: times.dhuhr,
    asr: times.asr,
    maghrib: times.maghrib,
    isha: times.isha,
  };
}

export function getTimesForDate(
  methodKey: string,
  lat: number,
  lng: number,
  date: Date,
): PrayerTimesResult {
  const times = toTimesMap(computePrayerTimes(methodKey, lat, lng, date));
  const now = new Date();
  for (const name of PRAYER_NAMES) {
    if (times[name].getTime() > now.getTime()) {
      return {
        times,
        next: { name, date: times[name] },
        remainingMs: times[name].getTime() - now.getTime(),
      };
    }
  }
  const tomorrow = computePrayerTimes(methodKey, lat, lng, new Date(date.getTime() + 86400000));
  const fajr = tomorrow.fajr;
  return { times, next: { name: 'fajr', date: fajr }, remainingMs: fajr.getTime() - now.getTime() };
}

export function qiblaDirection(lat: number, lng: number): number {
  return Qibla(new Coordinates(lat, lng));
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}

export function formatTime(d: Date, withSeconds = false): string {
  return d.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    ...(withSeconds ? { second: '2-digit' } : {}),
  });
}

const HIJRI_LOCALE_MAP: Record<string, string> = {
  ar: 'ar-SA-u-ca-islamic',
  tr: 'tr-TR-u-ca-islamic',
  id: 'id-ID-u-ca-islamic',
  ur: 'ur-PK-u-ca-islamic',
  fr: 'fr-FR-u-ca-islamic',
  de: 'de-DE-u-ca-islamic',
  en: 'en-US-u-ca-islamic',
};

export function hijriParts(date: Date, lang: string): { day: number; month: number; year: number } {
  try {
    const locale = HIJRI_LOCALE_MAP[lang] ?? 'en-US-u-ca-islamic';
    const parts = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'numeric', year: 'numeric', numberingSystem: 'latn' }).formatToParts(date);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? NaN);
    if (Number.isNaN(get('month')) || Number.isNaN(get('day'))) {
      return hijriPartsFallback(date, lang);
    }
    return { day: get('day'), month: get('month') - 1, year: get('year') };
  } catch {
    return hijriPartsFallback(date, lang);
  }
}

function toLatinDigits(s: string): string {
  return s
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
}

function hijriPartsFallback(date: Date, lang: string): { day: number; month: number; year: number } {
  try {
    const locale = HIJRI_LOCALE_MAP[lang] ?? 'en-US-u-ca-islamic';
    const parts = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(date);
    const get = (t: string) => Number(toLatinDigits(parts.find((p) => p.type === t)?.value ?? ''));
    return { day: get('day'), month: get('month') - 1, year: get('year') };
  } catch {
    return { day: NaN, month: NaN, year: NaN };
  }
}

export function hijriDate(date: Date, lang: string): { day: string; month: string; year: string; full: string } {
  try {
    const locale = HIJRI_LOCALE_MAP[lang] ?? 'en-US-u-ca-islamic';
    const day = new Intl.DateTimeFormat(locale, { day: 'numeric' }).format(date);
    const month = new Intl.DateTimeFormat(locale, { month: 'long' }).format(date);
    const year = new Intl.DateTimeFormat(locale, { year: 'numeric' }).format(date);
    return { day, month, year, full: `${day} ${month} ${year}` };
  } catch {
    return { day: '', month: '', year: '', full: '' };
  }
}

export function hijriMonthGrid(year: number, month: number, lang: string): (Date | null)[][] {
  const locale = HIJRI_LOCALE_MAP[lang] ?? 'en-US-u-ca-islamic';
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = first.getDay();
  const weeks: (Date | null)[][] = [];
  let week: (Date | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(new Date(year, month, d));
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  void locale;
  return weeks;
}

export const ISLAMIC_EVENTS: { month: number; day: number; label: { en: string; ar: string } }[] = [
  { month: 0, day: 1, label: { en: 'Islamic New Year', ar: 'رأس السنة الهجرية' } },
  { month: 0, day: 10, label: { en: 'Ashura', ar: 'عاشوراء' } },
  { month: 2, day: 12, label: { en: "Mawlid an-Nabi", ar: 'المولد النبوي' } },
  { month: 6, day: 27, label: { en: "Laylat al-Mi'raj", ar: 'ليلة الإسراء والمعراج' } },
  { month: 7, day: 15, label: { en: "Nisf Sha'ban", ar: 'ليلة النصف من شعبان' } },
  { month: 8, day: 1, label: { en: 'Ramadan begins', ar: 'بداية شهر رمضان' } },
  { month: 8, day: 27, label: { en: 'Laylat al-Qadr', ar: 'ليلة القدر' } },
  { month: 9, day: 1, label: { en: 'Eid al-Fitr', ar: 'عيد الفطر' } },
  { month: 11, day: 9, label: { en: 'Day of Arafah', ar: 'يوم عرفة' } },
  { month: 11, day: 10, label: { en: 'Eid al-Adha', ar: 'عيد الأضحى' } },
  { month: 11, day: 11, label: { en: 'Days of Tashreeq', ar: 'أيام التشريق' } },
];

export function eventLabel(e: { month: number; day: number; label: { en: string; ar: string } }, lang: string): string {
  return lang.startsWith('ar') ? e.label.ar : e.label.en;
}
