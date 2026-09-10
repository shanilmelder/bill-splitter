/**
 * Largest-remainder apportionment of integer cents.
 *
 * The guarantee this module exists to keep: the returned shares sum to
 * `totalCents` exactly — no cent lost, no cent invented. Every comparison is
 * between integers; there is no floating-point arithmetic in the ordering
 * path, because comparing fractional parts as floats is precisely how a cent
 * goes missing.
 *
 * Pure module — deliberately free of React and of any bill-shaped types.
 * BS-27 only ever passes weights of 1, but the weighted signature is the one
 * BS-28 / BS-30 / BS-31 / BS-39 (per-item shares, uneven splits) will import
 * unchanged.
 */

/**
 * Split `totalCents` across `weights`, proportionally to the weights.
 *
 * Remainder cents are handed out one at a time to the entries whose unrounded
 * amount had the largest fractional part; ties go to the earlier index, so
 * participant order decides.
 *
 * @param totalCents non-negative integer
 * @param weights non-empty array of positive integers
 * @returns one share per weight, in the original order, summing to `totalCents`
 */
export function apportion(totalCents: number, weights: number[]): number[] {
  if (!Number.isInteger(totalCents) || totalCents < 0) {
    throw new RangeError(`apportion: totalCents must be a non-negative integer, got ${totalCents}`);
  }
  if (weights.length === 0) {
    throw new RangeError('apportion: weights must not be empty');
  }

  let weightSum = 0;
  for (const weight of weights) {
    if (!Number.isInteger(weight) || weight <= 0) {
      throw new RangeError(`apportion: every weight must be a positive integer, got ${weight}`);
    }
    weightSum += weight;
  }

  const base = new Array<number>(weights.length);
  const remainders = new Array<number>(weights.length);
  let baseSum = 0;

  for (let i = 0; i < weights.length; i += 1) {
    const numerator = totalCents * (weights[i] as number);
    const share = Math.trunc(numerator / weightSum);
    base[i] = share;
    // Integer fractional numerator, 0 <= remainder < weightSum. Kept as an
    // integer so step 2 below never compares floats.
    remainders[i] = numerator - share * weightSum;
    baseSum += share;
  }

  // 1. How many whole cents are still unallocated after flooring.
  const leftover = totalCents - baseSum;

  // 2. Largest remainder first; ties broken by ascending index.
  const order = Array.from(weights, (_, i) => i).sort((a, b) => {
    const remainderA = remainders[a] as number;
    const remainderB = remainders[b] as number;
    if (remainderA !== remainderB) {
      return remainderB - remainderA;
    }
    return a - b;
  });

  // 3. Hand out the leftover cents, one each.
  for (let k = 0; k < leftover; k += 1) {
    const index = order[k] as number;
    base[index] = (base[index] as number) + 1;
  }

  // 4. The invariant the whole feature rests on. If this ever trips it is a
  //    bug in this function, not something callers should paper over — the
  //    UI's reconciliation row exists to surface it, not to mask it.
  const total = base.reduce((sum, share) => sum + share, 0);
  if (total !== totalCents) {
    throw new Error(`apportion: shares summed to ${total}, expected ${totalCents}`);
  }

  return base;
}

export type ReconcileResult =
  | { ok: true }
  | { ok: false; totalCents: number; sumCents: number };

/**
 * Check that a set of shares still accounts for the bill total.
 *
 * The UI calls this on whatever the splitter returned and shows an error
 * region instead of the per-person amounts when it disagrees — better to say
 * something has gone wrong than to display a number we cannot stand behind.
 */
export function reconcile(totalCents: number, shares: number[]): ReconcileResult {
  const sumCents = shares.reduce((sum, share) => sum + share, 0);
  if (sumCents === totalCents) {
    return { ok: true };
  }
  return { ok: false, totalCents, sumCents };
}
