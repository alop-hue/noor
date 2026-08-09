import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { EmptyState, Text } from '@/components/ui';
import { searchQuran, searchHadith, type SearchResult, type HadithRow } from '@/db/queries';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeContext';
import { radius, space } from '@/theme/tokens';

export default function QuranSearch() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ kind?: string }>();
  const kind = params.kind === 'hadith' ? 'hadith' : 'quran';
  const [query, setQuery] = useState('');
  const [quranResults, setQuranResults] = useState<SearchResult[] | null>(null);
  const [hadithResults, setHadithResults] = useState<HadithRow[] | null>(null);
  const { defaultTranslation } = useSettings();

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setQuranResults(null);
      setHadithResults(null);
      return;
    }
    const h = setTimeout(async () => {
      if (kind === 'hadith') {
        setHadithResults(await searchHadith(q));
      } else {
        setQuranResults(await searchQuran(q, defaultTranslation));
      }
    }, 300);
    return () => clearTimeout(h);
  }, [query, kind, defaultTranslation]);

  const loading = kind === 'quran' ? quranResults === null : hadithResults === null;
  const empty =
    kind === 'quran' ? (quranResults?.length ?? 0) === 0 : (hadithResults?.length ?? 0) === 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={[styles.header, { backgroundColor: colors.bgElevated, borderBottomColor: colors.hairline }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
        <TextInput
          autoFocus
          value={query}
          onChangeText={setQuery}
          placeholder={kind === 'hadith' ? t('hadith.searchHint') : t('quran.searchHint')}
          placeholderTextColor={colors.placeholder}
          style={[styles.input, { color: colors.text, backgroundColor: colors.bgSunken }]}
        />
      </View>
      {loading || query.trim().length < 2 ? (
        <EmptyState
          title={kind === 'hadith' ? t('hadith.search') : t('quran.search')}
          hint={kind === 'hadith' ? t('hadith.searchHint') : t('quran.searchHint')}
        />
      ) : empty ? (
        <EmptyState
          title={kind === 'hadith' ? t('hadith.noResults') : t('quran.noResults')}
          hint={kind === 'hadith' ? t('hadith.noResultsHint') : t('quran.noResultsHint')}
        />
      ) : kind === 'hadith' ? (
        <FlatList showsVerticalScrollIndicator={false}
          data={hadithResults}
          keyExtractor={(r) => String(r.id)}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + space[8] }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/hadith/${item.book_slug}?hadith=${item.id}`)}
              style={({ pressed }) => [styles.row, { borderBottomColor: colors.hairline }, pressed && { backgroundColor: colors.bgSunken }]}
            >
              <Text variant="bodySmall" font="arabicBold" style={{ color: colors.quranText, textAlign: 'right' }}>
                {item.arabic}
              </Text>
              <Text variant="bodySmall" color="secondary" numberOfLines={2} style={{ marginTop: space[1] }}>
                {item.english}
              </Text>
              <View style={styles.rowMeta}>
                <Text variant="micro" font="uiBold" color="primary">
                  {item.book_slug} {item.number > 0 ? `· ${item.number}` : ''}
                </Text>
                {item.grade ? <Text variant="micro" color="tertiary">{item.grade}</Text> : null}
              </View>
            </Pressable>
          )}
        />
      ) : (
        <FlatList showsVerticalScrollIndicator={false}
          data={quranResults}
          keyExtractor={(r) => `${r.surah}:${r.ayah}:${r.matchedIn}`}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + space[8] }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/quran/${item.surah}?ayah=${item.ayah}`)}
              style={({ pressed }) => [styles.row, { borderBottomColor: colors.hairline }, pressed && { backgroundColor: colors.bgSunken }]}
            >
              <Text variant="bodySmall" font="arabicBold" style={{ color: colors.quranText, textAlign: 'right' }}>
                {item.arabic}
              </Text>
              <Text variant="bodySmall" color="secondary" numberOfLines={2} style={{ marginTop: space[1] }}>
                {item.text}
              </Text>
              <View style={styles.rowMeta}>
                <Text variant="micro" font="uiBold" color="primary">
                  {item.surah}:{item.ayah}
                </Text>
                {item.matchedIn === 'arabic' && (
                  <Text variant="micro" color="tertiary">
                    {t('quran.search')}
                  </Text>
                )}
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
  input: { flex: 1, paddingHorizontal: space[3], paddingVertical: space[2], borderRadius: radius.pill, fontSize: 15 },
  row: { paddingHorizontal: space[4], paddingVertical: space[3], borderBottomWidth: StyleSheet.hairlineWidth * 2 },
  rowMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space[2] },
});
