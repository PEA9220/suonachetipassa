import { PitchDetector } from 'pitchy';

export const FRAME_SIZE = 2048;
export const HOP_MS = 10;
export const MIN_NOTE_MS = 60;
export const MIN_MIDI = 55; // Sol3
export const MAX_MIDI = 100; // Mi7
const MIN_CLARITY = 0.9;

export type PitchFrame = { timeMs: number; hz: number | null; rms: number };

export function midiToHz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** Altezza continua in semitoni MIDI (69 = La4 a 440 Hz). */
export function hzToMidiFloat(hz: number): number {
  return 69 + 12 * Math.log2(hz / 440);
}

export function hzToMidiCents(hz: number): { midi: number; cents: number } {
  const exact = hzToMidiFloat(hz);
  const midi = Math.round(exact);
  const cents = Math.round((exact - midi) * 100 * 1e6) / 1e6;
  return { midi, cents: cents === 0 ? 0 : cents };
}

const detectors = new Map<number, PitchDetector<Float32Array>>();

/** Hz, oppure null se il segnale è incerto o fuori dall'estensione del violino. */
export function detectPitch(buf: Float32Array, sampleRate: number): number | null {
  let detector = detectors.get(buf.length);
  if (!detector) { detector = PitchDetector.forFloat32Array(buf.length); detectors.set(buf.length, detector); }
  const [hz, clarity] = detector.findPitch(buf, sampleRate);
  if (!(hz > 0) || clarity < MIN_CLARITY) return null;
  const midi = hzToMidiFloat(hz);
  if (midi < MIN_MIDI - 0.5 || midi > MAX_MIDI + 0.5) return null;
  return hz;
}

export function rms(buf: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
  return Math.sqrt(sum / buf.length);
}

/** Frame di altezza ogni HOP_MS da un segnale registrato (stessa analisi dell'ascolto dal vivo). */
export function analyzeSamples(samples: Float32Array, sampleRate: number): PitchFrame[] {
  const hop = Math.round((sampleRate * HOP_MS) / 1000);
  const out: PitchFrame[] = [];
  for (let end = FRAME_SIZE; end <= samples.length; end += hop) {
    const block = samples.subarray(end - FRAME_SIZE, end);
    const level = rms(block);
    // il tempo del frame è il centro del blocco analizzato
    out.push({ timeMs: ((end - FRAME_SIZE / 2) / sampleRate) * 1000, hz: level >= 0.005 ? detectPitch(block, sampleRate) : null, rms: level });
  }
  return out;
}
