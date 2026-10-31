import type { Exercise } from './types';
import type { NoteResult } from './evaluate';
import { getLevel } from './levels';
import { generateExercise } from './generator';
import { getRepertoire } from './repertoire';
import { buildPlayback } from './schedule';
import type { PitchFrame } from './pitch';
import { isSilentFor } from './signal';
import { SILENCE_RMS } from './segment';

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

export type ListenState = 'continue' | 'done' | 'silent';

/**
 * Decide se continuare ad ascoltare. Senza alcun suono dopo il conteggio l'esercizio è
 * "silent" (non conta), anche quando finisce prima dei 5 secondi di silenzio.
 */
export function listenDecision(frames: PitchFrame[], countEndMs: number, nowMs: number, endAtMs: number): ListenState {
  const elapsed = nowMs - countEndMs;
  if (isSilentFor(frames, countEndMs, nowMs)) return 'silent';
  if (elapsed < endAtMs) return 'continue';
  const heard = frames.some(f => f.timeMs >= countEndMs && f.timeMs <= nowMs && f.rms >= SILENCE_RMS);
  return heard ? 'done' : 'silent';
}
