/** Bill-shaped domain types. Money is always integer cents, never a float. */

export type ParticipantId = string;

export interface Participant {
  id: ParticipantId;
  /** Raw user input. May be `''` — names are optional. */
  name: string;
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
