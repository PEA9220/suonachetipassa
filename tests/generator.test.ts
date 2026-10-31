import { describe, it, expect } from 'vitest';
import { generateExercise } from '../src/core/generator';
import { createRng } from '../src/core/random';
import { getLevel } from '../src/core/levels';

const MAJOR = [0, 2, 4, 5, 7, 9, 11];

describe('generateExercise', () => {
  for (let n = 1; n <= 7; n++) {
    it(`rispetta i vincoli del livello ${n} su 200 semi`, () => {
      for (let seed = 0; seed < 200; seed++) {
        const ex = generateExercise(getLevel(n), seed);
        const c = getLevel(n).content;
        expect(ex.origin).toBe('generated'); expect(ex.level).toBe(n); expect(ex.meter).toEqual([4, 4]);
        expect(ex.notes.length).toBeGreaterThanOrEqual(c.noteCount[0]);
        expect(ex.notes.length).toBeLessThanOrEqual(c.noteCount[1]);
        ex.notes.forEach(x => {
          expect(x.midi).toBeGreaterThanOrEqual(c.minMidi);
          expect(x.midi).toBeLessThanOrEqual(c.maxMidi); expect(c.durations).toContain(x.durationBeats);
        });
        ex.notes.slice(1).forEach((x, i) => expect(x.startBeat).toBe(ex.notes[i].startBeat + ex.notes[i].durationBeats));
        ex.notes.slice(1).forEach((x, i) => expect(Math.abs(x.midi - ex.notes[i].midi)).toBeLessThanOrEqual(c.maxInterval));
        if (!c.accidentals) ex.notes.forEach(x => expect(MAJOR).toContain(x.midi % 12));
        expect(ex.bpm).toBeGreaterThanOrEqual(c.bpm[0]); expect(ex.bpm).toBeLessThanOrEqual(c.bpm[1]);
      }
    });
  }

  it('stesso seme, stesso esercizio', () => {
    expect(generateExercise(getLevel(6), 42)).toEqual(generateExercise(getLevel(6), 42));
    expect(generateExercise(getLevel(6), 42).id).toBe('gen-6-42');
  });

  it('livello 7: scala maggiore con tonica sulla classe dell\'ultima nota', () => {
    for (let seed = 0; seed < 200; seed++) {
      const ex = generateExercise(getLevel(7), seed);
      const tonic = ex.notes[ex.notes.length - 1].midi % 12;
      ex.notes.forEach(x => expect(MAJOR).toContain((x.midi - tonic + 12) % 12));
    }
  });

  it('livello 8 non si genera', () => {
    expect(() => generateExercise(getLevel(8), 1)).toThrow();
  });
});

describe('createRng', () => {
  it('è deterministico e in [0, 1)', () => {
    const a = createRng(7), b = createRng(7);
    for (let i = 0; i < 100; i++) { const x = a(); expect(x).toBe(b()); expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(1); }
  });
});
