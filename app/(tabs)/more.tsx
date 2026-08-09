import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ListRow, SectionLabel, Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeContext';
import { space } from '@/theme/tokens';

export default function MoreTab() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={{ backgroundColor: colors.bg }} contentContainerStyle={{ paddingTop: insets.top + space[5], paddingBottom: insets.bottom + space[8] }} >
      <Text variant="title" font="uiBold" style={{ paddingHorizontal: space[4], marginBottom: space[3] }}>
        {t('tabs.more')}
      </Text>

      <SectionLabel>{t('settings.title')}</SectionLabel>
      <ListRow
        icon={<Ionicons name="moon-outline" size={20} color={colors.primary} />}
        title={t('settings.theme')}
        subtitle={t('settings.appearance')}
        onPress={() => router.push('/more/settings')}
        right={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
      />
      <ListRow
        icon={<Ionicons name="time-outline" size={20} color={colors.primary} />}
        title={t('settings.notificationSettings')}
        subtitle={t('settings.notificationHint')}
        onPress={() => router.push('/prayer/notifications')}
        right={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
      />
      <ListRow
        icon={<Ionicons name="download-outline" size={20} color={colors.primary} />}
        title={t('settings.downloads')}
        subtitle={t('settings.downloadHint')}
        onPress={() => router.push('/more/downloads')}
        right={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
      />

      <SectionLabel>{t('tools.title')}</SectionLabel>
      <ListRow
        icon={<Ionicons name="school-outline" size={20} color={colors.primary} />}
        title={t('memorize.title')}
        subtitle={t('memorize.progressHint')}
        onPress={() => router.push('/more/memorize')}
        right={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
      />
      <ListRow
        icon={<Ionicons name="bookmark-outline" size={20} color={colors.primary} />}
        title={t('quran.inBookmarks')}
        onPress={() => router.push('/more/bookmarks')}
        right={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
      />

      <SectionLabel>{t('settings.legal')}</SectionLabel>
      <ListRow
        icon={<Ionicons name="pulse-outline" size={20} color={colors.primary} />}
        title={t('settings.diagnostics')}
        onPress={() => router.push('/more/diagnostics')}
        right={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
      />
      <ListRow
        icon={<Ionicons name="information-circle-outline" size={20} color={colors.primary} />}
        title={t('settings.about')}
        onPress={() => router.push('/more/legal')}
        right={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
      />

      <View style={{ alignItems: 'center', marginTop: space[8] }}>
        <Text variant="caption" color="tertiary">
          {t('appName')} · {t('settings.builtWith')}
        </Text>
        <Text variant="micro" color="tertiary" style={{ marginTop: 2 }}>
          v1.0.0
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({});
