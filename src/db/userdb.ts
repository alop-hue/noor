import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

let db: SQLiteDatabase | null = null;

async function getDb(): Promise<SQLiteDatabase> {
  if (db) return db;
  db = await openDatabaseAsync('noor-user.db');
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS bookmarks_ayah(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      surah INTEGER NOT NULL,
      ayah INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE(surah, ayah)
    );
    CREATE TABLE IF NOT EXISTS bookmarks_hadith(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_slug TEXT NOT NULL,
      hadith_id INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE(book_slug, hadith_id)
    );
    CREATE TABLE IF NOT EXISTS notes(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      surah INTEGER NOT NULL,
      ayah INTEGER NOT NULL,
      text TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE(surah, ayah)
    );
    CREATE TABLE IF NOT EXISTS memorized(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      surah INTEGER NOT NULL,
      ayah INTEGER NOT NULL,
      memorized_at INTEGER NOT NULL,
      UNIQUE(surah, ayah)
    );
    CREATE TABLE IF NOT EXISTS user_mosques(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
  return db;
}

export interface UserMosque {
  id: number;
  name: string;
  lat: number;
  lng: number;
  created_at: number;
}

export async function addUserMosque(name: string, lat: number, lng: number): Promise<void> {
  const d = await getDb();
  await d.runAsync('INSERT INTO user_mosques (name, lat, lng, created_at) VALUES (?, ?, ?, ?)', name, lat, lng, Date.now());
}

export async function getUserMosques(): Promise<UserMosque[]> {
  const d = await getDb();
  return (await d.getAllAsync<UserMosque>('SELECT * FROM user_mosques ORDER BY created_at DESC')) ?? [];
}

export async function deleteUserMosque(id: number): Promise<void> {
  const d = await getDb();
  await d.runAsync('DELETE FROM user_mosques WHERE id = ?', id);
}

export interface AyahBookmark {
  surah: number;
  ayah: number;
  created_at: number;
}

export async function isAyahBookmarked(surah: number, ayah: number): Promise<boolean> {
  const d = await getDb();
  const row = await d.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) c FROM bookmarks_ayah WHERE surah = ? AND ayah = ?',
    surah,
    ayah,
  );
  return (row?.c ?? 0) > 0;
}

export async function toggleAyahBookmark(surah: number, ayah: number): Promise<boolean> {
  const d = await getDb();
  const exists = await isAyahBookmarked(surah, ayah);
  if (exists) {
    await d.runAsync('DELETE FROM bookmarks_ayah WHERE surah = ? AND ayah = ?', surah, ayah);
    return false;
  }
  await d.runAsync(
    'INSERT OR REPLACE INTO bookmarks_ayah (surah, ayah, created_at) VALUES (?, ?, ?)',
    surah,
    ayah,
    Date.now(),
  );
  return true;
}

export async function getAyahBookmarks(): Promise<AyahBookmark[]> {
  const d = await getDb();
  return d.getAllAsync<AyahBookmark>('SELECT surah, ayah, created_at FROM bookmarks_ayah ORDER BY created_at DESC');
}

export interface HadithBookmark {
  book_slug: string;
  hadith_id: number;
  created_at: number;
}

export async function isHadithBookmarked(bookSlug: string, hadithId: number): Promise<boolean> {
  const d = await getDb();
  const row = await d.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) c FROM bookmarks_hadith WHERE book_slug = ? AND hadith_id = ?',
    bookSlug,
    hadithId,
  );
  return (row?.c ?? 0) > 0;
}

export async function toggleHadithBookmark(bookSlug: string, hadithId: number): Promise<boolean> {
  const d = await getDb();
  const exists = await isHadithBookmarked(bookSlug, hadithId);
  if (exists) {
    await d.runAsync('DELETE FROM bookmarks_hadith WHERE book_slug = ? AND hadith_id = ?', bookSlug, hadithId);
    return false;
  }
  await d.runAsync(
    'INSERT OR REPLACE INTO bookmarks_hadith (book_slug, hadith_id, created_at) VALUES (?, ?, ?)',
    bookSlug,
    hadithId,
    Date.now(),
  );
  return true;
}

