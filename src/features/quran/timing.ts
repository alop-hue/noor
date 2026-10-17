import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { ungzip } from 'pako';

/**
 * Per-word recitation timing (karaoke highlight), aligned to the default
 * reciter (Mishary Alafasy, mp3quran "afs" surah files). Data is bundled as
 * a gzipped JSON asset and inflated once into memory.
 *
 * Row format (per ayah): [ayah, startMs, endMs, flatWordPairs]
 * where flatWordPairs = [w0start, w0end, w1start, w1end, ...].
 */

/** Row: [ayah, startMs, endMs, flatWordPairs] where flatWordPairs = [s0,e0,s1,e1,...] */
type AyahRow = [number, number, number, number[]];

interface SurahTimingRaw {
  t: number;
  a: AyahRow[];
}

let cache: Record<string, SurahTimingRaw> | null = null;
let loadPromise: Promise<void> | null = null;

async function loadOnce(): Promise<void> {
  const asset = Asset.fromModule(require('../../../assets/data/word-timing.json.gz'));
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  const bytes = new File(uri).bytesSync();
  const json = ungzip(bytes);
  cache = JSON.parse(new TextDecoder().decode(json)) as Record<string, SurahTimingRaw>;
}

/** Kick off (and memoize) loading of the timing table. Safe to call often. */
export function preloadTiming(): Promise<void> {
  if (!loadPromise) loadPromise = loadOnce().catch(() => {});
  return loadPromise;
}

export function timingReady(): boolean {
  return cache != null;
}

function surahTiming(surah: number): SurahTimingRaw | null {
  return cache?.[String(surah)] ?? null;
}

/** Total duration (ms) of a surah's timing, or null. */
export function surahTimingTotalMs(surah: number): number | null {
  return surahTiming(surah)?.t ?? null;
}

/**
 * Map an absolute playback position (ms into the surah file) to the active
 * ayah + word. Word index is 1-based (matches playWord). Returns null when
 * timing isn't loaded or the position is out of range.
 */
export function locateAtMs(
  surah: number,
  ms: number,
): { ayah: number; word: number } | null {
  const st = surahTiming(surah);
  if (!st || st.a.length === 0) return null;

  // Last ayah whose startMs <= ms (clamps across inter-ayah silence gaps).
  let lo = 0;
  let hi = st.a.length - 1;
  let ai = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (st.a[mid][1] <= ms) {
      ai = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  const row = st.a[ai];
  if (ms >= row[2] && ai === st.a.length - 1) {
    // Past the end of the last ayah — clamp to its final word.
    const flat = row[3];
    return { ayah: row[0], word: Math.max(1, flat.length / 2) };
  }
  const ayah = row[0];
  const flat = row[3];
  const n = flat.length / 2;

  // Last word whose startMs <= ms within the ayah.
  let wl = 0;
  let wh = n - 1;
  let wi = 0;
  while (wl <= wh) {
    const mid = (wl + wh) >> 1;
    if (flat[mid * 2] <= ms) {
      wi = mid;
      wl = mid + 1;
    } else {
      wh = mid - 1;
    }
  }
  return { ayah, word: wi + 1 };
}

/** Start time (seconds) of an ayah, for accurate seeking. Null if unknown. */
export function getAyahStartSeconds(surah: number, ayah: number): number | null {
  const st = surahTiming(surah);
  if (!st) return null;
  const row = st.a.find((r) => r[0] === ayah);
  return row ? row[1] / 1000 : null;
}
