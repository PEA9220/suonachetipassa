import { describe, it, expect } from 'vitest';
import { getLevel, LEVELS } from '../src/core/levels';

describe('levels', () => {
  it('ha le tolleranze del piano', () => {
    expect(getLevel(1).tolerances).toEqual({ intonationCents: 30, rhythmMs: null });
    expect(getLevel(2).tolerances).toEqual({ intonationCents: 25, rhythmMs: null });
    expect(getLevel(3).tolerances).toEqual({ intonationCents: 22, rhythmMs: 200 });
    expect(getLevel(8).tolerances).toEqual({ intonationCents: 8, rhythmMs: 50 });
    expect(LEVELS.map(l => l.tolerances.intonationCents)).toEqual([30, 25, 22, 18, 15, 12, 10, 8]);
    expect(LEVELS.slice(2).map(l => l.tolerances.rhythmMs)).toEqual([200, 160, 120, 90, 70, 50]);
  });
  it('livello 8 è repertorio, 9 non esiste', () => {
    expect(getLevel(8).content.kind).toBe('repertoire');
    expect(() => getLevel(9)).toThrow();
  });
});