export async function getHadithBookmarks(): Promise<HadithBookmark[]> {
  const d = await getDb();
  return d.getAllAsync<HadithBookmark>(
    'SELECT book_slug, hadith_id, created_at FROM bookmarks_hadith ORDER BY created_at DESC',
  );
}

export async function getNote(surah: number, ayah: number): Promise<string | null> {
  const d = await getDb();
  const row = await d.getFirstAsync<{ text: string }>('SELECT text FROM notes WHERE surah = ? AND ayah = ?', surah, ayah);
  return row?.text ?? null;
}

export async function saveNote(surah: number, ayah: number, text: string): Promise<void> {
  const d = await getDb();
  if (text.trim().length === 0) {
    await d.runAsync('DELETE FROM notes WHERE surah = ? AND ayah = ?', surah, ayah);
    return;
  }
  await d.runAsync(
    `INSERT INTO notes (surah, ayah, text, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(surah, ayah) DO UPDATE SET text = excluded.text, updated_at = excluded.updated_at`,
    surah,
    ayah,
    text.trim(),
    Date.now(),
  );
}

export async function getAllNotes(): Promise<{ surah: number; ayah: number; text: string; updated_at: number }[]> {
  const d = await getDb();
  return d.getAllAsync('SELECT surah, ayah, text, updated_at FROM notes ORDER BY updated_at DESC');
}

export async function isAyahMemorized(surah: number, ayah: number): Promise<boolean> {
  const d = await getDb();
  const row = await d.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) c FROM memorized WHERE surah = ? AND ayah = ?',
    surah,
    ayah,
  );
  return (row?.c ?? 0) > 0;
}

export async function toggleAyahMemorized(surah: number, ayah: number): Promise<boolean> {
  const d = await getDb();
  const exists = await isAyahMemorized(surah, ayah);
  if (exists) {
    await d.runAsync('DELETE FROM memorized WHERE surah = ? AND ayah = ?', surah, ayah);
    return false;
  }
  await d.runAsync(
    'INSERT OR REPLACE INTO memorized (surah, ayah, memorized_at) VALUES (?, ?, ?)',
    surah,
    ayah,
    Date.now(),
  );
  return true;
}

export async function getMemorizedSurah(surah: number): Promise<number[]> {
  const d = await getDb();
  const rows = await d.getAllAsync<{ ayah: number }>('SELECT ayah FROM memorized WHERE surah = ? ORDER BY ayah', surah);
  return rows.map((r) => r.ayah);
}

export async function getMemorizedCounts(): Promise<Record<number, number>> {
  const d = await getDb();
  const rows = await d.getAllAsync<{ surah: number; c: number }>(
    'SELECT surah, COUNT(*) c FROM memorized GROUP BY surah',
  );
  return Object.fromEntries(rows.map((r) => [r.surah, r.c]));
}

export async function getMemorizedAyahs(): Promise<{ surah: number; ayah: number }[]> {
  const d = await getDb();
  return d.getAllAsync<{ surah: number; ayah: number }>('SELECT surah, ayah FROM memorized ORDER BY surah, ayah');
}

export async function exportUserData(): Promise<string> {
  const d = await getDb();
  const bookmarks = await d.getAllAsync<AyahBookmark>('SELECT * FROM bookmarks_ayah ORDER BY id');
  const hadithBookmarks = await d.getAllAsync<HadithBookmark>('SELECT * FROM bookmarks_hadith ORDER BY id');
  const notes = await getAllNotes();
  const memorized = await getMemorizedAyahs();
  return JSON.stringify({ exportedAt: new Date().toISOString(), bookmarks, hadithBookmarks, notes, memorized }, null, 2);
}
