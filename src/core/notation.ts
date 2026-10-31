import type { Exercise } from './types';

/** Un segno sul rigo: nota (midi) o pausa (null), con la durata in codice VexFlow. */
export type Piece = { midi: number | null; duration: string; dots: number; tieToNext: boolean; noteIndex: number | null };

// durate in quarti, dalla più lunga
const CODES: [number, string, number][] = [
  [4, 'w', 0], [3, 'hd', 1], [2, 'h', 0], [1.5, 'qd', 1], [1, 'q', 0], [0.75, '8d', 1], [0.5, '8', 0], [0.25, '16', 0],
];

function decompose(quarters: number): [string, number][] {
  const out: [string, number][] = [];
  let rest = quarters;
  while (rest > 1e-6) {
    const c = CODES.find(([q]) => q <= rest + 1e-6);
    if (!c) break; // sotto il sedicesimo: si trascura
    out.push([c[1], c[2]]);
    rest -= c[0];
  }
  return out;
}

/** Divide l'esercizio in battute, con pause nei vuoti e legature dove una nota supera la stanghetta. */
export function toMeasures(ex: Exercise): Piece[][] {
  const perMeasure = ex.meter[0];
  const toQuarters = 4 / ex.meter[1];
  const end = ex.notes.reduce((e, n) => Math.max(e, n.startBeat + n.durationBeats), 0);
  const count = Math.max(1, Math.ceil(end / perMeasure - 1e-9));
  const measures: Piece[][] = Array.from({ length: count }, () => []);

  // eventi: note e pause in ordine, ciascuno spezzato alle stanghette
  type Span = { midi: number | null; start: number; length: number; noteIndex: number | null };
  const spans: Span[] = [];
  let beat = 0;
  ex.notes.forEach((n, i) => {
    if (n.startBeat > beat + 1e-6) spans.push({ midi: null, start: beat, length: n.startBeat - beat, noteIndex: null });
    spans.push({ midi: n.midi, start: n.startBeat, length: n.durationBeats, noteIndex: i });
    beat = n.startBeat + n.durationBeats;
  });
  if (count * perMeasure > beat + 1e-6) spans.push({ midi: null, start: beat, length: count * perMeasure - beat, noteIndex: null });

  for (const s of spans) {
    let start = s.start;
    const stop = s.start + s.length;
    while (stop - start > 1e-6) {
      const m = Math.floor(start / perMeasure + 1e-9);
      const pieceEnd = Math.min(stop, (m + 1) * perMeasure);
      const parts = decompose((pieceEnd - start) * toQuarters);
      parts.forEach(([duration, dots], k) => {
        const last = k === parts.length - 1 && pieceEnd >= stop - 1e-6;
        measures[m].push({ midi: s.midi, duration, dots, tieToNext: s.midi !== null && !last, noteIndex: s.noteIndex });
      });
      start = pieceEnd;
    }
  }
  return measures;
}
