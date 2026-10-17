import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Text, LoadingState } from '@/components/ui';
import { MushafReader, type MushafVerse } from '@/components/quran/MushafReader';
import { getByJuz, getByPage, getSurah, type AyahRow } from '@/db/queries';
import { arabicSurahName } from '@/features/quran/surahNames';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeContext';
import { space } from '@/theme/tokens';

export default function IndexReader() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ kind: string; n: string }>();
  const kind = params.kind === 'juz' ? 'juz' : 'page';
  const n = Number(params.n);

  if (kind === 'page') {
    return <PageMushaf n={n} />;
  }
  return <JuzList n={n} />;
}

/** Real mushaf page (cross-surah), rendered with the classic page reader. */
function PageMushaf({ n }: { n: number }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tajweed } = useSettings();
  const [verses, setVerses] = useState<MushafVerse[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await getByPage(n);
      const nameCache = new Map<number, string>();
      const mapped: MushafVerse[] = [];
      for (const r of rows) {
        if (!nameCache.has(r.surah)) {
          const s = await getSurah(r.surah);
          nameCache.set(r.surah, s ? arabicSurahName(r.surah) : '');
        }
        mapped.push({
          ayah: r.ayah,
          arabic: r.arabic,
          page: r.page || n,
          sajda: r.sajda,
          surah: r.surah,
          surahName: nameCache.get(r.surah) ?? '',
        });
      }
      if (!cancelled) setVerses(mapped);
    })();
    return () => {
      cancelled = true;
    };
  }, [n]);

  const firstSurah = verses?.[0]?.surah ?? 1;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={[styles.header, { backgroundColor: colors.bgElevated, borderBottomColor: colors.hairline }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text variant="subheading" font="uiBold">
          {`${t('quran.page')} ${n}`}
        </Text>
        <View style={{ width: 24 }} />
      </View>
      {!verses ? (
        <LoadingState />
      ) : (
        <MushafReader
          surahId={firstSurah}
          surahName={verses[0]?.surahName ?? ''}
          verses={verses}
          showBismillah
          activeAyah={null}
          tajweed={tajweed}
          onPressAyah={(ayah) => {
            const surah = verses.find((v) => v.ayah === ayah)?.surah ?? firstSurah;
            router.push(`/quran/${surah}?ayah=${ayah}`);
          }}
          onPageChange={() => {}}
        />
      )}
      <View style={{ height: insets.bottom }} />
    </View>
  );
}

/** Juz reading list (a juz spans many pages, so a vertical list fits best). */
function JuzList({ n }: { n: number }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [verses, setVerses] = useState<(AyahRow & { surahName: string })[] | null>(null);
  const { showTranslation } = useSettings();

  useEffect(() => {
    (async () => {
      const rows = await getByJuz(n);
      const names = new Map<number, string>();
      for (const r of rows) {
        if (!names.has(r.surah)) {
          const s = await getSurah(r.surah);
          names.set(r.surah, s?.english_name ?? '');
        }
      }
      setVerses(rows.map((r) => ({ ...r, surahName: names.get(r.surah) ?? '' })));
    })();
  }, [n]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={[styles.header, { backgroundColor: colors.bgElevated, borderBottomColor: colors.hairline }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text variant="subheading" font="uiBold">
          {t('quran.juzShort', { n })}
        </Text>
        <View style={{ width: 24 }} />
      </View>
      {!verses ? (
        <LoadingState />
      ) : (
        <FlatList showsVerticalScrollIndicator={false}
          data={verses}
          keyExtractor={(v) => `${v.surah}:${v.ayah}`}
          contentContainerStyle={{ paddingBottom: insets.bottom + space[8] }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/quran/${item.surah}?ayah=${item.ayah}`)}
              style={({ pressed }) => [styles.verse, { borderBottomColor: colors.hairline }, pressed && { backgroundColor: colors.bgSunken }]}
            >
              <Text variant="quranCompact" font="arabicBold" style={{ color: colors.quranText, textAlign: 'right' }}>
                {item.arabic}
              </Text>
              <View style={styles.meta}>
                <View style={[styles.num, { borderColor: colors.hairlineStrong }]}>
                  <Text variant="micro" font="uiBold">
                    {item.ayah}
                  </Text>
                </View>
                <Text variant="caption" color="secondary">
                  {item.surahName}
                </Text>
              </View>
              {showTranslation && (
                <TranslationLine surah={item.surah} ayah={item.ayah} />
              )}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

function TranslationLine({ surah, ayah }: { surah: number; ayah: number }) {
  const { defaultTranslation } = useSettings();
  const [text, setText] = useState<string>('');
  useEffect(() => {
    import('@/db/queries').then(async ({ getTranslations }) => {
      const rows = await getTranslations(surah, ayah, [defaultTranslation]);
      setText(rows[0]?.text ?? '');
    });
  }, [surah, ayah, defaultTranslation]);
  if (!text) return null;
  return (
    <Text variant="bodySmall" color="secondary" style={{ marginTop: space[2] }}>
      {text}
    </Text>
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
  verse: { paddingHorizontal: space[5], paddingVertical: space[4], borderBottomWidth: StyleSheet.hairlineWidth * 2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginTop: space[2] },
  num: { borderWidth: 1, borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
});
