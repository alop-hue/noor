export interface ColoredSpan {
  text: string;
  color: 'default' | 'madd' | 'qalqalah' | 'ghunnah' | 'ikhfa' | 'hamzat';
}

const QALQALAH = new Set(['ق', 'ط', 'ب', 'ج', 'د']);
const MADD_LETTERS = new Set(['ا', 'ى', 'و']);
const HAMZA = new Set(['ء', 'أ', 'إ', 'ئ', 'ؤ']);
const GHUNNAH_DIACRITICS = 'ّ';
const NUN_MEEM = new Set(['ن', 'م']);
const IKHFA_LETTERS = new Set(['ت', 'ث', 'ج', 'د', 'ذ', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ف', 'ق', 'ك']);

interface TokenCursor {
  text: string;
  index: number;
  prev: string;
  next: string;
}

function classifyToken(t: TokenCursor): 'madd' | 'qalqalah' | 'ghunnah' | 'ikhfa' | 'hamzat' | 'default' {
  const chars = [...t.text];

  if (chars.some((c) => HAMZA.has(c))) {
    const afterHamza = chars[chars.indexOf('ا') === -1 ? -1 : chars.indexOf('ا') + 1];
    const hasMaddLetterAfterHamza =
      MADD_LETTERS.has(afterHamza ?? '') ||
      (t.text.includes('ا') && t.text.includes('و')) ||
      (t.text.includes('ا') && t.text.includes('ى'));
    if (hasMaddLetterAfterHamza) return 'madd';
    return 'hamzat';
  }

  if (t.text.includes(GHUNNAH_DIACRITICS) && [...t.text].some((c) => NUN_MEEM.has(c))) {
    return 'ghunnah';
  }

  if (chars.some((c) => MADD_LETTERS.has(c))) {
    return 'madd';
  }

  if (chars.some((c) => QALQALAH.has(c))) {
    return 'qalqalah';
  }

  const last = chars[chars.length - 1];
  if (last && NUN_MEEM.has(last) && [...t.next][0] && IKHFA_LETTERS.has([...t.next][0])) {
    return 'ikhfa';
  }

  return 'default';
}

export function colorizeWords(words: string[]): ColoredSpan[][] {
  return words.map((word, i) => {
    const prev = i > 0 ? words[i - 1] : '';
    const next = i < words.length - 1 ? words[i + 1] : '';
    const color = classifyToken({ text: word, index: i, prev, next });
    return [{ text: word, color }];
  });
}

export function splitWords(arabic: string): string[] {
  return arabic.split(/\s+/).filter(Boolean);
}
