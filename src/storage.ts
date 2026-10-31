import { get, set } from 'idb-keyval';
import { initialState, validateState, type ProgressState } from './core/progress';

const KEY = 'violino-progress';

export async function loadState(): Promise<{ state: ProgressState; wasReset: boolean }> {
  let raw: unknown;
  try {
    raw = await get(KEY);
  } catch {
    return { state: initialState(), wasReset: true };
  }
  if (raw === undefined) return { state: initialState(), wasReset: false };
  const state = validateState(raw);
  return state ? { state, wasReset: false } : { state: initialState(), wasReset: true };
}

export async function saveState(s: ProgressState): Promise<void> {
  await set(KEY, s);
}
