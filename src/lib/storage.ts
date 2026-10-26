const PREFIX = 'ggsn:';

export function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeStorage(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage may be full or disabled (private mode) — the app keeps working.
  }
}

export function removeStorage(key: string): void {
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    // no-op
  }
}

export const STORAGE_KEYS = {
  spots: 'spots.v1',
  activeSpot: 'activeSpot.v1',
  position: 'position.v1',
  activity: 'activity.v1',
  theme: 'theme.v1',
  budget: 'budget.v1',
  demo: 'demo.v1',
  seeded: 'seeded.v1',
} as const;
