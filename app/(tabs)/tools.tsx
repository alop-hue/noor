import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeContext';
import { radius, space } from '@/theme/tokens';

export default function ToolsTab() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const tools = [
    { icon: 'compass-outline', label: t('tools.qibla'), hint: t('tools.qiblaHint'), route: '/tools/qibla' },
    { icon: 'repeat-outline', label: t('tools.tasbih'), hint: t('tools.tasbihHint'), route: '/tools/tasbih' },
    { icon: 'sparkles-outline', label: t('tools.dhikr'), hint: t('tools.dhikrHint'), route: '/tools/dhikr' },
    { icon: 'calendar-outline', label: t('tools.calendar'), hint: t('tools.calendarHint'), route: '/tools/calendar' },
    { icon: 'location-outline', label: t('tools.mosque'), hint: t('tools.mosqueHint'), route: '/tools/mosque' },
    { icon: 'sparkles', label: t('tools.names99'), hint: t('tools.names99Hint'), route: '/tools/names99' },
  ] as const;

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={{ backgroundColor: colors.bg }} contentContainerStyle={{ paddingTop: insets.top + space[5], paddingBottom: insets.bottom + space[8] }} >
      <Text variant="title" font="uiBold" style={{ paddingHorizontal: space[4], marginBottom: space[4] }}>
        {t('tools.title')}
      </Text>
      {tools.map((tool) => (
        <Pressable
          key={tool.route}
          onPress={() => router.push(tool.route)}
          style={({ pressed }) => [styles.row, { borderBottomColor: colors.hairline }, pressed && { backgroundColor: colors.bgSunken }]}
        >
          <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name={tool.icon} size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="body" font="uiBold">{tool.label}</Text>
            <Text variant="caption" color="secondary">{tool.hint}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingVertical: space[3],
    paddingHorizontal: space[4],
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
  icon: { width: 42, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
