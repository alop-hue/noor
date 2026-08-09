import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button, Segmented, Text, Toggle, LoadingState } from '@/components/ui';
import { ResizableSheet } from '@/components/ui/Sheet';
import { MushafReader } from '@/components/quran/MushafReader';
import { getAyahs, getSurah, getSurahTranslations, getTafsir, type AyahRow, type SurahRow, type TafsirRow, type TranslationRow, TAFSIR_BY_LANG, TAFSIR_SOURCES, TRANSLATION_EDITIONS } from '@/db/queries';
import { getMemorizedSurah, getNote, isAyahBookmarked, isAyahMemorized, saveNote, toggleAyahBookmark, toggleAyahMemorized } from '@/db/userdb';
import { colorizeWords, splitWords } from '@/features/quran/tajweed';
import { arabicSurahName, surahDisplayName } from '@/features/quran/surahNames';
import { playSurah, playWord, RECITERS, startMemorizeRange, stopMemorize, subscribeToPlayer, togglePlayPause, type PlayerStatus } from '@/services/audio';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeContext';
import { radius, space } from '@/theme/tokens';
import { Clipboard } from 'react-native';

const TAJWEED_COLOR_KEY = { madd: 'madd', qalqalah: 'qalqalah', ghunnah: 'ghunnah', ikhfa: 'ikhfa', hamzat: 'hamzat' } as const;

const MEMORIZE_REPEATS = [1, 3, 5, 10] as const;

interface LoadedVerse {
  ayah: AyahRow;
  translation: string;
}

