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
