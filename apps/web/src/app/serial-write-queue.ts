export interface SerialWriteQueue {
  enqueue<T>(operation: () => Promise<T>): Promise<T>;
}

/** Keeps IndexedDB writes ordered while allowing a failed write to recover. */
export function createSerialWriteQueue(): SerialWriteQueue {
  let tail: Promise<void> = Promise.resolve();

  return {
    enqueue<T>(operation: () => Promise<T>): Promise<T> {
      const next = tail.then(operation);
      tail = next.then(() => undefined, () => undefined);
      return next;
    },
  };
}
