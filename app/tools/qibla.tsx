import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';

import { Surface, Text, LoadingState } from '@/components/ui';
import { qiblaDirection } from '@/services/prayer';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeContext';
import { radius, space } from '@/theme/tokens';

export default function QiblaScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { prayer, setPrayer } = useSettings();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(prayer.coords);
  const [loading, setLoading] = useState(false);
  const [heading, setHeading] = useState<number | null>(null);
  const subscribed = useRef(false);

  useEffect(() => {
    if (!prayer.coords) {
      (async () => {
        setLoading(true);
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.granted) {
          const loc = await Location.getCurrentPositionAsync({});
          const c = { lat: loc.coords.latitude, lng: loc.coords.longitude };
          setCoords(c);
          setPrayer({ coords: c });
        }
        setLoading(false);
      })();
    }
  }, []);

  useEffect(() => {
    if (subscribed.current) return;
    subscribed.current = true;
    let headingSub: Location.LocationSubscription | null = null;
    let magnetoSub: { remove: () => void } | null = null;

    (async () => {
      const perm = await Location.getForegroundPermissionsAsync();
      if (!perm.granted) return;
      try {
        headingSub = await Location.watchHeadingAsync((h) => setHeading(h.magHeading));
        return;
      } catch {
        // fall through to magnetometer
      }
      Magnetometer.setUpdateInterval(100);
      magnetoSub = Magnetometer.addListener(({ x, y }) => {
        const rad = Math.atan2(x, y);
        const deg = ((rad >= 0 ? rad : 2 * Math.PI + rad) * 180) / Math.PI;
        setHeading((deg + 360) % 360);
      });
    })();

    return () => {
      subscribed.current = false;
      headingSub?.remove();
      magnetoSub?.remove();
    };
  }, []);

  const direction = coords ? qiblaDirection(coords.lat, coords.lng) : null;
  const rotation = direction !== null && heading !== null ? direction - heading : direction ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={[styles.header, { backgroundColor: colors.bgElevated, borderBottomColor: colors.hairline }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text variant="subheading" font="uiBold">{t('tools.qibla')}</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <LoadingState />
      ) : !coords || direction === null ? (
        <Surface style={{ margin: space[4] }}>
          <Text variant="body">{t('qibla.locationNeeded')}</Text>
          <Text variant="bodySmall" color="secondary">{t('qibla.locationNeededHint')}</Text>
        </Surface>
      ) : (
        <View style={{ alignItems: 'center', paddingTop: space[8] }}>
          <View style={[styles.compass, { borderColor: colors.hairline, backgroundColor: colors.card }]}>
            <View
              style={{
                position: 'absolute',
                top: 14,
                alignItems: 'center',
                transform: [{ rotate: `${heading !== null ? -heading : 0}deg` }],
              }}
            >
              <Text variant="micro" font="uiBold" color="tertiary">N</Text>
            </View>
            <Ionicons
              name="navigate"
              size={110}
              color={colors.primary}
              style={{ transform: [{ rotate: `${rotation}deg` }] }}
            />
            <View style={styles.centerDot} />
          </View>
          <Text variant="caption" color="secondary" style={{ marginTop: space[5] }}>{t('qibla.heading')}</Text>
          <Text variant="title" font="uiBold">
            {heading !== null ? Math.round((direction - heading + 360) % 360) : Math.round(direction)}°
          </Text>
          {heading !== null ? (
            <Text variant="micro" color="tertiary" style={{ marginTop: 2 }}>
              {t('qibla.phoneHeading')}: {Math.round(heading)}°
            </Text>
          ) : null}
          <Surface style={{ marginTop: space[6], marginHorizontal: space[4], alignItems: 'center' }}>
            <Text variant="body" font="arabicBold" style={{ fontSize: 28 }}>الكعبة</Text>
            <Text variant="bodySmall" color="secondary" style={{ marginTop: 2 }}>
              {t('qibla.distance')}: {haversine(coords.lat, coords.lng, 21.4225, 39.8262).toFixed(0)} km
            </Text>
          </Surface>
        </View>
      )}
    </View>
  );
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
  compass: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#C9A227',
  },
});
