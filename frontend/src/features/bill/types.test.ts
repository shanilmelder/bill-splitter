import { describe, expect, it } from 'vitest';
import { displayName, parseShareCount, type Participant } from './types';

const participant = (name: string): Participant => ({ id: `id-${name}`, name, shareInput: '1' });

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
    const second: Participant = { id: 'other', name: 'Sam', shareInput: '1' };
    expect(displayName(first, 0)).toBe(displayName(second, 1));
    expect(first.id).not.toBe(second.id);
  });
});

describe('parseShareCount', () => {
  it('accepts positive whole numbers', () => {
    expect(parseShareCount('1')).toEqual({ ok: true, shares: 1 });
    expect(parseShareCount('3')).toEqual({ ok: true, shares: 3 });
    expect(parseShareCount(' 4 ')).toEqual({ ok: true, shares: 4 });
  });

  it('accepts the upper bound and refuses anything past it', () => {
    expect(parseShareCount('1000')).toEqual({ ok: true, shares: 1000 });
    expect(parseShareCount('1001')).toEqual({ ok: false, error: 'TOO_LARGE' });
  });

  it('refuses an empty share count', () => {
    expect(parseShareCount('')).toEqual({ ok: false, error: 'EMPTY' });
    expect(parseShareCount('   ')).toEqual({ ok: false, error: 'EMPTY' });
  });

  it('refuses zero and negative share counts', () => {
    expect(parseShareCount('0')).toEqual({ ok: false, error: 'TOO_SMALL' });
    expect(parseShareCount('-1')).toEqual({ ok: false, error: 'INVALID' });
  });

  it('refuses fractional and non-numeric share counts', () => {
    expect(parseShareCount('1.5')).toEqual({ ok: false, error: 'INVALID' });
    expect(parseShareCount('abc')).toEqual({ ok: false, error: 'INVALID' });
    expect(parseShareCount('2 people')).toEqual({ ok: false, error: 'INVALID' });
  });
});
