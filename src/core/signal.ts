import type { PitchFrame } from './pitch';
import { SILENCE_RMS } from './segment';

const NOISE_RMS = 0.02;
const NOISE_SHARE = 0.6;

/** Vero se da fromMs a nowMs sono passati almeno limitMs senza suono. */
export function isSilentFor(frames: PitchFrame[], fromMs: number, nowMs: number, limitMs = 5000): boolean {
  if (nowMs - fromMs < limitMs) return false;
  return !frames.some(f => f.timeMs >= fromMs && f.timeMs <= nowMs && f.rms >= SILENCE_RMS);
}

/** Vero se oltre il 60% dei frame è forte ma senza altezza riconoscibile. */
export function isNoisy(frames: PitchFrame[]): boolean {
  if (frames.length === 0) return false;
  const noisy = frames.filter(f => f.rms > NOISE_RMS && f.hz === null).length;
  return noisy / frames.length > NOISE_SHARE;
}
