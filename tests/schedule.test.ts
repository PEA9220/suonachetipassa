import { describe, it, expect } from 'vitest';
import { buildPlayback, buildCountIn } from '../src/core/schedule';
import type { Exercise } from '../src/core/types';

const base: Exercise = { id: 't', origin: 'generated', bpm: 60, meter: [4, 4], level: 3, notes: [] };
const ex44: Exercise = { ...base, bpm: 60, meter: [4, 4],
  notes: [{ midi: 69, startBeat: 0, durationBeats: 1 }, { midi: 71, startBeat: 2, durationBeats: 2 }] };

describe('schedule', () => {
  it('conteggio di una battuta', () => {
    expect(buildCountIn(ex44).clicks).toEqual([{ timeMs: 0, accent: true }, { timeMs: 1000, accent: false }, { timeMs: 2000, accent: false }, { timeMs: 3000, accent: false }]);
    expect(buildCountIn(ex44).totalMs).toBe(4000);
    expect(buildCountIn({ ...ex44, bpm: 120, meter: [3, 4] }).clicks.map(c => c.timeMs)).toEqual([0, 500, 1000]);
  });
  it('riproduzione', () => {
    expect(buildPlayback(ex44).notes).toEqual([{ midi: 69, timeMs: 0, durationMs: 1000 }, { midi: 71, timeMs: 2000, durationMs: 2000 }]);
    expect(buildPlayback(ex44).totalMs).toBe(4000);
  });
  it('metro in ottavi: il battito è l\'ottavo', () => {
    expect(buildCountIn({ ...ex44, bpm: 120, meter: [6, 8] }).clicks).toHaveLength(6);
  });
});
