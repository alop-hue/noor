import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ListRow, SectionLabel, Text, Toggle } from '@/components/ui';
import { SUPPORTED_LANGS } from '@/i18n';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeContext';
import { space } from '@/theme/tokens';

const THEME_OPTIONS = ['system', 'light', 'dark', 'amoled'] as const;
const LANG_NAMES: Record<string, string> = {
  en: 'English',
  ar: 'العربية',
  tr: 'Türkçe',
  id: 'Bahasa Indonesia',
  ur: 'اردو',
  fr: 'Français',
  de: 'Deutsch',
};

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, setTheme, language, setLanguage, tajweed, setTajweed, wordByWord, setWordByWord, showTranslation, setShowTranslation, defaultTranslation } = useSettings();

  void defaultTranslation;

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={{ backgroundColor: colors.bg }} contentContainerStyle={{ paddingTop: insets.top + space[3], paddingBottom: insets.bottom + space[8] }} >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text variant="subheading" font="uiBold">{t('settings.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <SectionLabel>{t('settings.appearance')}</SectionLabel>
      <ListRow
        icon={<Ionicons name="contrast-outline" size={20} color={colors.primary} />}
        title={t('settings.theme')}
        subtitle={t(`settings.themes.${theme}`)}
        onPress={() => {
          const idx = THEME_OPTIONS.indexOf(theme);
          setTheme(THEME_OPTIONS[(idx + 1) % THEME_OPTIONS.length]);
        }}
        right={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
      />
      {THEME_OPTIONS.map((opt) => (
        <Pressable key={opt} onPress={() => setTheme(opt)} style={[styles.option, { borderBottomColor: colors.hairline }]}>
          <Text variant="body" color={theme === opt ? 'primary' : 'text'}>{t(`settings.themes.${opt}`)}</Text>
          {theme === opt && <Ionicons name="checkmark" size={18} color={colors.primary} />}
        </Pressable>
      ))}

      <SectionLabel>{t('settings.language')}</SectionLabel>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2], paddingHorizontal: space[4] }}>
        {SUPPORTED_LANGS.map((lng) => (
          <Pressable
            key={lng}
            onPress={() => setLanguage(lng)}
            style={[
              styles.langChip,
              {
                borderColor: (language ?? 'en') === lng ? colors.primary : colors.hairline,
                backgroundColor: (language ?? 'en') === lng ? colors.primarySoft : colors.card,
              },
            ]}
          >
            <Text variant="bodySmall" font="uiBold" color={(language ?? 'en') === lng ? 'primary' : 'secondary'}>
              {LANG_NAMES[lng]}
            </Text>
          </Pressable>
        ))}
      </View>

      <SectionLabel>{t('settings.reading')}</SectionLabel>
      <ListRow
        icon={<Ionicons name="color-palette-outline" size={20} color={colors.primary} />}
        title={t('settings.tajweed')}
        right={<Toggle value={tajweed} onValueChange={setTajweed} />}
      />
      <ListRow
        icon={<Ionicons name="text-outline" size={20} color={colors.primary} />}
        title={t('settings.wordByWord')}
        right={<Toggle value={wordByWord} onValueChange={setWordByWord} />}
      />
      <ListRow
        icon={<Ionicons name="language-outline" size={20} color={colors.primary} />}
        title={t('quran.translations')}
        subtitle={showTranslation ? t('quran.translationOn') : t('quran.translationsOff')}
        right={<Toggle value={showTranslation} onValueChange={setShowTranslation} />}
      />
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
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space[6],
    paddingVertical: space[3],
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
  langChip: {
    paddingHorizontal: space[4],
    paddingVertical: space[2],
    borderRadius: 999,
    borderWidth: 1,
  },
});
