/**
 * Recherche de lieux :
 *  1. Base Adresse Nationale (api-adresse.data.gouv.fr) — France, Licence Ouverte,
 *     sans clé, CORS ouvert, données mises à jour en continu.
 *  2. Nominatim (OpenStreetMap) — international, ODbL, usage modéré (1 req/s max).
 *  3. Open-Meteo Geocoding — secours si les deux précédents échouent.
 */
import type { GeoPoint, SearchResult } from '../core/types';
import { getJson } from './http';

interface BanFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    label: string;
    name: string;
    city?: string;
    municipality?: string;
    postcode?: string;
    type: string;
    score?: number;
  };
}

interface BanResponse {
  features: BanFeature[];
}

async function searchBan(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  const url = new URL('https://api-adresse.data.gouv.fr/search/');
  url.searchParams.set('q', query);
  url.searchParams.set('limit', '6');
  url.searchParams.set('autocomplete', '0');
  const raw = await getJson<BanResponse>(url.toString(), { signal, timeoutMs: 12_000 });
  return (raw.features ?? []).map((feature) => ({
    lat: feature.geometry.coordinates[1],
    lon: feature.geometry.coordinates[0],
    label: feature.properties.label,
    name: feature.properties.name,
    commune: feature.properties.city ?? feature.properties.municipality,
    postcode: feature.properties.postcode,
    type: feature.properties.type,
    source: 'BAN' as const,
    score: feature.properties.score,
  }));
}

interface NominatimItem {
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  type: string;
  addresstype?: string;
  address?: { postcode?: string; city?: string; town?: string; village?: string; municipality?: string };
}

async function searchNominatim(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '6');
  url.searchParams.set('accept-language', 'fr');
  url.searchParams.set('addressdetails', '1');
  const raw = await getJson<NominatimItem[]>(url.toString(), { signal, timeoutMs: 12_000 });
  return (raw ?? []).map((item) => ({
    lat: Number(item.lat),
    lon: Number(item.lon),
    label: item.display_name,
    name: item.name || item.display_name.split(',')[0],
    commune: item.address?.city ?? item.address?.town ?? item.address?.village ?? item.address?.municipality,
    postcode: item.address?.postcode,
    type: item.addresstype ?? item.type,
    source: 'Nominatim' as const,
  }));
}

interface OpenMeteoGeoItem {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
  postcodes?: string[];
}

async function searchOpenMeteo(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', query);
  url.searchParams.set('count', '6');
  url.searchParams.set('language', 'fr');
  url.searchParams.set('format', 'json');
  const raw = await getJson<{ results?: OpenMeteoGeoItem[] }>(url.toString(), {
    signal,
    timeoutMs: 12_000,
  });
  return (raw.results ?? []).map((item) => ({
    lat: item.latitude,
    lon: item.longitude,
    label: [item.name, item.admin1, item.country].filter(Boolean).join(', '),
    name: item.name,
    commune: item.admin1,
    postcode: item.postcodes?.[0],
    type: 'localité',
    source: 'Open-Meteo' as const,
  }));
}

/** Coordonnées saisies à la main : « 44.8378, -0.5792 » ou « 44°50'17"N 0°34'46"O ». */
export function parseCoordinates(input: string): GeoPoint | null {
  const cleaned = input.trim().replace(/,/g, ' ').replace(/\s+/g, ' ');
  const simple = /^(-?\d{1,3}(?:[.,]\d+)?)\s+(-?\d{1,3}(?:[.,]\d+)?)$/.exec(cleaned);
  if (simple) {
    const lat = Number(simple[1].replace(',', '.'));
    const lon = Number(simple[2].replace(',', '.'));
    if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) return { lat, lon };
  }
  const dms = /(\d{1,3})°\s*(\d{1,2})?'?\s*([NSEOW])?\s+(\d{1,3})°\s*(\d{1,2})?'?\s*([NSEOW])?/i.exec(cleaned);
  if (dms) {
    const lat = Number(dms[1]) + Number(dms[2] ?? 0) / 60;
    const lon = Number(dms[4]) + Number(dms[5] ?? 0) / 60;
    const latH = (dms[3] ?? '').toUpperCase();
    const lonH = (dms[6] ?? '').toUpperCase();
    const signedLat = latH === 'S' ? -lat : lat;
    const signedLon = lonH === 'O' || lonH === 'W' ? -lon : lon;
    if (Math.abs(signedLat) <= 90 && Math.abs(signedLon) <= 180) {
      return { lat: signedLat, lon: signedLon };
    }
  }
  return null;
}

export interface SearchOutcome {
  results: SearchResult[];
  source: 'BAN' | 'Nominatim' | 'Open-Meteo';
  warning?: string;
}

/** Recherche en cascade : la première source qui répond fournit les résultats. */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<SearchOutcome> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return { results: [], source: 'BAN' };

  const errors: string[] = [];

  try {
    const results = await searchBan(trimmed, signal);
    if (results.length) return { results, source: 'BAN' };
    errors.push('BAN : aucun résultat');
  } catch (error) {
    errors.push(`BAN : ${(error as Error).message}`);
  }

  try {
    const results = await searchNominatim(trimmed, signal);
    if (results.length) {
      return {
        results,
        source: 'Nominatim',
        warning: 'Résultats OpenStreetMap/Nominatim (source de secours).',
      };
    }
    errors.push('Nominatim : aucun résultat');
  } catch (error) {
    errors.push(`Nominatim : ${(error as Error).message}`);
  }

  try {
    const results = await searchOpenMeteo(trimmed, signal);
    if (results.length) {
      return {
        results,
        source: 'Open-Meteo',
        warning: 'Résultats Open-Meteo Geocoding (localités uniquement).',
      };
    }
    errors.push('Open-Meteo : aucun résultat');
  } catch (error) {
    errors.push(`Open-Meteo : ${(error as Error).message}`);
  }

  throw new Error(`Aucun lieu trouvé. ${errors.join(' · ')}`);
}

/** Adresse la plus proche d'un point (géolocalisation) — BAN uniquement. */
export async function reverseGeocode(point: GeoPoint, signal?: AbortSignal): Promise<string | null> {
  try {
    const url = new URL('https://api-adresse.data.gouv.fr/reverse/');
    url.searchParams.set('lat', String(point.lat));
    url.searchParams.set('lon', String(point.lon));
    const raw = await getJson<BanResponse>(url.toString(), { signal, timeoutMs: 10_000 });
    return raw.features?.[0]?.properties.label ?? null;
  } catch {
    return null;
  }
}
