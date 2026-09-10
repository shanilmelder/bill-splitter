import { describe, expect, it } from 'vitest';
import { formatCents, parseAmountToCents } from './amount';

describe('parseAmountToCents', () => {
  it.each([
    ['10', 1000],
    ['10.5', 1050],
    ['10.50', 1050],
    ['0', 0],
    ['0.00', 0],
    [' 10.00 ', 1000],
    ['1000', 100000],
    ['0.05', 5],
  ])('parses %j as %i cents', (input, cents) => {
    expect(parseAmountToCents(input)).toEqual({ ok: true, cents });
  });

  it('refuses more than 2 decimal places rather than rounding', () => {
    expect(parseAmountToCents('10.555')).toEqual({ ok: false, error: 'TOO_MANY_DECIMALS' });
    expect(parseAmountToCents('10.5555')).toEqual({ ok: false, error: 'TOO_MANY_DECIMALS' });
  });

  it.each(['-1', '-0.01', '-10.00'])('refuses the negative amount %j', (input) => {
    expect(parseAmountToCents(input)).toEqual({ ok: false, error: 'NEGATIVE' });
  });

  it.each(['', '   '])('reports %j as empty rather than invalid', (input) => {
    expect(parseAmountToCents(input)).toEqual({ ok: false, error: 'EMPTY' });
  });

  it.each(['abc', '1,00', '1.2.3', '1e3', '.5', '10.', '$10'])(
    'rejects %j as invalid',
    (input) => {
      expect(parseAmountToCents(input)).toEqual({ ok: false, error: 'INVALID' });
    },
  );
});

describe('formatCents', () => {
  it.each([
    [0, '0.00'],
    [5, '0.05'],
    [50, '0.50'],
    [333, '3.33'],
    [334, '3.34'],
    [1000, '10.00'],
    [100000, '1000.00'],
  ])('renders %i cents as %j', (cents, expected) => {
    expect(formatCents(cents)).toBe(expected);
  });

  it('always renders exactly 2 decimal places', () => {
    for (let cents = 0; cents <= 2000; cents += 1) {
      expect(formatCents(cents)).toMatch(/^\d+\.\d{2}$/);
    }
  });

  it('round-trips through parseAmountToCents without losing a cent', () => {
    for (let cents = 0; cents <= 5000; cents += 7) {
      expect(parseAmountToCents(formatCents(cents))).toEqual({ ok: true, cents });
    }
  });
});
