import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as RNText,
  View,
  type LayoutChangeEvent,
  type NativeSyntheticEvent,
  type TextLayoutEventData,
  type ViewToken,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/ui';
import { colorizeWords, splitWords } from '@/features/quran/tajweed';
import { useTheme } from '@/theme/ThemeContext';
import { space } from '@/theme/tokens';

export interface MushafVerse {
  ayah: number;
  arabic: string;
  sajda?: number;
}

interface Props {
  surahId: number;
  surahName: string;
  verses: MushafVerse[];
  showBismillah: boolean;
  activeAyah: number | null;
  focusAyah?: number;
  memorizeMode?: boolean;
  tajweed: boolean;
  wordByWord?: boolean;
  onPressAyah: (ayah: number) => void;
  onPressWord?: (ayah: number, word: number) => void;
  onLongPressAyah?: (ayah: number) => void;
  hiddenAyahs?: Set<number>;
  onToggleHidden?: (ayah: number) => void;
  onPageChange: (ayah: number) => void;
  onNextSurah?: () => void;
  activeWord?: number | null;
  activeWordAyah?: number | null;
}

const FONT_SIZE = 36;
const LINE_HEIGHT = 64;
const H_PADDING = 16;
const PAGE_BG = '#0A1A14';
const PAGE_TEXT = '#F5EDDA';
const MARKER_COLOR = '#C9A227';
const PAGE_FRAME = '#1A3D2E';
const HEADER_GREEN = '#0B5E3E';

interface Paper {
  bg: string;
  text: string;
  frame: string;
  marker: string;
  markerBg: string;
  tajweed: { madd: string; qalqalah: string; ghunnah: string; ikhfa: string; hamzat: string };
  sajda: string;
  muted: string;
  hairline: string;
  underline: string;
  chipBorder: string;
  chipBg: string;
}

const PAPER_LIGHT: Paper = {
  bg: '#FAF6EB',
  text: '#2B2114',
  frame: '#C2A56B',
  marker: '#9A7B1F',
  markerBg: 'rgba(154,123,31,0.10)',
  tajweed: { madd: '#C0392B', qalqalah: '#1F618D', ghunnah: '#1E8449', ikhfa: '#7D6608', hamzat: '#8E44AD' },
  sajda: '#7A6212',
  muted: 'rgba(43,33,20,0.55)',
  hairline: 'rgba(43,33,20,0.30)',
  underline: 'rgba(43,33,20,0.35)',
  chipBorder: 'rgba(43,33,20,0.22)',
  chipBg: 'rgba(43,33,20,0.06)',
};

const PAPER_DARK: Paper = {
  bg: PAGE_BG,
  text: PAGE_TEXT,
  frame: PAGE_FRAME,
  marker: MARKER_COLOR,
  markerBg: 'rgba(201,162,39,0.12)',
  tajweed: { madd: '#E07B6E', qalqalah: '#7FB3D5', ghunnah: '#82D4A4', ikhfa: '#D8BE6E', hamzat: '#C39BD3' },
  sajda: '#D4AF37',
  muted: 'rgba(245,237,218,0.55)',
  hairline: 'rgba(242,235,216,0.35)',
  underline: 'rgba(242,235,216,0.40)',
  chipBorder: 'rgba(242,235,216,0.22)',
  chipBg: 'rgba(255,255,255,0.06)',
};

const PAPER_AMOLED: Paper = {
  ...PAPER_DARK,
  bg: '#000000',
  frame: '#1C1C1C',
};

const toArabicDigits = (n: number) =>
  String(n).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);

