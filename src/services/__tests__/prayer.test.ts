import { computePrayerTimes, formatTime, getTimesForDate, qiblaDirection, toTimesMap } from '../prayer';

describe('computePrayerTimes', () => {
  const lat = 24.7136;
  const lng = 46.6753;

  it('returns ordered prayer times for Riyadh', () => {
    const times = computePrayerTimes('MuslimWorldLeague', lat, lng, new Date(2026, 5, 15));
    const map = toTimesMap(times);
    const names = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
    const dates = names.map((n) => map[n].getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i]).toBeGreaterThan(dates[i - 1]);
    }
  });

  it('supports all listed methods without throwing', () => {
    for (const m of ['MuslimWorldLeague', 'Egyptian', 'Karachi', 'UmmAlQura', 'Dubai', 'Qatar', 'Kuwait', 'Singapore', 'Tehran', 'Turkey', 'ISNA'] as const) {
      expect(() => computePrayerTimes(m, lat, lng, new Date(2026, 0, 1))).not.toThrow();
    }
  });
});

describe('getTimesForDate', () => {
  it('returns today times in local date format', () => {
    const { times } = getTimesForDate('MuslimWorldLeague', 24.7, 46.6, new Date(2026, 2, 10));
    expect(Object.keys(times)).toEqual(['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha']);
    const names = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
    for (const k of names) {
      expect(formatTime(times[k])).toMatch(/^\d{1,2}:\d{2}(\s?[AP]M)?$/);
    }
  });
});

describe('qiblaDirection', () => {
  it('points to Makkah from Riyadh (~229deg) and from Istanbul (~151deg)', () => {
    expect(Math.round(qiblaDirection(24.7, 46.6))).toBeGreaterThan(200);
    expect(Math.round(qiblaDirection(24.7, 46.6))).toBeLessThan(250);
    expect(Math.round(qiblaDirection(41.0, 28.9))).toBeGreaterThan(130);
    expect(Math.round(qiblaDirection(41.0, 28.9))).toBeLessThan(170);
  });
});
