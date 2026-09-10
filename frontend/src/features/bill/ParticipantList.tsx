import { displayName, type Participant, type ParticipantId } from './types';

export interface ParticipantListProps {
  participants: Participant[];
  canRemove: boolean;
  onAdd: () => void;
  onRemove: (id: ParticipantId) => void;
  onRename: (id: ParticipantId, name: string) => void;
  onShareChange: (id: ParticipantId, value: string) => void;
}

const MIN_PARTICIPANTS_HINT_ID = 'participants-minimum-hint';

/**
 * The people at the table. Names are optional; identity is the generated id,
 * so two people called the same thing stay two people.
 *
 * Labels and accessible button names are position-based ("Participant 2 name")
 * rather than name-based, so they stay unique and stable while someone types.
 */
export function ParticipantList({
  participants,
  canRemove,
  onAdd,
  onRemove,
  onRename,
  onShareChange,
}: ParticipantListProps) {
  return (
    <section aria-labelledby="participants-heading" className="flex flex-col gap-3">
      <h2 id="participants-heading" className="text-base font-semibold text-slate-800">
        People at the table
      </h2>

      <ul className="flex flex-col gap-3">
        {participants.map((participant, index) => (
          <li key={participant.id} className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
            <div className="flex flex-1 flex-col gap-1">
              <label
                htmlFor={`participant-name-${participant.id}`}
                className="text-sm font-medium text-slate-700"
              >
                {`Participant ${index + 1} name`}
              </label>
              <input
                id={`participant-name-${participant.id}`}
                type="text"
                autoComplete="off"
                value={participant.name}
                placeholder={displayName(participant, index)}
                onChange={(event) => onRename(participant.id, event.target.value)}
                className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>

            <div className="flex flex-col gap-1 sm:w-24">
              <label
                htmlFor={`participant-shares-${participant.id}`}
                className="text-sm font-medium text-slate-700"
              >
                {`Participant ${index + 1} shares`}
              </label>
              <input
                id={`participant-shares-${participant.id}`}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={participant.shareInput}
                onChange={(event) => onShareChange(participant.id, event.target.value)}
                className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 py-2 text-right tabular-nums shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>

            <button
              type="button"
              onClick={() => onRemove(participant.id)}
              disabled={!canRemove}
              aria-label={`Remove participant ${index + 1}`}
              aria-describedby={canRemove ? undefined : MIN_PARTICIPANTS_HINT_ID}
              className="min-h-[44px] min-w-[44px] rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      {!canRemove && (
        <p id={MIN_PARTICIPANTS_HINT_ID} className="text-sm text-slate-600">
          A bill needs at least one participant, so this person cannot be removed.
        </p>
      )}

      <button
        type="button"
        onClick={onAdd}
        className="min-h-[44px] self-start rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
      >
        Add participant
      </button>
    </section>
  );
}