export function MushafReader({
  surahId,
  surahName,
  verses,
  showBismillah,
  activeAyah,
  focusAyah,
  memorizeMode,
  tajweed,
  wordByWord,
  onPressAyah,
  onPressWord,
  onLongPressAyah,
  hiddenAyahs,
  onToggleHidden,
  onPageChange,
  onNextSurah,
  activeWord,
  activeWordAyah,
}: Props) {
  const { mode } = useTheme();
  const paper = mode === 'light' ? PAPER_LIGHT : mode === 'amoled' ? PAPER_AMOLED : PAPER_DARK;
  const { t, i18n } = useTranslation();
  const listRef = useRef<FlatList>(null);
  const [areaH, setAreaH] = useState(0);
  const [pageW, setPageW] = useState(0);
  const [avgCharW, setAvgCharW] = useState<number | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const lastPageRef = useRef(-1);
  const rtl = i18n.dir() === 'rtl';

  useEffect(() => {
    const id = setTimeout(() => {
      setAvgCharW((v) => (v === null ? 15 : v));
    }, 1500);
    return () => clearTimeout(id);
  }, []);

  const onProbeLayout = (e: NativeSyntheticEvent<TextLayoutEventData>) => {
    const line = e.nativeEvent.lines[0];
    if (line && avgCharW === null) setAvgCharW(line.width / 20);
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setPageW(width);
    setAreaH(height);
  };

  const pages = useMemo(() => {
    if (!avgCharW || !pageW || !areaH) return null;
    const usableW = pageW - H_PADDING * 2;
    const usableH = areaH - 60;
    const linesPerPage = Math.max(1, Math.floor(usableH / LINE_HEIGHT));
    const pages: { verses: MushafVerse[] }[] = [];
    let cur: MushafVerse[] = [];
    let curLines = 0;
    const push = () => {
      if (cur.length) {
        pages.push({ verses: cur });
        cur = [];
        curLines = 0;
      }
    };
    for (const v of verses) {
      const estLines = Math.max(1, Math.ceil((v.arabic.length * avgCharW) / usableW));
      if (cur.length && curLines + estLines > linesPerPage) push();
      cur.push(v);
      curLines += estLines;
    }
    push();
    return pages;
  }, [avgCharW, pageW, areaH, verses]);

  const pagesRef = useRef(pages);
  pagesRef.current = pages;
  const onPageChangeRef = useRef(onPageChange);
  onPageChangeRef.current = onPageChange;
  const lastVisibleRef = useRef(-1);

  const scrollToPage = useCallback(
    (i: number, animated = true) => {
      if (!pages) return;
      const idx = Math.min(Math.max(0, i), pages.length - 1);
      listRef.current?.scrollToIndex({ index: idx, animated });
    },
    [pages],
  );

  useEffect(() => {
    if (!pages) return;
    const target = activeAyah ?? focusAyah;
    if (!target) return;
    const idx = pages.findIndex((p) => p.verses.some((v) => v.ayah === target));
    if (idx >= 0 && idx !== lastPageRef.current) {
      lastPageRef.current = idx;
      scrollToPage(idx, false);
    }
  }, [pages, activeAyah, focusAyah, scrollToPage]);

  useEffect(() => {
    lastPageRef.current = -1;
    lastVisibleRef.current = -1;
    setPageIndex(0);
  }, [surahId]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0]?.index as number | null | undefined;
    const currentPages = pagesRef.current;
    if (typeof first === 'number' && currentPages && currentPages[first]) {
      setPageIndex(first);
      onPageChangeRef.current(currentPages[first].verses[0].ayah);
      if (first !== lastVisibleRef.current) {
        lastVisibleRef.current = first;
        Haptics.selectionAsync().catch(() => {});
      }
    }
  }).current;

  const renderVerse = (v: MushafVerse) => {
    const isActive = activeAyah === v.ayah;
    const isFocus = memorizeMode && focusAyah === v.ayah;
    const isHidden = hiddenAyahs?.has(v.ayah) ?? false;
    const isWordActive = activeWordAyah === v.ayah && activeWord != null;
    const bg = isActive
      ? 'rgba(201,162,39,0.28)'
      : isFocus
        ? 'rgba(201,162,39,0.16)'
        : 'transparent';
    const words = splitWords(v.arabic);
    const spans = tajweed ? colorizeWords(words) : null;
    const verseMarkerInline = `  ${toArabicDigits(v.ayah)}  `;
    const base = [
      styles.ayahSpan,
      {
        backgroundColor: bg,
        color: paper.text,
      },
    ];
    const pressProps = {
      onPress: () => onPressAyah(v.ayah),
      onLongPress: onLongPressAyah ? () => onLongPressAyah(v.ayah) : undefined,
      delayLongPress: 400,
    };
    if (isHidden && onToggleHidden) {
      return (
        <Pressable
          key={`h${v.ayah}`}
          onPress={() => onToggleHidden(v.ayah)}
          style={({ pressed }) => [
            styles.hiddenBox,
            { borderColor: paper.hairline },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text variant="caption" color="secondary">{t('quran.hiddenAyah')}</Text>
          <RNText style={[styles.inlineMarker, { color: paper.marker }]}>{verseMarkerInline}</RNText>
        </Pressable>
      );
    }
    if (wordByWord && onPressWord) {
      const wordSpans = spans ?? words.map((w) => [{ text: w, color: 'default' as const }]);
      return (
        <RNText key={v.ayah} style={base} {...pressProps}>
          {wordSpans.map((wordParts, i) => (
            <RNText
              key={`w${i}`}
              style={[styles.wordTap, { color: paper.text, borderBottomColor: paper.underline }]}
              onPress={() => onPressWord(v.ayah, i + 1)}
            >
              {wordParts.map((span, j) => (
                <RNText
                  key={j}
                  style={{ color: span.color === 'default' ? paper.text : paper.tajweed[span.color] }}
                >
                  {span.text}
                </RNText>
              ))}
              {' '}
            </RNText>
          ))}
          {v.sajda === 1 ? <RNText style={{ color: paper.sajda }}> ۩ </RNText> : null}
          <RNText style={[styles.inlineMarkerCircle, { color: paper.marker, borderColor: paper.marker, backgroundColor: paper.markerBg }]} onPress={() => onPressAyah(v.ayah)}>
            {verseMarkerInline}
          </RNText>
        </RNText>
      );
    }
    if (spans) {
      return (
        <RNText key={v.ayah} style={base} {...pressProps}>
          {spans.map((word, i) => {
            const isHighlighted = isWordActive && i === activeWord;
            return word.map((span, j) => (
              <RNText
                key={`${i}-${j}`}
                style={{
                  color: span.color === 'default' ? paper.text : paper.tajweed[span.color],
                  backgroundColor: isHighlighted ? 'rgba(201,162,39,0.4)' : 'transparent',
                  borderRadius: 3,
                  paddingHorizontal: isHighlighted ? 1 : 0,
                }}
              >
                {span.text}{' '}
              </RNText>
            ));
          })}
          {v.sajda === 1 ? <RNText style={{ color: paper.sajda }}> ۩ </RNText> : null}
          <RNText style={[styles.inlineMarkerCircle, { color: paper.marker, borderColor: paper.marker, backgroundColor: paper.markerBg }]} onPress={() => onPressAyah(v.ayah)}>
            {verseMarkerInline}
          </RNText>
        </RNText>
      );
    }
    return (
      <RNText key={v.ayah} style={base} {...pressProps}>
        <RNText style={{ color: paper.text }}>{v.arabic}</RNText>
        {v.sajda === 1 ? <RNText style={{ color: paper.sajda }}> ۩ </RNText> : null}
        <RNText style={[styles.inlineMarkerCircle, { color: paper.marker, borderColor: paper.marker, backgroundColor: paper.markerBg }]}>
          {verseMarkerInline}
        </RNText>
      </RNText>
    );
  };

  if (!pages || avgCharW === null) {
    return (
      <View style={{ flex: 1 }} onLayout={onLayout}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <RNText
            style={styles.probe}
            onTextLayout={onProbeLayout}
            numberOfLines={1}
          >
            {'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ'}
          </RNText>
          <Text variant="caption" color="tertiary">…</Text>
        </View>
      </View>
    );
  }

  const lastPage = pages.length - 1;

  return (
    <View style={{ flex: 1, backgroundColor: paper.bg }} onLayout={onLayout}>
      <FlatList
        showsVerticalScrollIndicator={false}
        ref={listRef}
        data={pages}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        getItemLayout={(_, index) => ({ length: pageW, offset: pageW * index, index })}
        initialScrollIndex={0}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        renderItem={({ item, index }) => (
          <View style={[styles.page, { width: pageW }]}>
            <View style={styles.pageFrame}>
              <View style={[styles.pageFrameInner, { borderColor: paper.frame }]}>
                <View style={[styles.surahHeader, { backgroundColor: HEADER_GREEN }]}>
                  {index === 0 && showBismillah ? (
                    <RNText style={styles.bismillah}>{'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ'}</RNText>
                  ) : index === 0 ? (
                    <RNText style={styles.surahName}>{surahName}</RNText>
                  ) : null}
                  {index !== 0 && (
                    <View style={styles.headerOrnament}>
                      <View style={[styles.ornamentLine, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
                      <View style={[styles.ornamentDot, { backgroundColor: 'rgba(255,255,255,0.5)' }]} />
                      <View style={[styles.ornamentLine, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
                    </View>
                  )}
                </View>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  style={styles.pageBody}
                  contentContainerStyle={{ paddingBottom: 80 }}
                >
                  {item.verses.map(renderVerse)}
                </ScrollView>
                <View style={[styles.pageFooter, { borderTopColor: paper.frame }]}>
                  <RNText style={[styles.pageNumber, { color: paper.muted }]}>{toArabicDigits(pageIndex + 1)}</RNText>
                </View>
              </View>
            </View>
            {index === lastPage && onNextSurah ? (
              <Pressable
                onPress={onNextSurah}
                style={[styles.nextBtn, { borderColor: paper.chipBorder, backgroundColor: paper.chipBg }]}
              >
                <Text variant="bodySmall" font="arabicBold" color="primary">
                  {t('quran.nextSurah')} {rtl ? '‹' : '›'}
                </Text>
              </Pressable>
            ) : null}
          </View>
        )}
        onScrollToIndexFailed={({ index }) =>
          listRef.current?.scrollToOffset({ offset: index * pageW, animated: false })
        }
      />
      <View style={styles.footer}>
        <Pressable onPress={() => scrollToPage(pageIndex - 1)} hitSlop={10} style={styles.footerBtn} accessibilityLabel={t('quran.prevPage')}>
          <Ionicons name={rtl ? 'chevron-forward' : 'chevron-back'} size={20} color={paper.muted} />
        </Pressable>
        <Text variant="caption" font="uiBold" style={{ color: paper.muted }}>
          {toArabicDigits(pageIndex + 1)} / {toArabicDigits(pages.length)}
        </Text>
        <Pressable onPress={() => scrollToPage(pageIndex + 1)} hitSlop={10} style={styles.footerBtn} accessibilityLabel={t('quran.nextPage')}>
          <Ionicons name={rtl ? 'chevron-back' : 'chevron-forward'} size={20} color={paper.muted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  probe: { position: 'absolute', opacity: 0, fontSize: FONT_SIZE, lineHeight: LINE_HEIGHT, fontFamily: 'Amiri_700Bold' },
  page: { flex: 1 },
  pageFrame: { flex: 1, padding: 8 },
  pageFrameInner: { flex: 1, borderWidth: 2, borderRadius: 4, overflow: 'hidden', borderColor: PAGE_FRAME },
  surahHeader: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  headerOrnament: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ornamentLine: { width: 40, height: 1 },
  ornamentDot: { width: 5, height: 5, borderRadius: 3 },
  bismillah: { fontSize: 26, lineHeight: 44, color: '#F5EDDA', fontFamily: 'Amiri_700Bold', textAlign: 'center' },
  surahName: { fontSize: 24, lineHeight: 40, color: '#F5EDDA', fontFamily: 'Amiri_700Bold' },
  pageBody: { flex: 1, paddingHorizontal: 12, paddingTop: 8 },
  pageFooter: {
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
  },
  pageNumber: { fontSize: 16, color: 'rgba(245,237,218,0.5)', fontFamily: 'Amiri_400Regular' },
  ayahSpan: {
    fontSize: FONT_SIZE,
    lineHeight: LINE_HEIGHT,
    fontFamily: 'Amiri_700Bold',
    color: PAGE_TEXT,
    textAlign: 'justify',
    direction: 'rtl',
    borderRadius: 4,
    paddingHorizontal: 1,
    marginBottom: 4,
  },
  verseMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: MARKER_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    alignSelf: 'center',
    backgroundColor: 'rgba(201,162,39,0.08)',
  },
  marker: { fontSize: 15, color: MARKER_COLOR, fontFamily: 'Amiri_700Bold', textAlign: 'center' },
  inlineMarker: { fontSize: FONT_SIZE, color: MARKER_COLOR, fontFamily: 'Amiri_700Bold' },
  inlineMarkerCircle: {
    fontSize: 14,
    color: MARKER_COLOR,
    fontFamily: 'Amiri_700Bold',
    backgroundColor: 'rgba(201,162,39,0.12)',
    borderWidth: 1,
    borderColor: MARKER_COLOR,
    borderRadius: 14,
    overflow: 'hidden',
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginHorizontal: 2,
  },
  wordTap: { borderBottomWidth: 1, borderBottomColor: 'rgba(242,235,216,0.4)', paddingHorizontal: 1, color: PAGE_TEXT },
  hiddenBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    direction: 'rtl',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 6,
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    marginBottom: 4,
    minHeight: LINE_HEIGHT,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[4],
  },
  footerBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(128,128,128,0.12)' },
  nextBtn: {
    position: 'absolute',
    bottom: 58,
    alignSelf: 'center',
    paddingHorizontal: space[4],
    paddingVertical: space[2],
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
  },
});
