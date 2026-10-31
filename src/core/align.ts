import type { Note, PlayedNote } from './types';

export type Pair = { e: number | null; p: number | null };

/** Nota giusta: entro ±50 cent dall'attesa. */
export function centsFrom(expectedMidi: number, played: PlayedNote): number {
  return (played.midi - expectedMidi) * 100 + played.cents;
}

export function isSamePitch(expectedMidi: number, played: PlayedNote): boolean {
  return Math.abs(centsFrom(expectedMidi, played)) <= 50;
}

/**
 * Allineamento Needleman-Wunsch: costo 0 per nota giusta, 1 per sostituzione,
 * mancante o in più. A parità di costo vince l'abbinamento più vicino nel tempo.
 * `played[].startMs` è già corretto per la latenza.
 */
export function align(expected: Note[], played: PlayedNote[], bpm = 60): Pair[] {
  const n = expected.length, m = played.length;
  const beatMs = 60000 / bpm;
  const cost: number[][] = [], time: number[][] = [], move: number[][] = [];
  for (let i = 0; i <= n; i++) { cost.push(new Array(m + 1).fill(0)); time.push(new Array(m + 1).fill(0)); move.push(new Array(m + 1).fill(0)); }
  for (let i = 1; i <= n; i++) { cost[i][0] = i; move[i][0] = 1; }
  for (let j = 1; j <= m; j++) { cost[0][j] = j; move[0][j] = 2; }
  const better = (c: number, t: number, bc: number, bt: number) => c < bc || (c === bc && t < bt - 1e-9);
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const e = expected[i - 1], p = played[j - 1];
      // 0 = abbinamento, 1 = attesa mancante, 2 = suonata in più
      let bc = cost[i - 1][j - 1] + (isSamePitch(e.midi, p) ? 0 : 1);
      let bt = time[i - 1][j - 1] + Math.abs(p.startMs - e.startBeat * beatMs);
      let bm = 0;
      if (better(cost[i - 1][j] + 1, time[i - 1][j], bc, bt)) { bc = cost[i - 1][j] + 1; bt = time[i - 1][j]; bm = 1; }
      if (better(cost[i][j - 1] + 1, time[i][j - 1], bc, bt)) { bc = cost[i][j - 1] + 1; bt = time[i][j - 1]; bm = 2; }
      cost[i][j] = bc; time[i][j] = bt; move[i][j] = bm;
    }
  }
  const pairs: Pair[] = [];
  let i = n, j = m;
  while (i > 0 || j > 0) {
    const mv = move[i][j];
    if (i > 0 && j > 0 && mv === 0) { pairs.push({ e: i - 1, p: j - 1 }); i--; j--; }
    else if (i > 0 && (j === 0 || mv === 1)) { pairs.push({ e: i - 1, p: null }); i--; }
    else { pairs.push({ e: null, p: j - 1 }); j--; }
  }
  return pairs.reverse();
}
