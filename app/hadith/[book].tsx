import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Clipboard } from 'react-native';

import { LoadingState, Text } from '@/components/ui';
import { ResizableSheet } from '@/components/ui/Sheet';
import { getHadithByBook, type HadithBookRow, type HadithRow } from '@/db/queries';
import { getHadithBooks } from '@/db/queries';
import { isHadithBookmarked, toggleHadithBookmark } from '@/db/userdb';
import { useTheme } from '@/theme/ThemeContext';
import { radius, space } from '@/theme/tokens';

export default function HadithBookScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language.startsWith('ar');
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ book: string; hadith?: string }>();
  const [book, setBook] = useState<HadithBookRow | null>(null);
  const [hadiths, setHadiths] = useState<HadithRow[] | null>(null);
  const [active, setActive] = useState<HadithRow | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const listRef = useRef<FlatList<HadithRow>>(null);

  useEffect(() => {
    (async () => {
      const books = await getHadithBooks();
      setBook(books.find((b) => b.slug === params.book) ?? null);
      const rows = await getHadithByBook(params.book, 5000);
      setHadiths(rows);
      if (params.hadith) {
        const idx = rows.findIndex((r) => r.id === Number(params.hadith));
        if (idx >= 0) setTimeout(() => listRef.current?.scrollToIndex({ index: idx, viewPosition: 0.3 }), 300);
      }
    })();
  }, [params.book, params.hadith]);

  const openHadith = async (h: HadithRow) => {
    setActive(h);
    setBookmarked(await isHadithBookmarked(h.book_slug, h.id));
  };

  const copy = async () => {
    if (!active) return;
    await Clipboard.setString(
      `${active.arabic}\n\n${active.english}\n\n[${active.book_slug}${active.number > 0 ? ` ${active.number}` : ''}${active.grade ? ` · ${active.grade}` : ''}]`,
    );
  };

  const share = async () => {
    if (!active) return;
    await Share.share({
      message: `${active.arabic}\n${active.english}\n— ${active.book_slug} ${active.number > 0 ? active.number : ''}`,
    });
  };

  const sections: { title: string; count: number }[] = [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={[styles.header, { backgroundColor: colors.bgElevated, borderBottomColor: colors.hairline }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text variant="subheading" font={isArabic ? 'arabicBold' : 'uiBold'} numberOfLines={1} style={isArabic ? styles.rtlTitle : undefined}>
            {isArabic ? (book?.title_arabic ?? book?.title ?? params.book) : (book?.title ?? params.book)}
          </Text>
          <Text variant="caption" color="secondary" style={isArabic ? styles.rtlTitle : undefined}>
            {t('hadith.by', { author: isArabic ? (book?.author_arabic ?? book?.author ?? '') : (book?.author ?? '') })}
          </Text>
        </View>
        <View style={{ width: 24 }} />
      </View>
      {!hadiths ? (
        <LoadingState />
      ) : (
        <FlatList showsVerticalScrollIndicator={false}
          ref={listRef}
          data={hadiths}
          keyExtractor={(h) => String(h.id)}
          initialNumToRender={14}
          maxToRenderPerBatch={12}
          windowSize={9}
          onScrollToIndexFailed={({ index }) => listRef.current?.scrollToOffset({ offset: index * 180 })}
          contentContainerStyle={{ paddingBottom: insets.bottom + space[8] }}
          ListHeaderComponent={
            sections.length > 0 ? (
              <View style={styles.sections}>
                {sections.map((s) => (
                  <Text key={s.title} variant="caption" color="secondary">{s.title}</Text>
                ))}
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openHadith(item)}
              style={({ pressed }) => [styles.row, { borderBottomColor: colors.hairline }, pressed && { backgroundColor: colors.bgSunken }]}
            >
              <View style={styles.rowTop}>
                <Text variant="caption" font="uiBold" color="primary">
                  {item.chapter || item.book_slug} {item.number > 0 ? `· ${item.number}` : ''}
                </Text>
                {item.grade ? (
                  <Text variant="micro" color="tertiary" numberOfLines={1} style={{ maxWidth: '60%' }}>
                    {item.grade}
                  </Text>
                ) : null}
              </View>
              <Text variant="bodySmall" font="arabicBold" style={{ color: colors.quranText, textAlign: 'right', marginTop: space[2] }}>
                {item.arabic}
              </Text>
              {!isArabic ? (
                <Text variant="bodySmall" color="secondary" numberOfLines={4} style={{ marginTop: space[2] }}>
                  {item.english}
                </Text>
              ) : null}
            </Pressable>
          )}
        />
      )}

      <HadithSheet
        visible={active !== null}
        hadith={active}
        onClose={() => setActive(null)}
        bookmarked={bookmarked}
        onToggleBookmark={async () => {
          if (!active) return;
          setBookmarked(await toggleHadithBookmark(active.book_slug, active.id));
        }}
        onCopy={copy}
        onShare={share}
        isArabic={isArabic}
        t={t}
        colors={colors}
      />
    </View>
  );
}

