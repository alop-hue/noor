import { Ionicons } from '@expo/vector-icons';
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
}

const FONT_SIZE = 32;
const LINE_HEIGHT = 58;
const H_PADDING = 22;
const PROBE_TEXT = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ الْحَمْدُ لِلَّهِ';
const PAGE_BG = '#0C1210';
const PAGE_TEXT = '#F2EBD8';
const MARKER = '#B39B7D';
const TAJWEED = {
  madd: '#E07B6E',
  qalqalah: '#7FB3D5',
  ghunnah: '#82D4A4',
  ikhfa: '#D8BE6E',
  hamzat: '#C39BD3',
} as const;

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
}: Props) {
  const { colors } = useTheme();
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
    if (line && avgCharW === null) setAvgCharW(line.width / PROBE_TEXT.length);
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
    setPageIndex(0);
  }, [surahId]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0]?.index as number | null | undefined;
    if (typeof first === 'number' && pages && pages[first]) {
      setPageIndex(first);
      onPageChange(pages[first].verses[0].ayah);
    }
  }).current;

  const renderVerse = (v: MushafVerse) => {
    const isActive = activeAyah === v.ayah;
    const isFocus = memorizeMode && focusAyah === v.ayah;
    const isHidden = hiddenAyahs?.has(v.ayah) ?? false;
    const bg = isActive
      ? 'rgba(201,162,39,0.28)'
      : isFocus
        ? 'rgba(201,162,39,0.16)'
        : 'transparent';
    const words = splitWords(v.arabic);
    const spans = tajweed ? colorizeWords(words) : null;
    const marker = (
      <RNText
        key={`m${v.ayah}`}
        style={[styles.marker, { color: MARKER }]}
        onPress={() => onPressAyah(v.ayah)}
      >
        ﴿{toArabicDigits(v.ayah)}﴾
      </RNText>
    );
    const base = [
      styles.ayahSpan,
      {
        backgroundColor: bg,
        color: PAGE_TEXT,
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
            { borderColor: 'rgba(242,235,216,0.35)' },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text variant="caption" color="secondary">{t('quran.hiddenAyah')}</Text>
          {marker}
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
              style={[styles.wordTap, { color: PAGE_TEXT }]}
              onPress={() => onPressWord(v.ayah, i + 1)}
            >
              {wordParts.map((span, j) => (
                <RNText
                  key={j}
                  style={{ color: span.color === 'default' ? PAGE_TEXT : TAJWEED[span.color] }}
                >
                  {span.text}
                </RNText>
              ))}
              {' '}
            </RNText>
          ))}
          {v.sajda === 1 ? <RNText style={{ color: '#D4AF37' }}> ۩ </RNText> : null}
          {marker}
        </RNText>
      );
    }
    if (spans) {
      return (
        <RNText key={v.ayah} style={base} {...pressProps}>
          {spans.map((word, i) =>
            word.map((span, j) => (
              <RNText
                key={`${i}-${j}`}
                style={{
                  color: span.color === 'default' ? PAGE_TEXT : TAJWEED[span.color],
                }}
              >
                {span.text}{' '}
              </RNText>
            )),
          )}
          {v.sajda === 1 ? <RNText style={{ color: '#D4AF37' }}> ۩ </RNText> : null}
          {marker}
        </RNText>
      );
    }
    return (
      <RNText key={v.ayah} style={base} {...pressProps}>
        <RNText style={{ color: PAGE_TEXT }}>{v.arabic}</RNText>
        {v.sajda === 1 ? <RNText style={{ color: '#D4AF37' }}> ۩ </RNText> : null}
        {marker}
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
            {PROBE_TEXT}
          </RNText>
          <Text variant="caption" color="tertiary">…</Text>
        </View>
      </View>
    );
  }

  const lastPage = pages.length - 1;

  return (
    <View style={{ flex: 1, backgroundColor: PAGE_BG }} onLayout={onLayout}>
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
            <View style={styles.pageHead}>
              {index === 0 && showBismillah ? (
                <RNText style={styles.bismillah}>{'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ'}</RNText>
              ) : index === 0 ? (
                <RNText style={styles.surahName}>{surahName}</RNText>
              ) : null}
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.pageBody}
              contentContainerStyle={{ paddingBottom: 80 }}
            >
              {item.verses.map(renderVerse)}
            </ScrollView>
            {index === lastPage && onNextSurah ? (
              <Pressable
                onPress={onNextSurah}
                style={[styles.nextBtn, { borderColor: 'rgba(242,235,216,0.22)', backgroundColor: 'rgba(255,255,255,0.06)' }]}
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
        <Pressable onPress={() => scrollToPage(pageIndex - 1)} hitSlop={10} style={styles.footerBtn}>
          <Ionicons name={rtl ? 'chevron-forward' : 'chevron-back'} size={20} color={colors.textSecondary} />
        </Pressable>
        <Text variant="caption" font="uiBold" color="secondary">
          {toArabicDigits(pageIndex + 1)} / {toArabicDigits(pages.length)}
        </Text>
        <Pressable onPress={() => scrollToPage(pageIndex + 1)} hitSlop={10} style={styles.footerBtn}>
          <Ionicons name={rtl ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  probe: { position: 'absolute', opacity: 0, fontSize: FONT_SIZE, lineHeight: LINE_HEIGHT, fontFamily: 'Amiri_700Bold' },
  page: { flex: 1, paddingHorizontal: H_PADDING },
  pageHead: { height: 44, justifyContent: 'center', alignItems: 'center' },
  pageBody: { flex: 1 },
  bismillah: { fontSize: 27, lineHeight: 44, color: '#B39B7D', fontFamily: 'Amiri_700Bold' },
  surahName: { fontSize: 24, lineHeight: 40, color: '#B39B7D', fontFamily: 'Amiri_700Bold' },
  ayahSpan: {
    fontSize: FONT_SIZE,
    lineHeight: LINE_HEIGHT,
    fontFamily: 'Amiri_700Bold',
    color: PAGE_TEXT,
    textAlign: 'right',
    direction: 'rtl',
    borderRadius: 4,
    paddingHorizontal: 1,
    marginBottom: 4,
  },
  marker: { fontSize: 22, lineHeight: LINE_HEIGHT, color: '#B39B7D' },
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
    bottom: 10,
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
