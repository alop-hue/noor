import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Segmented, Text, LoadingState } from '@/components/ui';
import { getByJuz, getByPage, getSurahs, type SurahRow } from '@/db/queries';
import { surahDisplayName } from '@/features/quran/surahNames';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeContext';
import { radius, space } from '@/theme/tokens';

type Mode = 'surah' | 'juz' | 'page';

export default function QuranTab() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { lastRead } = useSettings();
  const [mode, setMode] = useState<Mode>('surah');
  const [surahs, setSurahs] = useState<SurahRow[] | null>(null);

  useEffect(() => {
    getSurahs().then(setSurahs);
  }, []);

  const openSearch = () => router.push('/quran/search');
  const openSurah = (id: number) => router.push(`/quran/${id}`);

  const lastReadSurah = lastRead ? surahs?.find((s) => s.id === lastRead.surah) : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={styles.topBar}>
        <Text variant="title" font="uiBold">
          {t('quran.title')}
        </Text>
        <Pressable
          onPress={openSearch}
          style={({ pressed }) => [
            styles.searchBtn,
            { backgroundColor: colors.bgSunken, borderColor: colors.hairline },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Ionicons name="search" size={16} color={colors.textSecondary} />
          <Text variant="bodySmall" color="secondary">
            {t('quran.search')}
          </Text>
        </Pressable>
      </View>

      <View style={styles.segRow}>
        <Segmented<Mode>
          options={[
            { value: 'surah', label: t('quran.bySurah') },
            { value: 'juz', label: t('quran.byJuz') },
            { value: 'page', label: t('quran.byPage') },
          ]}
          value={mode}
          onChange={setMode}
        />
      </View>

      {mode === 'surah' ? (
        !surahs ? (
          <LoadingState />
        ) : (
          <>
            {lastRead ? (
              <Pressable
                onPress={() => openSurah(lastRead.surah)}
                style={({ pressed }) => [
                  styles.continueChip,
                  { backgroundColor: colors.primarySoft, borderColor: colors.primary },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Ionicons name="bookmark" size={14} color={colors.primary} />
                <Text variant="bodySmall" font="uiBold" color="primary">
                  {t('quran.continueReading')}
                </Text>
                <Text variant="bodySmall" color="secondary" numberOfLines={1} style={{ flex: 1 }}>
                  {lastReadSurah?.english_name} · {t('quran.verseNumber')} {lastRead.ayah}
                </Text>
              </Pressable>
            ) : null}
            <FlatList showsVerticalScrollIndicator={false}
              data={surahs}
              keyExtractor={(s) => String(s.id)}
              contentContainerStyle={{ paddingBottom: insets.bottom + space[8] }}
              renderItem={({ item }) => {
                const isLast = lastRead?.surah === item.id;
                return (
                  <Pressable
                    onPress={() => openSurah(item.id)}
                    style={({ pressed }) => [
                      styles.surahRow,
                      { borderBottomColor: colors.hairline },
                      isLast && { backgroundColor: colors.primarySoft },
                      pressed && { backgroundColor: colors.bgSunken },
                    ]}
                  >
                    <View style={[styles.surahNum, { backgroundColor: colors.primarySoft }]}>
                      <Text variant="bodySmall" font="uiBold" color="primary">
                        {item.id}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="body" font="uiBold">
                        {item.english_name}
                      </Text>
                      <Text variant="caption" color="secondary">
                        {item.translation} · {t('quran.verses', { n: item.ayahs })} · {t(`quran.${item.type === 'Meccan' ? 'meccan' : 'medinan'}`)}
                        {isLast ? ` · ${t('quran.verseNumber')} ${lastRead!.ayah}` : ''}
                      </Text>
                    </View>
                    <Text variant="body" font="arabicBold" style={{ fontSize: 20 }}>
                      {surahDisplayName(item.id, item.name, i18n.language)}
                    </Text>
                  </Pressable>
                );
              }}
            />
          </>
        )
      ) : (
        <IndexList
          count={mode === 'juz' ? 30 : 604}
          label={(n) => (mode === 'juz' ? t('quran.juzShort', { n }) : `${t('quran.page')} ${n}`)}
          onPick={(n) => router.push(`/quran/idx?kind=${mode}&n=${n}`)}
          onLoad={async (n) => (mode === 'juz' ? getByJuz(n) : getByPage(n))}
        />
      )}
    </View>
  );
}

function IndexList({
  count,
  label,
  onPick,
  onLoad,
}: {
  count: number;
  label: (n: number) => string;
  onPick: (n: number) => void;
  onLoad: (n: number) => Promise<unknown>;
}) {
  const { colors } = useTheme();
  const items = Array.from({ length: count }, (_, i) => i + 1);
  return (
    <FlatList showsVerticalScrollIndicator={false}
      data={items}
      keyExtractor={(n) => String(n)}
      numColumns={5}
      contentContainerStyle={{ padding: space[3] }}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => {
            void onLoad(item);
            onPick(item);
          }}
          style={({ pressed }) => [
            styles.idxCell,
            { borderColor: colors.hairline, backgroundColor: colors.card },
            pressed && { opacity: 0.6 },
          ]}
        >
          <Text variant="bodySmall" font="uiBold">
            {item}
          </Text>
          <Text variant="micro" color="tertiary">
            {label(item)}
          </Text>
        </Pressable>
      )}
    />
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
  segRow: { paddingHorizontal: space[4], paddingBottom: space[3] },
  continueChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    marginHorizontal: space[4],
    marginBottom: space[3],
    paddingHorizontal: space[3],
    paddingVertical: space[3],
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radius.md,
  },
  surahRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingVertical: space[3],
    paddingHorizontal: space[4],
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
  surahNum: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idxCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 4,
    paddingVertical: space[3],
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radius.sm,
  },
});
