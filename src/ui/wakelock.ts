let lock: WakeLockSentinel | null = null;

/** Tiene acceso lo schermo durante l'esercizio, dove il browser lo consente. */
export async function keepAwake(): Promise<void> {
  try { lock = (await navigator.wakeLock?.request('screen')) ?? null; } catch { lock = null; }
}

export function releaseAwake(): void {
  void lock?.release().catch(() => undefined);
  lock = null;
}
