import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { LoadingState, Segmented, Text } from '@/components/ui';
import { getAdhkarByCategory, getAdhkarCategories, type AdhkarRow } from '@/db/queries';
import { useTheme } from '@/theme/ThemeContext';
import { radius, space } from '@/theme/tokens';

export default function DhikrScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<string[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [items, setItems] = useState<AdhkarRow[] | null>(null);
  const [counts, setCounts] = useState<Record<number, number>>({});

  useEffect(() => {
    getAdhkarCategories().then(async (cats) => {
      setCategories(cats);
      if (cats.length > 0) {
        setActive(cats[0]);
        setItems(await getAdhkarByCategory(cats[0]));
      }
    });
  }, []);

  const select = async (cat: string) => {
    setActive(cat);
    setItems(null);
    setItems(await getAdhkarByCategory(cat));
    setCounts({});
  };

  const bump = (id: number, count: number) => {
    setCounts((c) => {
      const next = { ...c, [id]: (c[id] ?? 0) + 1 };
      if (next[id] >= count) delete next[id];
      return next;
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={[styles.header, { backgroundColor: colors.bgElevated, borderBottomColor: colors.hairline }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text variant="subheading" font="uiBold">{t('tools.dhikr')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={{ padding: space[4] }}>
        <Segmented
          options={categories.map((c) => ({ value: c, label: t(`dhikr.categories.${c}`) }))}
          value={active ?? categories[0] ?? ''}
          onChange={(v) => select(v)}
        />
      </View>

      {!items ? (
        <LoadingState />
      ) : (
        <FlatList showsVerticalScrollIndicator={false}
          data={items}
          keyExtractor={(a) => String(a.id)}
          contentContainerStyle={{ paddingBottom: insets.bottom + space[8], paddingHorizontal: space[4] }}
          renderItem={({ item }) => {
            const done = (counts[item.id] ?? 0) >= item.count;
            return (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.hairline }]}>
                <Text variant="body" font="arabicBold" style={{ color: colors.quranText, textAlign: 'right', lineHeight: 30 }}>
                  {item.arabic}
                </Text>
                {item.transliteration ? (
                  <Text variant="bodySmall" color="secondary" style={{ marginTop: space[2], fontStyle: 'italic' }}>
                    {item.transliteration}
                  </Text>
                ) : null}
                {item.translation ? (
                  <Text variant="bodySmall" color="secondary" style={{ marginTop: 2 }}>
                    {item.translation}
                  </Text>
                ) : null}
                <View style={styles.cardFooter}>
                  <Text variant="caption" color="tertiary">
                    {t('dhikr.count', { n: item.count })} · {item.source}
                  </Text>
                  <Pressable
                    onPress={() => bump(item.id, item.count)}
                    style={[styles.countBtn, { borderColor: done ? colors.success : colors.hairlineStrong, backgroundColor: done ? colors.primarySoft : colors.bgSunken }]}
                  >
                    <Text variant="bodySmall" font="uiBold" color={done ? 'primary' : 'secondary'}>
                      {done ? t('dhikr.done') : `${counts[item.id] ?? 0}/${item.count}`}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
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
  card: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radius.md,
    padding: space[4],
    marginBottom: space[3],
  },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space[3] },
  countBtn: { paddingHorizontal: space[3], paddingVertical: space[1], borderRadius: radius.pill, borderWidth: 1 },
});
