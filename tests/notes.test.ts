import { describe, it, expect } from 'vitest';
import { noteName, formatPercent } from '../src/core/notes';

describe('noteName', () => {
  it('nomi italiani con ottava scientifica', () => {
    expect(noteName(69)).toBe('La4');
    expect(noteName(61)).toBe('Do♯4');
    expect(noteName(55)).toBe('Sol3');
    expect(noteName(100)).toBe('Mi7');
  });
});

describe('formatPercent', () => {
  it('percentuale intera', () => {
    expect(formatPercent(0.856)).toBe('86%');
    expect(formatPercent(1)).toBe('100%');
  });
});
