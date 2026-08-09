import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Linking, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';

import { Button, EmptyState, LoadingState, Segmented, Text } from '@/components/ui';
import { ResizableSheet } from '@/components/ui/Sheet';
import { addUserMosque, deleteUserMosque, getUserMosques, type UserMosque } from '@/db/userdb';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeContext';
import { radius, space } from '@/theme/tokens';

interface Mosque {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distanceKm: number;
  mine?: boolean;
  userId?: number;
}

interface OverpassElem {
  id: number;
  lat: number;
  lon: number;
  tags: Record<string, string>;
}

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.osm.ch/api/interpreter',
];

const RADII = [1, 3, 10] as const;

const MOSQUE_QUERY = (lat: number, lng: number, radiusM: number) =>
  `[out:json][timeout:15];(node["amenity"="place_of_worship"]["religion"="muslim"](around:${radiusM},${lat},${lng}););out tags;`;

export default function MosqueScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { prayer } = useSettings();
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [radiusKm, setRadiusKm] = useState<(typeof RADII)[number]>(3);
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [newCoords, setNewCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const useMyLocation = async () => {
    setLocating(true);
    const c = await currentCoords();
    if (c) {
      setNewCoords(c);
      setSaved(false);
    }
    setLocating(false);
  };

  const saveMosque = async () => {
    const trimmed = name.trim();
    if (!trimmed || !newCoords) return;
    setSaving(true);
    await addUserMosque(trimmed, newCoords.lat, newCoords.lng);
    setSaving(false);
    setSaved(true);
    setAddOpen(false);
    setName('');
    setNewCoords(null);
    void find(radiusKm);
  };

  const removeMine = async (m: Mosque) => {
    if (m.userId != null) {
      await deleteUserMosque(m.userId);
      setMosques((prev) => prev.filter((x) => x.id !== m.id));
    }
  };

  const validCoords = (lat: number, lng: number) =>
    Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);

  const currentCoords = useCallback(async (): Promise<{ lat: number; lng: number } | null> => {
    if (prayer.coords && validCoords(prayer.coords.lat, prayer.coords.lng)) {
      return { lat: prayer.coords.lat, lng: prayer.coords.lng };
    }
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) return null;
    const loc = await Location.getCurrentPositionAsync({});
    return { lat: loc.coords.latitude, lng: loc.coords.longitude };
  }, [prayer.coords]);

  const km = useCallback(
    (lat1: number, lng1: number, lat2: number, lng2: number) => {
      if (!validCoords(lat1, lng1) || !validCoords(lat2, lng2)) return NaN;
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLng = ((lng2 - lng1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    },
    [],
  );

  const find = async (radius: number = radiusKm) => {
    setState('loading');
    try {
      const coords = await currentCoords();
      if (!coords) {
        setState('error');
        return;
      }
      const query = MOSQUE_QUERY(coords.lat, coords.lng, radius * 1000);
      let json: { elements?: unknown[] } | null = null;
      for (const mirror of OVERPASS_MIRRORS) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 15000);
        try {
          const res = await fetch(`${mirror}?data=${encodeURIComponent(query)}`, { signal: ctrl.signal });
          if (!res.ok) continue;
          json = await res.json();
          break;
        } catch {
          // try next mirror
        } finally {
          clearTimeout(timer);
        }
      }
      if (!json) throw new Error('all overpass mirrors failed');
      const raw = (json.elements ?? []) as OverpassElem[];
      const overpass: Mosque[] = raw
        .filter((e) => !!(e.tags && (e.tags.name || e.tags['name:en'])))
        .map((e) => ({
          id: `o${e.id}`,
          name: e.tags['name:en'] || e.tags.name || t('mosque.name'),
          lat: e.lat,
          lng: e.lon,
          distanceKm: km(coords.lat, coords.lng, e.lat, e.lon),
          mine: false,
        }))
        .filter((m) => Number.isFinite(m.distanceKm))
        .sort((a: Mosque, b: Mosque) => a.distanceKm - b.distanceKm)
        .slice(0, 50);
      const mine = (await getUserMosques())
        .map((m): Mosque => ({
          id: `u${m.id}`,
          name: m.name,
          lat: m.lat,
          lng: m.lng,
          distanceKm: km(coords.lat, coords.lng, m.lat, m.lng),
          mine: true,
          userId: m.id,
        }))
        .filter((m) => Number.isFinite(m.distanceKm));
      setMosques([...mine, ...overpass].sort((a, b) => a.distanceKm - b.distanceKm));
      setState('ok');
    } catch (e) {
      console.warn('overpass failed', e);
      setState('error');
    }
  };

  useEffect(() => {
    find();
  }, []);

  const openMaps = (m: Mosque) => {
    const label = encodeURIComponent(m.name);
    const gmaps = `https://www.google.com/maps/search/?api=1&query=${m.lat},${m.lng}`;
    Linking.openURL(gmaps).catch(() => Linking.openURL(`geo:${m.lat},${m.lng}?q=${label}`));
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={[styles.header, { backgroundColor: colors.bgElevated, borderBottomColor: colors.hairline }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text variant="subheading" font="uiBold">{t('tools.mosque')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.radiusRow}>
        <Text variant="caption" color="secondary">{t('mosque.radius')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1, marginStart: space[2] }}>
          <Segmented
            options={RADII.map((r) => ({ value: String(r), label: `${r} km` }))}
            value={String(radiusKm)}
            onChange={(v) => {
              const r = Number(v) as (typeof RADII)[number];
              setRadiusKm(r);
              void find(r);
            }}
          />
        </ScrollView>
        <Pressable onPress={() => setAddOpen(true)} hitSlop={8} style={[styles.addBtn, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="add" size={20} color={colors.primary} />
        </Pressable>
      </View>

      {state === 'loading' && <LoadingState label={t('mosque.loading')} />}
      {state === 'error' && (
        <View style={{ flex: 1 }}>
          <EmptyState title={t('mosque.error')} hint={t('mosque.noResultsHint')} />
          <View style={{ paddingHorizontal: space[4] }}>
            <Button title={t('mosque.find')} onPress={() => find(radiusKm)} />
          </View>
        </View>
      )}
      {state === 'idle' && (
        <View style={{ padding: space[4] }}>
          <Button title={t('mosque.find')} onPress={() => find(radiusKm)} />
        </View>
      )}
      {state === 'ok' &&
        (mosques.length === 0 ? (
          <EmptyState title={t('mosque.noResults')} hint={t('mosque.noResultsHint')} />
        ) : (
          <FlatList showsVerticalScrollIndicator={false}
            data={mosques}
            keyExtractor={(m) => m.id}
           
            contentContainerStyle={{ paddingBottom: insets.bottom + space[8] }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => openMaps(item)}
                style={({ pressed }) => [styles.row, { borderBottomColor: colors.hairline }, pressed && { backgroundColor: colors.bgSunken }]}
              >
                <View style={[styles.icon, { backgroundColor: item.mine ? colors.accentSoft : colors.primarySoft }]}>
                  <Ionicons name={item.mine ? 'star' : 'location'} size={20} color={item.mine ? colors.accent : colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="body" font="uiBold">{item.name}</Text>
                  <Text variant="caption" color="secondary">
                    {item.mine ? t('mosque.addedByYou') : ''}
                    {item.mine && Number.isFinite(item.distanceKm) ? ' · ' : ''}
                    {Number.isFinite(item.distanceKm) ? t('mosque.distance', { n: item.distanceKm.toFixed(1) }) : ''}
                  </Text>
                </View>
                {item.mine ? (
                  <Pressable onPress={() => void removeMine(item)} hitSlop={8} style={{ padding: 4 }}>
                    <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
                  </Pressable>
                ) : (
                  <Text variant="caption" color="primary">{t('mosque.openMaps')}</Text>
                )}
              </Pressable>
            )}
          />
        ))}

      <ResizableSheet visible={addOpen} onClose={() => setAddOpen(false)}>
        <View style={{ paddingHorizontal: space[5], paddingBottom: insets.bottom + space[4] }}>
          <Text variant="subheading" font="uiBold" style={{ textAlign: 'center', marginBottom: space[4] }}>
            {t('mosque.addMosque')}
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t('mosque.addName')}
            placeholderTextColor={colors.placeholder}
            style={[styles.input, { color: colors.text, borderColor: colors.hairline, backgroundColor: colors.card }]}
          />
          <Button
            title={t('mosque.useMyLocation')}
            variant="secondary"
            loading={locating}
            icon="locate-outline"
            style={{ marginTop: space[3] }}
            onPress={() => void useMyLocation()}
          />
          {newCoords ? (
            <Text variant="caption" color="secondary" style={{ marginTop: space[2], textAlign: 'center' }}>
              {newCoords.lat.toFixed(5)}, {newCoords.lng.toFixed(5)}
            </Text>
          ) : null}
          <Button
            title={t('common.save')}
            disabled={!name.trim() || !newCoords}
            loading={saving}
            style={{ marginTop: space[3] }}
            onPress={() => void saveMosque()}
          />
          {saved ? (
            <Text variant="caption" color="primary" style={{ marginTop: space[2], textAlign: 'center' }}>
              {t('mosque.addedByYou')}
            </Text>
          ) : null}
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
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3], paddingHorizontal: space[4], borderBottomWidth: StyleSheet.hairlineWidth * 2 },
  icon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  radiusRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[4], paddingVertical: space[3] },
  addBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginStart: space[2] },
  input: { borderWidth: 1, borderRadius: radius.md, padding: space[3] },
});
