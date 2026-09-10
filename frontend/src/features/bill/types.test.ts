import { describe, expect, it } from 'vitest';
import { displayName, type Participant } from './types';

const participant = (name: string): Participant => ({ id: `id-${name}`, name });

describe('displayName', () => {
  it('uses the trimmed name when there is one', () => {
    expect(displayName(participant('  Ada  '), 0)).toBe('Ada');
  });

  it('falls back to the list position when the name is empty or blank', () => {
    expect(displayName(participant(''), 0)).toBe('Person 1');
    expect(displayName(participant('   '), 1)).toBe('Person 2');
    expect(displayName(participant(''), 19)).toBe('Person 20');
  });

  it('does not merge two participants that share a name', () => {
    const first = participant('Sam');
    const second: Participant = { id: 'other', name: 'Sam' };
    expect(displayName(first, 0)).toBe(displayName(second, 1));
    expect(first.id).not.toBe(second.id);
  });
});
