import { describe, it, expect } from 'vitest';
import { isSilentFor, isNoisy } from '../src/core/signal';
import { quiet, loudUnpitched, steady, seq } from './helpers/frames';

describe('isSilentFor', () => {
  it('5 secondi di silenzio', () => {
    expect(isSilentFor(quiet(5000), 0, 5000)).toBe(true);
    expect(isSilentFor(quiet(4900), 0, 4900)).toBe(false);
  });
  it('un suono nell\'intervallo azzera il silenzio', () => {
    expect(isSilentFor(seq(quiet(1000), steady(440, 100), quiet(4000)), 0, 5100)).toBe(false);
  });
});

describe('isNoisy', () => {
  it('rumore forte senza altezza', () => {
    expect(isNoisy(loudUnpitched(0.7, 1000))).toBe(true);
    expect(isNoisy(steady(440, 1000))).toBe(false);
    expect(isNoisy([])).toBe(false);
  });
});
