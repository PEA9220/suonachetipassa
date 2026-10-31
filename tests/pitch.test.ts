import { describe, it, expect } from 'vitest';
import { detectPitch, hzToMidiCents, midiToHz } from '../src/core/pitch';
import { sine, noise } from './helpers/signals';

describe('hzToMidiCents', () => {
  it('converte rispetto a La4 = 440 Hz', () => {
    expect(hzToMidiCents(440)).toEqual({ midi: 69, cents: 0 });
    expect(hzToMidiCents(midiToHz(55))).toEqual({ midi: 55, cents: 0 });
    const r = hzToMidiCents(440 * 2 ** (-30 / 1200));
    expect(r.midi).toBe(69); expect(r.cents).toBeCloseTo(-30, 6);
  });
});

describe('detectPitch', () => {
  it('riconosce ogni nota del violino entro 2 cent', () => {
    for (let m = 55; m <= 100; m++) {
      const hz = 440 * 2 ** ((m - 69) / 12);
      const r = hzToMidiCents(detectPitch(sine(hz, 48000), 48000)!);
      expect(r.midi, `MIDI ${m}`).toBe(m); expect(Math.abs(r.cents), `MIDI ${m}`).toBeLessThanOrEqual(2);
    }
  });
  it('misura uno scarto di 15 cent', () => {
    expect(hzToMidiCents(detectPitch(sine(440 * 2 ** (15 / 1200), 48000), 48000)!).cents).toBeCloseTo(15, 0);
  });
  it('rumore e frequenze fuori estensione danno null', () => {
    expect(detectPitch(noise(48000), 48000)).toBeNull();
    expect(detectPitch(sine(30, 48000), 48000)).toBeNull();
    expect(detectPitch(new Float32Array(2048), 48000)).toBeNull();
  });
});
