import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from 'expo-audio';
import { Directory, File, Paths } from 'expo-file-system';
import * as LegacyFS from 'expo-file-system/legacy';

import reciters from '../../assets/data/reciters.json';
import { useSettings } from '../store/settings';

export interface Reciter {
  id: string;
  name: string;
  ar?: string;
  style: string;
  server: string;
}

export const RECITERS: Reciter[] = reciters as Reciter[];

const AYAH_SECONDS = 25;

let player: AudioPlayer | null = null;
let currentSurah: number | null = null;
let playMode: 'surah' | 'word' | 'memorize' | null = null;
/** The ayah where the current playback segment started. Used to compute the
 *  real-time reading ayah and to implement verse-repeat. */
let startAyah: number | null = null;
let ayahTimer: ReturnType<typeof setInterval> | null = null;
let lastAyahTick = 0;
let memorizeAdvancing = false;
let listeners = new Set<(status: PlayerStatus) => void>();
let sleepTimerMs: number | null = null;
let sleepTimerHandle: ReturnType<typeof setTimeout> | null = null;
let lastStatus: PlayerStatus = {
  playing: false,
  isLoaded: false,
  currentTime: 0,
  duration: 0,
  didJustFinish: false,
  surah: null,
  memorize: null,
  startAyah: null,
  currentWord: null,
};

export interface PlayerStatus {
  playing: boolean;
  isLoaded: boolean;
  currentTime: number;
  duration: number;
  didJustFinish: boolean;
  surah: number | null;
  memorize: MemorizeState | null;
  startAyah?: number | null;
  currentWord?: number | null;
}

export interface MemorizeState {
  surah: number;
  from: number;
  to: number;
  repeatTimes: number;
  repeatLeft: number;
  currentAyah: number;
}

let memorize: MemorizeState | null = null;

function getPlayer(): AudioPlayer {
  if (!player) {
    player = createAudioPlayer();
    player.addListener('playbackStatusUpdate', (status: AudioStatus) => {
      lastStatus = {
        playing: status.playing,
        isLoaded: status.isLoaded,
        currentTime: status.currentTime,
        duration: status.duration,
        didJustFinish: status.didJustFinish,
        surah: currentSurah,
        memorize,
        startAyah,
      };
      if (status.didJustFinish) handleFinished();
      emit();
    });
  }
  return player;
}

function emit() {
  for (const l of listeners) l(lastStatus);
}

/**
 * Drives ayah boundaries for verse-repeat and memorize repeat. Surah files are
 * played as one long track (there are no per-ayah timestamps), so a timer walks
 * the approximate ayah cadence (~25s/ayah) and re-seeks when a repeat applies.
 */
function startAyahTimer() {
  stopAyahTimer();
  lastAyahTick = 0;
  ayahTimer = setInterval(() => {
    if (!player) return;
    const ct = player.currentTime;
    if (lastAyahTick === 0) {
      lastAyahTick = ct;
      return;
    }
    if (ct - lastAyahTick < AYAH_SECONDS - 0.3) return;
    lastAyahTick = 0; // re-anchor after the seek performed below
    if (playMode === 'memorize' && memorize) {
      void advanceMemorize();
    } else if (playMode === 'surah' && useSettings.getState().audio.repeat === 'verse') {
      void (async () => {
        const p = getPlayer();
        const seek = Math.max(0, (startAyah ?? 1) - 2) * AYAH_SECONDS;
        const dur = p.duration;
        await p.seekTo(dur > 0 ? Math.min(seek, Math.max(0, dur - 2)) : seek);
        p.play();
      })();
    }
  }, 1000);
}

function stopAyahTimer() {
  if (ayahTimer) {
    clearInterval(ayahTimer);
    ayahTimer = null;
  }
  lastAyahTick = 0;
}

export function subscribeToPlayer(cb: (status: PlayerStatus) => void): () => void {
  listeners.add(cb);
  cb(lastStatus);
  return () => {
    listeners.delete(cb);
  };
}

function audioDir(): Directory {
  return new Directory(Paths.document, 'audio');
}

export function surahAudioPath(reciterId: string, surah: number): File {
  return new File(new Directory(audioDir(), reciterId), `${String(surah).padStart(3, '0')}.mp3`);
}

export function surahUrl(reciterId: string, surah: number): string {
  const reciter = RECITERS.find((r) => r.id === reciterId) ?? RECITERS[0];
  return `${reciter.server}${String(surah).padStart(3, '0')}.mp3`;
}

