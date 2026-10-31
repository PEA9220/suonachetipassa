import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { framesToNotes } from '../src/core/segment';
import { evaluate } from '../src/core/evaluate';
import { getLevel } from '../src/core/levels';
import { minNoteMsFor } from '../src/core/session';
import type { Exercise } from '../src/core/types';
import type { PitchFrame } from '../src/core/pitch';

// Tentativi veri salvati dal riepilogo ("Salva i dati del tentativo"), tempi dalla fine del conteggio.
type Attempt = { exercise: Exercise; frames: PitchFrame[]; latencyMs: number | null };
const dir = join(__dirname, 'fixtures', 'attempts');
const load = (name: string): Attempt => JSON.parse(readFileSync(join(dir, name), 'utf8'));

describe('tentativi reali', () => {
  it('generatore La6 con colpo grave all\'attacco: una sola nota, nessuna nota in più', () => {
    const a = load('generatore-la6-colpo-grave.json');
    const notes = framesToNotes(a.frames, { minNoteMs: minNoteMsFor(a.exercise) });
    const ev = evaluate(a.exercise, notes, getLevel(a.exercise.level).tolerances, a.latencyMs);
    expect(ev.results.filter(r => r.status === 'extra')).toHaveLength(0);
    // il generatore suonava davvero un La6 mentre l'esercizio chiedeva un La5
    expect(ev.results.map(r => r.status)).toEqual(['wrong']);
    expect(notes.at(-1)?.midi).toBe(93);
  });

  it('ogni tentativo salvato si rilegge senza errori', () => {
    for (const f of readdirSync(dir).filter(n => n.endsWith('.json'))) {
      const a = load(f);
      expect(() => framesToNotes(a.frames, { minNoteMs: minNoteMsFor(a.exercise) })).not.toThrow();
    }
  });
});
