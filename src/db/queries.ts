import { getDb } from './database';

export interface SurahRow {
  id: number;
  name: string;
  english_name: string;
  translation: string;
  type: string;
  ayahs: number;
}

export interface AyahRow {
  id: number;
  surah: number;
  ayah: number;
  arabic: string;
  juz: number;
  page: number;
  hizb: number;
  sajda: number;
}

export interface TranslationRow {
  surah: number;
  ayah: number;
  lang: string;
  edition: string;
  text: string;
}

export interface TafsirRow {
  source: string;
  language: string;
  surah: number;
  start_ayah: number;
  end_ayah: number;
  text: string;
}

export interface HadithBookRow {
  id: number;
  slug: string;
  title: string;
  title_arabic: string;
  author: string;
  author_arabic: string;
}

export interface HadithRow {
  id: number;
  book_slug: string;
  chapter: string;
  number: number;
  arabic: string;
  english: string;
  grade: string;
  reference: string;
}

export interface AdhkarRow {
  id: number;
  category: string;
  arabic: string;
  transliteration: string;
  translation: string;
  count: number;
  source: string;
}

export interface SearchResult {
  surah: number;
  ayah: number;
  arabic: string;
  text: string;
  edition: string;
  matchedIn: 'arabic' | 'translation';
}

export async function getSurahs(): Promise<SurahRow[]> {
  const db = await getDb();
  return db.getAllAsync<SurahRow>('SELECT * FROM surahs ORDER BY id');
}

export async function getSurah(id: number): Promise<SurahRow | null> {
  const db = await getDb();
  return db.getFirstAsync<SurahRow>('SELECT * FROM surahs WHERE id = ?', id);
}

export async function getAyahs(surah: number): Promise<AyahRow[]> {
  const db = await getDb();
  return db.getAllAsync<AyahRow>('SELECT * FROM ayahs WHERE surah = ? ORDER BY ayah', surah);
}

export async function getAyah(surah: number, ayah: number): Promise<AyahRow | null> {
  const db = await getDb();
  return db.getFirstAsync<AyahRow>('SELECT * FROM ayahs WHERE surah = ? AND ayah = ?', surah, ayah);
}

export interface MentionRow {
  surah: number;
  ayah: number;
  arabic: string;
}

export async function getAyahsMentioning(keyword: string, limit = 3): Promise<MentionRow[]> {
  const db = await getDb();
  return db.getAllAsync<MentionRow>(
    'SELECT surah, ayah, arabic FROM ayahs WHERE arabic_norm LIKE ? ORDER BY surah, ayah LIMIT ?',
    `%${keyword}%`,
    limit,
  );
}

export async function getByJuz(juz: number): Promise<AyahRow[]> {
  const db = await getDb();
  return db.getAllAsync<AyahRow>('SELECT * FROM ayahs WHERE juz = ? ORDER BY id', juz);
}

export async function getByPage(page: number): Promise<AyahRow[]> {
  const db = await getDb();
  return db.getAllAsync<AyahRow>('SELECT * FROM ayahs WHERE page = ? ORDER BY id', page);
}

export async function getTranslations(
  surah: number,
  ayah: number,
  editions: string[],
): Promise<TranslationRow[]> {
  const db = await getDb();
  const placeholders = editions.map(() => '?').join(',');
  return db.getAllAsync<TranslationRow>(
    `SELECT * FROM translations WHERE surah = ? AND ayah = ? AND edition IN (${placeholders}) ORDER BY CASE edition ${editions
      .map((e, i) => `WHEN '${e}' THEN ${i}`)
      .join(' ')} END`,
    surah,
    ayah,
    ...editions,
  );
}

export async function getSurahTranslations(surah: number, edition: string): Promise<TranslationRow[]> {
  const db = await getDb();
  return db.getAllAsync<TranslationRow>(
    'SELECT surah, ayah, lang, edition, text FROM translations WHERE surah = ? AND edition = ? ORDER BY ayah',
    surah,
    edition,
  );
}

export async function getTafsir(
  sources: string[],
  surah: number,
  ayah: number,
): Promise<TafsirRow[]> {
  const db = await getDb();
  const placeholders = sources.map(() => '?').join(',');
  return db.getAllAsync<TafsirRow>(
    `SELECT * FROM tafsir WHERE source IN (${placeholders}) AND surah = ? AND start_ayah <= ? AND end_ayah >= ? ORDER BY (end_ayah - start_ayah)`,
    ...sources,
    surah,
    ayah,
    ayah,
  );
}

