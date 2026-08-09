import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button, Text } from '@/components/ui';
import { deleteAllDownloads, deleteSurahDownload, downloadSurah, isSurahDownloaded, RECITERS } from '@/services/audio';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeContext';
import { radius, space } from '@/theme/tokens';

export default function DownloadsScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { audio, setAudio, downloads, setDownloadProgress, clearDownloads } = useSettings();
  const [activeReciter, setActiveReciter] = useState(audio.reciterId);
  const [local, setLocal] = useState<Set<number>>(new Set());

  const refresh = () => {
    const set = new Set<number>();
    for (let i = 1; i <= 114; i++) if (isSurahDownloaded(activeReciter, i)) set.add(i);
    setLocal(set);
  };

  useEffect(refresh, [activeReciter, downloads]);

  const start = async (surah: number) => {
    setDownloadProgress(surah, 1);
    try {
      await downloadSurah(activeReciter, surah, (pct) => setDownloadProgress(surah, pct));
      setDownloadProgress(surah, null);
      refresh();
    } catch (e) {
      console.warn('download failed', e);
      setDownloadProgress(surah, null);
    }
  };

  const remove = (surah: number) => {
    deleteSurahDownload(activeReciter, surah);
    refresh();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={[styles.header, { backgroundColor: colors.bgElevated, borderBottomColor: colors.hairline }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text variant="subheading" font="uiBold">{t('audio.downloads')}</Text>
        <Pressable onPress={() => router.push('/prayer/settings')} hitSlop={8}>
          <Ionicons name="settings-outline" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.reciterRow}>
        <Text variant="caption" font="uiBold" color="tertiary" style={styles.label}>{t('audio.reciter')}</Text>
        <FlatList showsVerticalScrollIndicator={false}
          horizontal
          data={RECITERS}
          keyExtractor={(r) => r.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: space[2], paddingHorizontal: space[4] }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                setActiveReciter(item.id);
                setAudio({ reciterId: item.id });
              }}
              style={[
                styles.reciterChip,
                {
                  borderColor: activeReciter === item.id ? colors.primary : colors.hairline,
                  backgroundColor: activeReciter === item.id ? colors.primarySoft : colors.card,
                },
              ]}
            >
              <Text variant="micro" font="uiBold" color={activeReciter === item.id ? 'primary' : 'secondary'}>{i18n.language.startsWith('ar') ? (item.ar ?? item.name) : item.name}</Text>
            </Pressable>
          )}
        />
      </View>

      <FlatList showsVerticalScrollIndicator={false}
        data={Array.from({ length: 114 }, (_, i) => i + 1)}
        keyExtractor={(n) => String(n)}
        numColumns={6}
        contentContainerStyle={{ padding: space[3], paddingBottom: insets.bottom + space[8] }}
        renderItem={({ item }) => {
          const dl = downloads[String(item)];
          const done = local.has(item);
          return (
            <Pressable
              onPress={() => (done ? remove(item) : start(item))}
              onLongPress={() => done && remove(item)}
              style={[
                styles.cell,
                {
                  borderColor: done ? colors.primary : colors.hairline,
                  backgroundColor: done ? colors.primarySoft : colors.card,
                },
              ]}
            >
              {dl != null ? (
                <Text variant="micro" font="uiBold" color="primary">{dl}%</Text>
              ) : done ? (
                <Ionicons name="checkmark" size={18} color={colors.primary} />
              ) : (
                <Text variant="micro" color="secondary">{item}</Text>
              )}
            </Pressable>
          );
        }}
      />

      <View style={[styles.footer, { borderTopColor: colors.hairline, paddingBottom: insets.bottom + space[3] }]}>
        <Button
          title={t('audio.deleteAll')}
          variant="ghost"
          onPress={() =>
            Alert.alert(t('audio.deleteAll'), t('settings.clearAllDataConfirm'), [
              { text: t('common.cancel'), style: 'cancel' },
              { text: t('common.delete'), style: 'destructive', onPress: () => { deleteAllDownloads(); clearDownloads(); refresh(); } },
            ])
          }
        />
      </View>
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
  reciterRow: { paddingVertical: space[3] },
  label: { paddingHorizontal: space[4], marginBottom: space[2], textTransform: 'uppercase', letterSpacing: 1 },
  reciterChip: { paddingHorizontal: space[3], paddingVertical: space[2], borderRadius: radius.pill, borderWidth: 1 },
  cell: {
    flex: 1,
    aspectRatio: 1,
    margin: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radius.sm,
  },
  footer: { borderTopWidth: StyleSheet.hairlineWidth * 2, paddingHorizontal: space[4], paddingTop: space[3] },
});
