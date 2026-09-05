import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { I18nManager, StyleSheet, View } from 'react-native';

import { MiniPlayer } from '@/components/audio/MiniPlayer';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeContext';

export default function TabsLayout() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  void useSettings((s) => s.language);
  const rtl = i18n.dir() === 'rtl';
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, direction: rtl ? 'rtl' : 'ltr' }}>
      <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: [
          styles.tabBar,
          { backgroundColor: colors.bgElevated, borderTopColor: colors.hairline, direction: rtl ? 'rtl' : 'ltr' },
        ],
        tabBarLabelStyle: [styles.label, rtl && { writingDirection: 'rtl' }],
        tabBarIconStyle: rtl ? { transform: [{ scaleX: -1 }] } : undefined,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="quran"
        options={{
          title: t('tabs.quran'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'book' : 'book-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="hadith"
        options={{
          title: t('tabs.hadith'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tools"
        options={{
          title: t('tabs.tools'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'compass' : 'compass-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: t('tabs.more'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'ellipsis-horizontal' : 'ellipsis-horizontal-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
      <MiniPlayer />
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    elevation: 0,
    shadowOpacity: 0,
  },
  label: { fontSize: 10, fontWeight: '600' },
});
