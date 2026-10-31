import type { Exercise, PlayedNote, Tolerances } from './types';
import { align, centsFrom, isSamePitch } from './align';

export type NoteResult = {
  expectedIndex: number | null; playedIndex: number | null;
  status: 'correct' | 'wrong' | 'missing' | 'extra';
  centsOff: number | null; intonationOk: boolean | null;
  timingMs: number | null; timingOk: boolean | null;
};

export type Evaluation = {
  results: NoteResult[];
  scores: { notes: number; intonation: number; rhythm: number | null };
  total: number;
};

/** playedIndex indica la posizione in `played` così come è stato ricevuto. */
export function evaluate(ex: Exercise, played: PlayedNote[], tol: Tolerances, latencyMs: number | null): Evaluation {
  const beatMs = 60000 / ex.bpm;
  const rhythmOn = tol.rhythmMs !== null && latencyMs !== null;
  const lat = latencyMs ?? 0;

  // Le note iniziate prima di metà battito dalla partenza appartengono al conteggio.
  const kept = played
    .map((p, index) => ({ index, note: { ...p, startMs: p.startMs - lat } }))
    .filter(x => x.note.startMs >= -beatMs / 2);
  const pairs = align(ex.notes, kept.map(k => k.note), ex.bpm);

  const results: NoteResult[] = pairs.map(({ e, p }) => {
    const base = { expectedIndex: e, playedIndex: p === null ? null : kept[p].index,
      centsOff: null, intonationOk: null, timingMs: null, timingOk: null };
    if (e === null) return { ...base, status: 'extra' };
    if (p === null) return { ...base, status: 'missing' };
    const exp = ex.notes[e], pl = kept[p].note;
    const centsOff = centsFrom(exp.midi, pl);
    if (!isSamePitch(exp.midi, pl)) return { ...base, status: 'wrong', centsOff };
    const timingMs = rhythmOn ? pl.startMs - exp.startBeat * beatMs : null;
    return { ...base, status: 'correct', centsOff,
      intonationOk: Math.abs(centsOff) <= tol.intonationCents,
      timingMs, timingOk: timingMs === null ? null : Math.abs(timingMs) <= (tol.rhythmMs as number) };
  });

  const correct = results.filter(r => r.status === 'correct');
  const extras = results.filter(r => r.status === 'extra').length;
  const share = (ok: (r: NoteResult) => boolean) => (correct.length === 0 ? 0 : correct.filter(ok).length / correct.length);
  const notes = correct.length / (ex.notes.length + extras);
  const intonation = share(r => r.intonationOk === true);
  const rhythm = rhythmOn ? share(r => r.timingOk === true) : null;
  const total = rhythm === null ? 0.625 * notes + 0.375 * intonation : 0.5 * notes + 0.3 * intonation + 0.2 * rhythm;
  return { results, scores: { notes, intonation, rhythm }, total };
}
