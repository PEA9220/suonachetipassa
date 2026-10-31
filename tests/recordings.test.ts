import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readWav } from './helpers/wav';
import { analyzeSamples } from '../src/core/pitch';
import { framesToNotes } from '../src/core/segment';

// Ogni registrazione `nome.wav` ha accanto `nome.json`:
// { "notes": [{ "midi": 69, "cents": -3 }, ...] } con lo scarto letto sull'accordatore.
const dir = join(__dirname, 'fixtures', 'audio');
const files = existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith('.wav')) : [];

describe.skipIf(files.length === 0)('registrazioni di prova', () => {
  for (const file of files) {
    it(file, () => {
      const expected: { notes: { midi: number; cents: number }[] } =
        JSON.parse(readFileSync(join(dir, file.replace(/\.wav$/, '.json')), 'utf8'));
      const { samples, sampleRate } = readWav(join(dir, file));
      const notes = framesToNotes(analyzeSamples(samples, sampleRate));
      expect(notes.map(n => n.midi)).toEqual(expected.notes.map(n => n.midi));
      notes.forEach((n, i) => expect(Math.abs(n.cents - expected.notes[i].cents), `nota ${i + 1}`).toBeLessThanOrEqual(5));
    });
  }
});
