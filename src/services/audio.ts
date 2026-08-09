import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from 'expo-audio';
import { Directory, File, Paths } from 'expo-file-system';
import * as LegacyFS from 'expo-file-system/legacy';

import reciters from '../../assets/data/reciters.json';
import { useSettings } from '../store/settings';

export interface Reciter {
  id: string;
  name: string;
  style: string;
  server: string;
}

export const RECITERS: Reciter[] = reciters as Reciter[];

let player: AudioPlayer | null = null;
let currentSurah: number | null = null;
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
};

export interface PlayerStatus {
  playing: boolean;
  isLoaded: boolean;
  currentTime: number;
  duration: number;
  didJustFinish: boolean;
  surah: number | null;
  memorize: MemorizeState | null;
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

export async function playSurah(surah: number, fromAyah?: number): Promise<void> {
  const { reciterId } = useSettings.getState().audio;
  memorize = null;
  currentSurah = surah;
  await initAudioMode();
  const p = getPlayer();
  const local = surahAudioPath(reciterId, surah);
  const source = local.exists ? local.uri : surahUrl(reciterId, surah);
  const rate = useSettings.getState().audio.speed;
  try {
    p.replace({ uri: source });
    p.setPlaybackRate(rate);
    if (fromAyah && fromAyah > 1) {
      const ayahs = Math.max(1, fromAyah - 1);
      await p.seekTo((ayahs - 1) * 25);
    }
    p.play();
  } catch (e) {
    console.warn('playSurah failed', e);
  }
}

export function togglePlayPause(): void {
  const p = getPlayer();
  if (lastStatus.playing) p.pause();
  else p.play();
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
  currentSurah = null;
  lastStatus = { ...lastStatus, playing: false, isLoaded: false, surah: null, memorize: null };
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
  if (!surah) return;
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
    emit();
    return;
  }
  await p.seekTo((m.currentAyah - 1) * 25);
  lastStatus = { ...lastStatus, didJustFinish: false, memorize };
  p.play();
  emit();
}

export async function startMemorizeRange(surah: number, from: number, to: number, times: number): Promise<void> {
  memorize = { surah, from, to, repeatTimes: times, repeatLeft: times, currentAyah: from };
  currentSurah = surah;
  const { reciterId } = useSettings.getState().audio;
  await initAudioMode();
  const p = getPlayer();
  const local = surahAudioPath(reciterId, surah);
  const source = local.exists ? local.uri : surahUrl(reciterId, surah);
  try {
    p.replace({ uri: source });
    p.setPlaybackRate(useSettings.getState().audio.speed);
    await p.seekTo((from - 1) * 25);
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
