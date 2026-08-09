import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';

import { Button, ListRow, SectionLabel, Text } from '@/components/ui';
import { METHOD_KEYS, computePrayerTimes, formatTime } from '@/services/prayer';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeContext';
import { radius, space } from '@/theme/tokens';

export default function PrayerSettingsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { prayer, setPrayer } = useSettings();
  const [showMethods, setShowMethods] = useState(false);
  const [manual, setManual] = useState(false);
  const [lat, setLat] = useState(prayer.coords ? String(prayer.coords.lat) : '');
  const [lng, setLng] = useState(prayer.coords ? String(prayer.coords.lng) : '');
  const [locating, setLocating] = useState(false);

  const times = prayer.coords ? computePrayerTimes(prayer.method, prayer.coords.lat, prayer.coords.lng, new Date()) : null;

  const useGps = async () => {
    setLocating(true);
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.granted) {
      const loc = await Location.getCurrentPositionAsync({});
      setPrayer({ coords: { lat: loc.coords.latitude, lng: loc.coords.longitude } });
      setManual(false);
    }
    setLocating(false);
  };

  const saveManual = () => {
    const la = parseFloat(lat);
    const ln = parseFloat(lng);
    if (!Number.isNaN(la) && !Number.isNaN(ln)) {
      setPrayer({ coords: { lat: la, lng: ln } });
      setManual(false);
    }
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={{ backgroundColor: colors.bg }} contentContainerStyle={{ paddingTop: insets.top + space[3], paddingBottom: insets.bottom + space[8] }} >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text variant="subheading" font="uiBold">{t('prayer.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <SectionLabel>{t('prayer.method')}</SectionLabel>
      <ListRow
        icon={<Ionicons name="calculator-outline" size={20} color={colors.primary} />}
        title={t('prayer.method')}
        subtitle={t(`prayer.methods.${prayer.method}`)}
        onPress={() => setShowMethods((s) => !s)}
        right={<Ionicons name={showMethods ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textTertiary} />}
      />
      {showMethods &&
        METHOD_KEYS.map((m) => (
          <Pressable
            key={m}
            onPress={() => {
              setPrayer({ method: m });
              setShowMethods(false);
            }}
            style={[styles.option, { borderBottomColor: colors.hairline }]}
          >
            <Text variant="body" color={prayer.method === m ? 'primary' : 'text'}>{t(`prayer.methods.${m}`)}</Text>
            {prayer.method === m && <Ionicons name="checkmark" size={18} color={colors.primary} />}
          </Pressable>
        ))}

      <SectionLabel>{t('prayer.location')}</SectionLabel>
      <ListRow
        icon={<Ionicons name="navigate-outline" size={20} color={colors.primary} />}
        title={t('prayer.useGps')}
        subtitle={prayer.coords ? `${prayer.coords.lat.toFixed(4)}, ${prayer.coords.lng.toFixed(4)}` : t('prayer.locationDisabled')}
        onPress={useGps}
        right={locating ? <Text variant="caption" color="secondary">{t('common.loading')}</Text> : <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
      />
      <ListRow
        icon={<Ionicons name="create-outline" size={20} color={colors.primary} />}
        title={t('prayer.manualLocation')}
        onPress={() => setManual((m) => !m)}
        right={<Ionicons name={manual ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textTertiary} />}
      />
      {manual && (
        <View style={styles.manualBox}>
          <TextInput
            value={lat}
            onChangeText={setLat}
            placeholder={t('prayer.lat')}
            placeholderTextColor={colors.placeholder}
            keyboardType="numbers-and-punctuation"
            style={[styles.input, { color: colors.text, borderColor: colors.hairline, backgroundColor: colors.card }]}
          />
          <TextInput
            value={lng}
            onChangeText={setLng}
            placeholder={t('prayer.lng')}
            placeholderTextColor={colors.placeholder}
            keyboardType="numbers-and-punctuation"
            style={[styles.input, { color: colors.text, borderColor: colors.hairline, backgroundColor: colors.card }]}
          />
          <Button title={t('prayer.save')} onPress={saveManual} />
        </View>
      )}

      {times && (
        <>
          <SectionLabel>{t('home.todayTimes')}</SectionLabel>
          <View style={{ paddingHorizontal: space[4] }}>
            {(['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const).map((name) => (
              <View key={name} style={[styles.timeRow, { borderBottomColor: colors.hairline }]}>
                <Text variant="body">{t(`prayer.${name}`)}</Text>
                <Text variant="body" font="uiBold">{formatTime(times[name])}</Text>
              </View>
            ))}
          </View>
        </>
      )}
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
  manualBox: { padding: space[4], gap: space[3] },
  input: { borderWidth: 1, borderRadius: radius.md, padding: space[3], fontSize: 15 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: space[2], borderBottomWidth: StyleSheet.hairlineWidth * 2 },
});
