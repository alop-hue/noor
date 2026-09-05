import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { CustomTabBar } from '@/components/ui/CustomTabBar';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeContext';

export default function TabsLayout() {
  const { i18n } = useTranslation();
  const { colors } = useTheme();
  void useSettings((s) => s.language);
  const rtl = i18n.dir() === 'rtl';
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, direction: rtl ? 'rtl' : 'ltr' }}>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'home' }} />
        <Tabs.Screen name="quran" options={{ title: 'quran' }} />
        <Tabs.Screen name="hadith" options={{ title: 'hadith' }} />
        <Tabs.Screen name="tools" options={{ title: 'tools' }} />
        <Tabs.Screen name="more" options={{ title: 'more' }} />
      </Tabs>
    </View>
  );
}
