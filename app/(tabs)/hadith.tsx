import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { LoadingState, Text } from '@/components/ui';
import { countHadithByBook, getHadithBooks, type HadithBookRow } from '@/db/queries';
import { isRtl } from '@/i18n';
import { useTheme } from '@/theme/ThemeContext';
import { radius, space } from '@/theme/tokens';

type BookWithCount = HadithBookRow & { count: number };

export default function HadithTab() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [books, setBooks] = useState<BookWithCount[] | null>(null);
  const [shaikh, setShaikh] = useState('all');

  useEffect(() => {
    (async () => {
      const rows = await getHadithBooks();
      const withCounts = await Promise.all(
        rows.map(async (b) => ({ ...b, count: await countHadithByBook(b.slug) })),
      );
      setBooks(withCounts);
    })();
  }, []);

  const rtl = isRtl(i18n.language);
  const shaikhs = useMemo(() => {
    const names: string[] = [];
    for (const b of books ?? []) {
      const n = rtl && b.author_arabic ? b.author_arabic : b.author;
      if (!names.includes(n)) names.push(n);
    }
    return names;
  }, [books, rtl]);

  const authorKey = (b: BookWithCount) => (rtl && b.author_arabic ? b.author_arabic : b.author);

  const visible = useMemo(
    () => (shaikh === 'all' ? books : books?.filter((b) => authorKey(b) === shaikh) ?? null),
    [books, shaikh, rtl],
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={styles.topBar}>
        <Text variant="title" font="uiBold">
          {t('hadith.title')}
        </Text>
        <Pressable
          onPress={() => router.push('/quran/search?kind=hadith')}
          style={({ pressed }) => [
            styles.searchBtn,
            { backgroundColor: colors.bgSunken, borderColor: colors.hairline },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Ionicons name="search" size={16} color={colors.textSecondary} />
          <Text variant="bodySmall" color="secondary">
            {t('hadith.search')}
          </Text>
        </Pressable>
      </View>
      {!books ? (
        <LoadingState />
      ) : (
        <FlatList showsVerticalScrollIndicator={false}
          data={visible ?? []}
          keyExtractor={(b) => b.slug}
          contentContainerStyle={{ paddingBottom: insets.bottom + space[8] }}
          ListHeaderComponent={
            <ScrollView showsVerticalScrollIndicator={false}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
             >
              <Pressable
                onPress={() => setShaikh('all')}
                style={[
                  styles.chip,
                  { borderColor: shaikh === 'all' ? colors.primary : colors.hairline, backgroundColor: shaikh === 'all' ? colors.primarySoft : colors.card },
                ]}
              >
                <Text variant="micro" font="uiBold" color={shaikh === 'all' ? 'primary' : 'secondary'}>
                  {t('hadith.allShaikhs')}
                </Text>
              </Pressable>
              {shaikhs.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setShaikh(s)}
                  style={[
                    styles.chip,
                    { borderColor: shaikh === s ? colors.primary : colors.hairline, backgroundColor: shaikh === s ? colors.primarySoft : colors.card },
                  ]}
                >
                  <Text variant="micro" font="uiBold" color={shaikh === s ? 'primary' : 'secondary'}>
                    {s}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/hadith/${item.slug}`)}
              style={({ pressed }) => [
                styles.row,
                { borderBottomColor: colors.hairline },
                pressed && { backgroundColor: colors.bgSunken },
              ]}
            >
              <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
                <Text variant="body" font="arabicBold" color="primary">
                  {item.title_arabic ? item.title_arabic[0] : 'ح'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="body" font={rtl ? 'arabicBold' : 'uiBold'} style={rtl ? styles.rtlTitle : undefined}>
                  {rtl && item.title_arabic ? item.title_arabic : item.title}
                </Text>
                <Text variant="caption" color="secondary" style={rtl ? styles.rtlTitle : undefined}>
                  {t('hadith.by', { author: authorKey(item) })} · {t('hadith.hadiths', { n: item.count })}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space[4],
    paddingVertical: space[3],
  },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radius.pill,
  },
  chips: { flexDirection: 'row', gap: space[2], paddingHorizontal: space[4], paddingVertical: space[2] },
  chip: {
    paddingHorizontal: space[3],
    paddingVertical: space[1],
    borderWidth: 1,
    borderRadius: radius.pill,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingVertical: space[3],
    paddingHorizontal: space[4],
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rtlTitle: { textAlign: 'right', direction: 'rtl' },
});
