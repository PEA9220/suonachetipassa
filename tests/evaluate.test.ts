import { describe, it, expect } from 'vitest';
import { evaluate } from '../src/core/evaluate';
import { align } from '../src/core/align';
import { getLevel } from '../src/core/levels';
import type { Exercise, PlayedNote } from '../src/core/types';

const ex: Exercise = { id: 't', origin: 'generated', bpm: 60, meter: [4, 4], level: 4,
  notes: [69, 71, 73, 74].map((midi, i) => ({ midi, startBeat: i, durationBeats: 1 })) };
const beatMs = (e: Exercise) => 60000 / e.bpm;
const perfect = (e: Exercise): PlayedNote[] =>
  e.notes.map(n => ({ midi: n.midi, cents: 0, startMs: n.startBeat * beatMs(e), durationMs: n.durationBeats * beatMs(e) }));
const withMidi = (p: PlayedNote[], i: number, midi: number) => p.map((x, j) => (j === i ? { ...x, midi } : x));
const without = (p: PlayedNote[], i: number) => p.filter((_, j) => j !== i);
const withExtra = (p: PlayedNote[], i: number) =>
  [...p.slice(0, i + 1), { midi: 80, cents: 0, startMs: p[i].startMs + 500, durationMs: 200 }, ...p.slice(i + 1)];
const withCents = (p: PlayedNote[], cents: number, idx?: number[]) => p.map((x, j) => (!idx || idx.includes(j) ? { ...x, cents } : x));
const shifted = (p: PlayedNote[], ms: number) => p.map(x => ({ ...x, startMs: x.startMs + ms }));
const early = (midi: number, startMs: number): PlayedNote => ({ midi, cents: 0, startMs, durationMs: 300 });
const tol4 = getLevel(4).tolerances;

describe('evaluate', () => {
  it('esecuzione perfetta vale 1', () => {
    expect(evaluate(ex, perfect(ex), tol4, 0).total).toBe(1);
  });
  it('nota sbagliata', () => {
    const r = evaluate(ex, withMidi(perfect(ex), 1, 72), tol4, 0);
    expect(r.scores.notes).toBe(0.75);
    expect(r.results[1].status).toBe('wrong');
  });
  it('nota mancante: le altre restano allineate', () => {
    const r = evaluate(ex, without(perfect(ex), 1), tol4, 0);
    expect(r.results.map(x => x.status)).toEqual(['correct', 'missing', 'correct', 'correct']);
  });
  it('nota in più', () => {
    const r = evaluate(ex, withExtra(perfect(ex), 2), tol4, 0);
    expect(r.scores.notes).toBe(0.8);
    expect(r.results.filter(x => x.status === 'extra')).toHaveLength(1);
  });
  it('intonazione secondo il livello', () => {
    expect(evaluate(ex, withCents(perfect(ex), -20), getLevel(4).tolerances, 0).scores.intonation).toBe(0);
    expect(evaluate(ex, withCents(perfect(ex), -20), getLevel(3).tolerances, 0).scores.intonation).toBe(1);
  });
  it('ritmo secondo il livello', () => {
    expect(evaluate(ex, shifted(perfect(ex), 150), getLevel(4).tolerances, 0).scores.rhythm).toBe(1);
    expect(evaluate(ex, shifted(perfect(ex), 150), getLevel(5).tolerances, 0).scores.rhythm).toBe(0);
  });
  it('la latenza misurata viene sottratta', () => {
    expect(evaluate(ex, shifted(perfect(ex), 120), getLevel(8).tolerances, 120).scores.rhythm).toBe(1);
  });
  it('senza calibrazione il ritmo non è valutato', () => {
    const nc = evaluate(ex, withCents(perfect(ex), -40), getLevel(8).tolerances, null);
    expect(nc.scores.rhythm).toBeNull(); expect(nc.total).toBeCloseTo(0.625);
  });
  it('livelli senza ritmo: pesi 62,5 / 37,5', () => {
    const r = evaluate(ex, shifted(perfect(ex), 400), getLevel(1).tolerances, 0);
    expect(r.scores.rhythm).toBeNull(); expect(r.total).toBe(1);
  });
  it('pesi 50 / 30 / 20', () => {
    expect(evaluate(ex, withCents(perfect(ex), -20, [0, 1]), getLevel(4).tolerances, 0).total).toBeCloseTo(0.5 + 0.15 + 0.2);
  });
  it('review focus 4: note suonate durante il conteggio vengono ignorate', () => {
    expect(evaluate(ex, [early(69, -1500), ...perfect(ex)], tol4, 0).total).toBe(1);
  });
  it('nessuna nota suonata vale 0', () => {
    const r = evaluate(ex, [], tol4, 0);
    expect(r.total).toBe(0);
    expect(r.results.every(x => x.status === 'missing')).toBe(true);
  });
  it('scarto in cent e tempo nei risultati', () => {
    const r = evaluate(ex, shifted(withCents(perfect(ex), 12), 30), tol4, 0);
    expect(r.results[0].centsOff).toBe(12);
    expect(r.results[0].timingMs).toBe(30);
  });
});

describe('align', () => {
  it('a parità di costo sceglie l\'abbinamento più vicino nel tempo', () => {
    const exp = [{ midi: 69, startBeat: 0, durationBeats: 1 }, { midi: 69, startBeat: 1, durationBeats: 1 }];
    const played = [{ midi: 69, cents: 0, startMs: 1000, durationMs: 900 }];
    expect(align(exp, played, 60)).toEqual([{ e: 0, p: null }, { e: 1, p: 0 }]);
  });
});
