export const PRACTICE_LAB_RETURN_STORAGE_KEY = 'bitatlas:practice-lab-return';
export const PRACTICE_LAB_RETURN_PARAM = 'fromSession';

export function readStoredPracticeLabReturn(): string | null {
  try {
    const raw = globalThis.sessionStorage?.getItem(PRACTICE_LAB_RETURN_STORAGE_KEY)?.trim();
    return raw ? raw : null;
  } catch {
    return null;
  }
}

export function rememberPracticeLabReturn(sessionId: string): void {
  const trimmed = sessionId.trim();
  if (!trimmed) return;
  try {
    globalThis.sessionStorage?.setItem(PRACTICE_LAB_RETURN_STORAGE_KEY, trimmed);
  } catch {
    // Ignore storage quota/privacy mode failures; query param still carries initial navigation.
  }
}

export function clearPracticeLabReturn(): void {
  try {
    globalThis.sessionStorage?.removeItem(PRACTICE_LAB_RETURN_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export function buildPracticeLabDestination(destination: string, sessionId: string): string {
  const trimmed = sessionId.trim();
  if (!trimmed) return destination;
  const hashIndex = destination.indexOf('#');
  const withoutHash = hashIndex >= 0 ? destination.slice(0, hashIndex) : destination;
  const hash = hashIndex >= 0 ? destination.slice(hashIndex) : '';
  const queryIndex = withoutHash.indexOf('?');
  const pathname = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;
  const params = new URLSearchParams(queryIndex >= 0 ? withoutHash.slice(queryIndex + 1) : '');
  params.set(PRACTICE_LAB_RETURN_PARAM, trimmed);
  const query = params.toString();
  return `${pathname}${query ? `?${query}` : ''}${hash}`;
}
