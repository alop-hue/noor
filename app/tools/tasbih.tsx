import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { Button, Text } from '@/components/ui';
import { ResizableSheet } from '@/components/ui/Sheet';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeContext';
import { radius, space } from '@/theme/tokens';

export default function TasbihScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tasbihTarget, setTasbihTarget, tasbihDhikr, setTasbihDhikr } = useSettings();
  const [count, setCount] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const debounce = useRef(false);

  const tap = () => {
    if (debounce.current) return;
    debounce.current = true;
    setTimeout(() => (debounce.current = false), 120);
    setCount((c) => {
      const next = c + 1;
      if (next >= tasbihTarget) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      return next;
    });
  };

  const reset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCount(0);
  };

  const progress = Math.min(1, count / tasbihTarget);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={[styles.header, { backgroundColor: colors.bgElevated, borderBottomColor: colors.hairline }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text variant="subheading" font="uiBold">{t('tools.tasbih')}</Text>
        <Pressable onPress={reset} hitSlop={8}>
          <Ionicons name="refresh" size={22} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: insets.bottom + space[8] }}>
        <Text variant="display" font="uiBold" style={{ fontVariant: ['tabular-nums'] }}>
          {count}
        </Text>
        <Text variant="caption" color="secondary">
          {t('tools.tasbihCount', { n: tasbihTarget })} · {t('dhikr.progress', { done: count, total: tasbihTarget })}
        </Text>

        <Pressable onPress={tap} style={({ pressed }) => [styles.ring, { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.primarySoft }, pressed && { transform: [{ scale: 0.96 }] }]}>
          <Text variant="subheading" font="arabicBold" color="primary">{tasbihDhikr}</Text>
        </Pressable>

        <Pressable onPress={() => { setDraft(tasbihDhikr); setEditOpen(true); }} hitSlop={8} style={{ marginTop: space[2] }}>
          <Text variant="caption" color="tertiary">
            {t('tasbih.editDhikr')} <Ionicons name="pencil" size={12} color={colors.textTertiary} />
          </Text>
        </Pressable>

        <View style={[styles.track, { backgroundColor: colors.bgSunken, borderColor: colors.hairline }]}>
          <View style={[styles.fill, { backgroundColor: colors.primary, width: `${progress * 100}%` }]} />
        </View>

        <View style={styles.targets}>
          {[33, 50, 100].map((n) => (
            <Pressable
              key={n}
              onPress={() => {
                setTasbihTarget(n);
                setCount(0);
              }}
              style={[styles.targetChip, { borderColor: n === tasbihTarget ? colors.primary : colors.hairline, backgroundColor: n === tasbihTarget ? colors.primarySoft : colors.card }]}
            >
              <Text variant="caption" font="uiBold" color={n === tasbihTarget ? 'primary' : 'secondary'}>{n}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={{ position: 'absolute', bottom: insets.bottom + 16, right: 16 }}>
        <Pressable onPress={reset} style={[styles.resetFab, { backgroundColor: colors.primary }]}>
          <Ionicons name="refresh" size={20} color={colors.textOnEmphasis} />
        </Pressable>
      </View>

      <ResizableSheet visible={editOpen} onClose={() => setEditOpen(false)}>
        <View style={{ paddingHorizontal: space[5], paddingBottom: insets.bottom + space[4] }}>
          <Text variant="subheading" font="uiBold" style={{ textAlign: 'center', marginBottom: space[4] }}>
            {t('tasbih.editDhikr')}
          </Text>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="سُبْحَانَ الله"
            placeholderTextColor={colors.placeholder}
            style={[styles.input, { color: colors.text, borderColor: colors.hairline, backgroundColor: colors.card }]}
          />
          <Button
            title={t('common.save')}
            disabled={!draft.trim()}
            style={{ marginTop: space[3] }}
            onPress={() => {
              setTasbihDhikr(draft.trim());
              setEditOpen(false);
            }}
          />
        </View>
      </ResizableSheet>
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
  ring: {
    width: 240,
    height: 240,
    borderRadius: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: space[7],
  },
  track: {
    width: 260,
    height: 8,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 4 },
  targets: { flexDirection: 'row', gap: space[2], marginTop: space[5] },
  targetChip: { paddingHorizontal: space[4], paddingVertical: space[2], borderRadius: radius.pill, borderWidth: 1 },
  resetFab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: { borderWidth: 1, borderRadius: radius.md, padding: space[3] },
});
