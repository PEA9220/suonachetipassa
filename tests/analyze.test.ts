import { describe, it, expect } from 'vitest';
import { analyzeSamples } from '../src/core/pitch';
import { framesToNotes } from '../src/core/segment';
import { sine } from './helpers/signals';

describe('analyzeSamples + framesToNotes', () => {
  it('un segnale sintetico La-silenzio-Si dà due note', () => {
    const sr = 48000;
    const parts = [sine(440, sr, sr / 2), new Float32Array(sr / 4), sine(493.88, sr, sr / 2)];
    const all = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
    let at = 0; for (const p of parts) { all.set(p, at); at += p.length; }
    const notes = framesToNotes(analyzeSamples(all, sr));
    expect(notes.map(n => n.midi)).toEqual([69, 71]);
  });
});
