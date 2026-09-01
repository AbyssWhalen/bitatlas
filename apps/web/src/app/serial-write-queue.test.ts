import { describe, expect, it } from 'vitest';
import { createSerialWriteQueue } from './serial-write-queue';

describe('serial write queue', () => {
  it('runs writes in enqueue order and continues after a failure', async () => {
    const queue = createSerialWriteQueue();
    const events: string[] = [];

    const first = queue.enqueue(async () => {
      events.push('first-start');
      events.push('first-end');
      return 'first';
    });
    const failed = queue.enqueue(async () => {
      events.push('failed-start');
      throw new Error('simulated write failure');
    });
    const third = queue.enqueue(async () => {
      events.push('third-start');
      return 'third';
    });

    await expect(first).resolves.toBe('first');
    await expect(failed).rejects.toThrow('simulated write failure');
    await expect(third).resolves.toBe('third');
    expect(events).toEqual(['first-start', 'first-end', 'failed-start', 'third-start']);
  });

  it('does not start a later write before an earlier async write settles', async () => {
    const queue = createSerialWriteQueue();
    const events: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });

    const first = queue.enqueue(async () => {
      events.push('first-start');
      await gate;
      events.push('first-end');
    });
    const second = queue.enqueue(async () => {
      events.push('second-start');
    });

    await Promise.resolve();
    expect(events).toEqual(['first-start']);
    release();
    await first;
    await second;
    expect(events).toEqual(['first-start', 'first-end', 'second-start']);
  });
});
