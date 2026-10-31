import type { LevelConfig } from './types';

// Unica sede delle soglie dei livelli.
export const LEVELS: LevelConfig[] = [
  { level: 1, label: 'Note singole, prima posizione, corde La e Mi', tolerances: { intonationCents: 30, rhythmMs: null },
    content: { kind: 'random', minMidi: 69, maxMidi: 83, noteCount: [1, 1], maxInterval: 0, durations: [2], accidentals: false, bpm: [60, 60] } },
  { level: 2, label: 'Note singole, prima posizione, tutte le corde', tolerances: { intonationCents: 25, rhythmMs: null },
    content: { kind: 'random', minMidi: 55, maxMidi: 83, noteCount: [1, 1], maxInterval: 0, durations: [2], accidentals: false, bpm: [60, 60] } },
  { level: 3, label: 'Intervalli di due note', tolerances: { intonationCents: 22, rhythmMs: 200 },
    content: { kind: 'random', minMidi: 55, maxMidi: 83, noteCount: [2, 2], maxInterval: 7, durations: [1, 2], accidentals: false, bpm: [60, 72] } },
  { level: 4, label: 'Motivi di 3-5 note, ritmi semplici', tolerances: { intonationCents: 18, rhythmMs: 160 },
    content: { kind: 'random', minMidi: 55, maxMidi: 83, noteCount: [3, 5], maxInterval: 5, durations: [1, 2], accidentals: false, bpm: [60, 72] } },
  { level: 5, label: 'Motivi più lunghi con alterazioni', tolerances: { intonationCents: 15, rhythmMs: 120 },
    content: { kind: 'random', minMidi: 55, maxMidi: 83, noteCount: [5, 8], maxInterval: 7, durations: [0.5, 1, 2], accidentals: true, bpm: [72, 84] } },
  { level: 6, label: 'Frasi generate con cambi di posizione', tolerances: { intonationCents: 12, rhythmMs: 90 },
    content: { kind: 'random', minMidi: 55, maxMidi: 93, noteCount: [6, 10], maxInterval: 9, durations: [0.5, 1, 2], accidentals: true, bpm: [72, 96] } },
  { level: 7, label: 'Frasi generate nello stile del repertorio', tolerances: { intonationCents: 10, rhythmMs: 70 },
    content: { kind: 'styled', minMidi: 55, maxMidi: 93, noteCount: [8, 12], maxInterval: 7, durations: [0.5, 1, 1.5, 2], accidentals: true, bpm: [72, 96] } },
  { level: 8, label: 'Estratti veri del repertorio', tolerances: { intonationCents: 8, rhythmMs: 50 },
    content: { kind: 'repertoire', minMidi: 55, maxMidi: 100, noteCount: [1, 1000], maxInterval: 100, durations: [], accidentals: true, bpm: [0, 1000] } },
];

export function getLevel(level: number): LevelConfig {
  const found = LEVELS.find(l => l.level === level);
  if (!found) throw new Error(`Livello inesistente: ${level}`);
  return found;
}
