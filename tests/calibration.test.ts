import { describe, it, expect } from 'vitest';
import { computeLatency } from '../src/core/calibration';

const clicks = [0, 1000, 2000, 3000, 4000, 5000, 6000, 7000];

describe('computeLatency', () => {
  it('restituisce la mediana degli scarti', () => {
    expect(computeLatency(clicks, clicks.map((c, i) => c + 115 + (i % 2 ? 4 : -4)))).toBeCloseTo(115, -1);
  });
  it('null con meno di 6 abbinamenti su 8', () => {
    expect(computeLatency(clicks, [115, 1115, 2115, 3115, 4115])).toBeNull();
  });
  it('ignora gli attacchi spuri', () => {
    expect(computeLatency(clicks, [...clicks.map(c => c + 115), 2500])).toBeCloseTo(115, -1);
  });
  it('ignora attacchi oltre 400 ms dal click', () => {
    expect(computeLatency(clicks, clicks.map(c => c + 450))).toBeNull();
  });
});