export async function searchQuran(
  q: string,
  edition: string,
  limit = 50,
): Promise<SearchResult[]> {
  const db = await getDb();
  const like = `%${q}%`;
  const rows = await db.getAllAsync<SearchResult>(
    `SELECT a.surah, a.ayah, a.arabic, t.text, t.edition,
            CASE WHEN a.arabic_norm LIKE ? THEN 'arabic' ELSE 'translation' END AS matchedIn
     FROM ayahs a
     LEFT JOIN translations t ON t.surah = a.surah AND t.ayah = a.ayah AND t.edition = ?
     WHERE a.arabic_norm LIKE ? OR t.text LIKE ?
     ORDER BY a.id LIMIT ?`,
    like,
    edition,
    like,
    like,
    limit,
  );
  return rows;
}

export async function getHadithBooks(): Promise<HadithBookRow[]> {
  const db = await getDb();
  return db.getAllAsync<HadithBookRow>('SELECT * FROM hadith_books ORDER BY id');
}

export async function getHadithByBook(bookSlug: string, limit = 500, offset = 0): Promise<HadithRow[]> {
  const db = await getDb();
  return db.getAllAsync<HadithRow>(
    'SELECT * FROM hadith WHERE book_slug = ? ORDER BY id LIMIT ? OFFSET ?',
    bookSlug,
    limit,
    offset,
  );
}

export async function countHadithByBook(bookSlug: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) c FROM hadith WHERE book_slug = ?', bookSlug);
  return row?.c ?? 0;
}

export async function getHadithChapters(bookSlug: string): Promise<{ chapter: string; count: number }[]> {
  const db = await getDb();
  return db.getAllAsync<{ chapter: string; count: number }>(
    'SELECT chapter, COUNT(*) count FROM hadith WHERE book_slug = ? AND chapter != \'\' GROUP BY chapter ORDER BY MIN(id)',
    bookSlug,
  );
}

export async function searchHadith(q: string, limit = 60): Promise<HadithRow[]> {
  const db = await getDb();
  const like = `%${q}%`;
  return db.getAllAsync<HadithRow>(
    `SELECT * FROM hadith WHERE arabic_norm LIKE ? OR english LIKE ? ORDER BY id LIMIT ?`,
    like,
    like,
    limit,
  );
}

export async function getAdhkarCategories(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ category: string }>(
    'SELECT category FROM adhkar GROUP BY category ORDER BY MIN(id)',
  );
  return rows.map((r) => r.category);
}

export async function getAdhkarByCategory(category: string): Promise<AdhkarRow[]> {
  const db = await getDb();
  return db.getAllAsync<AdhkarRow>('SELECT * FROM adhkar WHERE category = ? ORDER BY id', category);
}

export const TRANSLATION_EDITIONS: Record<string, { lang: string; label: string }> = {
  'eng-muhammadtaqiudd': { lang: 'en', label: 'Saheeh International' },
  'eng-abdullahyusufal': { lang: 'en', label: 'Abdullah Yusuf Ali' },
  'eng-maududi': { lang: 'en', label: 'Abul Ala Maududi' },
  'urd-ahmedali': { lang: 'ur', label: 'Ahmed Ali (Urdu)' },
  'tur-alibulac': { lang: 'tr', label: 'Ali Bulaç (Türkçe)' },
  'ind-kingfahdcomplex': { lang: 'id', label: 'Kemenag Indonesia' },
  'fra-muhammadhamidul': { lang: 'fr', label: 'Muhammad Hamidullah' },
  'deu-aburidamuhammad': { lang: 'de', label: 'Abu Rida (Deutsch)' },
  'rus-elmirkuliev': { lang: 'ru', label: 'Эльмир Кулиев' },
};

export const TAFSIR_SOURCES = [
  { id: 'ibn-kathir-en', lang: 'en', label: 'Ibn Kathir' },
  { id: 'saadi', lang: 'ar', label: 'Al-Sa\'di' },
  { id: 'jalalayn', lang: 'ar', label: 'Jalalayn' },
  { id: 'ibn-kathir-ur', lang: 'ur', label: 'Ibn Kathir (اردو)' },
];

export const TAFSIR_BY_LANG: Record<string, string> = {
  ar: 'saadi',
  en: 'ibn-kathir-en',
  ur: 'ibn-kathir-ur',
};
