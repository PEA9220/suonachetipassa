import { describe, it, expect } from 'vitest';
import { toMeasures } from '../src/core/notation';
import type { Exercise } from '../src/core/types';

const ex = (notes: Exercise['notes'], meter: [number, number] = [4, 4]): Exercise =>
  ({ id: 't', origin: 'generated', bpm: 60, meter, level: 3, notes });

describe('toMeasures', () => {
  it('note semplici in una battuta', () => {
    const m = toMeasures(ex([{ midi: 69, startBeat: 0, durationBeats: 2 }, { midi: 71, startBeat: 2, durationBeats: 2 }]));
    expect(m).toHaveLength(1);
    expect(m[0].map(p => [p.midi, p.duration, p.tieToNext])).toEqual([[69, 'h', false], [71, 'h', false]]);
  });
  it('pause per i vuoti e completamento dell\'ultima battuta', () => {
    const m = toMeasures(ex([{ midi: 69, startBeat: 1, durationBeats: 1 }]));
    expect(m[0].map(p => [p.midi, p.duration])).toEqual([[null, 'q'], [69, 'q'], [null, 'h']]);
  });
  it('una nota che attraversa la stanghetta si divide con legatura', () => {
    const m = toMeasures(ex([{ midi: 69, startBeat: 3, durationBeats: 2 }]));
    expect(m).toHaveLength(2);
    expect(m[0].at(-1)).toMatchObject({ midi: 69, duration: 'q', tieToNext: true, noteIndex: 0 });
    expect(m[1][0]).toMatchObject({ midi: 69, duration: 'q', tieToNext: false, noteIndex: 0 });
  });
  it('durate non standard si scompongono', () => {
    const m = toMeasures(ex([{ midi: 76, startBeat: 0, durationBeats: 3.5 }, { midi: 76, startBeat: 3.5, durationBeats: 0.5 }]));
    expect(m[0].map(p => p.duration)).toEqual(['hd', '8', '8']);
    expect(m[0][0].tieToNext).toBe(true);
  });
  it('3/4 e 6/8', () => {
    expect(toMeasures(ex([{ midi: 69, startBeat: 0, durationBeats: 3 }], [3, 4]))[0][0].duration).toBe('hd');
    expect(toMeasures(ex([{ midi: 69, startBeat: 0, durationBeats: 3 }], [6, 8]))[0][0].duration).toBe('qd');
  });
});
