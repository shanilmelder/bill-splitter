import { describe, expect, it } from 'vitest';
import { apportion, reconcile } from './apportion';

const ones = (n: number): number[] => new Array<number>(n).fill(1);

describe('apportion', () => {
  it('splits 10.00 three ways as 3.34 / 3.33 / 3.33 — the headline guarantee', () => {
    const shares = apportion(1000, [1, 1, 1]);
    expect(shares).toEqual([334, 333, 333]);
    expect(shares.reduce((sum, share) => sum + share, 0)).toBe(1000);
  });

  it.each([
    [0, [1, 1, 1], [0, 0, 0]],
    [1000, [1], [1000]],
    [1001, [1, 1, 1], [334, 334, 333]],
    [1002, [1, 1, 1], [334, 334, 334]],
    [10, ones(7), [2, 2, 2, 1, 1, 1, 1]],
    [1000, ones(7), [143, 143, 143, 143, 143, 143, 142]],
    [100, [1, 1, 1], [34, 33, 33]],
  ])('apportions %i cents over %j', (total, weights, expected) => {
    expect(apportion(total, weights)).toEqual(expected);
  });

  it('gives the single leftover cent to the first participant', () => {
    const expected = ones(20).map((_, index) => (index === 0 ? 1 : 0));
    expect(apportion(1, ones(20))).toEqual(expected);
  });

  it('honours weights, so BS-28 can reuse it unchanged', () => {
    expect(apportion(1000, [2, 1, 1])).toEqual([500, 250, 250]);
  });

  it('rejects inputs that would break the invariant', () => {
    expect(() => apportion(-1, [1])).toThrow(RangeError);
    expect(() => apportion(10.5, [1])).toThrow(RangeError);
    expect(() => apportion(100, [])).toThrow(RangeError);
    expect(() => apportion(100, [0, 1])).toThrow(RangeError);
    expect(() => apportion(100, [-1, 1])).toThrow(RangeError);
  });

  it('never loses or invents a cent, and keeps shares within one cent of each other', () => {
    let seed = 20260909;
    const nextRandom = (): number => {
      // Deterministic LCG, so a failure is reproducible rather than a flake.
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };

    for (let run = 0; run < 2000; run += 1) {
      const totalCents = Math.floor(nextRandom() * 1_000_001);
      const n = 1 + Math.floor(nextRandom() * 20);
      const shares = apportion(totalCents, ones(n));

      expect(shares).toHaveLength(n);
      expect(shares.reduce((sum, share) => sum + share, 0)).toBe(totalCents);
      expect(Math.max(...shares) - Math.min(...shares)).toBeLessThanOrEqual(1);
      // The extra cents go to the front of the list, never the middle.
      expect([...shares].sort((a, b) => b - a)).toEqual(shares);
    }
  });
});

describe('reconcile', () => {
  it('accepts shares that add up to the total', () => {
    expect(reconcile(1000, [334, 333, 333])).toEqual({ ok: true });
    expect(reconcile(0, [0, 0, 0])).toEqual({ ok: true });
  });

  it('reports both numbers when a cent has gone missing', () => {
    expect(reconcile(1000, [333, 333, 333])).toEqual({
      ok: false,
      totalCents: 1000,
      sumCents: 999,
    });
  });

  it('reports an invented cent too', () => {
    expect(reconcile(1000, [334, 334, 334])).toEqual({
      ok: false,
      totalCents: 1000,
      sumCents: 1002,
    });
  });
});
