import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { MiniPlayer } from '@/components/audio/MiniPlayer';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeContext';

export default function TabsLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  void useSettings((s) => s.language);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: [
          styles.tabBar,
          { backgroundColor: colors.bgElevated, borderTopColor: colors.hairline },
        ],
        tabBarLabelStyle: styles.label,
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
