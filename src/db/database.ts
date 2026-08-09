import { Asset } from 'expo-asset';
import { File, Paths } from 'expo-file-system';
import * as LegacyFS from 'expo-file-system/legacy';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { Inflate } from 'pako';

export const DB_VERSION = 2;
export const DB_NAME = 'quran.db';

let db: SQLiteDatabase | null = null;

function dbFile(): File {
  return new File(Paths.document, DB_NAME);
}

function gzPath(): string {
  return new File(Paths.document, 'quran.db.gz').uri;
}

async function materializeGz(): Promise<void> {
  const asset = Asset.fromModule(require('../../assets/data/quran.db.gz'));
  await asset.downloadAsync();
  const dst = gzPath();
  const target = new File(dst);
  if (!target.exists) {
    try {
      if (asset.localUri && new File(asset.localUri).exists) {
        new File(asset.localUri).copySync(target);
      } else {
        await LegacyFS.copyAsync({ from: asset.localUri!, to: dst });
      }
    } catch {
      await LegacyFS.copyAsync({ from: asset.localUri!, to: dst });
    }
  }
}

function inflateGzToFile(): Promise<void> {
  return new Promise((resolve, reject) => {
    const input = new File(gzPath());
    const output = dbFile();
    let handle;
    try {
      handle = output.open();
    } catch (e) {
      reject(e);
      return;
    }
    const inflater = new Inflate({ chunkSize: 64 * 1024 });
    inflater.onData = (chunk: Uint8Array) => handle.writeBytes(chunk);
    inflater.onEnd = (status: number) => {
      try {
        handle.close();
      } catch {
        /* noop */
      }
      if (status === 0) resolve();
      else reject(new Error(`inflate failed with status ${status}`));
    };
    try {
      const ok = inflater.push(input.bytesSync(), true);
      if (!ok) {
        try {
          handle.close();
        } catch {
          /* noop */
        }
        reject(new Error(`inflate failed: ${inflater.msg || 'unknown error'}`));
      }
    } catch (e) {
      try {
        handle.close();
      } catch {
        /* noop */
      }
      reject(e);
    }
  });
}

async function unpackDatabase(): Promise<void> {
  await materializeGz();
  const out = dbFile();
  if (out.exists) out.delete();
  try {
    await inflateGzToFile();
    const gz = new File(gzPath());
    if (gz.exists) gz.delete();
  } catch (e) {
    if (out.exists) out.delete();
    throw e;
  }
}

export async function ensureDatabase(): Promise<void> {
  const out = dbFile();
  if (!out.exists) {
    await unpackDatabase();
    return;
  }
  try {
    const probe = await openDatabaseAsync(DB_NAME, undefined, Paths.document.uri);
    const row = await probe.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    const version = row?.user_version ?? 0;
    await probe.closeAsync();
    if (version !== DB_VERSION) {
      await unpackDatabase();
    }
  } catch {
    if (out.exists) out.delete();
    await unpackDatabase();
  }
}

export async function getDb(): Promise<SQLiteDatabase> {
  if (db) return db;
  if (!dbFile().exists) {
    await ensureDatabase();
  }
  db = await openDatabaseAsync(DB_NAME, undefined, Paths.document.uri);
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  return db;
}

export async function closeDb(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}

export async function wipeLocalData(): Promise<void> {
  await closeDb();
  for (const name of [DB_NAME, 'quran.db.gz', 'quran.db-wal', 'quran.db-shm']) {
    const f = new File(Paths.document, name);
    if (f.exists) f.delete();
  }
}