function HadithSheet({
  visible, hadith, onClose, bookmarked, onToggleBookmark, onCopy, onShare, isArabic, t, colors,
}: {
  visible: boolean;
  hadith: HadithRow | null;
  onClose: () => void;
  bookmarked: boolean;
  onToggleBookmark: () => void;
  onCopy: () => void;
  onShare: () => void;
  isArabic: boolean;
  t: (k: string, o?: Record<string, unknown>) => string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const insets = useSafeAreaInsets();
  return (
    <ResizableSheet visible={visible} onClose={onClose}>
      {hadith && (
        <>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space[5], paddingBottom: insets.bottom + space[4] }} >
            <Text variant="caption" font="uiBold" color="primary">
              {hadith.book_slug} {hadith.number > 0 ? `· ${hadith.number}` : ''}
            </Text>
              <Text variant="body" font="arabicBold" style={{ color: colors.quranText, textAlign: 'right', marginTop: space[3] }}>
                {hadith.arabic}
              </Text>
              {!isArabic ? (
                <Text variant="body" color="secondary" style={{ marginTop: space[3], lineHeight: 24 }}>
                  {hadith.english}
                </Text>
              ) : null}
              {hadith.grade ? (
                <Text variant="caption" color="tertiary" style={{ marginTop: space[3] }}>
                  {t('hadith.grade')}: {hadith.grade}
                </Text>
              ) : null}
              {hadith.reference ? (
                <Text variant="caption" color="tertiary" style={{ marginTop: 2 }}>
                  {t('hadith.reference')}: {hadith.reference}
                </Text>
              ) : null}
              <View style={[styles.actions, { borderTopColor: colors.hairline }]}>
                <ActionBtn icon={bookmarked ? 'bookmark' : 'bookmark-outline'} label={t('hadith.bookmarked')} onPress={onToggleBookmark} active={bookmarked} colors={colors} />
                <ActionBtn icon="copy-outline" label={t('hadith.copy')} onPress={onCopy} colors={colors} />
                <ActionBtn icon="share-outline" label={t('common.share')} onPress={onShare} colors={colors} />
              </View>
          </ScrollView>
        </>
      )}
    </ResizableSheet>
  );
}

function ActionBtn({ icon, label, onPress, active, colors }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; active?: boolean; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}>
      <Ionicons name={icon} size={20} color={active ? colors.primary : colors.textSecondary} />
      <Text variant="micro" font="uiBold" color={active ? 'primary' : 'secondary'}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rtlTitle: { textAlign: 'right', direction: 'rtl' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[3],
    paddingVertical: space[3],
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
  sections: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], padding: space[4] },
  row: { paddingHorizontal: space[4], paddingVertical: space[3], borderBottomWidth: StyleSheet.hairlineWidth * 2 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: space[5], paddingTop: space[4], borderTopWidth: StyleSheet.hairlineWidth * 2 },
  actionBtn: { alignItems: 'center', gap: 4 },
});
