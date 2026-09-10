/** Bill-shaped domain types. Money is always integer cents, never a float. */

export type ParticipantId = string;

export interface Participant {
  id: ParticipantId;
  /** Raw user input. May be `''` — names are optional. */
  name: string;
  /**
   * Raw user input for the share count. Defaults to `'1'`, so an untouched
   * bill splits evenly with no extra input needed. Kept as text (not a
   * number) for the same reason `totalInput` is: the user's typing survives
   * validation instead of being silently rewritten.
   */
  shareInput: string;
}

export type ShareParseError = 'EMPTY' | 'INVALID' | 'TOO_SMALL' | 'TOO_LARGE';

export type ShareParseResult =
  | { ok: true; shares: number }
  | { ok: false; error: ShareParseError };

/** A share count above this would risk `apportion`'s `totalCents * weight`
 * multiplication overflowing `Number.MAX_SAFE_INTEGER` and corrupting the
 * split — this is a correctness guard, not an arbitrary UI limit. */
export const MAX_SHARE_COUNT = 1000;

const SHARE_PATTERN = /^\d+$/;

/**
 * Parse a participant's raw share-count text into a positive integer.
 *
 * Fractional shares are out of scope: anything that is not a bare positive
 * integer is refused rather than coerced, mirroring `parseAmountToCents`.
 */
export function parseShareCount(input: string): ShareParseResult {
  const trimmed = input.trim();

  if (trimmed === '') {
    return { ok: false, error: 'EMPTY' };
  }

  if (!SHARE_PATTERN.test(trimmed)) {
    return { ok: false, error: 'INVALID' };
  }

  const shares = Number.parseInt(trimmed, 10);
  if (!Number.isSafeInteger(shares)) {
    return { ok: false, error: 'INVALID' };
  }

  if (shares < 1) {
    return { ok: false, error: 'TOO_SMALL' };
  }

  if (shares > MAX_SHARE_COUNT) {
    return { ok: false, error: 'TOO_LARGE' };
  }

  return { ok: true, shares };
}

/**
 * The one object that is the bill. BS-36 persists exactly this, which is why
 * cents are derived rather than stored: there is no second source of truth to
 * keep in sync.
 */
export interface BillState {
  participants: Participant[];
  /** Raw text from the total field, so the user's typing survives validation. */
  totalInput: string;
}

/**
 * How a splitter is injected into the bill. `apportion` is the real one; tests
 * pass a deliberately broken one to reach the reconciliation error branch
 * without weakening `apportion`'s own invariant.
 */
export type Splitter = (totalCents: number, weights: number[]) => number[];

/**
 * The label a participant is shown under: their trimmed name, or their
 * position in the list. Position-derived, so removing someone renumbers the
 * unnamed participants below them.
 */
export function displayName(participant: Participant, index: number): string {
  const trimmed = participant.name.trim();
  return trimmed === '' ? `Person ${index + 1}` : trimmed;
}
