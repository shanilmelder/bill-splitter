import { useCallback, useMemo, useState } from 'react';
import { parseAmountToCents, type AmountParseError } from '../../lib/money/amount';
import { apportion, reconcile } from '../../lib/money/apportion';
import {
  parseShareCount,
  type BillState,
  type Participant,
  type ParticipantId,
  type ShareParseError,
  type Splitter,
} from './types';

/**
 * What the screen should render right now, derived from `BillState`.
 *
 * - `no-total`  — nothing entered yet; not an error, just no amounts to show.
 * - `invalid`   — the total was refused; show an inline message, no amounts.
 * - `ok`        — amounts that provably add up to the total.
 * - `invalid-shares` — a share count was refused; show an inline message, no amounts.
 * - `mismatch`  — the split did not add up; show an error, never the amounts.
 */
export type BillSplit =
  | { kind: 'no-total' }
  | { kind: 'invalid'; error: AmountParseError }
  | { kind: 'invalid-shares'; participantId: ParticipantId; error: ShareParseError }
  | { kind: 'ok'; totalCents: number; shares: number[]; sumCents: number }
  /** `sumCents` is null when the splitter threw rather than answering. */
  | { kind: 'mismatch'; totalCents: number; sumCents: number | null };

export interface UseBillOptions {
  /** Defaults to `apportion`; injectable so the mismatch branch is testable. */
  splitter?: Splitter;
}

export interface UseBill {
  participants: Participant[];
  totalInput: string;
  split: BillSplit;
  setTotalInput: (value: string) => void;
  addParticipant: () => void;
  removeParticipant: (id: ParticipantId) => void;
  renameParticipant: (id: ParticipantId, name: string) => void;
  setParticipantShares: (id: ParticipantId, value: string) => void;
  /** A bill always has at least one participant, so zero is never reachable. */
  canRemoveParticipant: boolean;
}

function newParticipant(): Participant {
  return { id: crypto.randomUUID(), name: '', shareInput: '1' };
}

/** A new bill starts empty: one participant, no name, no total, no items. */
function initialState(): BillState {
  return { participants: [newParticipant()], totalInput: '' };
}

export function useBill(options: UseBillOptions = {}): UseBill {
  const splitter = options.splitter ?? apportion;
  const [state, setState] = useState<BillState>(initialState);

  const setTotalInput = useCallback((value: string) => {
    setState((current) => ({ ...current, totalInput: value }));
  }, []);

  const addParticipant = useCallback(() => {
    setState((current) => ({
      ...current,
      participants: [...current.participants, newParticipant()],
    }));
  }, []);

  const removeParticipant = useCallback((id: ParticipantId) => {
    setState((current) => {
      // Never drop to zero participants — `apportion` would have nothing to
      // divide by.
      if (current.participants.length <= 1) {
        return current;
      }
      return {
        ...current,
        participants: current.participants.filter((participant) => participant.id !== id),
      };
    });
  }, []);

  const renameParticipant = useCallback((id: ParticipantId, name: string) => {
    setState((current) => ({
      ...current,
      // Identity is the generated id, so two participants may share a name and
      // stay two participants.
      participants: current.participants.map((participant) =>
        participant.id === id ? { ...participant, name } : participant,
      ),
    }));
  }, []);

  const setParticipantShares = useCallback((id: ParticipantId, value: string) => {
    setState((current) => ({
      ...current,
      participants: current.participants.map((participant) =>
        participant.id === id ? { ...participant, shareInput: value } : participant,
      ),
    }));
  }, []);

  const split = useMemo<BillSplit>(() => {
    const parsed = parseAmountToCents(state.totalInput);
    if (!parsed.ok) {
      return parsed.error === 'EMPTY' ? { kind: 'no-total' } : { kind: 'invalid', error: parsed.error };
    }

    const totalCents = parsed.cents;

    // Every share count is parsed before any splitting happens; the first
    // one that fails blocks amounts entirely rather than silently falling
    // back to a share of 1.
    const weights: number[] = [];
    for (const participant of state.participants) {
      const parsedShare = parseShareCount(participant.shareInput);
      if (!parsedShare.ok) {
        return { kind: 'invalid-shares', participantId: participant.id, error: parsedShare.error };
      }
      weights.push(parsedShare.shares);
    }

    let shares: number[];
    try {
      shares = splitter(totalCents, weights);
    } catch {
      // A splitter that refuses to answer is the same failure mode as one that
      // answers wrongly: show an error, not a number.
      return { kind: 'mismatch', totalCents, sumCents: null };
    }

    // A share per participant, or we cannot label the amounts we were given.
    if (shares.length !== weights.length) {
      return {
        kind: 'mismatch',
        totalCents,
        sumCents: shares.reduce((sum, share) => sum + share, 0),
      };
    }

    const checked = reconcile(totalCents, shares);
    if (!checked.ok) {
      return { kind: 'mismatch', totalCents, sumCents: checked.sumCents };
    }

    return { kind: 'ok', totalCents, shares, sumCents: totalCents };
  }, [splitter, state.participants, state.totalInput]);

  return {
    participants: state.participants,
    totalInput: state.totalInput,
    split,
    setTotalInput,
    addParticipant,
    removeParticipant,
    renameParticipant,
    setParticipantShares,
    canRemoveParticipant: state.participants.length > 1,
  };
}
