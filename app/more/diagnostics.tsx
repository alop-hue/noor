import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button, EmptyState, Text } from '@/components/ui';
import { clearLog, readLog, type DiagnosticEntry } from '@/services/diagnostics';
import { useTheme } from '@/theme/ThemeContext';
import { space } from '@/theme/tokens';

const LEVEL_COLOR = { error: 'danger', warn: 'accent', info: 'tertiary' } as const;

export default function DiagnosticsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [entries, setEntries] = useState<DiagnosticEntry[] | null>(null);

  const load = useCallback(async () => {
    setEntries(await readLog());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const share = async () => {
    const text = entries?.map((e) => `[${e.ts}] ${e.level.toUpperCase()} ${e.message}${e.stack ? `\n${e.stack}` : ''}`).join('\n\n') ?? '';
    await Share.share({ message: text });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={[styles.header, { backgroundColor: colors.bgElevated, borderBottomColor: colors.hairline }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text variant="subheading" font="uiBold">{t('settings.diagnostics')}</Text>
        <Pressable onPress={() => { clearLog(); load(); }} hitSlop={8}>
          <Ionicons name="trash-outline" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>

      {!entries ? null : entries.length === 0 ? (
        <EmptyState title={t('settings.noDiagnostics')} />
      ) : (
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: space[3] }}>
            <Button title={t('common.share')} variant="secondary" onPress={share} />
          </View>
          <View style={{ flex: 1, paddingHorizontal: space[4] }}>
            {entries.map((e, i) => (
              <View key={i} style={[styles.entry, { borderBottomColor: colors.hairline }]}>
                <Text variant="micro" font="uiBold" color={LEVEL_COLOR[e.level]}>{e.level.toUpperCase()}</Text>
                <Text variant="caption" color="tertiary">{e.ts.replace('T', ' ').slice(0, 19)}</Text>
                <Text variant="bodySmall" color="secondary" selectable>{e.message}</Text>
                {e.stack ? <Text variant="micro" color="tertiary" selectable numberOfLines={6}>{e.stack}</Text> : null}
              </View>
            ))}
          </View>
        </>
      )}
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
  entry: { paddingVertical: space[2], borderBottomWidth: StyleSheet.hairlineWidth * 2, gap: 2 },
});
