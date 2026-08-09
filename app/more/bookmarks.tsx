import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { EmptyState, LoadingState, Segmented, Text } from '@/components/ui';
import { getAyah, getHadithByBook, getSurah, type HadithRow } from '@/db/queries';
import { getAyahBookmarks, getHadithBookmarks } from '@/db/userdb';
import { useTheme } from '@/theme/ThemeContext';
import { radius, space } from '@/theme/tokens';

type Tab = 'ayah' | 'hadith';

export default function BookmarksScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('ayah');
  const [ayahs, setAyahs] = useState<{ surah: number; ayah: number; juz: number; surahName: string }[] | null>(null);
  const [hadiths, setHadiths] = useState<(HadithRow & { bookTitle: string })[] | null>(null);

  const load = async () => {
    const ayahBm = await getAyahBookmarks();
    const rows = await Promise.all(
      ayahBm.map(async (b) => {
        const [ayah, s] = await Promise.all([getAyah(b.surah, b.ayah), getSurah(b.surah)]);
        return { surah: b.surah, ayah: b.ayah, juz: ayah?.juz ?? 0, surahName: s?.english_name ?? '' };
      }),
    );
    setAyahs(rows);

    const hBm = await getHadithBookmarks();
    const hRows = await Promise.all(
      hBm.map(async (b) => {
        const list = await getHadithByBook(b.book_slug, 5000);
        return list.find((h) => h.id === b.hadith_id) ?? null;
      }),
    );
    setHadiths(
      hRows
        .filter((h): h is HadithRow => h !== null)
        .map((h) => ({ ...h, bookTitle: h.book_slug })),
    );
  };

  useEffect(() => {
    load();
  }, [tab]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={[styles.header, { backgroundColor: colors.bgElevated, borderBottomColor: colors.hairline }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text variant="subheading" font="uiBold">{t('quran.inBookmarks')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={{ padding: space[4] }}>
        <Segmented<Tab>
          options={[
            { value: 'ayah', label: t('quran.title') },
            { value: 'hadith', label: t('hadith.title') },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>

      {tab === 'ayah' ? (
        !ayahs ? (
          <LoadingState />
        ) : ayahs.length === 0 ? (
          <EmptyState title={t('quran.noResults')} />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + space[8] }} >
            {ayahs.map((a) => (
              <Pressable
                key={`${a.surah}:${a.ayah}`}
                onPress={() => router.push(`/quran/${a.surah}?ayah=${a.ayah}`)}
                style={({ pressed }) => [styles.row, { borderBottomColor: colors.hairline }, pressed && { backgroundColor: colors.bgSunken }]}
              >
                <View style={[styles.num, { borderColor: colors.hairlineStrong }]}>
                  <Text variant="micro" font="uiBold">{a.ayah}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="body" font="uiBold">{a.surahName}</Text>
                  <Text variant="caption" color="secondary">{t('quran.juzShort', { n: a.juz })}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </Pressable>
            ))}
          </ScrollView>
        )
      ) : !hadiths ? (
        <LoadingState />
      ) : hadiths.length === 0 ? (
        <EmptyState title={t('hadith.noResults')} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + space[8] }} >
          {hadiths.map((h) => (
            <Pressable
              key={h.id}
              onPress={() => router.push(`/hadith/${h.book_slug}?hadith=${h.id}`)}
              style={({ pressed }) => [styles.row, { borderBottomColor: colors.hairline }, pressed && { backgroundColor: colors.bgSunken }]}
            >
              <View style={{ flex: 1 }}>
                <Text variant="caption" font="uiBold" color="primary">{h.bookTitle} {h.number > 0 ? `· ${h.number}` : ''}</Text>
                <Text variant="bodySmall" color="secondary" numberOfLines={2} style={{ marginTop: 2 }}>
                  {h.english || h.arabic}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </Pressable>
          ))}
        </ScrollView>
      )}
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
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3], paddingHorizontal: space[4], borderBottomWidth: StyleSheet.hairlineWidth * 2 },
  num: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
