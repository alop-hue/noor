import { File, Paths } from 'expo-file-system';

const LOG_FILE = 'noor-errors.log';
const MAX_ENTRIES = 400;

export interface DiagnosticEntry {
  ts: string;
  level: 'error' | 'warn' | 'info';
  message: string;
  stack?: string;
}

let queue: string[] = [];

function logFile(): File {
  return new File(Paths.document, LOG_FILE);
}

async function flush(): Promise<void> {
  if (queue.length === 0) return;
  const f = logFile();
  if (!f.exists) f.create();
  const current = f.textSync();
  const merged = (current ? current.trimEnd() + '\n' : '') + queue.join('\n');
  queue = [];
  const lines = merged.split('\n').slice(-MAX_ENTRIES);
  f.write(lines.join('\n') + '\n');
}

export function writeEntry(level: DiagnosticEntry['level'], message: string, stack?: string): void {
  const entry: DiagnosticEntry = {
    ts: new Date().toISOString(),
    level,
    message: message.slice(0, 500),
    stack: stack?.slice(0, 1200),
  };
  queue.push(JSON.stringify(entry));
  void flush();
}

export function readLog(): Promise<DiagnosticEntry[]> {
  const f = logFile();
  if (!f.exists) return Promise.resolve([]);
  return Promise.resolve(
    f
      .textSync()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line) as DiagnosticEntry;
        } catch {
          return { ts: '', level: 'info' as const, message: line };
        }
      })
      .reverse(),
  );
}

export function clearLog(): void {
  const f = logFile();
  if (f.exists) f.delete();
}

export function installErrorListener(): void {
  const onError = (e: unknown) => {
    if (e instanceof Error) {
      writeEntry('error', `${e.name}: ${e.message}`, e.stack);
    } else {
      writeEntry('error', String(e));
    }
  };

  const globalHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    writeEntry('error', `[FATAL ${isFatal ? 'yes' : 'no'}] ${error?.message ?? String(error)}`, error?.stack);
    globalHandler(error, isFatal);
  });

  const origError = console.error;
  console.error = (...args: unknown[]) => {
    writeEntry('error', args.map(String).join(' '));
    origError(...args);
  };

  const origWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    writeEntry('warn', args.map(String).join(' '));
    origWarn(...args);
  };

  globalThis.addEventListener?.('unhandledrejection', (e: PromiseRejectionEvent) => {
    const reason = e.reason;
    onError(reason instanceof Error ? reason : new Error(String(reason)));
  });
}
