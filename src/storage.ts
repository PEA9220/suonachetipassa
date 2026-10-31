import { get, set } from 'idb-keyval';
import { initialState, validateState, type ProgressState } from './core/progress';

const KEY = 'violino-progress';

/** firstRun: nessun dato salvato, è il primo avvio. */
export async function loadState(): Promise<{ state: ProgressState; wasReset: boolean; firstRun: boolean }> {
  let raw: unknown;
  try {
    raw = await get(KEY);
  } catch {
    return { state: initialState(), wasReset: true, firstRun: false };
  }
  if (raw === undefined) return { state: initialState(), wasReset: false, firstRun: true };
  const state = validateState(raw);
  return state ? { state, wasReset: false, firstRun: false } : { state: initialState(), wasReset: true, firstRun: false };
}

export async function saveState(s: ProgressState): Promise<void> {
  await set(KEY, s);
}
