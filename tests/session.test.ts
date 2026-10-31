import { describe, it, expect } from 'vitest';
import { pickExercise, markFor, stopAtMs } from '../src/core/session';
import type { NoteResult } from '../src/core/evaluate';

describe('session', () => {
  it('sceglie la fonte dell\'esercizio dal livello', () => {
    expect(pickExercise(8, 1).origin).toBe('repertoire');
    expect(pickExercise(3, 1).origin).toBe('generated');
    expect(pickExercise(3, 1)).toEqual(pickExercise(3, 1));
  });
  it('esito grafico: prima l\'intonazione, poi il ritmo', () => {
    expect(markFor({ status: 'correct', intonationOk: false, centsOff: -20, timingOk: true, timingMs: 0 } as NoteResult)).toBe('flat');
    expect(markFor({ status: 'correct', intonationOk: false, centsOff: 20, timingOk: false, timingMs: 300 } as NoteResult)).toBe('sharp');
    expect(markFor({ status: 'correct', intonationOk: true, centsOff: 2, timingOk: false, timingMs: 130 } as NoteResult)).toBe('late');
    expect(markFor({ status: 'correct', intonationOk: true, centsOff: 2, timingOk: false, timingMs: -130 } as NoteResult)).toBe('early');
    expect(markFor({ status: 'correct', intonationOk: true, centsOff: 2, timingOk: null, timingMs: null } as NoteResult)).toBe('correct');
    expect(markFor({ status: 'missing' } as NoteResult)).toBe('missing');
    expect(markFor({ status: 'wrong' } as NoteResult)).toBe('wrong');
    expect(markFor({ status: 'extra' } as NoteResult)).toBe('extra');
  });
  it('fine ascolto: fine prevista + 1 secondo', () => {
    expect(stopAtMs({ ...pickExercise(3, 1), bpm: 60, notes: [{ midi: 69, startBeat: 0, durationBeats: 4 }] })).toBe(5000);
  });
});

import { listenDecision } from '../src/core/session';
import { quiet, steady, seq } from './helpers/frames';

describe('listenDecision', () => {
  it('esercizio breve senza suono: aspetta i 5 secondi, poi silenzio (mai punteggio 0)', () => {
    expect(listenDecision(quiet(3000), 0, 3000, 3000)).toBe('continue');
    expect(listenDecision(quiet(5000), 0, 5000, 3000)).toBe('silent');
  });
  it('esercizio breve iniziato in ritardo: si valuta quando arriva il suono', () => {
    expect(listenDecision(seq(quiet(3500), steady(440, 200)), 0, 3700, 3000)).toBe('done');
  });
  it('esercizio breve suonato: finito', () => {
    expect(listenDecision(steady(440, 3000), 0, 3000, 3000)).toBe('done');
  });
  it('esercizio lungo: 5 secondi senza suono interrompono', () => {
    expect(listenDecision(quiet(5000), 0, 5000, 12000)).toBe('silent');
    expect(listenDecision(seq(quiet(1000), steady(440, 500), quiet(3500)), 0, 5000, 12000)).toBe('continue');
  });
  it('il suono durante il conteggio non conta', () => {
    expect(listenDecision(seq(steady(440, 1000), quiet(5000)), 1000, 6000, 3000)).toBe('silent');
  });
});

import { minNoteMsFor } from '../src/core/session';

describe('minNoteMsFor', () => {
  const ex = (durationBeats: number, bpm: number) => ({ ...pickExercise(3, 1), bpm, notes: [{ midi: 69, startBeat: 0, durationBeats }] });
  it('esercizi lenti: i suoni sotto 120 ms non sono note', () => {
    expect(minNoteMsFor(ex(2, 60))).toBe(120);
  });
  it('sedicesimi a 100 BPM (150 ms): bastano 60 ms', () => {
    expect(minNoteMsFor(ex(0.25, 100))).toBe(60);
  });
  it('note velocissime: mai sotto 40 ms', () => {
    expect(minNoteMsFor(ex(0.25, 200))).toBe(40);
  });
});
