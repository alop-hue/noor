import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/ui';
import { ResizableSheet } from '@/components/ui/Sheet';
import { getSurah } from '@/db/queries';
import { setRate, setSleepTimer, subscribeToPlayer, togglePlayPause, type PlayerStatus } from '@/services/audio';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeContext';
import { radius, space } from '@/theme/tokens';

export function MiniPlayer() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();  const { audio, setAudio } = useSettings();
  const [status, setStatus] = useState<PlayerStatus>({ playing: false, isLoaded: false, currentTime: 0, duration: 0, didJustFinish: false, surah: null, memorize: null, startAyah: null });
  const [surahName, setSurahName] = useState('');
  const [open, setOpen] = useState(false);
  const [sleepMins, setSleepMins] = useState<number | null>(null);

  useEffect(() => subscribeToPlayer(setStatus), []);
  useEffect(() => {
    if (status.surah && status.surah !== 0) {
      getSurah(status.surah).then((s) => setSurahName(i18n.language.startsWith('ar') ? (s?.name ?? '') : (s?.english_name ?? '')));
    }
  }, [status.surah, i18n.language]);

  if (!status.isLoaded || !status.surah) return null;

  const progress = status.duration > 0 ? Math.min(1, status.currentTime / status.duration) : 0;

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={[styles.bar, { backgroundColor: colors.bgElevated, borderTopColor: colors.hairline }]}>
        <View style={[styles.progress, { backgroundColor: colors.primary, width: `${progress * 100}%` }]} />
        <View style={styles.row}>
          <Ionicons name="musical-notes" size={18} color={colors.primary} />
          <Text variant="bodySmall" font="uiBold" numberOfLines={1} style={{ flex: 1, marginLeft: space[2] }}>
            {surahName}
          </Text>
          <Pressable onPress={togglePlayPause} hitSlop={8}>
            <Ionicons name={status.playing ? 'pause' : 'play'} size={22} color={colors.text} />
          </Pressable>
        </View>
      </Pressable>

      <ResizableSheet visible={open} onClose={() => setOpen(false)}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space[5], paddingBottom: space[7] }}>
        <Text variant="subheading" font="uiBold" style={{ textAlign: 'center' }}>
          {surahName}
        </Text>
        <Text variant="caption" color="secondary" style={{ textAlign: 'center', marginTop: 2 }}>
          {t('audio.nowPlaying')}
        </Text>

        <View style={styles.controls}>
          <ControlBtn icon={status.playing ? 'pause' : 'play'} onPress={togglePlayPause} big />
        </View>

          <View style={styles.section}>
            <Text variant="caption" font="uiBold" color="tertiary" style={styles.label}>{t('audio.speed')}</Text>
            <View style={styles.chips}>
              {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                <Chip
                  key={rate}
                  label={`${rate}×`}
                  active={audio.speed === rate}
                  onPress={() => {
                    setRate(rate);
                    setAudio({ speed: rate });
                  }}
                />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text variant="caption" font="uiBold" color="tertiary" style={styles.label}>{t('audio.sleepTimer')}</Text>
            <View style={styles.chips}>
              {[null, 5, 10, 15, 30, 60].map((m) => (
                <Chip
                  key={String(m)}
                  label={m === null ? t('audio.sleepOff') : t('audio.sleepMinutes', { n: m })}
                  active={sleepMins === m}
                  onPress={() => {
                    setSleepTimer(m);
                    setSleepMins(m);
                  }}
                />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text variant="caption" font="uiBold" color="tertiary" style={styles.label}>{t('audio.repeatRange')}</Text>
            <View style={styles.chips}>
              {(['off', 'surah', 'verse'] as const).map((r) => (
                <Chip
                  key={r}
                  label={t(`audio.repeat${r === 'off' ? 'Off' : r === 'surah' ? 'Surah' : 'Verse'}`)}
                  active={audio.repeat === r}
                  onPress={() => setAudio({ repeat: r })}
                />
              ))}
            </View>
          </View>

          <Pressable onPress={() => setOpen(false)} style={{ alignSelf: 'center', marginTop: space[4], padding: space[2] }}>
            <Text variant="bodySmall" font="uiBold" color="primary">{t('common.close')}</Text>
          </Pressable>
        </ScrollView>
      </ResizableSheet>
    </>
  );
}

function ControlBtn({ icon, onPress, big }: { icon: 'play' | 'pause'; onPress: () => void; big?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.ctrl, { backgroundColor: colors.primary }, big && { width: 64, height: 64, borderRadius: 32 }]}>
      <Ionicons name={icon} size={big ? 28 : 20} color={colors.textOnEmphasis} />
    </Pressable>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderColor: active ? colors.primary : colors.hairline,
          backgroundColor: active ? colors.primarySoft : colors.card,
        },
      ]}
    >
      <Text variant="micro" font="uiBold" color={active ? 'primary' : 'secondary'}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { borderTopWidth: StyleSheet.hairlineWidth * 2, overflow: 'hidden' },
  progress: { position: 'absolute', top: 0, left: 0, height: 2 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[4], paddingVertical: space[3] },
  controls: { flexDirection: 'row', justifyContent: 'center', marginTop: space[5] },
  ctrl: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  section: { marginTop: space[5] },
  label: { textTransform: 'uppercase', letterSpacing: 1, marginBottom: space[2] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  chip: { paddingHorizontal: space[3], paddingVertical: space[2], borderRadius: radius.pill, borderWidth: 1 },
});
