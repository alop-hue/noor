import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { MiniPlayer } from '@/components/audio/MiniPlayer';
import { Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeContext';
import { space } from '@/theme/tokens';

const TABS = [
  { name: 'index', icon: 'home', iconOutline: 'home-outline', labelKey: 'tabs.home' },
  { name: 'quran', icon: 'book', iconOutline: 'book-outline', labelKey: 'tabs.quran' },
  { name: 'hadith', icon: 'chatbubbles', iconOutline: 'chatbubbles-outline', labelKey: 'tabs.hadith' },
  { name: 'tools', icon: 'compass', iconOutline: 'compass-outline', labelKey: 'tabs.tools' },
  { name: 'more', icon: 'ellipsis-horizontal', iconOutline: 'ellipsis-horizontal-outline', labelKey: 'tabs.more' },
] as const;

export function CustomTabBar({ state, navigation }: any) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const rtl = i18n.dir() === 'rtl';

  return (
    <View style={[styles.container, { backgroundColor: colors.bgElevated, borderTopColor: colors.hairline }]}>
      <MiniPlayer />
      <View style={[styles.tabs, rtl && { direction: 'rtl' }]}>
        {TABS.map((tab, index) => {
          const focused = state.index === index;
          const color = focused ? colors.primary : colors.textTertiary;
          return (
            <Pressable
              key={tab.name}
              onPress={() => navigation.navigate(tab.name)}
              style={styles.tab}
            >
              <Ionicons name={focused ? tab.icon : tab.iconOutline} size={22} color={color} />
              <Text variant="micro" font="uiBold" color={focused ? 'primary' : 'tertiary'}>
                {t(tab.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: space[1],
    paddingBottom: space[2],
  },
  tab: {
    alignItems: 'center',
    gap: 2,
  },
});
