import assert from 'node:assert/strict';
import { dispatchPrintTask } from '@/lib/print-dispatch';

async function run() {
  let callCount = 0;
  const task = async () => {
    callCount += 1;
    return { ok: true, value: callCount };
  };

  const [first, second] = await Promise.all([
    dispatchPrintTask({ idempotencyKey: 'smoke-same-key', task }),
    dispatchPrintTask({ idempotencyKey: 'smoke-same-key', task }),
  ]);

  assert.deepEqual(first, second, 'Idempotency result should be identical for same key');
  assert.equal(callCount, 1, 'Task should run once for same idempotency key');

  let retryCount = 0;
  const retryResult = await dispatchPrintTask({
    idempotencyKey: 'smoke-retry-key',
    attempts: 3,
    task: async () => {
      retryCount += 1;
      if (retryCount < 2) {
        throw new Error('temporary failure');
      }
      return { ok: true };
    },
  });

  assert.deepEqual(retryResult, { ok: true }, 'Retry result should eventually succeed');
  assert.equal(retryCount, 2, 'Task should retry after first failure');

  console.log('Smoke test passed: print dispatch idempotency + retry');
}

run().catch((error) => {
  console.error('Smoke test failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
