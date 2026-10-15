import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import {
  buildDailyTrigger,
  buildDateTrigger,
  requestNotificationPermission,
  rescheduleAllPrayerReminders,
  schedulePrayerReminder,
  sendDelayedTestNotification,
} from '../notifications';

const mockScheduleNotificationAsync = jest.fn();
const mockGetAllScheduled = jest.fn();
const mockCancelScheduled = jest.fn();
const mockGetPermissions = jest.fn();
const mockRequestPermissions = jest.fn();

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: (...args: unknown[]) => mockScheduleNotificationAsync(...args),
  getAllScheduledNotificationsAsync: (...args: unknown[]) => mockGetAllScheduled(...args),
  cancelScheduledNotificationAsync: (...args: unknown[]) => mockCancelScheduled(...args),
  getPermissionsAsync: (...args: unknown[]) => mockGetPermissions(...args),
  requestPermissionsAsync: (...args: unknown[]) => mockRequestPermissions(...args),
  setNotificationChannelAsync: jest.fn(async () => undefined),
  AndroidImportance: { MAX: 5 },
  AndroidNotificationPriority: { MAX: 1 },
  AndroidNotificationVisibility: { PUBLIC: 1 },
  SchedulableTriggerInputTypes: { DAILY: 'DAILY', DATE: 'DATE' },
}));

jest.mock('expo-intent-launcher', () => ({
  startActivityAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-constants', () => ({
  default: { expoConfig: { android: { package: 'com.noor.quran' }, name: 'Noor' } },
}));

const reminder = (minute: number) => ({
  prayer: 'fajr' as const,
  hour: 5,
  minute,
  sound: 'default' as const,
  label: 'Fajr',
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGetAllScheduled.mockResolvedValue([]);
  mockCancelScheduled.mockResolvedValue(undefined);
  mockScheduleNotificationAsync.mockImplementation(async (req: { content: { title: string } }) => `id-${req.content.title}`);
});

describe('triggers', () => {
  it('buildDailyTrigger returns a DAILY trigger with hour/minute', () => {
    expect(buildDailyTrigger(5, 30)).toEqual({
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 5,
      minute: 30,
    });
  });

  it('buildDateTrigger returns a DATE trigger with epoch millis', () => {
    const date = new Date(2026, 0, 1, 12, 0, 0);
    expect(buildDateTrigger(date)).toEqual({
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: date.getTime(),
    });
  });

  it('sendDelayedTestNotification schedules a future DATE trigger', async () => {
    const before = Date.now();
    const id = await sendDelayedTestNotification('T', 'B', 10);
    expect(typeof id).toBe('string');
    const req = mockScheduleNotificationAsync.mock.calls[0][0];
    expect(req.trigger.type).toBe(Notifications.SchedulableTriggerInputTypes.DATE);
    expect(req.trigger.date).toBeGreaterThanOrEqual(before + 10_000);
    expect(req.content.data.type).toBe('test');
  });
});

describe('schedulePrayerReminder', () => {
  it('schedules a prayer-typed notification and returns its id', async () => {
    const id = await schedulePrayerReminder(reminder(30));
    expect(id).toBe('id-Fajr');
    const req = mockScheduleNotificationAsync.mock.calls[0][0];
    expect(req.content.data).toEqual({ type: 'prayer', prayer: 'fajr' });
    expect(req.trigger.hour).toBe(5);
    expect(req.trigger.minute).toBe(30);
  });

  it('puts channelId inside the trigger on Android', async () => {
    const os = jest.replaceProperty(Platform, 'OS', 'android');
    try {
      await schedulePrayerReminder(reminder(0));
      const req = mockScheduleNotificationAsync.mock.calls[0][0];
      expect(req.trigger.channelId).toBe('prayer');
      expect(req.channelId).toBeUndefined();
    } finally {
      os.restore();
    }
  });
});

describe('rescheduleAllPrayerReminders', () => {
  it('cancels existing prayer reminders before scheduling', async () => {
    mockGetAllScheduled.mockResolvedValue([
      { identifier: 'a', content: { data: { type: 'prayer' } } },
      { identifier: 'b', content: { data: { type: 'other' } } },
    ]);
    await rescheduleAllPrayerReminders([reminder(1)]);
    expect(mockCancelScheduled).toHaveBeenCalledWith('a');
    expect(mockCancelScheduled).not.toHaveBeenCalledWith('b');
  });

  it('keeps scheduling the remaining reminders when one fails', async () => {
    mockScheduleNotificationAsync
      .mockRejectedValueOnce(new Error('boom'))
      .mockImplementation(async (req: { content: { title: string } }) => `id-${req.content.title}`);
    const count = await rescheduleAllPrayerReminders([reminder(1), reminder(2), reminder(3)]);
    expect(count).toBe(2);
    expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(3);
  });

  it('still schedules when cancel fails', async () => {
    mockGetAllScheduled.mockRejectedValue(new Error('unavailable'));
    const count = await rescheduleAllPrayerReminders([reminder(1)]);
    expect(count).toBe(1);
  });
});

describe('requestNotificationPermission', () => {
  it('returns true when already granted without asking again', async () => {
    mockGetPermissions.mockResolvedValue({ granted: true, canAskAgain: true });
    await expect(requestNotificationPermission()).resolves.toBe(true);
    expect(mockRequestPermissions).not.toHaveBeenCalled();
  });

  it('returns false when permanently denied', async () => {
    mockGetPermissions.mockResolvedValue({ granted: false, canAskAgain: false });
    await expect(requestNotificationPermission()).resolves.toBe(false);
    expect(mockRequestPermissions).not.toHaveBeenCalled();
  });

  it('asks and returns the grant result', async () => {
    mockGetPermissions.mockResolvedValue({ granted: false, canAskAgain: true });
    mockRequestPermissions.mockResolvedValue({ granted: true });
    await expect(requestNotificationPermission()).resolves.toBe(true);
    expect(mockRequestPermissions).toHaveBeenCalledTimes(1);
  });
});
