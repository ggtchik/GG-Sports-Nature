import { API, getJSON } from './http';

export interface GeoResult {
  id: string;
  name: string;
  detail: string;
  postcode?: string;
  country?: string;
  lat: number;
  lon: number;
  kind?: string;
}

interface NominatimAddress {
  house_number?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  village?: string;
  town?: string;
  city?: string;
  municipality?: string;
  county?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

interface NominatimItem {
  place_id?: number;
  osm_id?: number;
  lat?: string;
  lon?: string;
  name?: string;
  display_name?: string;
  type?: string;
  category?: string;
  addresstype?: string;
  address?: NominatimAddress;
  importance?: number;
}

interface OpenMeteoGeoItem {
  id?: number;
  name?: string;
  latitude?: number;
  longitude?: number;
  country?: string;
  admin1?: string;
  admin2?: string;
  postcode?: string;
  postcodes?: string[];
  feature_code?: string;
}

interface OpenMeteoGeoResponse {
  results?: OpenMeteoGeoItem[];
}

const NOMINATIM_HEADERS = {
  'Accept-Language': 'fr',
};

function uniqueParts(parts: (string | undefined)[]): string {
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const part of parts) {
    const value = (part ?? '').trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cleaned.push(value);
  }
  return cleaned.join(' · ');
}

function mapNominatim(item: NominatimItem, index: number): GeoResult | null {
  const lat = Number(item.lat);
  const lon = Number(item.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const address = item.address ?? {};
  const fallbackName = (item.display_name ?? '').split(',')[0]?.trim();
  // Une recherche par code postal renvoie un objet « postal_code » dont le nom
  // est le code lui-même : on préfère alors la commune associée.
  const postcodeOnly = item.addresstype === 'postcode' || /^\d{5}$/.test((item.name ?? '').trim());
  const placeName = postcodeOnly
    ? address.city || address.town || address.village || address.municipality
    : item.name;
  const name = (placeName || address.city || address.town || address.village || fallbackName || 'Lieu').trim();
  const detail = uniqueParts([
    address.county && address.county !== name ? address.county : undefined,
    address.state,
    address.country,
  ]);
  return {
    id: `nom-${item.place_id ?? item.osm_id ?? index}`,
    name,
    detail: detail || (item.display_name ?? ''),
    postcode: address.postcode,
    country: address.country,
    lat,
    lon,
    kind: item.addresstype || item.type,
  };
}

function mapOpenMeteo(item: OpenMeteoGeoItem, index: number): GeoResult | null {
  if (typeof item.latitude !== 'number' || typeof item.longitude !== 'number') return null;
  return {
    id: `om-${item.id ?? index}`,
    name: item.name ?? 'Lieu',
    detail: uniqueParts([item.admin2, item.admin1, item.country]),
    postcode: item.postcode ?? item.postcodes?.[0],
    country: item.country,
    lat: item.latitude,
    lon: item.longitude,
    kind: item.feature_code,
  };
}

const CACHE_TTL = 10 * 60 * 1000;
const cache = new Map<string, { at: number; results: GeoResult[] }>();

async function fromOpenMeteo(query: string, signal?: AbortSignal): Promise<GeoResult[]> {
  const params = new URLSearchParams({
    name: query,
    count: '8',
    language: 'fr',
    format: 'json',
  });
  const raw = await getJSON<OpenMeteoGeoResponse>(`${API.geocode}?${params.toString()}`, {
    signal,
    timeoutMs: 12_000,
  });
  return (raw.results ?? [])
    .map(mapOpenMeteo)
    .filter((item): item is GeoResult => item !== null);
}

async function fromNominatim(query: string, signal?: AbortSignal): Promise<GeoResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    addressdetails: '1',
    limit: '8',
    'accept-language': 'fr',
    dedupe: '1',
  });
  const raw = await getJSON<NominatimItem[]>(
    `${API.nominatim}/search?${params.toString()}`,
    { signal, headers: NOMINATIM_HEADERS, timeoutMs: 12_000 },
  );
  return raw.map(mapNominatim).filter((item): item is GeoResult => item !== null);
}

async function fromPostcode(postcode: string, signal?: AbortSignal): Promise<GeoResult[]> {
  const params = new URLSearchParams({
    postalcode: postcode,
    country: 'France',
    format: 'jsonv2',
    addressdetails: '1',
    limit: '8',
    'accept-language': 'fr',
  });
  const raw = await getJSON<NominatimItem[]>(
    `${API.nominatim}/search?${params.toString()}`,
    { signal, headers: NOMINATIM_HEADERS, timeoutMs: 12_000 },
  );
  return raw.map(mapNominatim).filter((item): item is GeoResult => item !== null);
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<GeoResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const cacheKey = trimmed.toLowerCase();
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.results;

  let results: GeoResult[] = [];
  const isPostcode = /^\d{5}$/.test(trimmed);

  if (isPostcode) {
    try {
      results = await fromPostcode(trimmed, signal);
    } catch (error) {
      if (signal?.aborted) throw error;
      results = [];
    }
  }

  if (!results.length) {
    try {
      results = await fromNominatim(trimmed, signal);
    } catch (error) {
      if (signal?.aborted) throw error;
      results = [];
    }
  }

  if (!results.length) {
    results = await fromOpenMeteo(trimmed, signal);
  }

  cache.set(cacheKey, { at: Date.now(), results });
  return results;
}

export async function reverseGeocode(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<GeoResult | null> {
  const params = new URLSearchParams({
    lat: lat.toFixed(5),
    lon: lon.toFixed(5),
    format: 'jsonv2',
    zoom: '14',
    addressdetails: '1',
    'accept-language': 'fr',
  });
  try {
    const raw = await getJSON<NominatimItem & { error?: string }>(
      `${API.nominatim}/reverse?${params.toString()}`,
      { signal, headers: NOMINATIM_HEADERS, timeoutMs: 12_000 },
    );
    if (!raw || raw.error) return null;
    const address = raw.address ?? {};
    const name =
      address.village || address.town || address.city || address.municipality || address.county || 'Ma position';
    return {
      id: `rev-${lat.toFixed(4)}-${lon.toFixed(4)}`,
      name,
      detail: uniqueParts([address.county && address.county !== name ? address.county : undefined, address.state, address.country]),
      postcode: address.postcode,
      country: address.country,
      lat,
      lon,
      kind: 'reversé',
    };
  } catch (error) {
    if (signal?.aborted) throw error;
    return null;
  }
}
