import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button, Segmented, Surface, Text } from '@/components/ui';
import { useSettings, type WirdGoal } from '@/store/settings';
import { useTheme } from '@/theme/ThemeContext';
import { fontStack, radius, space } from '@/theme/tokens';

const GOAL_OPTIONS: { value: WirdGoal; label: string; desc: string }[] = [
  { value: 'pages', label: 'pages', desc: '4 pages/day = 30 days' },
  { value: 'juz', label: 'juz', desc: '1 juz/day = 30 days' },
  { value: 'surahs', label: 'surahs', desc: '4 surahs/day' },
];

export default function WirdScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dailyWird, setDailyWird } = useSettings();
  const rtl = i18n.language.startsWith('ar');

  const today = new Date().toISOString().slice(0, 10);
  const isToday = dailyWird.lastDate === today;

  const progress = useMemo(() => {
    if (!dailyWird.enabled || dailyWird.target === 0) return 0;
    return Math.min(1, dailyWird.completed / dailyWird.target);
  }, [dailyWird.enabled, dailyWird.completed, dailyWird.target]);

  const progressPct = Math.round(progress * 100);

  const handleStart = () => {
    setDailyWird({ enabled: true, completed: 0, lastDate: today });
    router.push('/quran/1');
  };

  const handleReset = () => {
    setDailyWird({ enabled: false, completed: 0, lastDate: '' });
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + space[5], paddingBottom: insets.bottom + space[8] }}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text variant="title" font="uiBold">
          {t('wird.title')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {dailyWird.enabled && (
        <Surface style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View>
              <Text variant="caption" color="secondary" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                {t('wird.todayProgress')}
              </Text>
              <Text variant="display" font="uiBold" color="primary" style={{ marginTop: 4 }}>
                {dailyWird.completed} / {dailyWird.target}
              </Text>
            </View>
            <View style={styles.streakBadge}>
              <Ionicons name="flame" size={20} color={colors.accent} />
              <Text variant="title" font="uiBold" color="accent">
                {dailyWird.streak}
              </Text>
            </View>
          </View>

          <View style={[styles.progressBar, { backgroundColor: colors.bgSunken }]}>
            <View style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: colors.primary }]} />
          </View>

          <Text variant="caption" color="tertiary" style={{ marginTop: space[2] }}>
            {progressPct}% {t('wird.completed')}
          </Text>
        </Surface>
      )}

      <Text variant="caption" font="uiBold" color="tertiary" style={styles.section}>
        {t('wird.setGoal')}
      </Text>

      {GOAL_OPTIONS.map((opt) => (
        <Pressable
          key={opt.value}
          onPress={() => setDailyWird({ goal: opt.value, completed: 0, lastDate: '' })}
          style={({ pressed }) => [
            styles.goalRow,
            { backgroundColor: colors.card, borderBottomColor: colors.hairline },
            dailyWird.goal === opt.value && { backgroundColor: colors.primarySoft, borderColor: colors.primary },
            pressed && { opacity: 0.7 },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text variant="body" font="uiBold" color={dailyWird.goal === opt.value ? 'primary' : 'text'}>
              {t(`wird.goals.${opt.value}`)}
            </Text>
            <Text variant="caption" color="secondary">{opt.desc}</Text>
          </View>
          {dailyWird.goal === opt.value && (
            <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
          )}
        </Pressable>
      ))}

      <Text variant="caption" font="uiBold" color="tertiary" style={styles.section}>
        {t('wird.dailyTarget')}
      </Text>

      <View style={styles.targetRow}>
        {[
          { value: 2, label: '2' },
          { value: 4, label: '4' },
          { value: 8, label: '8' },
          { value: 20, label: '20' },
        ].map((opt) => (
          <Pressable
            key={opt.value}
            onPress={() => setDailyWird({ target: opt.value, completed: 0, lastDate: '' })}
            style={({ pressed }) => [
              styles.targetChip,
              {
                borderColor: dailyWird.target === opt.value ? colors.primary : colors.hairline,
                backgroundColor: dailyWird.target === opt.value ? colors.primarySoft : colors.card,
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text variant="body" font="uiBold" color={dailyWird.target === opt.value ? 'primary' : 'text'}>
              {opt.label}
            </Text>
            <Text variant="micro" color="tertiary">
              {dailyWird.goal === 'pages' ? t('wird.pages') : dailyWird.goal === 'juz' ? t('wird.juz') : t('wird.surahsShort')}
            </Text>
          </Pressable>
        ))}
      </View>

      <Surface style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={20} color={colors.accent} />
        <Text variant="bodySmall" color="secondary" style={{ flex: 1, marginLeft: space[2] }}>
          {t('wird.info')}
        </Text>
      </Surface>

      <View style={styles.actions}>
        {dailyWird.enabled ? (
          <>
            <Button title={t('wird.continueReading')} onPress={() => router.push('/quran/1')} style={{ flex: 1 }} />
            <Button title={t('wird.reset')} variant="secondary" onPress={handleReset} />
          </>
        ) : (
          <Button title={t('wird.startWird')} onPress={handleStart} style={{ flex: 1 }} />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[4],
    paddingBottom: space[4],
  },
  progressCard: { marginHorizontal: space[4] },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: space[3],
    paddingVertical: space[1],
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,165,0,0.12)',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginTop: space[4],
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  section: {
    marginTop: space[6],
    marginBottom: space[2],
    marginHorizontal: space[4],
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
  targetRow: {
    flexDirection: 'row',
    gap: space[3],
    paddingHorizontal: space[4],
  },
  targetChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: space[3],
    borderWidth: 1,
    borderRadius: radius.md,
    gap: 2,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: space[4],
    marginTop: space[6],
  },
  actions: {
    flexDirection: 'row',
    gap: space[3],
    paddingHorizontal: space[4],
    marginTop: space[6],
  },
});
