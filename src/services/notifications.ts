import * as IntentLauncher from 'expo-intent-launcher';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type { AdhanSound, PrayerName } from '../store/settings';

const CHANNEL_PRAYER = 'prayer';

export const canRequestExactAlarms = (): boolean =>
  Platform.OS === 'android' && Number(Platform.Version) >= 31;

export const ADHAN_SOUND_FILES: Record<Exclude<AdhanSound, 'silent' | 'custom'>, string> = {
  default: 'default',
  makkah: 'default',
  hejaz: 'default',
  ajam: 'default',
  fajr: 'default',
  alafasy: 'default',
  alafasy_hd: 'default',
};

function soundFile(sound: AdhanSound): string | undefined {
  if (sound === 'silent') return undefined;
  if (sound === 'custom') return 'default';
  return ADHAN_SOUND_FILES[sound];
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function initNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  for (const key of Object.keys(ADHAN_SOUND_FILES) as (keyof typeof ADHAN_SOUND_FILES)[]) {
    const file = ADHAN_SOUND_FILES[key];
    await Notifications.setNotificationChannelAsync(key === 'default' ? CHANNEL_PRAYER : `prayer-${key}`, {
      name: `Prayer (${key})`,
      importance: Notifications.AndroidImportance.MAX,
      sound: file,
      vibrationPattern: [0, 250, 150, 250],
      enableVibrate: true,
      bypassDnd: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      showBadge: false,
    });
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

export async function openExactAlarmSettings(): Promise<void> {
  const pkg = Constants.expoConfig?.android?.package ?? Constants.expoConfig?.name ?? 'com.noor.quran';
  try {
    await IntentLauncher.startActivityAsync('android.settings.REQUEST_SCHEDULE_EXACT_ALARM', {
      extra: { 'android.provider.extra.APP_PACKAGE': pkg },
    });
  } catch {
    try {
      await IntentLauncher.startActivityAsync('android.settings.APPLICATION_DETAILS_SETTINGS', {
        data: `package:${pkg}`,
      });
    } catch {
      // no settings screen available
    }
  }
}

export interface PrayerReminder {
  prayer: PrayerName;
  hour: number;
  minute: number;
  sound: AdhanSound;
  label: string;
}

export function buildDailyTrigger(hour: number, minute: number): Notifications.DailyTriggerInput {
  return { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute };
}

export function buildDateTrigger(date: Date): Notifications.DateTriggerInput {
  return { type: Notifications.SchedulableTriggerInputTypes.DATE, date: date.getTime() };
}

export async function schedulePrayerReminder(reminder: PrayerReminder): Promise<string | null> {
  const channelId =
    reminder.sound === 'silent' || reminder.sound === 'default'
      ? CHANNEL_PRAYER
      : `prayer-${reminder.sound}`;
  const trigger: Notifications.DailyTriggerInput =
    Platform.OS === 'android'
      ? { ...buildDailyTrigger(reminder.hour, reminder.minute), channelId }
      : buildDailyTrigger(reminder.hour, reminder.minute);
  return Notifications.scheduleNotificationAsync({
    content: {
      title: reminder.label,
      body: `${String(reminder.hour).padStart(2, '0')}:${String(reminder.minute).padStart(2, '0')}`,
      sound: soundFile(reminder.sound),
      priority: Notifications.AndroidNotificationPriority.MAX,
      data: { type: 'prayer', prayer: reminder.prayer },
    },
    trigger,
  });
}

export async function cancelAllPrayerReminders(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.content.data?.type === 'prayer')
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

export async function sendTestNotification(title: string, body: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: 'default', priority: Notifications.AndroidNotificationPriority.MAX, data: { type: 'test' } },
    trigger: Platform.OS === 'android' ? { channelId: CHANNEL_PRAYER } : null,
  });
}

export async function sendTestAdhan(sound: AdhanSound, title: string, body: string): Promise<void> {
  const channelId =
    sound === 'silent' || sound === 'default' ? CHANNEL_PRAYER : `prayer-${sound}`;
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: soundFile(sound),
      priority: Notifications.AndroidNotificationPriority.MAX,
      data: { type: 'test', sound },
    },
    trigger: Platform.OS === 'android' ? { channelId } : null,
  });
}

export async function rescheduleAllPrayerReminders(reminders: PrayerReminder[]): Promise<number> {
  await cancelAllPrayerReminders();
  let count = 0;
  for (const r of reminders) {
    const id = await schedulePrayerReminder(r);
    if (id) count++;
  }
  return count;
}

export async function resyncPrayerNotifications(
  labelFor: (prayer: PrayerName) => string,
): Promise<number> {
  const { prayer } = (await import('../store/settings')).useSettings.getState();
  if (!prayer.notificationsEnabled || !prayer.coords) {
    await cancelAllPrayerReminders();
    return 0;
  }
  const { computePrayerTimes, PRAYER_NAMES } = await import('./prayer');
  const times = computePrayerTimes(prayer.method, prayer.coords.lat, prayer.coords.lng, new Date());
  const reminders: PrayerReminder[] = [];
  for (const name of PRAYER_NAMES) {
    const pref = prayer.notify[name];
    if (!pref.enabled) continue;
    const offset = prayer.offsets[name] ?? 0;
    const d = new Date(times[name].getTime() + offset * 60000);
    reminders.push({ prayer: name, hour: d.getHours(), minute: d.getMinutes(), sound: pref.sound, label: labelFor(name) });
  }
  return rescheduleAllPrayerReminders(reminders);
}
