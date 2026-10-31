import { describe, it, expect } from 'vitest';
import { initialState, canUnlock, recordResult, validateState, type ProgressState } from '../src/core/progress';

describe('progress', () => {
  it('stato iniziale', () => {
    expect(initialState()).toEqual({ unlockedLevel: 1, currentLevel: 1, history: {}, latencyMs: null });
  });
  it('regola di sblocco', () => {
    expect(canUnlock(Array(9).fill(1))).toBe(false);
    expect(canUnlock(Array(10).fill(0.8))).toBe(true);
    expect(canUnlock([...Array(5).fill(0), ...Array(10).fill(0.85)])).toBe(true);
    expect(canUnlock(Array(10).fill(0.79))).toBe(false);
  });
  it('esercizio non valido: non entra nello storico', () => {
    expect(recordResult(initialState(), 1, 1, false).state.history[1] ?? []).toHaveLength(0);
  });
  it('il decimo esercizio buono sblocca il livello 2', () => {
    let s: ProgressState = initialState();
    let last: number | null = null;
    for (let i = 0; i < 10; i++) { const r = recordResult(s, 1, 0.9, true); s = r.state; last = r.newlyUnlocked; }
    expect(last).toBe(2); expect(s.unlockedLevel).toBe(2);
    expect(s.history[1]).toHaveLength(10);
    // l'undicesimo non sblocca di nuovo
    expect(recordResult(s, 1, 0.9, true).newlyUnlocked).toBeNull();
  });
  it('oltre l\'8 non si sblocca nulla', () => {
    const s = { ...initialState(), unlockedLevel: 8, history: { 8: Array(9).fill(1) } };
    expect(recordResult(s, 8, 1, true).newlyUnlocked).toBeNull();
  });
  it('lo storico conserva solo gli ultimi 10', () => {
    let s = initialState();
    for (let i = 0; i < 15; i++) s = recordResult(s, 1, i / 20, true).state;
    expect(s.history[1]).toHaveLength(10);
    expect(s.history[1][0]).toBe(5 / 20);
  });
  it('non modifica lo stato ricevuto', () => {
    const s = initialState();
    recordResult(s, 1, 1, true);
    expect(s).toEqual(initialState());
  });
  it('validazione', () => {
    expect(validateState({ unlockedLevel: 'x' })).toBeNull();
    expect(validateState(null)).toBeNull();
    expect(validateState({ ...initialState(), currentLevel: 3 })).toBeNull(); // oltre lo sbloccato
    expect(validateState(initialState())).toEqual(initialState());
    expect(validateState({ ...initialState(), unlockedLevel: 3, history: { 2: [0.5, 1] }, latencyMs: 110 }))
      .toEqual({ ...initialState(), unlockedLevel: 3, history: { 2: [0.5, 1] }, latencyMs: 110 });
  });
});
