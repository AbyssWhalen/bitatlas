import { describe, expect, it } from 'vitest';
import { chooseCacheEvictions } from './cache-policy';
describe('shared replaceable cache budget', () => {
  it('never removes pinned, unique or pending copies under pressure', () => {
    for (let count = 1; count < 100; count++) {
      const entries = Array.from({ length: count }, (_, i) => ({ key: String(i), bytes: 10, lastUsed: i, pinned: false, unique: false }));
      const protectedCopies = [
        { key: 'pinned', bytes: 10_000, lastUsed: 0, pinned: true, unique: false },
        { key: 'unique', bytes: 10_000, lastUsed: 0, pinned: false, unique: true },
        { key: 'pending', bytes: 10, lastUsed: 0, pinned: false, unique: false, pending: true },
      ];
      const removed = chooseCacheEvictions([...entries, ...protectedCopies], 30, 50);
      expect(removed).not.toContain('pinned'); expect(removed).not.toContain('unique'); expect(removed).not.toContain('pending');
      expect(entries.filter((entry) => !removed.includes(entry.key)).length * 10 + 40).toBeLessThanOrEqual(50);
    }
  });
  it('fails without pretending that protected space was released', () => {
    expect(() => chooseCacheEvictions([{ key: 'data', bytes: 100, lastUsed: 0, pinned: false, unique: false, pending: true }], 1, 100)).toThrow('额度不足');
  });
});
