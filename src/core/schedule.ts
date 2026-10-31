import type { Exercise } from './types';

export type ScheduledNote = { midi: number; timeMs: number; durationMs: number };
export type Click = { timeMs: number; accent: boolean };

/** Durata di un battito: il bpm si riferisce all'unità del metro (quarti in 4/4, ottavi in 6/8). */
export function beatMs(ex: Exercise): number {
  return 60000 / ex.bpm;
}

export function buildPlayback(ex: Exercise): { notes: ScheduledNote[]; totalMs: number } {
  const b = beatMs(ex);
  const notes = ex.notes.map(n => ({ midi: n.midi, timeMs: n.startBeat * b, durationMs: n.durationBeats * b }));
  const totalMs = notes.reduce((end, n) => Math.max(end, n.timeMs + n.durationMs), 0);
  return { notes, totalMs };
}

/** Conteggio d'attacco: una battuta al tempo dell'esercizio, primo battito accentato. */
export function buildCountIn(ex: Exercise): { clicks: Click[]; totalMs: number } {
  const b = beatMs(ex), beats = ex.meter[0];
  return { clicks: Array.from({ length: beats }, (_, i) => ({ timeMs: i * b, accent: i === 0 })), totalMs: beats * b };
}
