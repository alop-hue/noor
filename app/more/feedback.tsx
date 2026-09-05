import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Linking } from 'react-native';

import { Button, Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeContext';
import { radius, space } from '@/theme/tokens';

const FEEDBACK_EMAIL = 'alopesclop13@gmail.com';

export default function FeedbackScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) {
      Alert.alert(t('feedback.messageRequired'));
      return;
    }
    setSending(true);
    try {
      const body = encodeURIComponent(
        `${message.trim()}\n\n---\nApp: Noor v1.0.0\nLang: ${t('appName')}\nDevice: ${new Date().toLocaleDateString()}`
      );
      const sub = encodeURIComponent(subject.trim() || t('feedback.defaultSubject'));
      await Linking.openURL(`mailto:${FEEDBACK_EMAIL}?subject=${sub}&body=${body}`);
      Alert.alert(t('feedback.thanks'), t('feedback.thanksMessage'), [
        { text: t('common.ok'), onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert(t('feedback.error'), t('feedback.errorMessage'));
    }
    setSending(false);
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + space[5], paddingBottom: insets.bottom + space[8] }}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text variant="title" font="uiBold">
          {t('feedback.title')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.hero}>
        <View style={[styles.iconCircle, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="chatbubble-ellipses" size={32} color={colors.primary} />
        </View>
        <Text variant="body" color="secondary" style={{ textAlign: 'center', marginTop: space[3] }}>
          {t('feedback.subtitle')}
        </Text>
      </View>

      <View style={styles.form}>
        <Text variant="caption" font="uiBold" color="tertiary" style={styles.label}>
          {t('feedback.subject')}
        </Text>
        <TextInput
          value={subject}
          onChangeText={setSubject}
          placeholder={t('feedback.subjectPlaceholder')}
          placeholderTextColor={colors.placeholder}
          style={[styles.input, { color: colors.text, borderColor: colors.hairline, backgroundColor: colors.card }]}
        />

        <Text variant="caption" font="uiBold" color="tertiary" style={styles.label}>
          {t('feedback.message')}
        </Text>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder={t('feedback.messagePlaceholder')}
          placeholderTextColor={colors.placeholder}
          multiline
          numberOfLines={6}
          style={[styles.textArea, { color: colors.text, borderColor: colors.hairline, backgroundColor: colors.card }]}
          textAlignVertical="top"
        />

        <Button
          title={t('feedback.send')}
          onPress={handleSend}
          disabled={sending || !message.trim()}
          style={{ marginTop: space[4] }}
        />
      </View>

      <View style={styles.footer}>
        <Ionicons name="mail-outline" size={16} color={colors.textTertiary} />
        <Text variant="micro" color="tertiary">{FEEDBACK_EMAIL}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[4],
    paddingBottom: space[4],
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: space[5],
    marginBottom: space[5],
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    paddingHorizontal: space[4],
  },
  label: {
    marginBottom: space[2],
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space[3],
    paddingVertical: space[3],
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space[3],
    paddingVertical: space[3],
    fontSize: 16,
    minHeight: 150,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
    marginTop: space[6],
  },
});
