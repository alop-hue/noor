import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Share } from 'react-native';

import { ListRow, SectionLabel, Text } from '@/components/ui';
import { wipeLocalData } from '@/db/database';
import { exportUserData } from '@/db/userdb';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeContext';
import { space } from '@/theme/tokens';

export default function LegalScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { reset, setOnBoarded } = useSettings();
  const [view, setView] = useState<string>('about');

  const exportData = async () => {
    const json = await exportUserData();
    await Share.share({ message: json });
  };

  const clearAll = () => {
    Alert.alert(t('settings.clearAllData'), t('settings.clearAllDataConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await wipeLocalData();
          reset();
          setOnBoarded(false);
          router.replace('/');
        },
      },
    ]);
  };

  const screens: Record<string, { title: string; body: string }> = {
    about: {
      title: t('legal.about'),
      body:
        'Noor is an offline-first Quran, prayer, hadith and dhikr companion. All scripture text, translations, tafsir and hadith are bundled with the app and never leave your device. Audio recitations stream or download on demand from public reciter archives.\n\nThis app is non-profit, ad-free, and does not sell or share data.',
    },
    privacy: {
      title: t('legal.privacy'),
      body:
        '1. Local data only\nBookmarks, notes, settings and downloads are stored exclusively on this device.\n\n2. No analytics\nNoor contains no tracking, analytics SDKs or fingerprinting.\n\n3. Notifications are local\nPrayer reminders are computed and scheduled on-device. No notification service or push server is involved.\n\n4. Permissions are opt-in\nLocation, notifications and exact alarms are requested only when you enable the features that need them.\n\n5. Network use\nStreaming audio, Quran data updates and the optional mosque finder contact public services. Your IP address is visible to those services as with any web request.\n\n6. Your rights\nExport your data at any time (More > About > Export) or delete all local data (More > About > Clear all local data).',
    },
    terms: {
      title: t('legal.terms'),
      body:
        '1. Use\nNoor is provided free for personal, non-commercial use.\n\n2. Scripture content\nQuran text, translations and tafsir are provided as-is from the referenced public sources. We work hard to keep them accurate but cannot guarantee the absence of transcription errors.\n\n3. Prayer times\nPrayer times are calculated with standard astronomical methods. Always verify with your local mosque or authority, especially in polar regions.\n\n4. Liability\nThis app is provided "as is" without warranties of any kind. The developer is not liable for missed prayers, alarms, or any damages arising from use of the app.',
    },
    licenses: {
      title: t('legal.licenses'),
      body:
        'Quran text (Uthmani Hafs): Tanzil project / quran-api, licensed for non-commercial use with attribution.\n\nTranslations: Saheeh International, Abdullah Yusuf Ali, Abul Ala Maududi, Ahmed Ali (Urdu), Ali Bulaç (Türkçe), Kemenag (Indonesia), Muhammad Hamidullah (Français), Abu Rida (Deutsch), Elmir Kuliev (Русский).\n\nTafsir: Ibn Kathir (English abridged), As-Sa\'di (Arabic), Jalalayn (Arabic) — from public JSON archives.\n\nHadith: Sahih al-Bukhari, Sahih Muslim, Sunan an-Nasa\'i, Sunan Abi Dawud, Jami\' at-Tirmidhi, Sunan Ibn Majah, Muwatta Malik, Riyad as-Salihin, An-Nawawi 40 — from the HadithsJSONFormat archive.\n\nAdhkar: classic compilations with individual sources cited.\n\nRecitations: mp3quran.net reciter archive. Adhan: archive.org public audio.\n\nApp code: MIT license.',
    },
  };

  const current = screens[view];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={[styles.header, { backgroundColor: colors.bgElevated, borderBottomColor: colors.hairline }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
        <Text variant="subheading" font="uiBold">{t('settings.about')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ListRow
        icon={<Ionicons name="information-circle-outline" size={20} color={colors.primary} />}
        title={t('legal.about')}
        onPress={() => setView('about')}
        right={view === 'about' ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
      />
      <ListRow
        icon={<Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />}
        title={t('legal.privacy')}
        onPress={() => setView('privacy')}
        right={view === 'privacy' ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
      />
      <ListRow
        icon={<Ionicons name="document-text-outline" size={20} color={colors.primary} />}
        title={t('legal.terms')}
        onPress={() => setView('terms')}
        right={view === 'terms' ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
      />
      <ListRow
        icon={<Ionicons name="code-slash-outline" size={20} color={colors.primary} />}
        title={t('legal.licenses')}
        onPress={() => setView('licenses')}
        right={view === 'licenses' ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
      />

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ padding: space[5], paddingBottom: insets.bottom + space[8] }} >
        <Text variant="heading" font="uiBold">{current.title}</Text>
        <Text variant="body" color="secondary" style={{ marginTop: space[3], lineHeight: 24 }}>
          {current.body}
        </Text>

        <SectionLabel>{t('settings.data')}</SectionLabel>
        <ListRow
          icon={<Ionicons name="download-outline" size={20} color={colors.primary} />}
          title={t('settings.exportData')}
          onPress={exportData}
          right={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
        />
        <ListRow
          icon={<Ionicons name="trash-outline" size={20} color={colors.danger} />}
          title={t('settings.clearAllData')}
          onPress={clearAll}
          last
        />

        <Text variant="caption" color="tertiary" style={{ marginTop: space[8], textAlign: 'center' }}>
          {t('settings.builtWith')} · v1.0.0
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[3],
    paddingVertical: space[3],
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
});
