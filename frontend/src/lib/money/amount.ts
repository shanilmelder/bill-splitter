/**
 * Money parsing and formatting.
 *
 * Every amount in this app is an integer number of cents. Nothing in this
 * module divides by 100, calls `toFixed` on a divided value, or compares
 * floats: a single `cents / 100` would eventually lose a cent and break the
 * "per-person amounts add up to the bill total exactly" guarantee.
 *
 * Pure module — no React, no bill-shaped types.
 */

export type AmountParseError = 'EMPTY' | 'INVALID' | 'NEGATIVE' | 'TOO_MANY_DECIMALS';

export type AmountParseResult =
  | { ok: true; cents: number }
  | { ok: false; error: AmountParseError };

/** Whole digits with an optional 1- or 2-place decimal fraction. */
const ACCEPTED = /^(\d+)(?:\.(\d{1,2}))?$/;
/** A well-formed number that simply has too much precision. */
const TOO_PRECISE = /^\d+\.\d{3,}$/;

/**
 * Parse user text into integer cents.
 *
 * Never rounds or truncates silently: input with more than 2 decimal places is
 * rejected as `TOO_MANY_DECIMALS` so the UI can keep the user's text on screen
 * and let them correct it.
 *
 * Only `.` is accepted as the decimal separator; locale-aware separators and
 * currency symbols are BS-37.
 */
export function parseAmountToCents(input: string): AmountParseResult {
  const trimmed = input.trim();

  if (trimmed === '') {
    return { ok: false, error: 'EMPTY' };
  }

  if (trimmed.startsWith('-')) {
    return { ok: false, error: 'NEGATIVE' };
  }

  if (TOO_PRECISE.test(trimmed)) {
    return { ok: false, error: 'TOO_MANY_DECIMALS' };
  }

  const match = ACCEPTED.exec(trimmed);
  if (match === null) {
    return { ok: false, error: 'INVALID' };
  }

  const whole = match[1] ?? '';
  const fraction = (match[2] ?? '').padEnd(2, '0');

  // String assembly, then one integer parse — no float arithmetic anywhere.
  const cents = Number.parseInt(`${whole}${fraction}`, 10);
  if (!Number.isSafeInteger(cents)) {
    return { ok: false, error: 'INVALID' };
  }

  return { ok: true, cents };
}

/**
 * Render integer cents with exactly 2 decimal places, by integer string
 * assembly: sign, whole part, `.`, zero-padded remainder. Bare digits with a
 * `.` separator and no currency symbol (BS-37 adds locale formatting).
 */
export function formatCents(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.trunc(cents));
  // Pure string assembly: pad to at least 3 digits, then split off the last
  // two as the fraction. No division at all, so no rounding can creep in.
  const digits = String(abs).padStart(3, '0');
  return `${sign}${digits.slice(0, -2)}.${digits.slice(-2)}`;
}
