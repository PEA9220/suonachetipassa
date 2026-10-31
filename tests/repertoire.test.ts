import { describe, it, expect } from 'vitest';
import { parseExcerpt, getRepertoire } from '../src/core/repertoire';

const ok = { id: 'x', origin: 'repertoire', bpm: 80, meter: [3, 4], level: 8,
  source: { composer: 'J. S. Bach', work: 'Minuetto', bars: '1-2' },
  notes: [{ midi: 74, startBeat: 0, durationBeats: 1 }, { midi: 67, startBeat: 1, durationBeats: 0.5 }] };

describe('parseExcerpt', () => {
  it('accetta un estratto valido', () => {
    expect(parseExcerpt(ok).notes).toHaveLength(2);
  });
  it('rifiuta estratti non validi', () => {
    expect(() => parseExcerpt({ ...ok, source: undefined })).toThrow();
    expect(() => parseExcerpt({ ...ok, notes: [{ midi: 40, startBeat: 0, durationBeats: 1 }] })).toThrow();
    expect(() => parseExcerpt({ ...ok, notes: [{ midi: 74, startBeat: 0, durationBeats: 0 }] })).toThrow();
    expect(() => parseExcerpt({ ...ok, notes: [{ midi: 74, startBeat: 0, durationBeats: 2 }, { midi: 76, startBeat: 1, durationBeats: 1 }] })).toThrow();
    expect(() => parseExcerpt(null)).toThrow();
    expect(() => parseExcerpt({ ...ok, notes: [] })).toThrow();
  });
  it('ammette le pause', () => {
    expect(() => parseExcerpt({ ...ok, notes: [{ midi: 74, startBeat: 0, durationBeats: 1 }, { midi: 76, startBeat: 2, durationBeats: 1 }] })).not.toThrow();
  });
});

describe('getRepertoire', () => {
  it('include i tre estratti', () => {
    const all = getRepertoire();
    expect(all).toHaveLength(3);
    all.forEach(ex => expect(ex.level).toBe(8));
  });
});
