import { LEVELS } from './levels';

export type ProgressState = {
  unlockedLevel: number;
  currentLevel: number;
  history: Record<number, number[]>;
  latencyMs: number | null;
};

const WINDOW = 10;
const UNLOCK_AVERAGE = 0.8;
const MAX_LEVEL = LEVELS.length;

export function initialState(): ProgressState {
  return { unlockedLevel: 1, currentLevel: 1, history: {}, latencyMs: null };
}

/** Sblocco: media ≥ 0,80 sugli ultimi 10 esercizi validi. */
export function canUnlock(scores: number[]): boolean {
  if (scores.length < WINDOW) return false;
  const last = scores.slice(-WINDOW);
  return last.reduce((a, b) => a + b, 0) / WINDOW >= UNLOCK_AVERAGE - 1e-9;
}

export function recordResult(s: ProgressState, level: number, total: number, valid: boolean):
  { state: ProgressState; newlyUnlocked: number | null } {
  if (!valid) return { state: s, newlyUnlocked: null };
  const scores = [...(s.history[level] ?? []), total].slice(-WINDOW);
  const state: ProgressState = { ...s, history: { ...s.history, [level]: scores } };
  if (level === s.unlockedLevel && level < MAX_LEVEL && canUnlock(scores)) {
    state.unlockedLevel = level + 1;
    state.currentLevel = level + 1;
    return { state, newlyUnlocked: level + 1 };
  }
  return { state, newlyUnlocked: null };
}

const isLevel = (x: unknown): x is number => Number.isInteger(x) && (x as number) >= 1 && (x as number) <= MAX_LEVEL;

export function validateState(raw: unknown): ProgressState | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (!isLevel(r.unlockedLevel) || !isLevel(r.currentLevel) || r.currentLevel > r.unlockedLevel) return null;
  if (r.latencyMs !== null && !(typeof r.latencyMs === 'number' && Number.isFinite(r.latencyMs))) return null;
  if (typeof r.history !== 'object' || r.history === null || Array.isArray(r.history)) return null;
  const history: Record<number, number[]> = {};
  for (const [k, v] of Object.entries(r.history)) {
    const level = Number(k);
    if (!isLevel(level) || !Array.isArray(v) || !v.every(x => typeof x === 'number' && x >= 0 && x <= 1)) return null;
    history[level] = v.slice(-WINDOW);
  }
  return { unlockedLevel: r.unlockedLevel, currentLevel: r.currentLevel, history, latencyMs: r.latencyMs as number | null };
}
