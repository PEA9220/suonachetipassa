const MAX_MATCH_MS = 400;
const MIN_MATCHES = 6;

/** Latenza tra click e attacchi registrati: mediana degli scarti, null se gli abbinamenti sono pochi. */
export function computeLatency(clickMs: number[], onsetMs: number[]): number | null {
  const offsets: number[] = [];
  for (const click of clickMs) {
    let best: number | null = null;
    for (const onset of onsetMs) {
      const d = onset - click;
      if (Math.abs(d) <= MAX_MATCH_MS && (best === null || Math.abs(d) < Math.abs(best))) best = d;
    }
    if (best !== null) offsets.push(best);
  }
  if (offsets.length < MIN_MATCHES) return null;
  const s = offsets.sort((a, b) => a - b), mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
