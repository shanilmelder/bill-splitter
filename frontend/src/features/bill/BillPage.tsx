import { formatCents } from '../../lib/money/amount';
import { ParticipantList } from './ParticipantList';
import { TotalInput } from './TotalInput';
import { useBill } from './useBill';
import { displayName, type Splitter } from './types';

export interface BillPageProps {
  /**
   * Overrides the split algorithm. Production uses the default (`apportion`);
   * tests inject a deliberately mismatched splitter to exercise the
   * reconciliation error branch, which is unreachable while `apportion` is
   * correct.
   */
  splitter?: Splitter;
}

export function BillPage({ splitter }: BillPageProps) {
  const bill = useBill(splitter === undefined ? {} : { splitter });
  const { split } = bill;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Split the bill</h1>
        <p className="text-sm text-slate-600">
          Enter the bill total and who was at the table. Every amount is shown to the cent.
        </p>
      </header>

      <TotalInput
        value={bill.totalInput}
        onChange={bill.setTotalInput}
        error={split.kind === 'invalid' ? split.error : null}
      />

      <ParticipantList
        participants={bill.participants}
        canRemove={bill.canRemoveParticipant}
        onAdd={bill.addParticipant}
        onRemove={bill.removeParticipant}
        onRename={bill.renameParticipant}
      />

      <section aria-labelledby="items-heading" className="flex flex-col gap-2">
        <h2 id="items-heading" className="text-base font-semibold text-slate-800">
          Items
        </h2>
        <p className="text-sm text-slate-600">
          No items yet. This bill is split evenly between everyone at the table.
        </p>
      </section>

      <section aria-labelledby="amounts-heading" className="flex flex-col gap-3">
        <h2 id="amounts-heading" className="text-base font-semibold text-slate-800">
          Each person owes
        </h2>

        <div aria-live="polite" className="flex flex-col gap-4">
          {split.kind === 'no-total' && (
            <p className="text-sm text-slate-600">
              Enter a bill total to see what each person owes.
            </p>
          )}

          {split.kind === 'invalid' && (
            <p className="text-sm text-slate-600">
              No amounts yet — correct the bill total above.
            </p>
          )}

          {split.kind === 'mismatch' && (
            <div
              role="alert"
              className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800"
            >
              <p className="font-semibold">Something has gone wrong with this split.</p>
              <p>
                The per-person amounts do not add up to the bill total, so they are not shown.
                {split.sumCents === null
                  ? ' The split could not be calculated.'
                  : ` Bill total ${formatCents(split.totalCents)}, amounts add up to ${formatCents(split.sumCents)}.`}
              </p>
            </div>
          )}

          {split.kind === 'ok' && (
            <>
              <ul className="flex flex-col divide-y divide-slate-200 rounded-lg border border-slate-200">
                {bill.participants.map((participant, index) => (
                  <li
                    key={participant.id}
                    className="flex items-center justify-between gap-4 px-3 py-2"
                  >
                    <span className="truncate text-slate-800">
                      {displayName(participant, index)}
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums text-slate-900">
                      {formatCents(split.shares[index] ?? 0)}
                    </span>
                  </li>
                ))}
              </ul>

              <dl className="flex flex-col gap-1 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-600">Bill total</dt>
                  <dd className="font-semibold tabular-nums text-slate-900">
                    {formatCents(split.totalCents)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-600">Sum of per-person amounts</dt>
                  <dd className="font-semibold tabular-nums text-slate-900">
                    {formatCents(split.sumCents)}
                  </dd>
                </div>
              </dl>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
