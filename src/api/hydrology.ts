/**
 * Hydrologie — Hub'Eau (opération « Hydrométrie »), banque nationale alimentée
 * par la plateforme PHyC du réseau Vigicrues (SCHAPI).
 *
 * Licence Ouverte / Open Licence Etalab 2.0 · accès libre, sans clé, CORS ouvert.
 * Fraîcheur réelle : mesures bancarisées toutes les 5 à 60 min selon la station,
 * reprise par Hub'Eau toutes les ~5 min. Aucune prévision (Vigicrues ne les
 * expose pas via cette API).
 *
 * Unités renvoyées par l'API : hauteur en millimètres, débit en litres/seconde.
 * Elles sont converties ici en mètres et m³/s AVANT stockage, et cette
 * conversion est documentée (unité normalisée du modèle interne).
 */
import type { GeoPoint, HydroBundle, HydroSample, HydroStation } from '../core/types';
import { haversineKm } from '../core/geo';
import { getJson } from './http';
import { cacheKey, memoryGet, memorySet, persistentSet } from './cache';

const API = 'https://hubeau.eaufrance.fr/api/v2/hydrometrie';
const MAX_STATIONS = 5;
const SEARCH_RADIUS_KM = 60;
const CACHE_TTL_MS = 5 * 60_000;

interface HubEauStation {
  code_station: string;
  code_site?: string | null;
  libelle_station?: string;
  code_cours_eau?: string | null;
  libelle_cours_eau?: string | null;
  code_commune_station?: string | null;
  libelle_commune?: string | null;
  latitude_station?: number | string;
  longitude_station?: number | string;
  en_service?: boolean | null;
  type_station?: string | null;
  date_fermeture_station?: string | null;
}

interface HubEauStationsResponse {
  count?: number;
  data?: HubEauStation[];
}

interface HubEauObservation {
  code_station?: string;
  code_entite?: string;
  date_obs?: string;
  resultat_obs?: number;
  grandeur_hydro?: string;
  continuite_obs_hydro?: boolean;
}

interface HubEauObservationsResponse {
  count?: number;
  data?: HubEauObservation[];
}

function toNumber(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : NaN;
  return Number.isFinite(n) ? n : null;
}

function stationLabel(station: HubEauStation): string {
  return station.libelle_station?.trim() || `Station ${station.code_station}`;
}

function buildStationUrl(point: GeoPoint): string {
  const url = new URL(`${API}/referentiel/stations`);
  url.searchParams.set('latitude', String(point.lat));
  url.searchParams.set('longitude', String(point.lon));
  url.searchParams.set('distance', String(SEARCH_RADIUS_KM));
  url.searchParams.set('size', '100');
  url.searchParams.set('format', 'json');
  url.searchParams.set(
    'fields',
    'code_station,code_site,libelle_station,code_cours_eau,libelle_cours_eau,libelle_commune,latitude_station,longitude_station,en_service,date_fermeture_station',
  );
  return url.toString();
}

async function fetchCandidates(point: GeoPoint, signal?: AbortSignal): Promise<HydroStation[]> {
  const raw = await getJson<HubEauStationsResponse>(buildStationUrl(point), {
    signal,
    timeoutMs: 15_000,
  });
  const list = raw.data ?? [];
  const stations: HydroStation[] = [];
  for (const item of list) {
    const lat = toNumber(item.latitude_station);
    const lon = toNumber(item.longitude_station);
    if (lat === null || lon === null || !item.code_station) continue;
    const closed = Boolean(item.date_fermeture_station && item.en_service === false);
    if (closed) continue;
    stations.push({
      code: item.code_station,
      siteCode: item.code_site ?? null,
      name: stationLabel(item),
      river: item.libelle_cours_eau ?? (item.code_cours_eau || null),
      commune: item.libelle_commune ?? null,
      lat,
      lon,
      distanceKm: haversineKm(point, { lat, lon }),
      height: null,
      flow: null,
      heightSeries: [],
      flowSeries: [],
    });
  }
  return stations.sort((a, b) => a.distanceKm - b.distanceKm);
}

async function fetchObservations(
  codes: string[],
  grandeur: 'H' | 'Q',
  signal?: AbortSignal,
  size = 600,
): Promise<HubEauObservation[]> {
  // Les séries peuvent être portées par la station ou par le site : on interroge
  // les deux identifiants pour ne pas perdre de mesure.
  const url = new URL(`${API}/observations_tr`);
  url.searchParams.set('code_entite', codes.join(','));
  url.searchParams.set('grandeur_hydro', grandeur);
  url.searchParams.set('size', String(size));
  url.searchParams.set('format', 'json');
  const raw = await getJson<HubEauObservationsResponse>(url.toString(), {
    signal,
    timeoutMs: 20_000,
  });
  return raw.data ?? [];
}

