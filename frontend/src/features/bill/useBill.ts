import { useCallback, useMemo, useState } from 'react';
import { parseAmountToCents, type AmountParseError } from '../../lib/money/amount';
import { apportion, reconcile } from '../../lib/money/apportion';
import type { BillState, Participant, ParticipantId, Splitter } from './types';

/**
 * What the screen should render right now, derived from `BillState`.
 *
 * - `no-total`  — nothing entered yet; not an error, just no amounts to show.
 * - `invalid`   — the total was refused; show an inline message, no amounts.
 * - `ok`        — amounts that provably add up to the total.
 * - `mismatch`  — the split did not add up; show an error, never the amounts.
 */
export type BillSplit =
  | { kind: 'no-total' }
  | { kind: 'invalid'; error: AmountParseError }
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
  /** A bill always has at least one participant, so zero is never reachable. */
  canRemoveParticipant: boolean;
}

function newParticipant(): Participant {
  return { id: crypto.randomUUID(), name: '' };
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

  const split = useMemo<BillSplit>(() => {
    const parsed = parseAmountToCents(state.totalInput);
    if (!parsed.ok) {
      return parsed.error === 'EMPTY' ? { kind: 'no-total' } : { kind: 'invalid', error: parsed.error };
    }

    const totalCents = parsed.cents;
    // BS-27 splits evenly, so every weight is 1. BS-28 onwards varies these.
    const weights = state.participants.map(() => 1);

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
    canRemoveParticipant: state.participants.length > 1,
  };
}
