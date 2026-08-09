import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { LoadingState, Text } from '@/components/ui';
import { getSurahs, type SurahRow } from '@/db/queries';
import { getMemorizedCounts } from '@/db/userdb';
import { useTheme } from '@/theme/ThemeContext';
import { radius, space } from '@/theme/tokens';

export default function MemorizeScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [surahs, setSurahs] = useState<SurahRow[] | null>(null);
  const [counts, setCounts] = useState<Record<number, number>>({});

  useEffect(() => {
    (async () => {
      const [s, c] = await Promise.all([getSurahs(), getMemorizedCounts()]);
      setSurahs(s);
      setCounts(c);
    })();
  }, []);

  if (!surahs) return <LoadingState label={t('common.loading')} />;

  const totalAyahs = surahs.reduce((acc, s) => acc + s.ayahs, 0);
  const totalMemorized = Object.values(counts).reduce((a, b) => a + b, 0);
  const pct = Math.round((totalMemorized / Math.max(1, totalAyahs)) * 100);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={[styles.header, { backgroundColor: colors.bgElevated, borderBottomColor: colors.hairline }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text variant="subheading" font="uiBold">{t('memorize.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.summary, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name="school" size={28} color={colors.primary} />
        <View style={{ flex: 1, marginLeft: space[3] }}>
          <Text variant="body" font="uiBold">{t('memorize.overall', { pct })}</Text>
          <Text variant="caption" color="secondary">{t('memorize.total', { n: totalMemorized, m: totalAyahs })}</Text>
        </View>
      </View>

      <FlatList showsVerticalScrollIndicator={false}
        data={surahs}
        keyExtractor={(s) => String(s.id)}
        numColumns={6}
        contentContainerStyle={{ padding: space[3], paddingBottom: insets.bottom + space[8] }}
        renderItem={({ item }) => {
          const done = counts[item.id] ?? 0;
          const complete = done === item.ayahs;
          const firstMissing = done === 0 ? 1 : Math.min(item.ayahs, done + 1);
          return (
            <Pressable
              onPress={() => router.push(`/quran/${item.id}?memorize=1&ayah=${firstMissing}`)}
              style={[
                styles.cell,
                {
                  borderColor: done > 0 ? colors.primary : colors.hairline,
                  backgroundColor: complete ? colors.primarySoft : colors.card,
                },
              ]}
            >
              {complete ? (
                <Ionicons name="checkmark" size={16} color={colors.primary} />
              ) : (
                <Text variant="micro" color={done > 0 ? 'primary' : 'secondary'}>{item.id}</Text>
              )}
            </Pressable>
          );
        }}
      />
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
  summary: { flexDirection: 'row', alignItems: 'center', margin: space[4], padding: space[4], borderRadius: radius.md },
  cell: {
    flex: 1,
    aspectRatio: 1,
    margin: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radius.sm,
  },
});
