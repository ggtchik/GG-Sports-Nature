/** Anti-rebond réseau : cache mémoire + cache persistant pour les petites données. */

const memory = new Map<string, { value: unknown; at: number }>();
const PREFIX = 'ggsn:cache:';

export function cacheKey(parts: (string | number | null | undefined)[]): string {
  return parts
    .filter((p) => p !== null && p !== undefined)
    .map((p) => (typeof p === 'number' ? Math.round(p * 1000) / 1000 : String(p)))
    .join('|');
}

export function memoryGet<T>(key: string, ttlMs: number): { value: T; at: number } | null {
  const hit = memory.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > ttlMs) {
    memory.delete(key);
    return null;
  }
  return hit as { value: T; at: number };
}

export function memorySet<T>(key: string, value: T): void {
  memory.set(key, { value, at: Date.now() });
}

export function persistentGet<T>(key: string, ttlMs: number): { value: T; at: number } | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { value: T; at: number };
    if (!parsed || typeof parsed.at !== 'number' || Date.now() - parsed.at > ttlMs) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function persistentSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ value, at: Date.now() }));
  } catch {
    /* quota dépassé : le cache est un confort, jamais une nécessité. */
  }
}

export function clearCaches(): void {
  memory.clear();
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}
