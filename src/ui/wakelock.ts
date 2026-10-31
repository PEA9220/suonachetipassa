let lock: WakeLockSentinel | null = null;
let wanted = false;

async function request(): Promise<void> {
  if (lock || document.visibilityState !== 'visible') return;
  try {
    lock = (await navigator.wakeLock?.request('screen')) ?? null;
    lock?.addEventListener('release', () => { lock = null; });
  } catch {
    lock = null;
  }
}

// il browser rilascia il blocco quando la pagina va in secondo piano: lo si riprende al ritorno
document.addEventListener('visibilitychange', () => { if (wanted) void request(); });

/** Tiene acceso lo schermo, dove il browser lo consente, finché non si chiama releaseAwake. */
export async function keepAwake(): Promise<void> {
  wanted = true;
  await request();
}

export function releaseAwake(): void {
  wanted = false;
  void lock?.release().catch(() => undefined);
  lock = null;
}