export function isSurahDownloaded(reciterId: string, surah: number): boolean {
  return surahAudioPath(reciterId, surah).exists;
}

export async function initAudioMode(): Promise<void> {
  await setAudioModeAsync({
    shouldPlayInBackground: true,
    interruptionMode: 'doNotMix',
    playsInSilentMode: true,
  });
}

async function waitForDuration(p: AudioPlayer, timeoutMs = 6000): Promise<number> {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (p.duration > 0) return p.duration;
    await new Promise((r) => setTimeout(r, 60));
  }
  return p.duration;
}

async function playSurahMode(surah: number, fromAyah: number | undefined, mode: 'surah' | 'word'): Promise<void> {
  const { reciterId } = useSettings.getState().audio;
  memorize = null;
  playMode = mode;
  currentSurah = surah;
  startAyah = fromAyah ?? 1;
  if (mode === 'surah') startAyahTimer();
  await initAudioMode();
  const p = getPlayer();
  const local = surahAudioPath(reciterId, surah);
  const source = local.exists ? local.uri : surahUrl(reciterId, surah);
  const rate = useSettings.getState().audio.speed;
  try {
    p.replace({ uri: source });
    p.setPlaybackRate(rate);
    if (fromAyah && fromAyah > 1) {
      // Seek by rough per-ayah duration, but NEVER past the end of the file:
      // seeking beyond the end instantly finishes the track, which used to
      // trigger an unwanted gapless jump to the next surah. If the duration
      // is unknown, play from the start instead of risking an overshoot.
      const dur = await waitForDuration(p);
      if (dur > 0) {
        await p.seekTo(Math.min((fromAyah - 2) * 25, Math.max(0, dur - 2)));
      }
    }
    p.play();
  } catch (e) {
    console.warn('playSurah failed', e);
  }
}

export async function playSurah(surah: number, fromAyah?: number): Promise<void> {
  return playSurahMode(surah, fromAyah, 'surah');
}

/**
 * Play the surah file starting at an ayah, but treat it like word-level audio:
 * when it finishes it must NEVER auto-advance (no repeat, no gapless).
 * Used as the fallback when a word-level track is unavailable.
 */
export async function playAyah(surah: number, ayah: number): Promise<void> {
  return playSurahMode(surah, ayah, 'word');
}

export function togglePlayPause(): void {
  const p = getPlayer();
  if (lastStatus.playing) p.pause();
  else p.play();
}

function pad3(n: number): string {
  return String(n).padStart(3, '0');
}

export function wordAudioUrl(surah: number, ayah: number, word: number): string {
  return `https://audio.qurancdn.com/wbw/${pad3(surah)}_${pad3(ayah)}_${pad3(word)}.mp3`;
}

export async function playWord(surah: number, ayah: number, word: number): Promise<boolean> {
  const url = wordAudioUrl(surah, ayah, word);
  try {
    const res = await fetch(url, { method: 'HEAD' });
    if (!res.ok) return false;
  } catch {
    return false;
  }
  memorize = null;
  playMode = 'word';
  stopAyahTimer();
  currentSurah = surah;
  startAyah = ayah;
  await initAudioMode();
  try {
    const p = getPlayer();
    p.replace({ uri: url });
    p.setPlaybackRate(useSettings.getState().audio.speed);
    p.play();
    return true;
  } catch (e) {
    console.warn('playWord failed', e);
    return false;
  }
}

export async function seekTo(seconds: number): Promise<void> {
  await getPlayer().seekTo(seconds);
}

export function stop(): void {
  if (player) {
    player.pause();
    player.remove();
    player = null;
  }
  memorize = null;
  playMode = null;
  currentSurah = null;
  startAyah = null;
  stopAyahTimer();
  lastStatus = { ...lastStatus, playing: false, isLoaded: false, surah: null, memorize: null, startAyah: null };
  emit();
}

export function setRate(rate: number): void {
  if (player) player.setPlaybackRate(rate);
}

