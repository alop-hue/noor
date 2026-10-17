#!/usr/bin/env node
/**
 * Builds two auxiliary Quran datasets bundled into the app:
 *
 *  1. assets/data/word-timing.json.gz
 *     Per-word recitation timing (karaoke highlight), aligned to Mishary
 *     Alafasy's mp3quran surah files (the default reciter).
 *     Source: QUD quranic-universal-audio v3.2.0 (word_timestamps).
 *
 *  2. assets/data/wbw.json.gz
 *     Word-by-word English meaning + transliteration, for the pronunciation
 *     helper (shown only in English mode).
 *     Source: static.quranwbw.com v4 (translations + transliterations).
 *
 * Run: node scripts/build-aux-data.mjs
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { gunzipSync, gzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const OUT_DIR = join(process.cwd(), 'assets', 'data');
const TMP = '/tmp/opencode/quran-data/raw';

const TIMING_ZIP =
  'https://github.com/QUD-Technologies/quranic-universal-audio/releases/download/v3.2.0/mishary_rashid_al_afasy_mp3quran.zip';
const WBW_TRANS =
  'https://static.quranwbw.com/data/v4/words-data/translations/1.json?version=4';
const WBW_ROMAN =
  'https://static.quranwbw.com/data/v4/words-data/transliterations/1.json?version=2';

async function fetchToFile(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(dest, buf);
  return buf.length;
}

function buildWordTiming(raw) {
  // raw.rows: [verseKey, startMs, endMs, canonical, silenceAfter, [[wordIdx, start, end], ...]]
  const bySurah = {};
  let lastSurah = 0;
  let cur = null;
  for (const row of raw.rows) {
    const [verseKey, startMs, endMs, , , words] = row;
    const [sStr, aStr] = verseKey.split(':');
    const surah = Number(sStr);
    const ayah = Number(aStr);
    if (surah !== lastSurah) {
      cur = { t: 0, a: [] };
      bySurah[surah] = cur;
      lastSurah = surah;
    }
    // Flatten word [start,end] pairs: [s0,e0,s1,e1,...]
    const flat = [];
    for (const [, ws, we] of words) {
      flat.push(ws, we);
    }
    cur.a.push([ayah, startMs, endMs, flat]);
    cur.t = endMs; // rows are ordered, last endMs is the surah total
  }
  return bySurah;
}

function buildWbw(trans, roman) {
  // Both: { chapter: { ayah: [[word, word, ...]] } }  (value[0] is the word array)
  const out = {};
  for (const ch of Object.keys(trans)) {
    out[ch] = {};
    const tCh = trans[ch];
    const rCh = roman[ch] ?? {};
    for (const ayah of Object.keys(tCh)) {
      const tWords = tCh[ayah]?.[0] ?? [];
      const rWords = rCh[ayah]?.[0] ?? [];
      out[ch][ayah] = { t: tWords, r: rWords };
    }
  }
  return out;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(TMP, { recursive: true });

  // --- 1. Word timing ---
  const zipPath = join(TMP, 'alafasy_timing.zip');
  let rawJson;
  try {
    rawJson = gunzipSync(
      execFileSync('unzip', ['-p', zipPath, 'word_timestamps.json.gz']),
    ).toString('utf8');
  } catch {
    console.log('downloading timing zip...');
    await fetchToFile(TIMING_ZIP, zipPath);
    rawJson = gunzipSync(
      execFileSync('unzip', ['-p', zipPath, 'word_timestamps.json.gz']),
    ).toString('utf8');
  }
  const timing = buildWordTiming(JSON.parse(rawJson));
  const timingGz = gzipSync(Buffer.from(JSON.stringify(timing)), { level: 9 });
  writeFileSync(join(OUT_DIR, 'word-timing.json.gz'), timingGz);
  const surahCount = Object.keys(timing).length;
  console.log(
    `word-timing.json.gz: ${surahCount} surahs, ${(timingGz.length / 1024).toFixed(0)} KB gz`,
  );

  // --- 2. WBW meaning + transliteration ---
  const transPath = join(TMP, 'wbw_translations.json');
  const romanPath = join(TMP, 'wbw_transliterations.json');
  if (!existsSync(transPath)) {
    console.log('downloading WBW...');
    await fetchToFile(WBW_TRANS, transPath);
    await fetchToFile(WBW_ROMAN, romanPath);
  }
  const trans = JSON.parse(readFileSync(transPath, 'utf8'));
  const roman = JSON.parse(readFileSync(romanPath, 'utf8'));
  const wbw = buildWbw(trans, roman);
  const wbwGz = gzipSync(Buffer.from(JSON.stringify(wbw)), { level: 9 });
  writeFileSync(join(OUT_DIR, 'wbw.json.gz'), wbwGz);
  console.log(`wbw.json.gz: ${(wbwGz.length / 1024).toFixed(0)} KB gz`);

  console.log('done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
