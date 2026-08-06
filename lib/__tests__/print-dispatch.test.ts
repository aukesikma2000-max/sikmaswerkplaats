import { dispatchPrintTask } from '@/lib/print-dispatch';

describe('dispatchPrintTask', () => {
  it('dedupes same idempotency key', async () => {
    let callCount = 0;

    const task = () => {
      callCount += 1;
      return Promise.resolve({ ok: true, value: callCount });
    };

    const [first, second] = await Promise.all([
      dispatchPrintTask({ idempotencyKey: 'same-key', task }),
      dispatchPrintTask({ idempotencyKey: 'same-key', task }),
    ]);

    expect(first).toEqual(second);
    expect(callCount).toBe(1);
  });

  it('retries failed task and succeeds', async () => {
    let callCount = 0;

    const result = await dispatchPrintTask({
      idempotencyKey: 'retry-key',
      attempts: 3,
      task: async () => {
        callCount += 1;
        if (callCount < 2) {
          throw new Error('temporary');
        }
        return { ok: true };
      },
    });

    expect(result).toEqual({ ok: true });
    expect(callCount).toBe(2);
  });
});
