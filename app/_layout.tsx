import { Inter_400Regular, Inter_700Bold } from '@expo-google-fonts/inter';
import { Amiri_400Regular, Amiri_700Bold } from '@expo-google-fonts/amiri';
import { ScheherazadeNew_400Regular, ScheherazadeNew_700Bold } from '@expo-google-fonts/scheherazade-new';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { I18nManager, StyleSheet, View } from 'react-native';

import { Button, LoadingState, Text } from '@/components/ui';
import { ensureDatabase } from '@/db/database';
import { initI18n, isRtl, i18n } from '@/i18n';
import { installErrorListener } from '@/services/diagnostics';
import * as Notifications from 'expo-notifications';
import { resyncPrayerNotifications, setupNotificationChannels } from '@/services/notifications';
import { useSettings } from '@/store/settings';
import { ThemeProvider, useTheme } from '@/theme/ThemeContext';

type GateState = 'unpacking' | 'indexing' | 'ready' | 'error';

function i18nKeyToLabel(name: string): string {
  return i18n.exists(`prayer.${name}`) ? i18n.t(`prayer.${name}`) : name;
}

function GateScreen({ gate, retry }: { gate: Exclude<GateState, 'ready'>; retry: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.gate, { backgroundColor: colors.bg }]}>
      {gate === 'error' ? (
        <View style={{ alignItems: 'center', gap: 12 }}>
          <Text variant="subheading">Something went wrong while preparing the app.</Text>
          <Button title="Retry" onPress={retry} />
        </View>
      ) : (
        <View style={{ alignItems: 'center', gap: 8 }}>
          <Text variant="display" font="arabicBold">
            نور
          </Text>
          <LoadingState
            label={gate === 'unpacking' ? 'Preparing the sacred texts…' : 'Indexing for search…'}
          />
        </View>
      )}
    </View>
  );
}

function AppShell() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={colors.mode === 'light' ? 'dark' : 'light'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="quran/[surah]" />
        <Stack.Screen name="quran/idx" />
        <Stack.Screen name="quran/search" options={{ presentation: 'modal' }} />
        <Stack.Screen name="hadith/[book]" />
        <Stack.Screen name="tools/qibla" />
        <Stack.Screen name="tools/tasbih" />
        <Stack.Screen name="tools/dhikr" />
        <Stack.Screen name="tools/calendar" />
        <Stack.Screen name="tools/mosque" />
        <Stack.Screen name="prayer/settings" />
        <Stack.Screen name="prayer/notifications" />
        <Stack.Screen name="more/settings" />
        <Stack.Screen name="more/downloads" />
        <Stack.Screen name="more/bookmarks" />
        <Stack.Screen name="more/memorize" />
        <Stack.Screen name="more/diagnostics" />
        <Stack.Screen name="more/feedback" />
        <Stack.Screen name="more/legal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="tools/wird" />
      </Stack>
    </View>
  );
}

function Providers() {
  const theme = useSettings((s) => s.theme);
  const setTheme = useSettings((s) => s.setTheme);
  const language = useSettings((s) => s.language);
  const [gate, setGate] = useState<GateState>('unpacking');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    installErrorListener();
    let cancelled = false;
    (async () => {
      try {
        await initI18n(language);
        I18nManager.allowRTL(true);
        if (language && isRtl(language)) I18nManager.forceRTL(true);
        if (!cancelled) setGate('indexing');
        await ensureDatabase();
        await setupNotificationChannels();
        const perm = await Notifications.getPermissionsAsync();
        if (perm.granted) {
          try {
            await resyncPrayerNotifications(i18nKeyToLabel);
          } catch (e) {
            console.warn('resync notifications failed', e);
          }
        }
        if (!cancelled) setGate('ready');
      } catch (e) {
        console.error('bootstrap failed', e);
        if (!cancelled) setGate('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [language, attempt]);

  return (
    <ThemeProvider preference={theme} setPreference={setTheme}>
      {gate !== 'ready' ? (
        <GateScreen gate={gate} retry={() => setAttempt((a) => a + 1)} />
      ) : (
        <AppShell />
      )}
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_700Bold,
    Amiri_400Regular,
    Amiri_700Bold,
    ScheherazadeNew_400Regular,
    ScheherazadeNew_700Bold,
  });
  if (!fontsLoaded) {
    return <View style={styles.gate} />;
  }
  return <Providers />;
}

const styles = StyleSheet.create({
  gate: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B3D35' },
});