export default function ReaderScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ surah: string; ayah?: string; memorize?: string }>();
  const surahId = Number(params.surah);
  const targetAyah = params.ayah ? Number(params.ayah) : undefined;

  const { defaultTranslation, showTranslation, tajweed, wordByWord, setShowTranslation, setTajweed, setWordByWord, setDefaultTranslation, setLastRead, audio, setAudio, lastRead } = useSettings();

  const [surah, setSurah] = useState<SurahRow | null>(null);
  const [verses, setVerses] = useState<LoadedVerse[] | null>(null);
  const [active, setActive] = useState<LoadedVerse | null>(null);
  const [tafsir, setTafsir] = useState<Record<string, TafsirRow | null>>({});
  const [tafsirTab, setTafsirTab] = useState(TAFSIR_BY_LANG[i18n.language] ?? TAFSIR_SOURCES[0].id);
  const [note, setNote] = useState('');
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isMemorized, setIsMemorized] = useState(false);
  const [player, setPlayer] = useState<PlayerStatus>({ playing: false, isLoaded: false, currentTime: 0, duration: 0, didJustFinish: false, surah: null, memorize: null });
  const listRef = useRef<FlatList<LoadedVerse>>(null);
  const [sheetVerse, setSheetVerse] = useState<number | null>(null);
  const [memorizeMode, setMemorizeMode] = useState(params.memorize === '1');
  const isArabic = i18n.language.startsWith('ar');
  const isUrdu = i18n.language.startsWith('ur');
  const [memorized, setMemorized] = useState<Set<number>>(new Set());
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const [focusAyah, setFocusAyah] = useState(targetAyah ?? 1);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const [s, ayahs, trs] = await Promise.all([
        getSurah(surahId),
        getAyahs(surahId),
        getSurahTranslations(surahId, defaultTranslation),
      ]);
      setSurah(s);
      const trMap = new Map<number, string>();
      for (const tr of trs) trMap.set(tr.ayah, tr.text);
      setVerses(ayahs.map((a) => ({ ayah: a, translation: trMap.get(a.ayah) ?? '' })));
      setMemorized(new Set(await getMemorizedSurah(surahId)));
      if (targetAyah) {
        setTimeout(() => scrollToAyah(targetAyah), 350);
      }
    })();
  }, [surahId, defaultTranslation]);

  useEffect(() => {
    const unsub = subscribeToPlayer(setPlayer);
    return unsub;
  }, []);

  const scrollToAyah = useCallback((ayah: number) => {
    const idx = verses?.findIndex((v) => v.ayah.ayah === ayah) ?? -1;
    if (idx >= 0 && listRef.current) {
      listRef.current.scrollToIndex({ index: idx, viewPosition: 0.2 });
    }
  }, [verses]);

  useEffect(() => {
    if (player.memorize?.surah === surahId && player.memorize.currentAyah !== focusAyah) {
      setFocusAyah(player.memorize.currentAyah);
      scrollToAyah(player.memorize.currentAyah);
    }
  }, [player.memorize, surahId, focusAyah, scrollToAyah]);

  const openSheet = useCallback(async (v: LoadedVerse) => {
    setActive(v);
    setSheetVerse(v.ayah.ayah);
    const [bm, m, n] = await Promise.all([isAyahBookmarked(v.ayah.surah, v.ayah.ayah), isAyahMemorized(v.ayah.surah, v.ayah.ayah), getNote(v.ayah.surah, v.ayah.ayah)]);
    setIsBookmarked(bm);
    setIsMemorized(m);
    setNote(n ?? '');
    const srcs = TAFSIR_SOURCES.map((s) => s.id);
    const rows = await getTafsir(srcs, v.ayah.surah, v.ayah.ayah);
    const map: Record<string, TafsirRow | null> = {};
    for (const s of srcs) map[s] = rows.find((r) => r.source === s) ?? null;
    setTafsir(map);
  }, []);

  const copyVerse = async (v: LoadedVerse) => {
    const surahName = surah?.english_name ?? '';
    const text = `${v.ayah.arabic}\n\n${v.translation}\n\n— ${surahName} ${v.ayah.ayah}`;
    await Clipboard.setString(text);
  };

  const shareVerse = async (v: LoadedVerse) => {
    const text = `${v.ayah.arabic}\n${v.translation}\n— ${surah?.english_name} ${v.ayah.ayah}`;
    await Share.share({ message: text });
  };

  const toggleMemorizeState = useCallback(async (ayah: number) => {
    const now = await toggleAyahMemorized(surahId, ayah);
    setMemorized((prev) => {
      const next = new Set(prev);
      if (now) next.add(ayah);
      else next.delete(ayah);
      return next;
    });
    setIsMemorized(now);
  }, [surahId]);

  const toggleHiddenState = useCallback((ayah: number) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(ayah)) next.delete(ayah);
      else next.add(ayah);
      return next;
    });
  }, []);

  const moveFocus = useCallback((delta: number) => {
    setFocusAyah((f) => {
      const total = verses?.length ?? 0;
      const next = Math.min(Math.max(1, f + delta), Math.max(1, total));
      scrollToAyah(next);
      return next;
    });
  }, [verses, scrollToAyah]);

  const memorizeActive = player.memorize?.surah === surahId;

  const renderArabic = (v: LoadedVerse) => {
    const words = splitWords(v.ayah.arabic);
    if (tajweed && wordByWord) {
      const colored = colorizeWords(words);
      return colored.map((spans, i) => (
        <View key={i} style={styles.wordBox}>
          {spans.map((span, j) => (
            <Text key={j} variant="quranWord" font="quranBold" color={span.color === 'default' ? 'text' : 'text'} style={span.color !== 'default' ? { color: colors.tajweed[TAJWEED_COLOR_KEY[span.color]] } : undefined}>
              {span.text}
            </Text>
          ))}
        </View>
      ));
    }
    if (tajweed) {
      return colorizeWords(words).map((spans, i) => (
        <View key={i} style={{ flexDirection: 'row', flexWrap: 'wrap', direction: 'rtl' }}>
          {spans.map((span, j) => (
            <Text key={j} variant="quranCompact" font="quranBold" style={{ textAlign: 'justify', ...(span.color !== 'default' ? { color: colors.tajweed[TAJWEED_COLOR_KEY[span.color]] } : { color: colors.quranText }) }}>
              {span.text}{' '}
            </Text>
          ))}
        </View>
      ));
    }
    return (
      <Text variant="quranCompact" font="quranBold" style={{ color: colors.quranText, textAlign: 'justify' }}>
        {v.ayah.arabic}
      </Text>
    );
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: { item: LoadedVerse }[] }) => {
    const first = viewableItems[0]?.item as LoadedVerse | undefined;
    if (first) setLastRead(first.ayah.surah, first.ayah.ayah);
  }).current;

  const playingThis = player.surah === surahId && player.playing;
  const resumeFrom = lastRead && lastRead.surah === surahId ? lastRead.ayah : undefined;
  const startPlayback = () => playSurah(surahId, resumeFrom);
  const activeAyah = playingThis ? Math.min(verses?.length ?? 1, Math.floor(player.currentTime / 25) + 1) : null;

  if (!surah || !verses) return <LoadingState label={t('common.loading')} />;

  const showBismillah = surahId !== 1 && surahId !== 9;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { backgroundColor: colors.bgElevated, borderBottomColor: colors.hairline, paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text variant="subheading" font="arabicBold">
              {i18n.language.startsWith('ar') ? (arabicSurahName(surahId) || surah.name) : surah.name}
            </Text>
            <Text variant="caption" color="secondary">
              {i18n.language.startsWith('ar')
                ? `${t(`quran.${surah.type === 'Meccan' ? 'meccan' : 'medinan'}`)} · ${surah.ayahs}`
                : `${surah.english_name} · ${t(`quran.${surah.type === 'Meccan' ? 'meccan' : 'medinan'}`)} · ${surah.ayahs}`}
            </Text>
          </View>
          <Pressable
            onPress={() => (playingThis ? togglePlayPause() : startPlayback())}
            hitSlop={8}
            style={[styles.iconBtn, { backgroundColor: colors.primarySoft }]}
          >
            <Ionicons name={playingThis ? 'pause' : 'play'} size={18} color={colors.primary} />
          </Pressable>
        </View>
        <View style={styles.controlsWrap}>
          <View style={styles.controls}>
            <Pressable onPress={() => setSettingsOpen(true)} hitSlop={8} style={[styles.iconBtn, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="options-outline" size={18} color={colors.primary} />
            </Pressable>
          </View>
        </View>
      </View>

      <ResizableSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space[5], paddingBottom: insets.bottom + space[4] }}>
          <Text variant="subheading" font="uiBold" style={{ textAlign: 'center', marginBottom: space[3] }}>
            {t('quran.readerSettings')}
          </Text>
          {!isArabic && (
            <View style={styles.settingRow}>
              <Text variant="bodySmall" color="secondary">{t('quran.translations')}</Text>
              <Toggle value={showTranslation} onValueChange={setShowTranslation} />
            </View>
          )}
          <View style={[styles.settingRow, { borderBottomColor: colors.hairline }]}>
            <Text variant="bodySmall" color="secondary">{t('quran.tajweed')}</Text>
            <Toggle value={tajweed} onValueChange={setTajweed} />
          </View>
          <View style={[styles.settingRow, { borderBottomColor: colors.hairline }]}>
            <Text variant="bodySmall" color="secondary">{t('quran.wordByWord')}</Text>
            <Toggle value={wordByWord} onValueChange={setWordByWord} />
          </View>
          <View style={[styles.settingRow, { borderBottomColor: colors.hairline }]}>
            <Text variant="bodySmall" color="secondary">{t('memorize.title')}</Text>
            <Toggle value={memorizeMode} onValueChange={setMemorizeMode} />
          </View>
          <Text variant="caption" font="uiBold" color="tertiary" style={styles.sheetSection}>
            {t('audio.reciter')}
          </Text>
          {RECITERS.map((r) => {
            const activeRec = r.id === audio.reciterId;
            return (
              <Pressable
                key={r.id}
                onPress={() => {
                  setAudio({ reciterId: r.id });
                  if (playingThis) startPlayback();
                }}
                style={({ pressed }) => [
                  styles.reciterRow,
                  { borderBottomColor: colors.hairline },
                  activeRec && { backgroundColor: colors.primarySoft },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text variant="bodySmall" font="uiBold" color={activeRec ? 'primary' : 'text'}>
                    {i18n.language.startsWith('ar') ? (r.ar ?? r.name) : r.name}
                  </Text>
                  <Text variant="micro" color="tertiary">{r.style}</Text>
                </View>
                {activeRec ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </ResizableSheet>

      <MushafReader
        surahId={surahId}
        surahName={i18n.language.startsWith('ar') ? (arabicSurahName(surahId) || surah.name) : surah.name}
        verses={verses.map((v) => ({ ayah: v.ayah.ayah, arabic: v.ayah.arabic, sajda: v.ayah.sajda }))}
        showBismillah={showBismillah}
        activeAyah={activeAyah}
        focusAyah={memorizeMode ? focusAyah : undefined}
        memorizeMode={memorizeMode}
        tajweed={tajweed}
        wordByWord={wordByWord}
        onPressAyah={(ayah) => {
          const v = verses.find((x) => x.ayah.ayah === ayah);
          if (v) void openSheet(v);
        }}
        onPressWord={(ayah, word) => {
          void playWord(surahId, ayah, word).then((ok) => {
            if (!ok) void playSurah(surahId, ayah);
          });
        }}
        onLongPressAyah={(ayah) => {
          // Hold an aya to start the full surah recitation from it
          void playSurah(surahId, ayah);
        }}
        onPageChange={(ayah) => setLastRead(surahId, ayah)}
        onNextSurah={() => surahId < 114 && router.replace(`/quran/${surahId + 1}`)}
      />

      {memorizeMode && (
        <View style={[styles.memorizeBar, { backgroundColor: colors.bgElevated, borderTopColor: colors.hairline, paddingBottom: insets.bottom }]}>
          <View style={styles.memorizeRow}>
            {MEMORIZE_REPEATS.map((n) => (
              <Pressable
                key={n}
                onPress={() => setAudio({ memorizeRepeat: n })}
                style={[
                  styles.repeatChip,
                  { borderColor: audio.memorizeRepeat === n ? colors.primary : colors.hairline, backgroundColor: audio.memorizeRepeat === n ? colors.primarySoft : colors.card },
                ]}
              >
                <Text variant="micro" font="uiBold" color={audio.memorizeRepeat === n ? 'primary' : 'secondary'}>×{n}</Text>
              </Pressable>
            ))}
            <View style={{ flex: 1 }} />
            {memorizeActive && (
              <Text variant="micro" color="primary">
                {t('memorize.remaining', { n: player.memorize!.repeatLeft })}
              </Text>
            )}
          </View>
          <View style={styles.memorizeRow}>
            <Pressable onPress={() => moveFocus(-1)} hitSlop={8} style={styles.iconBtn}>
              <Ionicons name="play-skip-back" size={20} color={colors.text} />
            </Pressable>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text variant="caption" font="uiBold">{t('memorize.ayahOf', { n: focusAyah, total: verses?.length ?? 0 })}</Text>
              <Text variant="micro" color="tertiary">{t('memorize.tapHint')}</Text>
            </View>
            <Pressable onPress={() => moveFocus(1)} hitSlop={8} style={styles.iconBtn}>
              <Ionicons name="play-skip-forward" size={20} color={colors.text} />
            </Pressable>
          </View>
          <View style={styles.memorizeRow}>
            <Button title={t('memorize.playThis')} variant="secondary" style={{ flex: 1 }} onPress={() => void startMemorizeRange(surahId, focusAyah, focusAyah, audio.memorizeRepeat)} />
            <Button title={t('memorize.playRange')} variant="secondary" style={{ flex: 1 }} onPress={() => void startMemorizeRange(surahId, focusAyah, Math.min(focusAyah + 9, verses?.length ?? focusAyah), audio.memorizeRepeat)} />
            {memorizeActive && <Button title={t('memorize.stop')} variant="ghost" onPress={stopMemorize} />}
          </View>
        </View>
      )}

      <VerseSheet        visible={sheetVerse !== null}
        onClose={() => setSheetVerse(null)}
        verse={active}
        surah={surah}
        tafsir={tafsir}
        tafsirTab={tafsirTab}
        setTafsirTab={setTafsirTab}
        isBookmarked={isBookmarked}
        onToggleBookmark={async () => {
          if (!active) return;
          const bm = await toggleAyahBookmark(active.ayah.surah, active.ayah.ayah);
          setIsBookmarked(bm);
        }}
        isMemorized={isMemorized}
        onToggleMemorize={async () => {
          if (!active) return;
          await toggleMemorizeState(active.ayah.ayah);
        }}
        note={note}
        setNote={setNote}
        onSaveNote={async () => {
          if (!active) return;
          await saveNote(active.ayah.surah, active.ayah.ayah, note);
        }}
        onCopy={() => active && copyVerse(active)}
        onShare={() => active && shareVerse(active)}
        onPlay={() => {
          if (!active) return;
          playSurah(active.ayah.surah, active.ayah.ayah);
          setSheetVerse(null);
        }}
        defaultTranslation={defaultTranslation}
        onChangeTranslation={(ed) => setDefaultTranslation(ed)}
        isArabic={isArabic}
        showTafsir={isArabic || isUrdu}
        t={t}
        colors={colors}
      />
    </View>
  );
}

function VerseSheet({
  visible, onClose, verse, surah, tafsir, tafsirTab, setTafsirTab, isBookmarked, onToggleBookmark, isMemorized, onToggleMemorize, note, setNote, onSaveNote, onCopy, onShare, onPlay, defaultTranslation, onChangeTranslation, isArabic, showTafsir, t, colors,
}: {
  visible: boolean;
  onClose: () => void;
  verse: LoadedVerse | null;
  surah: SurahRow | null;
  tafsir: Record<string, TafsirRow | null>;
  tafsirTab: string;
  setTafsirTab: (s: string) => void;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  isMemorized: boolean;
  onToggleMemorize: () => void;
  note: string;
  setNote: (s: string) => void;
  onSaveNote: () => void;
  onCopy: () => void;
  onShare: () => void;
  onPlay: () => void;
  defaultTranslation: string;
  onChangeTranslation: (ed: string) => void;
  isArabic: boolean;
  showTafsir: boolean;
  t: (k: string, o?: Record<string, unknown>) => string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const [editions, setEditions] = useState<string[]>([]);
  useEffect(() => {
    setEditions(Object.keys(TRANSLATION_EDITIONS));
  }, []);
  const tafsirRows = TAFSIR_SOURCES.filter((s) => (isArabic ? s.lang === 'ar' : s.lang === 'ur' || s.lang === 'en'));
  return (
    <ResizableSheet visible={visible} onClose={onClose}>
      {verse && (
        <>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space[5], paddingBottom: space[4] }} >
            <Text variant="quranCompact" font="quranBold" style={{ color: colors.quranText, textAlign: 'center' }}>
              {verse.ayah.arabic}
            </Text>
            {!isArabic && (
              <Text variant="bodySmall" color="secondary" style={{ marginTop: space[3] }}>
                {verse.translation}
              </Text>
            )}

            {!isArabic && (
              <>
                <Text variant="caption" font="uiBold" color="tertiary" style={styles.sheetSection}>
                  {t('quran.translations')}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space[5] }} contentContainerStyle={{ paddingHorizontal: space[5], gap: space[2] }} >
                  {editions.map((ed) => (
                    <Pressable
                      key={ed}
                      onPress={() => onChangeTranslation(ed)}
                      style={[
                        styles.editionChip,
                        { borderColor: ed === defaultTranslation ? colors.primary : colors.hairline, backgroundColor: ed === defaultTranslation ? colors.primarySoft : colors.card },
                      ]}
                    >
                      <Text variant="micro" font="uiBold" color={ed === defaultTranslation ? 'primary' : 'secondary'}>
                        {TRANSLATION_EDITIONS[ed].label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}

            {showTafsir && (
              <>
                <Text variant="caption" font="uiBold" color="tertiary" style={styles.sheetSection}>
                  {t('quran.tafsir')}
                </Text>
                <Segmented
                  options={tafsirRows.map((s) => ({ value: s.id, label: s.label }))}
                  value={tafsirTab}
                  onChange={setTafsirTab}
                />
                <View style={{ marginTop: space[3] }}>
                  {tafsir[tafsirTab] ? (
                    <Text variant="bodySmall" color="secondary" style={{ lineHeight: 22 }}>
                      {stripHtml(tafsir[tafsirTab]!.text)}
                    </Text>
                  ) : (
                    <Text variant="bodySmall" color="tertiary">{t('hadith.noResults')}</Text>
                  )}
                </View>
              </>
            )}

              <Text variant="caption" font="uiBold" color="tertiary" style={styles.sheetSection}>
                {t('quran.notes')}
              </Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                multiline
                placeholder={t('quran.addNote')}
                placeholderTextColor={colors.placeholder}
                style={[styles.noteInput, { color: colors.text, borderColor: colors.hairline, backgroundColor: colors.card }]}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                <Button title={t('quran.saveNote')} onPress={onSaveNote} variant="secondary" style={{ marginTop: space[2] }} />
              </View>

              <View style={[styles.actionRow, { borderTopColor: colors.hairline }]}>
                <ActionBtn icon={isBookmarked ? 'bookmark' : 'bookmark-outline'} label={t('quran.bookmarkVerse')} onPress={onToggleBookmark} active={isBookmarked} colors={colors} />
                <ActionBtn icon={isMemorized ? 'school' : 'school-outline'} label={t('memorize.title')} onPress={onToggleMemorize} active={isMemorized} colors={colors} />
                <ActionBtn icon="play" label={t('quran.audio')} onPress={onPlay} colors={colors} />
                <ActionBtn icon="copy-outline" label={t('quran.copyVerse')} onPress={onCopy} colors={colors} />
                <ActionBtn icon="share-outline" label={t('common.share')} onPress={onShare} colors={colors} />
              </View>
              <Text variant="caption" color="tertiary" style={{ textAlign: 'center', marginTop: space[4] }}>
                {surah?.english_name} {t('quran.verseNumber')} {verse.ayah.ayah} · {t('quran.juzShort', { n: verse.ayah.juz })} · {t('quran.page')} {verse.ayah.page}
              </Text>
            </ScrollView>
          </>
        )}
    </ResizableSheet>
  );
}

function ActionBtn({ icon, label, onPress, active, colors }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; active?: boolean; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}>
      <Ionicons name={icon} size={20} color={active ? colors.primary : colors.textSecondary} />
      <Text variant="micro" font="uiBold" color={active ? 'primary' : 'secondary'}>{label}</Text>
    </Pressable>
  );
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

const styles = StyleSheet.create({
  header: { borderBottomWidth: StyleSheet.hairlineWidth * 2 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingHorizontal: space[3], paddingVertical: space[2] },
  iconBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  controlsWrap: { paddingBottom: space[2] },
  controls: { flexDirection: 'row', gap: space[4], paddingHorizontal: space[3] },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space[3], borderTopWidth: StyleSheet.hairlineWidth },
  bismillah: { alignItems: 'center', paddingVertical: space[5] },
  ayahBlock: { paddingHorizontal: space[5], paddingVertical: space[3] },
  ayahText: { flexDirection: 'row', flexWrap: 'wrap', direction: 'rtl', gap: space[2] },
  wordBox: { flexDirection: 'row', flexWrap: 'wrap', direction: 'rtl' },
  ayahMeta: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginTop: space[1] },
  ayahNum: { borderWidth: 1, borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  sajda: { paddingHorizontal: space[2], paddingVertical: 2, borderRadius: radius.sm },
  translation: { marginTop: space[2] },
  nextSurah: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth * 2, marginTop: space[4], paddingTop: space[3] },
  sheetGrabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(128,128,128,0.4)', marginTop: space[2], marginBottom: space[2] },
  sheetSection: { marginTop: space[5], marginBottom: space[2], textTransform: 'uppercase', letterSpacing: 1 },
  editionChip: { paddingHorizontal: space[3], paddingVertical: space[2], borderWidth: 1, borderRadius: radius.pill },
  noteInput: { minHeight: 80, borderWidth: 1, borderRadius: radius.md, padding: space[3], textAlignVertical: 'top' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: space[5], paddingTop: space[4], borderTopWidth: StyleSheet.hairlineWidth * 2 },
  actionBtn: { alignItems: 'center', gap: 4 },
  hiddenPlaceholder: { flex: 1, borderWidth: 1, borderStyle: 'dashed', borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingVertical: space[4], marginBottom: space[2] },
  memorizeBar: { borderTopWidth: StyleSheet.hairlineWidth * 2, paddingHorizontal: space[4], paddingTop: space[2], gap: space[2] },
  memorizeRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  repeatChip: { paddingHorizontal: space[3], paddingVertical: 4, borderWidth: 1, borderRadius: radius.pill },
  reciterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space[3], borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: space[2] },
});
