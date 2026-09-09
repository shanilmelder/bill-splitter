import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { BillPage } from './BillPage';

const amountsRegion = () => screen.getByRole('region', { name: 'Each person owes' });

/** The per-person amount rows, in participant order. */
const amountRows = () => within(amountsRegion()).getAllByRole('listitem');

const totalField = () => screen.getByLabelText('Bill total');

const addParticipants = async (user: ReturnType<typeof userEvent.setup>, count: number) => {
  const addButton = screen.getByRole('button', { name: 'Add participant' });
  for (let i = 0; i < count; i += 1) {
    await user.click(addButton);
  }
};

describe('BillPage', () => {
  it('opens as an empty bill with one participant and no items', () => {
    render(<BillPage />);

    const participants = screen.getByRole('region', { name: 'People at the table' });
    expect(within(participants).getAllByRole('listitem')).toHaveLength(1);
    expect(within(participants).getByPlaceholderText('Person 1')).toBeInTheDocument();

    expect(totalField()).toHaveValue('');
    expect(screen.getByText(/no items yet/i)).toBeInTheDocument();
    expect(
      within(amountsRegion()).getByText('Enter a bill total to see what each person owes.'),
    ).toBeInTheDocument();
  });

  it('cannot remove the only participant, and explains why', () => {
    render(<BillPage />);

    const remove = screen.getByRole('button', { name: 'Remove participant 1' });
    expect(remove).toBeDisabled();
    expect(
      screen.getByText('A bill needs at least one participant, so this person cannot be removed.'),
    ).toBeInTheDocument();
  });

  it('adds and removes participants', async () => {
    const user = userEvent.setup();
    render(<BillPage />);

    await addParticipants(user, 2);
    const participants = screen.getByRole('region', { name: 'People at the table' });
    expect(within(participants).getAllByRole('listitem')).toHaveLength(3);

    await user.click(screen.getByRole('button', { name: 'Remove participant 2' }));
    expect(within(participants).getAllByRole('listitem')).toHaveLength(2);
  });

  it('splits 10.00 between three people as 3.34, 3.33, 3.33 with a matching sum row', async () => {
    const user = userEvent.setup();
    render(<BillPage />);

    await addParticipants(user, 2);
    await user.type(totalField(), '10.00');

    const rows = amountRows();
    expect(rows).toHaveLength(3);
    expect(within(rows[0] as HTMLElement).getByText('3.34')).toBeInTheDocument();
    expect(within(rows[1] as HTMLElement).getByText('3.33')).toBeInTheDocument();
    expect(within(rows[2] as HTMLElement).getByText('3.33')).toBeInTheDocument();

    // Both the bill total and the sum of the per-person amounts are on screen.
    const region = amountsRegion();
    expect(within(region).getByText('Bill total')).toBeInTheDocument();
    expect(within(region).getByText('Sum of per-person amounts')).toBeInTheDocument();
    expect(within(region).getAllByText('10.00')).toHaveLength(2);
  });

  it('accepts a total of 0.00 and shows 0.00 for everyone', async () => {
    const user = userEvent.setup();
    render(<BillPage />);

    await addParticipants(user, 1);
    await user.type(totalField(), '0.00');

    const rows = amountRows();
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(within(row as HTMLElement).getByText('0.00')).toBeInTheDocument();
    }
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows every amount with exactly 2 decimal places', async () => {
    const user = userEvent.setup();
    render(<BillPage />);

    await addParticipants(user, 2);
    await user.type(totalField(), '7');

    // Each row carries exactly one money value, rendered to exactly 2 places.
    const shown = amountRows().map(
      (row) => within(row as HTMLElement).getByText(/^\d+\.\d{2}$/).textContent,
    );
    expect(shown).toEqual(['2.34', '2.33', '2.33']);

    const region = amountsRegion();
    expect(within(region).getAllByText('7.00')).toHaveLength(2);
  });

  it('keeps two participants with the same name as two separate participants', async () => {
    const user = userEvent.setup();
    render(<BillPage />);

    await addParticipants(user, 1);
    await user.type(screen.getByLabelText('Participant 1 name'), 'Sam');
    await user.type(screen.getByLabelText('Participant 2 name'), 'Sam');
    await user.type(totalField(), '10.00');

    const rows = amountRows();
    expect(rows).toHaveLength(2);
    expect(within(rows[0] as HTMLElement).getByText('Sam')).toBeInTheDocument();
    expect(within(rows[1] as HTMLElement).getByText('Sam')).toBeInTheDocument();
    expect(within(rows[0] as HTMLElement).getByText('5.00')).toBeInTheDocument();
    expect(within(rows[1] as HTMLElement).getByText('5.00')).toBeInTheDocument();
  });

  it('labels an unnamed participant added after a named one as Person 2', async () => {
    const user = userEvent.setup();
    render(<BillPage />);

    await user.type(screen.getByLabelText('Participant 1 name'), 'Ada');
    await addParticipants(user, 1);
    await user.type(totalField(), '10.00');

    const rows = amountRows();
    expect(within(rows[0] as HTMLElement).getByText('Ada')).toBeInTheDocument();
    expect(within(rows[1] as HTMLElement).getByText('Person 2')).toBeInTheDocument();
  });

  it('renumbers the remaining unnamed participants after a removal', async () => {
    const user = userEvent.setup();
    render(<BillPage />);

    await addParticipants(user, 2);
    await user.type(screen.getByLabelText('Participant 2 name'), 'Middle');
    await user.type(totalField(), '9.00');

    expect(within(amountRows()[2] as HTMLElement).getByText('Person 3')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove participant 2' }));

    const rows = amountRows();
    expect(rows).toHaveLength(2);
    expect(within(rows[0] as HTMLElement).getByText('Person 1')).toBeInTheDocument();
    expect(within(rows[1] as HTMLElement).getByText('Person 2')).toBeInTheDocument();
    expect(screen.queryByText('Middle')).not.toBeInTheDocument();
  });

  it('refuses a negative total with an inline message and calculates nothing', async () => {
    const user = userEvent.setup();
    render(<BillPage />);

    await user.type(totalField(), '-5');

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('A bill total cannot be negative.');
    // The message is announced against the input that was refused.
    expect(totalField()).toHaveAttribute('aria-describedby', alert.id);
    expect(totalField()).toHaveAttribute('aria-invalid', 'true');
    // The user's text is not thrown away.
    expect(totalField()).toHaveValue('-5');
    expect(within(amountsRegion()).queryAllByRole('listitem')).toHaveLength(0);
    expect(within(amountsRegion()).queryByText('Bill total')).not.toBeInTheDocument();
  });

  it('refuses a total with more than 2 decimal places without rewriting it', async () => {
    const user = userEvent.setup();
    render(<BillPage />);

    await user.type(totalField(), '10.555');

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter at most 2 decimal places, for example 10.50.',
    );
    expect(totalField()).toHaveValue('10.555');
    expect(within(amountsRegion()).queryAllByRole('listitem')).toHaveLength(0);
  });

  it('clears the inline message once the total is valid', async () => {
    const user = userEvent.setup();
    render(<BillPage />);

    await user.type(totalField(), '-5');
    expect(screen.getByRole('alert')).toBeInTheDocument();

    await user.clear(totalField());
    await user.type(totalField(), '5');

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(within(amountRows()[0] as HTMLElement).getByText('5.00')).toBeInTheDocument();
  });

  it('shows an error instead of amounts when the split does not add up', async () => {
    const user = userEvent.setup();
    // Deliberately broken splitter: reaching this branch through the real
    // `apportion` is impossible, and weakening its invariant to get here would
    // defeat the point of the invariant.
    render(<BillPage splitter={(_totalCents, weights) => weights.map(() => 1)} />);

    await user.type(totalField(), '10.00');

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Something has gone wrong with this split.');
    expect(alert).toHaveTextContent('Bill total 10.00, amounts add up to 0.01.');
    expect(within(amountsRegion()).queryAllByRole('listitem')).toHaveLength(0);
  });

  it('shows an error instead of amounts when the splitter cannot answer', async () => {
    const user = userEvent.setup();
    render(
      <BillPage
        splitter={() => {
          throw new Error('splitter exploded');
        }}
      />,
    );

    await user.type(totalField(), '10.00');

    expect(screen.getByRole('alert')).toHaveTextContent('The split could not be calculated.');
    expect(within(amountsRegion()).queryAllByRole('listitem')).toHaveLength(0);
  });
});
