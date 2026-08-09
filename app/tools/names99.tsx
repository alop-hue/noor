import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Clipboard, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/ui';
import { ResizableSheet } from '@/components/ui/Sheet';
import names from '@/assets/data/asmaul-husna.json';
import { getAyahsMentioning, type MentionRow } from '@/db/queries';
import { arabicSurahName } from '@/features/quran/surahNames';
import { useTheme } from '@/theme/ThemeContext';
import { radius, space } from '@/theme/tokens';

interface NameEntry {
  n: number;
  ar: string;
  tr: string;
  en: string;
  arMeaning: string;
  kw: string;
}

const ALL_NAMES = names as NameEntry[];

export default function Names99Screen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState<NameEntry | null>(null);
  const [verses, setVerses] = useState<MentionRow[] | null>(null);
  const [loadingVerses, setLoadingVerses] = useState(false);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_NAMES;
    return ALL_NAMES.filter(
      (n) =>
        n.ar.includes(query.trim()) ||
        n.tr.toLowerCase().includes(q) ||
        n.en.toLowerCase().includes(q) ||
        n.arMeaning.includes(query.trim()),
    );
  }, [query]);

  useEffect(() => {
    if (!detail) {
      setVerses(null);
      return;
    }
    let cancelled = false;
    setLoadingVerses(true);
    getAyahsMentioning(detail.kw, 3).then((rows) => {
      if (cancelled) return;
      setVerses(rows);
      setLoadingVerses(false);
    });
    return () => {
      cancelled = true;
    };
  }, [detail]);

  const openDetail = (n: NameEntry) => setDetail(n);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={[styles.header, { backgroundColor: colors.bgElevated, borderBottomColor: colors.hairline }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text variant="subheading" font="uiBold">{t('tools.names99')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.searchWrap, { backgroundColor: colors.bgElevated, borderBottomColor: colors.hairline }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.bgSunken }]}>
          <Ionicons name="search" size={16} color={colors.textTertiary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('tools.names99Search')}
            placeholderTextColor={colors.placeholder}
            style={[styles.input, { color: colors.text }]}
          />
        </View>
        <Text variant="micro" color="tertiary">
          {list.length} / {ALL_NAMES.length}
        </Text>
      </View>

      <FlatList showsVerticalScrollIndicator={false}
        data={list}
        keyExtractor={(n) => String(n.n)}
        contentContainerStyle={{ paddingBottom: insets.bottom + space[8] }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => openDetail(item)}
            style={({ pressed }) => [styles.row, { borderBottomColor: colors.hairline }, pressed && { backgroundColor: colors.bgSunken }]}
          >
            <View style={[styles.num, { backgroundColor: colors.primarySoft }]}>
              <Text variant="micro" font="uiBold" color="primary">{item.n}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space[2] }}>
                <Text variant="body" font="arabicBold" style={{ fontSize: 24, lineHeight: 34 }}>{item.ar}</Text>
                <Text variant="bodySmall" font="uiBold" color="primary" style={{ fontSize: 13 }}>{item.tr}</Text>
              </View>
              <Text variant="caption" color="secondary" style={{ marginTop: 2 }}>
                {i18n.language === 'ar' ? item.arMeaning : item.en}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </Pressable>
        )}
        ListEmptyComponent={
          <Text variant="bodySmall" color="tertiary" style={{ textAlign: 'center', marginTop: space[8] }}>
            {t('quran.noResults')}
          </Text>
        }
      />

      <ResizableSheet visible={detail !== null} onClose={() => setDetail(null)}>
        {detail && (
          <View style={{ paddingHorizontal: space[5], paddingBottom: insets.bottom + space[4] }}>
            <View style={{ alignItems: 'center', marginBottom: space[3] }}>
              <Text variant="caption" font="uiBold" color="tertiary" style={styles.section}>
                {t('tools.names99Meaning')}
              </Text>
              <Text variant="display" font="arabicBold" style={{ fontSize: 44, lineHeight: 64, marginTop: space[1] }}>
                {detail.ar}
              </Text>
              <Text variant="body" font="uiBold" color="primary" style={{ marginTop: 2 }}>{detail.tr}</Text>
            </View>
            <View style={[styles.meaningBox, { backgroundColor: colors.bgSunken, borderColor: colors.hairline }]}>
              <Text variant="bodySmall" font="arabicBold" style={{ color: colors.quranText, textAlign: 'center', lineHeight: 26 }}>
                {detail.arMeaning}
              </Text>
              {i18n.language !== 'ar' ? (
                <Text variant="bodySmall" color="secondary" style={{ textAlign: 'center', marginTop: space[1] }}>
                  {detail.en}
                </Text>
              ) : null}
            </View>

            <Text variant="caption" font="uiBold" color="tertiary" style={styles.section}>
              {t('names99.verses')}
            </Text>
            {loadingVerses ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: space[4] }} />
            ) : verses && verses.length > 0 ? (
              verses.map((v) => (
                <Pressable
                  key={`${v.surah}-${v.ayah}`}
                  onPress={() => void Clipboard.setString(v.arabic)}
                  style={({ pressed }) => [styles.ayahBox, { backgroundColor: colors.card, borderColor: colors.hairline }, pressed && { opacity: 0.8 }]}
                >
                  <Text variant="body" font="quranBold" style={{ color: colors.quranText, textAlign: 'right', lineHeight: 30 }}>
                    {v.arabic}
                  </Text>
                  <Text variant="caption" color="secondary" style={{ marginTop: space[2] }}>
                    {arabicSurahName(v.surah)} · {t('quran.verseNumber')} {v.ayah}
                  </Text>
                </Pressable>
              ))
            ) : (
              <Text variant="bodySmall" color="tertiary">{t('names99.noVerses')}</Text>
            )}

            <Pressable
              onPress={() => void Clipboard.setString(`${detail.ar} (${detail.tr})`)}
              style={[styles.copyBtn, { borderColor: colors.hairline, backgroundColor: colors.bgSunken }]}
            >
              <Ionicons name="copy-outline" size={16} color={colors.primary} />
              <Text variant="bodySmall" font="uiBold" color="primary">{t('common.copy')}</Text>
            </Pressable>
          </View>
        )}
      </ResizableSheet>
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
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4], paddingVertical: space[3], borderBottomWidth: StyleSheet.hairlineWidth * 2 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space[2], borderRadius: radius.md, paddingHorizontal: space[3], paddingVertical: 8 },
  input: { flex: 1, fontSize: 15, padding: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3], paddingHorizontal: space[4], borderBottomWidth: StyleSheet.hairlineWidth * 2 },
  num: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  section: { marginTop: space[4], marginBottom: space[2], textTransform: 'uppercase', letterSpacing: 1 },
  meaningBox: { borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: radius.md, padding: space[3] },
  ayahBox: { borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: radius.md, padding: space[3], marginBottom: space[2] },
  copyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[2], marginTop: space[4], paddingVertical: space[3], borderRadius: radius.md, borderWidth: 1 },
});
