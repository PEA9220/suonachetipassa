import type { PlayedNote } from './types';
import { HOP_MS, MIN_NOTE_MS, hzToMidiFloat, type PitchFrame } from './pitch';

export const SILENCE_RMS = 0.01;
const GAP_END_MS = 40;        // silenzio che chiude una nota
const CHANGE_SEMITONES = 0.7; // cambio d'altezza che apre una nota nuova...
const CHANGE_MS = 30;         // ...se dura almeno tanto
const DIP_RATIO = 0.3;        // calo di volume (circa −10 dB) che separa due note uguali: il vibrato resta sopra

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Altezza in semitoni per frame, con mediana mobile su 3 frame contro i salti isolati. */
function smoothedPitches(frames: PitchFrame[]): (number | null)[] {
  const raw = frames.map(f => (f.hz !== null && f.rms >= SILENCE_RMS ? hzToMidiFloat(f.hz) : null));
  return raw.map((p, i) => {
    if (p === null) return null;
    const prev = raw[i - 1], next = raw[i + 1];
    return prev != null && next != null ? median([prev, p, next]) : p;
  });
}

// Una nota attaccata a un'altra (legato veloce) può essere più corta di MIN_NOTE_MS.
const MIN_LINKED_NOTE_MS = 40;
const DIP_RESET_MS = 150;  // un calo che dura tanto è il nuovo livello della nota

type Building = { start: number; end: number; frames: number[]; peak: number };

export function framesToNotes(frames: PitchFrame[]): PlayedNote[] {
  const pitch = smoothedPitches(frames);
  const notes: PlayedNote[] = [];
  const gapFrames = Math.round(GAP_END_MS / HOP_MS);
  const changeFrames = Math.round(CHANGE_MS / HOP_MS);
  const dipResetFrames = Math.round(DIP_RESET_MS / HOP_MS);

  let cur: Building | null = null;
  let gap = 0;
  let dipStart: number | null = null; // primo frame del calo di volume in corso
  let dipPeak = 0;
  let pending: number[] = []; // frame a un'altezza diversa dalla nota in corso

  const close = (end?: number) => {
    if (cur) {
      const last = end ?? cur.end;
      const used = cur.frames.filter(k => k <= last);
      if (used.length > 0) {
        const durationMs = frames[used[used.length - 1]].timeMs - frames[cur.start].timeMs + HOP_MS;
        if (durationMs >= MIN_LINKED_NOTE_MS) {
          const m = median(used.map(k => pitch[k] as number));
          const midi = Math.round(m);
          notes.push({ midi, cents: (m - midi) * 100, startMs: frames[cur.start].timeMs, durationMs });
        }
      }
    }
    cur = null; gap = 0; dipStart = null; pending = [];
  };
  const open = (idx: number[]) => {
    cur = { start: idx[0], end: idx[idx.length - 1], frames: [...idx], peak: Math.max(...idx.map(k => frames[k].rms)) };
  };

  for (let i = 0; i < frames.length; i++) {
    const p = pitch[i];
    const level = frames[i].rms;

    if (!cur) { if (p !== null) open([i]); continue; }
    const note: Building = cur;

    // Calo e risalita del volume: cambio d'arco, nota nuova anche alla stessa altezza.
    if (level < DIP_RATIO * note.peak) {
      if (dipStart === null) { dipStart = i; dipPeak = 0; }
      if (p !== null) dipPeak = Math.max(dipPeak, level);
      if (i - dipStart >= dipResetFrames && dipPeak > 0) { note.peak = dipPeak; dipStart = null; }
    } else if (dipStart !== null && p !== null) {
      close(dipStart - 1);
      open([i]);
      continue;
    }

    if (p === null) {
      gap++;
      pending = [];
      if (gap >= gapFrames) close();
      continue;
    }
    gap = 0;

    const ref = median(note.frames.map(k => pitch[k] as number));
    if (Math.abs(p - ref) > CHANGE_SEMITONES) {
      if (pending.length > 0 && Math.abs(p - (pitch[pending[0]] as number)) > CHANGE_SEMITONES) pending = [];
      pending.push(i);
      if (pending.length >= changeFrames) {
        const moved = pending;
        close();
        open(moved);
      }
      continue;
    }
    pending = [];
    note.frames.push(i);
    note.end = i;
    if (dipStart === null) note.peak = Math.max(note.peak, level);
  }
  close();
  // scarta le note troppo corte, salvo quelle a ridosso di un'altra nota
  const near = (a: PlayedNote, b: PlayedNote | undefined) =>
    b !== undefined && Math.min(Math.abs(b.startMs - (a.startMs + a.durationMs)), Math.abs(a.startMs - (b.startMs + b.durationMs))) <= GAP_END_MS;
  return notes.filter((n, i) => n.durationMs >= MIN_NOTE_MS || near(n, notes[i - 1]) || near(n, notes[i + 1]));
}
