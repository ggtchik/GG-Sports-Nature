/**
 * Cours d'eau environnants (OSM / Overpass) pour le calque cartographique.
 *
 * Uniquement pour les activités en eau douce : le but est de situer le spot par
 * rapport aux rivières, ruisseaux et canaux proches, et de rattacher les stations
 * hydrologiques à leur cours d'eau. Requête volontairement bornée (rayon 3 km,
 * 80 tronçons) car les serveurs Overpass publics sont partagés.
 *
 * Best effort : en cas d'échec (serveur indisponible, quota), la fonction renvoie
 * une liste vide et un message ; la carte reste utilisable.
 */
import type { GeoPoint } from '../core/types';
import { getJson } from './http';
import { cacheKey, memoryGet, memorySet } from './cache';

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

const RADIUS_M = 3000;
const CACHE_TTL_MS = 30 * 60_000;

export interface WaterwayLine {
  id: number;
  name: string | null;
  kind: 'river' | 'stream' | 'canal' | 'drain' | 'ditch';
  points: [number, number][];
}

export interface WaterwayBundle {
  lines: WaterwayLine[];
  radiusKm: number;
  fetchedAt: number;
  error: string | null;
}

interface OverpassElement {
  type: string;
  id: number;
  tags?: Record<string, string>;
  geometry?: { lat: number; lon: number }[];
}

interface OverpassResponse {
  elements?: OverpassElement[];
}

const KINDS: Record<string, WaterwayLine['kind']> = {
  river: 'river',
  stream: 'stream',
  canal: 'canal',
  drain: 'drain',
  ditch: 'ditch',
};

function buildQuery(point: GeoPoint): string {
  const around = `around:${RADIUS_M},${point.lat.toFixed(5)},${point.lon.toFixed(5)}`;
  return `[out:json][timeout:20];(way(${around})[waterway~"^(river|stream|canal|drain|ditch)$"];);out geom 80;`;
}

export async function fetchWaterways(point: GeoPoint, signal?: AbortSignal): Promise<WaterwayBundle> {
  const key = cacheKey(['waterways', point.lat, point.lon]);
  const cached = memoryGet<WaterwayBundle>(key, CACHE_TTL_MS);
  if (cached) return cached.value;

  let lastError = 'Cours d’eau OpenStreetMap indisponibles pour le moment.';

  for (const endpoint of ENDPOINTS) {
    try {
      const url = `${endpoint}?data=${encodeURIComponent(buildQuery(point))}`;
      const raw = await getJson<OverpassResponse>(url, { signal, timeoutMs: 22_000 });
      const lines: WaterwayLine[] = [];
      for (const element of raw.elements ?? []) {
        if (element.type !== 'way' || !element.geometry || element.geometry.length < 2) continue;
        const kind = KINDS[element.tags?.waterway ?? ''] ?? 'stream';
        lines.push({
          id: element.id,
          name: element.tags?.name ?? null,
          kind,
          points: element.geometry.map((node) => [node.lat, node.lon] as [number, number]),
        });
      }
      const bundle: WaterwayBundle = {
        lines,
        radiusKm: RADIUS_M / 1000,
        fetchedAt: Date.now(),
        error: null,
      };
      memorySet(key, bundle);
      return bundle;
    } catch (error) {
      if (signal?.aborted) throw error;
      lastError = 'Cours d’eau OpenStreetMap indisponibles (serveur Overpass saturé ou bloqué).';
    }
  }

  return { lines: [], radiusKm: RADIUS_M / 1000, fetchedAt: Date.now(), error: lastError };
}