async function handleFinished(): Promise<void> {
  const { audio } = useSettings.getState();
  const { surah } = lastStatus;
  if (memorize) {
    await advanceMemorize();
    return;
  }
  // Word-level audio must never auto-advance to another surah.
  // Only full-surah playback may continue via repeat/gapless.
  if (playMode !== 'surah') {
    playMode = null;
    currentSurah = null;
    startAyah = null;
    stopAyahTimer();
    player?.pause();
    lastStatus = { ...lastStatus, playing: false, didJustFinish: false, surah: null, startAyah: null };
    emit();
    return;
  }
  if (!surah) return;
  if (audio.repeat === 'verse') {
    // Repeat the ayah the segment started from instead of moving on.
    const p = getPlayer();
    const seek = Math.max(0, (startAyah ?? 1) - 2) * AYAH_SECONDS;
    const dur = p.duration;
    await p.seekTo(dur > 0 ? Math.min(seek, Math.max(0, dur - 2)) : seek);
    lastAyahTick = 0;
    p.play();
    lastStatus = { ...lastStatus, didJustFinish: false };
    emit();
    return;
  }
  if (audio.repeat === 'surah') {
    await playSurah(surah);
    return;
  }
  if (audio.gapless && surah < 114) {
    await playSurah(surah + 1);
  } else {
    lastStatus = { ...lastStatus, didJustFinish: false };
    emit();
  }
}

async function advanceMemorize(): Promise<void> {
  if (memorizeAdvancing) return;
  memorizeAdvancing = true;
  try {
    const m = memorize;
    if (!m) return;
    const p = getPlayer();
    if (m.repeatLeft > 1) {
      m.repeatLeft -= 1;
    } else if (m.currentAyah < m.to) {
      m.currentAyah += 1;
      m.repeatLeft = m.repeatTimes;
    } else {
      memorize = null;
      lastStatus = { ...lastStatus, didJustFinish: false, memorize: null };
      p.pause();
      stopAyahTimer();
      emit();
      return;
    }
    const dur = p.duration;
    const seek = Math.min((m.currentAyah - 1) * AYAH_SECONDS, dur > 0 ? Math.max(0, dur - 2) : Number.MAX_SAFE_INTEGER);
    await p.seekTo(seek);
    lastStatus = { ...lastStatus, didJustFinish: false, memorize };
    p.play();
    emit();
  } finally {
    memorizeAdvancing = false;
  }
}

export async function startMemorizeRange(surah: number, from: number, to: number, times: number): Promise<void> {
  memorize = { surah, from, to, repeatTimes: times, repeatLeft: times, currentAyah: from };
  playMode = 'memorize';
  currentSurah = surah;
  startAyah = from;
  startAyahTimer();
  const { reciterId } = useSettings.getState().audio;
  await initAudioMode();
  const p = getPlayer();
  const local = surahAudioPath(reciterId, surah);
  const source = local.exists ? local.uri : surahUrl(reciterId, surah);
  try {
    p.replace({ uri: source });
    p.setPlaybackRate(useSettings.getState().audio.speed);
    const dur = await waitForDuration(p);
    await p.seekTo(Math.min((from - 1) * AYAH_SECONDS, dur > 0 ? Math.max(0, dur - 2) : Number.MAX_SAFE_INTEGER));
    p.play();
  } catch (e) {
    console.warn('startMemorizeRange failed', e);
  }
  emit();
}

export function stopMemorize(): void {
  memorize = null;
  lastStatus = { ...lastStatus, memorize: null };
  emit();
}

export function setSleepTimer(minutes: number | null): void {
  if (sleepTimerHandle) clearTimeout(sleepTimerHandle);
  sleepTimerHandle = null;
  sleepTimerMs = minutes === null ? null : minutes * 60000;
  if (sleepTimerMs !== null) {
    sleepTimerHandle = setTimeout(() => {
      stop();
    }, sleepTimerMs);
  }
}

export function getSleepTimerMinutes(): number | null {
  return sleepTimerMs === null ? null : Math.round(sleepTimerMs / 60000);
}

export async function downloadSurah(
  reciterId: string,
  surah: number,
  onProgress?: (pct: number) => void,
): Promise<File> {
  const dir = new Directory(audioDir(), reciterId);
  if (!dir.exists) dir.create({ intermediates: true });
  const target = surahAudioPath(reciterId, surah);
  if (target.exists) return target;
  const task = LegacyFS.createDownloadResumable(
    surahUrl(reciterId, surah),
    target.uri,
    {},
    (progress) => {
      const pct = progress.totalBytesWritten / Math.max(1, progress.totalBytesExpectedToWrite);
      onProgress?.(Math.min(99, Math.round(pct * 100)));
    },
  );
  const result = await task.downloadAsync();
  if (!result) throw new Error('download failed');
  return new File(result.uri);
}

export function deleteSurahDownload(reciterId: string, surah: number): void {
  const f = surahAudioPath(reciterId, surah);
  if (f.exists) f.delete();
}

export function deleteAllDownloads(): void {
  const dir = audioDir();
  if (dir.exists) dir.delete();
}
