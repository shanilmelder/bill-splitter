import type { AmountParseError } from '../../lib/money/amount';

const MESSAGES: Record<Exclude<AmountParseError, 'EMPTY'>, string> = {
  NEGATIVE: 'A bill total cannot be negative.',
  TOO_MANY_DECIMALS: 'Enter at most 2 decimal places, for example 10.50.',
  INVALID: 'Enter an amount using digits and a single decimal point, for example 10.50.',
};

export interface TotalInputProps {
  value: string;
  onChange: (value: string) => void;
  /** `null` while the field is empty — "no total yet" is not an error. */
  error: AmountParseError | null;
}

const INPUT_ID = 'bill-total';
const ERROR_ID = 'bill-total-error';

/**
 * The bill total field. Validation is a message, never keystroke blocking:
 * the user's text stays on screen so they can correct it.
 */
export function TotalInput({ value, onChange, error }: TotalInputProps) {
  const message = error === null || error === 'EMPTY' ? null : MESSAGES[error];

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={INPUT_ID} className="text-sm font-medium text-slate-700">
        Bill total
      </label>
      <input
        id={INPUT_ID}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        placeholder="0.00"
        aria-invalid={message !== null}
        aria-describedby={message === null ? undefined : ERROR_ID}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 py-2 text-lg tabular-nums shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400 sm:max-w-xs aria-invalid:border-red-500 aria-invalid:ring-red-300"
      />
      {message !== null && (
        <p id={ERROR_ID} role="alert" className="text-sm font-medium text-red-700">
          {message}
        </p>
      )}
    </div>
  );
}
