type DispatchOptions<T> = {
  idempotencyKey?: string;
  ttlMs?: number;
  attempts?: number;
  task: () => Promise<T>;
};

type CacheEntry<T> = {
  expiresAt: number;
  result: T;
};

const RESULT_CACHE = new Map<string, CacheEntry<unknown>>();
const PENDING_CACHE = new Map<string, Promise<unknown>>();
let queueTail: Promise<void> = Promise.resolve();

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function runWithRetry<T>(task: () => Promise<T>, attempts: number): Promise<T> {
  let lastError: unknown = null;

  for (let index = 0; index < attempts; index += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (index < attempts - 1) {
        await sleep((index + 1) * 300);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Printactie mislukt na meerdere pogingen.');
}

function cleanupExpiredEntries(now = Date.now()) {
  for (const [key, entry] of RESULT_CACHE.entries()) {
    if (entry.expiresAt <= now) {
      RESULT_CACHE.delete(key);
    }
  }
}

export async function dispatchPrintTask<T>(options: DispatchOptions<T>): Promise<T> {
  cleanupExpiredEntries();

  const key = options.idempotencyKey?.trim();
  const ttlMs = options.ttlMs ?? 12_000;
  const attempts = Math.max(1, options.attempts ?? 3);

  if (key) {
    const cached = RESULT_CACHE.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.result as T;
    }

    const pending = PENDING_CACHE.get(key);
    if (pending) {
      return pending as Promise<T>;
    }
  }

  const scheduled = queueTail.then(async () => {
    const result = await runWithRetry(options.task, attempts);
    if (key) {
      RESULT_CACHE.set(key, {
        expiresAt: Date.now() + ttlMs,
        result,
      });
    }
    return result;
  });

  queueTail = scheduled.then(() => undefined).catch(() => undefined);

  if (key) {
    PENDING_CACHE.set(key, scheduled as Promise<unknown>);
    scheduled.finally(() => {
      PENDING_CACHE.delete(key);
    });
  }

  return scheduled;
}