/** Regroupe les observations par station, de la plus ancienne à la plus récente. */
function groupObservations(
  observations: HubEauObservation[],
  factor: number,
): Map<string, HydroSample[]> {
  const groups = new Map<string, HydroSample[]>();
  for (const obs of observations) {
    const code = obs.code_station ?? obs.code_entite;
    const value = toNumber(obs.resultat_obs);
    if (!code || value === null || !obs.date_obs) continue;
    const sample: HydroSample = { at: obs.date_obs, value: value * factor };
    const arr = groups.get(code);
    if (arr) arr.push(sample);
    else groups.set(code, [sample]);
  }
  for (const [code, arr] of groups) {
    arr.sort((a, b) => a.at.localeCompare(b.at));
    // Une même mesure peut revenir via l'identifiant de station et celui du site.
    const deduped: HydroSample[] = [];
    for (const sample of arr) {
      if (deduped.length && deduped[deduped.length - 1].at === sample.at) continue;
      deduped.push(sample);
    }
    groups.set(code, deduped);
  }
  return groups;
}

export async function fetchHydrology(point: GeoPoint, signal?: AbortSignal): Promise<HydroBundle> {
  const key = cacheKey(['hydro', point.lat, point.lon]);
  const cached = memoryGet<HydroBundle>(key, CACHE_TTL_MS);
  if (cached) return cached.value;

  const candidates = await fetchCandidates(point, signal);
  if (candidates.length === 0) {
    const empty: HydroBundle = {
      stations: [],
      radiusKm: SEARCH_RADIUS_KM,
      candidateCount: 0,
      measurementError: null,
    };
    memorySet(key, empty);
    persistentSet(key, empty);
    return empty;
  }

  const shortlist = candidates.slice(0, 8);
  const codes = Array.from(
    new Set(shortlist.flatMap((station) => [station.code, station.siteCode].filter(Boolean) as string[])),
  );

  let measurementError: string | null = null;
  const heightGroups = new Map<string, HydroSample[]>();
  const flowGroups = new Map<string, HydroSample[]>();

  const [heightResult, flowResult] = await Promise.allSettled([
    fetchObservations(codes, 'H', signal),
    fetchObservations(codes, 'Q', signal),
  ]);

  if (heightResult.status === 'fulfilled') {
    // millimètres → mètres
    for (const [code, samples] of groupObservations(heightResult.value, 0.001)) {
      heightGroups.set(code, samples);
    }
  } else {
    measurementError = 'Mesures de hauteur indisponibles pour le moment.';
  }

  if (flowResult.status === 'fulfilled') {
    // litres/seconde → m³/s
    for (const [code, samples] of groupObservations(flowResult.value, 0.001)) {
      flowGroups.set(code, samples);
    }
  } else if (!measurementError) {
    measurementError = 'Mesures de débit indisponibles pour le moment.';
  }

  const seriesFor = (groups: Map<string, HydroSample[]>, station: HydroStation) =>
    groups.get(station.code) ?? (station.siteCode ? groups.get(station.siteCode) : undefined) ?? [];

  // La requête groupée renvoie les mesures les plus récentes de l'ensemble des
  // stations : une station très bavarde peut affamer les autres. On complète donc
  // individuellement les quelques stations restées sans aucune mesure.
  const starved = shortlist
    .filter((s) => seriesFor(heightGroups, s).length === 0 && seriesFor(flowGroups, s).length === 0)
    .slice(0, 3);

  if (starved.length > 0) {
    const extra = await Promise.allSettled(
      starved.flatMap((station) => {
        const ids = station.siteCode ? [station.code, station.siteCode] : [station.code];
        return [
          fetchObservations(ids, 'H', signal, 48).then((rows) => ({ rows, factor: 0.001 })),
          fetchObservations(ids, 'Q', signal, 48).then((rows) => ({ rows, factor: 0.001 })),
        ];
      }),
    );
    let index = 0;
    for (let s2 = 0; s2 < starved.length; s2 += 1) {
      for (let g = 0; g < 2; g += 1) {
        const result = extra[index];
        index += 1;
        if (result.status !== 'fulfilled') continue;
        const target = g === 0 ? heightGroups : flowGroups;
        for (const [code, samples] of groupObservations(result.value.rows, result.value.factor)) {
          if (!target.has(code)) target.set(code, samples);
        }
      }
    }
  }

  const enriched: HydroStation[] = shortlist.map((station) => {
    const heights = seriesFor(heightGroups, station);
    const flows = seriesFor(flowGroups, station);
    return {
      ...station,
      height: heights.length ? heights[heights.length - 1] : null,
      flow: flows.length ? flows[flows.length - 1] : null,
      heightSeries: heights.slice(-24),
      flowSeries: flows.slice(-24),
    };
  });

  // Les cinq stations les plus proches, en privilégiant celles qui publient des mesures,
  // puis affichage par distance croissante.
  const byDistance = [...enriched].sort((a, b) => a.distanceKm - b.distanceKm);
  const withData = byDistance.filter((s) => s.height || s.flow).slice(0, MAX_STATIONS);
  const withoutData = byDistance
    .filter((s) => !s.height && !s.flow)
    .slice(0, MAX_STATIONS - withData.length);
  const selected = [...withData, ...withoutData].sort((a, b) => a.distanceKm - b.distanceKm);

  const bundle: HydroBundle = {
    stations: selected,
    radiusKm: SEARCH_RADIUS_KM,
    candidateCount: candidates.length,
    measurementError,
  };

  memorySet(key, bundle);
  persistentSet(key, bundle);
  return bundle;
}
