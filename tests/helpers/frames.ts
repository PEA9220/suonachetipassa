import type { PitchFrame } from '../../src/core/pitch';

const HOP = 10;
const LOUD = 0.1;

// Ogni helper produce frame da 10 ms con tempi relativi; `seq` li mette in fila.
const frames = (ms: number, f: (t: number) => Omit<PitchFrame, 'timeMs'>): PitchFrame[] =>
  Array.from({ length: Math.round(ms / HOP) }, (_, i) => ({ timeMs: i * HOP, ...f(i * HOP) }));

export function seq(...parts: PitchFrame[][]): PitchFrame[] {
  const out: PitchFrame[] = [];
  for (const part of parts) {
    const offset = out.length * HOP;
    for (const fr of part) out.push({ ...fr, timeMs: offset + fr.timeMs });
  }
  return out;
}

export const steady = (hz: number, ms: number, rms = LOUD) => frames(ms, () => ({ hz, rms }));
export const silence = (ms: number) => frames(ms, () => ({ hz: null, rms: 0.001 }));
export const quiet = silence;
export const loudUnpitched = (rms: number, ms: number) => frames(ms, () => ({ hz: null, rms }));
/** Altezza che oscilla di ±cents a rateHz. */
export const vibrato = (hz: number, cents: number, rateHz: number, ms: number) =>
  frames(ms, t => ({ hz: hz * 2 ** ((cents * Math.sin((2 * Math.PI * rateHz * t) / 1000)) / 1200), rms: LOUD }));
/** Calo di volume alla stessa altezza, come un cambio d'arco. */
export const dip = (hz: number, ms: number, factor: number) => frames(ms, () => ({ hz, rms: LOUD * factor }));
export const withGlitch = (fr: PitchFrame[], index: number, hz: number) => fr.map((x, i) => (i === index ? { ...x, hz } : x));
export const alternating = (hzs: number[], ms: number, count: number) =>
  seq(...Array.from({ length: count }, (_, i) => steady(hzs[i % hzs.length], ms)));
