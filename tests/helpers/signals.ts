import { FRAME_SIZE } from '../../src/core/pitch';

export function sine(hz: number, sampleRate: number, length = FRAME_SIZE): Float32Array {
  const buf = new Float32Array(length);
  for (let i = 0; i < length; i++) buf[i] = 0.5 * Math.sin((2 * Math.PI * hz * i) / sampleRate);
  return buf;
}

export function noise(_sampleRate: number, length = FRAME_SIZE, seed = 1): Float32Array {
  const buf = new Float32Array(length);
  let s = seed;
  for (let i = 0; i < length; i++) { s = (s * 1664525 + 1013904223) >>> 0; buf[i] = (s / 4294967296) * 2 - 1; }
  return buf;
}
