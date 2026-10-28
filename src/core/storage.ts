/**
 * Persistance locale (localStorage) : spots, réglages, position de départ.
 * Aucune donnée n'est envoyée à un serveur de l'application.
 */
import type { Settings, Spot } from './types';
import { DEFAULT_COSTS } from './costs';

const KEY = 'ggsn:state:v1';

export const DEFAULT_SETTINGS: Settings = {
  units: 'standard',
  start: null,
  activeSpotId: null,
  activity: 'randonnee',
  costs: DEFAULT_COSTS,
  proxy: '/__proxy',
  mareeKey: '',
  theme: 'light',
  refreshMinutes: 15,
  showMarineLayers: true,
};

export interface PersistedState {
  settings: Settings;
  spots: Spot[];
}

function isSpot(value: unknown): value is Spot {
  if (!value || typeof value !== 'object') return false;
  const spot = value as Partial<Spot>;
  return (
    typeof spot.id === 'string' &&
    typeof spot.name === 'string' &&
    typeof spot.lat === 'number' &&
    typeof spot.lon === 'number'
  );
}

export function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { settings: { ...DEFAULT_SETTINGS }, spots: [] };
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      ...(parsed.settings ?? {}),
      costs: { ...DEFAULT_COSTS, ...(parsed.settings?.costs ?? {}) },
    };
    const spots = Array.isArray(parsed.spots) ? parsed.spots.filter(isSpot) : [];
    if (settings.activeSpotId && !spots.some((s) => s.id === settings.activeSpotId)) {
      settings.activeSpotId = spots[0]?.id ?? null;
    }
    return { settings, spots };
  } catch {
    return { settings: { ...DEFAULT_SETTINGS }, spots: [] };
  }
}

export function saveState(state: PersistedState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* stockage saturé ou désactivé : l'application reste utilisable en mémoire. */
  }
}

export function newId(prefix = 'spot'): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}

export function sortSpots(spots: Spot[]): Spot[] {
  return [...spots].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}
