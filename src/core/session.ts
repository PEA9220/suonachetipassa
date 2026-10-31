import type { Exercise } from './types';
import type { NoteResult } from './evaluate';
import { getLevel } from './levels';
import { generateExercise } from './generator';
import { getRepertoire } from './repertoire';
import { buildPlayback } from './schedule';

export type Mark = 'correct' | 'flat' | 'sharp' | 'early' | 'late' | 'wrong' | 'missing' | 'extra';

const LISTEN_TAIL_MS = 1000;

/** Livello 8: un estratto del repertorio; altrimenti un esercizio generato. */
export function pickExercise(level: number, seed: number): Exercise {
  const config = getLevel(level);
  if (config.content.kind === 'repertoire') {
    const all = getRepertoire();
    return all[Math.abs(Math.trunc(seed)) % all.length];
  }
  return generateExercise(config, seed);
}

/** Per una nota giusta conta prima l'intonazione, poi il ritmo. */
export function markFor(r: NoteResult): Mark {
  if (r.status !== 'correct') return r.status;
  if (r.intonationOk === false) return (r.centsOff ?? 0) < 0 ? 'flat' : 'sharp';
  if (r.timingOk === false) return (r.timingMs ?? 0) < 0 ? 'early' : 'late';
  return 'correct';
}

/** Fine dell'ascolto, in ms dalla fine del conteggio. */
export function stopAtMs(ex: Exercise): number {
  return buildPlayback(ex).totalMs + LISTEN_TAIL_MS;
}
