import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Notifications from 'expo-notifications';

import { Button, ListRow, SectionLabel, Text, Toggle } from '@/components/ui';
import { computePrayerTimes, formatTime, PRAYER_NAMES } from '@/services/prayer';
import { openExactAlarmSettings, canRequestExactAlarms, requestNotificationPermission, rescheduleAllPrayerReminders, sendTestAdhan, setupNotificationChannels } from '@/services/notifications';
import { useSettings, type AdhanSound, type PrayerName } from '@/store/settings';
import { useTheme } from '@/theme/ThemeContext';
import { radius, space } from '@/theme/tokens';

const SOUNDS: AdhanSound[] = ['default', 'makkah', 'hejaz', 'ajam', 'fajr', 'alafasy', 'alafasy_hd', 'silent'];

export default function NotificationSettingsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { prayer, setPrayer, setNotifyPref } = useSettings();
  const [permission, setPermission] = useState<boolean | null>(null);
  const [status, setStatus] = useState('');

  const reminders = useMemo(() => {
    if (!prayer.coords) return [];
    const times = computePrayerTimes(prayer.method, prayer.coords.lat, prayer.coords.lng, new Date());
    const list: { prayer: PrayerName; hour: number; minute: number; sound: AdhanSound; label: string }[] = [];
    for (const name of PRAYER_NAMES) {
      const pref = prayer.notify[name];
      const offset = prayer.offsets[name] ?? 0;
      if (!pref.enabled) continue;
      const d = new Date(times[name].getTime() + offset * 60000);
      list.push({ prayer: name, hour: d.getHours(), minute: d.getMinutes(), sound: pref.sound, label: t(`prayer.${name}`) });
    }
    return list;
  }, [prayer, t]);

  const apply = useCallback(async () => {
    await setupNotificationChannels();
    const count = await rescheduleAllPrayerReminders(reminders);
    setStatus(t('notifications.scheduled', { n: count }));
  }, [reminders, t]);

  useEffect(() => {
    (async () => {
      const perm = await Notifications.getPermissionsAsync();
      setPermission(perm.granted);
    })();
  }, []);

  useEffect(() => {
    if (permission === true && prayer.notificationsEnabled) {
      apply();
    }
  }, [permission, prayer.notificationsEnabled, apply]);

  const toggleEnabled = async (v: boolean) => {
    setPrayer({ notificationsEnabled: v });
    if (v) {
      const granted = await requestNotificationPermission();
      setPermission(granted);
      if (!granted) {
        setPrayer({ notificationsEnabled: false });
        return;
      }
      await apply();
    } else {
      await rescheduleAllPrayerReminders([]);
      setStatus('');
    }
  };

  const test = async () => {
    await sendTestAdhan('makkah', t('notifications.test'), t('notifications.testHint'));
  };

  const testPrayerSound = async (name: PrayerName) => {
    const pref = prayer.notify[name];
    await sendTestAdhan(pref.sound, t(`prayer.${name}`), t('notifications.testHint'));
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={{ backgroundColor: colors.bg }} contentContainerStyle={{ paddingTop: insets.top + space[3], paddingBottom: insets.bottom + space[8] }} >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text variant="subheading" font="uiBold">{t('notifications.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text variant="bodySmall" color="secondary" style={{ paddingHorizontal: space[4], marginTop: space[2] }}>
        {t('notifications.subtitle')}
      </Text>

      <ListRow
        icon={<Ionicons name="notifications-outline" size={20} color={colors.primary} />}
        title={t('notifications.enabled')}
        right={<Toggle value={prayer.notificationsEnabled} onValueChange={toggleEnabled} />}
      />
      {status ? (
        <Text variant="caption" color="primary" style={{ paddingHorizontal: space[5], paddingTop: space[1] }}>
          ✓ {status}
        </Text>
      ) : null}

      {prayer.coords ? (
        <>
          <SectionLabel>{t('notifications.perPrayer')}</SectionLabel>
          <Text variant="caption" color="tertiary" style={{ paddingHorizontal: space[4], marginBottom: space[2] }}>
            {t('notifications.perPrayerSubtitle')}
          </Text>
          {PRAYER_NAMES.map((name) => {
            const pref = prayer.notify[name];
            const time = computePrayerTimes(prayer.method, prayer.coords!.lat, prayer.coords!.lng, new Date());
            const base = new Date(time[name].getTime() + (prayer.offsets[name] ?? 0) * 60000);
            return (
              <View key={name}>
                <ListRow
                  icon={<Ionicons name="time-outline" size={20} color={colors.primary} />}
                  title={`${t(`prayer.${name}`)} · ${formatTime(base)}`}
                  subtitle={t(`notifications.${pref.sound === 'silent' ? 'silent' : pref.sound === 'default' ? 'default' : pref.sound}`)}
                  right={<Toggle value={pref.enabled} onValueChange={(v) => setNotifyPref(name, { enabled: v })} />}
                />
                {pref.enabled && (
                  <View style={styles.soundRow}>
                    {SOUNDS.map((s) => (
                      <Pressable
                        key={s}
                        onPress={() => setNotifyPref(name, { sound: s })}
                        style={[
                          styles.soundChip,
                          {
                            borderColor: pref.sound === s ? colors.primary : colors.hairline,
                            backgroundColor: pref.sound === s ? colors.primarySoft : colors.card,
                          },
                        ]}
                      >
                        <Text variant="micro" font="uiBold" color={pref.sound === s ? 'primary' : 'secondary'}>
                          {t(`notifications.${s}`)}
                        </Text>
                      </Pressable>
                    ))}
                    <Pressable
                      onPress={() => testPrayerSound(name)}
                      style={({ pressed }) => [
                        styles.soundChip,
                        { borderColor: colors.hairline, backgroundColor: colors.bgSunken },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="play" size={10} color={colors.primary} />
                        <Text variant="micro" font="uiBold" color="primary">{t('notifications.test')}</Text>
                      </View>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}
        </>
      ) : (
        <View style={{ padding: space[4] }}>
          <Button
            title={t('prayer.locationDisabledHint')}
            onPress={() => router.push('/prayer/settings')}
            variant="secondary"
          />
        </View>
      )}

      {canRequestExactAlarms() && (
        <>
          <SectionLabel>{t('notifications.exactAlarm')}</SectionLabel>
          <ListRow
            icon={<Ionicons name="alarm-outline" size={20} color={colors.primary} />}
            title={t('notifications.exactAlarm')}
            subtitle={t('notifications.exactAlarmHint')}
            onPress={() => void openExactAlarmSettings()}
            right={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
          />
        </>
      )}

      <SectionLabel>{t('notifications.test')}</SectionLabel>
      <View style={{ paddingHorizontal: space[4] }}>
        <Button title={t('notifications.test')} onPress={test} variant="secondary" />
        <Text variant="caption" color="tertiary" style={{ marginTop: space[2] }}>
          {t('notifications.testHint')}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[3],
    paddingVertical: space[3],
  },
  soundRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], paddingHorizontal: space[5], paddingBottom: space[2] },
  soundChip: { paddingHorizontal: space[3], paddingVertical: space[1], borderRadius: radius.pill, borderWidth: 1 },
});
