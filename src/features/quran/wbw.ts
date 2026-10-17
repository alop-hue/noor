import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { ungzip } from 'pako';

/**
 * Word-by-word English meaning + transliteration, for the pronunciation
 * helper (shown only in English mode). Bundled as a gzipped JSON asset and
 * inflated once into memory.
 *
 * Shape: { [surah]: { [ayah]: { t: string[], r: string[] } } }
 * where t = per-word English meanings, r = per-word transliterations.
 */

interface AyahWbw {
  t: string[];
  r: string[];
}

let cache: Record<string, Record<string, AyahWbw>> | null = null;
let loadPromise: Promise<void> | null = null;

async function loadOnce(): Promise<void> {
  const asset = Asset.fromModule(require('../../../assets/data/wbw.json.gz'));
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  const bytes = new File(uri).bytesSync();
  const json = ungzip(bytes);
  cache = JSON.parse(new TextDecoder().decode(json)) as Record<
    string,
    Record<string, AyahWbw>
  >;
}

/** Kick off (and memoize) loading of the WBW table. Safe to call often. */
export function preloadWbw(): Promise<void> {
  if (!loadPromise) loadPromise = loadOnce().catch(() => {});
  return loadPromise;
}

export function wbwReady(): boolean {
  return cache != null;
}

/** Transliteration + meaning for a single word (1-based index), or null. */
export function getWbwWord(
  surah: number,
  ayah: number,
  word: number,
): { translit: string; meaning: string } | null {
  const entry = cache?.[String(surah)]?.[String(ayah)];
  if (!entry) return null;
  const translit = entry.r[word - 1];
  const meaning = entry.t[word - 1];
  if (translit == null && meaning == null) return null;
  return { translit: translit ?? '', meaning: meaning ?? '' };
}
