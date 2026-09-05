import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

import { Surface, Text } from '@/components/ui';
import { getSurah } from '@/db/queries';
import { formatCountdown, formatTime, getTimesForDate, hijriDate } from '@/services/prayer';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeContext';
import { fontStack, radius, space, type } from '@/theme/tokens';
import { useTranslation } from 'react-i18next';

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const h = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(h);
  }, [intervalMs]);
  return now;
}

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { prayer, lastRead, defaultTranslation } = useSettings();
  const setPrayer = useSettings((s) => s.setPrayer);
  const [surahName, setSurahName] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (prayer.coords || locating) return;
    (async () => {
      setLocating(true);
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.granted) {
          const loc = await Location.getCurrentPositionAsync({});
          setPrayer({ coords: { lat: loc.coords.latitude, lng: loc.coords.longitude } });
        }
      } catch {
        // location unavailable — fall back to Makkah times
      }
      setLocating(false);
    })();
  }, [prayer.coords, locating, setPrayer]);

  const coords = prayer.coords ?? { lat: 21.4225, lng: 39.8262 };
  const now = useNow(1000);
  const result = useMemo(() => getTimesForDate(prayer.method, coords.lat, coords.lng, new Date(now)), [prayer.method, coords.lat, coords.lng, now]);
  const countdown = result.next ? formatCountdown(result.next.date.getTime() - now) : null;
  const hijri = useMemo(() => hijriDate(new Date(), i18n.language), [i18n.language]);
  const timezoneLabel = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    } catch {
      return '';
    }
  }, []);

  useEffect(() => {
    if (lastRead) getSurah(lastRead.surah).then((s) => setSurahName(s?.english_name ?? null));
  }, [lastRead]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('home.greetingMorning') : hour < 18 ? t('home.greetingAfternoon') : t('home.greetingEvening');
  void defaultTranslation;

  const quickTools = [
    { icon: 'compass-outline', label: t('tools.qibla'), route: '/tools/qibla' },
    { icon: 'repeat-outline', label: t('tools.tasbih'), route: '/tools/tasbih' },
    { icon: 'sparkles-outline', label: t('tools.dhikr'), route: '/tools/dhikr' },
    { icon: 'calendar-outline', label: t('tools.calendar'), route: '/tools/calendar' },
  ] as const;

  return (
    <ScrollView showsVerticalScrollIndicator={false}
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + space[5], paddingBottom: insets.bottom + space[8] }}
     >
      <View style={styles.header}>
        <View>
          <Text variant="caption" color="secondary" font="uiBold" style={{ letterSpacing: 1, textTransform: 'uppercase' }}>
            {greeting}
          </Text>
          <Text variant="display" font="uiBold">
            Noor
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text variant="body" font="arabic">
            {hijri.full || ''}
          </Text>
        </View>
      </View>

      {coords && result.next && (
        <Surface style={styles.nextPrayer}>
          <View style={styles.nextRow}>
            <View>
              <Text variant="caption" color="secondary" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                {t('home.nextPrayer')}
              </Text>
              <Text variant="title" font="uiBold" style={{ marginTop: 2 }}>
                {t(`prayer.${result.next.name}`)}
              </Text>
              <Text variant="heading" font="uiBold" color="primary" style={{ marginTop: 4, fontVariant: ['tabular-nums'] }}>
                {formatTime(result.next.date, true)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text variant="body" color="secondary">
                {t('home.countdown')}
              </Text>
              <Text variant="display" font="uiBold" color="accent" style={{ fontVariant: ['tabular-nums'] }}>
                {countdown}
              </Text>
            </View>
          </View>
          <View style={[styles.dayTimes, { borderTopColor: colors.hairline }]}>
            {Object.entries(result.times).map(([name, date]) => (
              <View key={name} style={styles.dayTimeItem}>
                <Text variant="caption" color="secondary">
                  {t(`prayer.${name}`)}
                </Text>
                <Text variant="bodySmall" font="uiBold">
                  {formatTime(date)}
                </Text>
              </View>
            ))}
          </View>
          {timezoneLabel ? (
            <Text variant="micro" color="tertiary" style={{ textAlign: 'center', marginTop: space[3] }}>
              {t('home.timezone', { tz: timezoneLabel })}
            </Text>
          ) : null}
          {!prayer.coords ? (
            <Text variant="micro" color="tertiary" style={{ textAlign: 'center', marginTop: 2 }}>
              {t('home.meccaFallback')}
            </Text>
          ) : null}
        </Surface>
      )}

      {lastRead && surahName && (
        <Pressable
          onPress={() => router.push(`/quran/${lastRead.surah}?ayah=${lastRead.ayah}`)}
          style={({ pressed }) => [styles.lastRead, { backgroundColor: colors.primarySoft, borderColor: colors.hairline }, pressed && { opacity: 0.8 }]}
        >
          <Ionicons name="bookmark" size={20} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text variant="bodySmall" font="uiBold" color="primary">
              {t('home.continueReading')}
            </Text>
            <Text variant="body" font="uiBold">
              {t('home.surah', { surah: surahName })} · {t('quran.verseNumber')} {lastRead.ayah}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </Pressable>
      )}

      <Text variant="caption" font="uiBold" color="tertiary" style={styles.section}>
        {t('home.quickTools')}
      </Text>
      <View style={styles.toolsGrid}>
        {quickTools.map((tool) => (
          <Pressable
            key={tool.route}
            onPress={() => router.push(tool.route)}
            style={({ pressed }) => [
              styles.toolCard,
              { backgroundColor: colors.card, borderColor: colors.hairline },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons name={tool.icon} size={24} color={colors.primary} />
            <Text variant="bodySmall" font="uiBold" style={{ marginTop: space[2] }}>
              {tool.label}
            </Text>
          </Pressable>
        ))}
        <Pressable
          onPress={() => router.push('/tools/wird')}
          style={({ pressed }) => [
            styles.toolCard,
            { backgroundColor: colors.card, borderColor: colors.hairline },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Ionicons name="today-outline" size={24} color={colors.primary} />
          <Text variant="bodySmall" font="uiBold" style={{ marginTop: space[2] }}>
            {t('wird.title')}
          </Text>
        </Pressable>
      </View>

      <Text variant="caption" font="uiBold" color="tertiary" style={styles.section}>
        {t('home.today')}
      </Text>
      <Surface hairline={false} style={{ marginHorizontal: space[4], marginTop: space[2] }}>
        <View style={styles.todayRow}>
          <Ionicons name="moon" size={18} color={colors.accent} />
          <Text variant="body" font="arabic" style={{ flex: 1, textAlign: 'right' }}>
            {new Date().toLocaleDateString(i18n.language === 'ar' || i18n.language === 'ur' ? 'ar' : i18n.language, {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        </View>
      </Surface>

      <View style={{ height: space[2] }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space[5],
    paddingBottom: space[5],
  },
  nextPrayer: { marginHorizontal: space[4] },
  nextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayTimes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: space[5],
    paddingTop: space[4],
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
  dayTimeItem: { alignItems: 'center', gap: 2 },
  lastRead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    marginHorizontal: space[4],
    marginTop: space[4],
    padding: space[4],
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radius.md,
  },
  section: {
    marginTop: space[6],
    marginBottom: space[2],
    marginHorizontal: space[4],
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[3],
    paddingHorizontal: space[4],
  },
  toolCard: {
    width: '47%',
    flexGrow: 1,
    padding: space[4],
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radius.md,
  },
  todayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },
});
