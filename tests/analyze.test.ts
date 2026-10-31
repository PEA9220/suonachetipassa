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

/** Suono con armoniche e fase continua: note legate, senza pause tra una e l'altra. */
function legato(hzs: number[], noteMs: number, sr: number): Float32Array {
  const per = Math.round((sr * noteMs) / 1000);
  const out = new Float32Array(per * hzs.length + sr / 5);
  let phase = 0;
  for (let i = 0; i < per * hzs.length; i++) {
    phase += (2 * Math.PI * hzs[Math.floor(i / per)]) / sr;
    out[i] = 0.4 * Math.sin(phase) + 0.2 * Math.sin(2 * phase) + 0.1 * Math.sin(3 * phase);
  }
  return out;
}

describe('review focus 5 su segnale realistico', () => {
  it('8 note legate da 70 ms alternate La / Si → 8 note', () => {
    const sr = 48000;
    const hzs = Array.from({ length: 8 }, (_, i) => (i % 2 ? 493.88 : 440));
    const notes = framesToNotes(analyzeSamples(legato(hzs, 70, sr), sr));
    expect(notes.map(n => n.midi)).toEqual([69, 71, 69, 71, 69, 71, 69, 71]);
  });
});
