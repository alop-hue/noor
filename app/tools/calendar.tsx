import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/ui';
import { hijriMonthGrid, hijriDate, hijriParts, ISLAMIC_EVENTS, eventLabel } from '@/services/prayer';
import { useTheme } from '@/theme/ThemeContext';
import { radius, space } from '@/theme/tokens';

export default function CalendarScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());

  const weekdays = useMemo(() => {
    const base = new Date(2026, 0, 5);
    const locale = i18n.language === 'ar' ? 'ar' : i18n.language;
    return Array.from({ length: 7 }, (_, i) =>
      new Date(base.getTime() + i * 86400000).toLocaleDateString(locale, { weekday: 'short' }),
    );
  }, [i18n.language]);

  const grid = useMemo(() => hijriMonthGrid(year, month, i18n.language), [year, month, i18n.language]);
  const monthHijri = useMemo(() => hijriDate(new Date(year, month, 15), i18n.language), [year, month, i18n.language]);

  const partsByDay = useMemo(() => {
    const map = new Map<string, { m: number; d: number }>();
    for (const week of grid) {
      for (const day of week) {
        if (!day) continue;
        const p = hijriParts(day, i18n.language);
        map.set(day.toDateString(), { m: p.month, d: p.day });
      }
    }
    return map;
  }, [grid, i18n.language]);

  const eventsByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of ISLAMIC_EVENTS) map.set(`${e.month}-${e.day}`, eventLabel(e, i18n.language));
    return map;
  }, [i18n.language]);

  const todayKey = useMemo(() => {
    const p = hijriParts(new Date(), i18n.language);
    return Number.isNaN(p.month) ? null : `${p.month}-${p.day}`;
  }, [i18n.language]);
  const todayEvents = todayKey ? (eventsByKey.get(todayKey) ? [eventsByKey.get(todayKey)!] : []) : [];

  const monthEvents = useMemo(() => {
    const found = new Map<string, { key: string; date: Date; label: string }>();
    for (const week of grid) {
      for (const day of week) {
        if (!day) continue;
        const p = partsByDay.get(day.toDateString());
        if (!p) continue;
        const key = `${p.m}-${p.d}`;
        const label = eventsByKey.get(key);
        if (label) found.set(key, { key, date: day, label });
      }
    }
    return [...found.values()].sort((a, b) => a.key.localeCompare(b.key));
  }, [grid, partsByDay, eventsByKey]);

  const shift = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setMonth(m);
    setYear(y);
  };

  const isCurrentMonth = year === new Date().getFullYear() && month === new Date().getMonth();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={[styles.header, { backgroundColor: colors.bgElevated, borderBottomColor: colors.hairline }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text variant="subheading" font="uiBold">{t('tools.calendar')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + space[8] }}>
      <View style={styles.monthNav}>
        <Pressable onPress={() => shift(-1)} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.textSecondary} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text variant="subheading" font="uiBold">
            {new Date(year, month, 1).toLocaleDateString(i18n.language === 'ar' ? 'ar' : i18n.language, { month: 'long', year: 'numeric' })}
          </Text>
          <Text variant="caption" font="arabicBold" color="primary">
            {monthHijri.month} {monthHijri.year}
          </Text>
        </View>
        <Pressable onPress={() => shift(1)} hitSlop={8}>
          <Ionicons name="chevron-forward" size={22} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {weekdays.map((d) => (
          <Text key={d} variant="micro" color="tertiary" style={styles.weekCell}>{d}</Text>
        ))}
      </View>

      {grid.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((d, di) => {
            const isToday = d && d.toDateString() === new Date().toDateString();
            const p = d ? partsByDay.get(d.toDateString()) : undefined;
            const hasEvent = p ? eventsByKey.has(`${p.m}-${p.d}`) : false;
            return (
              <View key={di} style={[styles.dayCell, isToday && { backgroundColor: colors.primarySoft, borderRadius: radius.sm }]}>
                {d ? (
                  <>
                    <Text variant="bodySmall" font={isToday ? 'uiBold' : 'ui'} color={isToday ? 'primary' : 'text'}>
                      {d.getDate()}
                    </Text>
                    {hasEvent ? (
                      <View style={[styles.eventDot, { backgroundColor: isToday ? colors.accent : colors.primary }]} />
                    ) : (
                      <View style={styles.eventDotSpacer} />
                    )}
                  </>
                ) : null}
              </View>
            );
          })}
        </View>
      ))}

      {isCurrentMonth ? (
        <View style={[styles.todayBanner, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
          <Ionicons name="today" size={16} color={colors.primary} />
          <Text variant="bodySmall" color="secondary" style={{ flex: 1 }}>
            {todayEvents.length > 0 ? todayEvents[0] : t('calendar.noEventToday')}
          </Text>
          <Text variant="caption" font="uiBold" color="primary">
            {t('calendar.today')}
          </Text>
        </View>
      ) : null}

      <Text variant="caption" font="uiBold" color="tertiary" style={styles.section}>
        {t('calendar.events')}
      </Text>
      {monthEvents.length === 0 ? (
        <Text variant="bodySmall" color="tertiary" style={{ paddingHorizontal: space[4] }}>
          {t('calendar.noEvents')}
        </Text>
      ) : (
        monthEvents.map((e) => (
          <View key={e.key} style={[styles.eventRow, { borderBottomColor: colors.hairline }]}>
            <Ionicons name="star-outline" size={16} color={colors.accent} />
            <Text variant="bodySmall" style={{ flex: 1 }}>{e.label}</Text>
            <Text variant="caption" color="secondary">
              {e.date.toLocaleDateString(i18n.language === 'ar' ? 'ar' : i18n.language, { day: 'numeric', month: 'short' })}
            </Text>
          </View>
        ))
      )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[3],
    paddingVertical: space[3],
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[5], paddingVertical: space[4] },
  weekRow: { flexDirection: 'row', paddingHorizontal: space[3] },
  weekCell: { flex: 1, textAlign: 'center', paddingVertical: space[2] },
  dayCell: { flex: 1, alignItems: 'center', paddingVertical: space[2] },
  section: { marginTop: space[6], marginBottom: space[2], marginHorizontal: space[4], textTransform: 'uppercase', letterSpacing: 1 },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingVertical: space[3], paddingHorizontal: space[4], borderBottomWidth: StyleSheet.hairlineWidth * 2 },
  eventDot: { width: 6, height: 6, borderRadius: 3, marginTop: 2 },
  eventDotSpacer: { width: 6, height: 8 },
  todayBanner: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginHorizontal: space[4], marginTop: space[3], padding: space[3], borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: radius.md },
});
