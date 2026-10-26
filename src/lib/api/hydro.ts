import type { HydroData, HydroReading, HydroStation } from '../../types';
import { haversineKm, isInFrance } from '../geo';
import { API, getJSON } from './http';

interface RawStation {
  code_station?: string;
  code_site?: string;
  libelle_station?: string;
  libelle_cours_eau?: string | null;
  libelle_commune?: string | null;
  libelle_departement?: string | null;
  longitude_station?: number;
  latitude_station?: number;
}

interface RawObservation {
  code_station?: string;
  grandeur_hydro?: string;
  date_obs?: string;
  resultat_obs?: number;
}

interface StationsResponse {
  data?: RawStation[];
  count?: number;
}

interface ObservationsResponse {
  data?: RawObservation[];
}

const FIELDS =
  'code_station,code_site,libelle_station,libelle_cours_eau,libelle_commune,libelle_departement,longitude_station,latitude_station';

const OBS_FIELDS = 'code_station,grandeur_hydro,date_obs,resultat_obs';

function stationsUrl(lat: number, lon: number, radiusKm: number): string {
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    distance: String(radiusKm),
    en_service: 'true',
    size: '80',
    fields: FIELDS,
  });
  return `${API.hydro}/referentiel/stations?${params.toString()}`;
}

function observationsUrl(code: string, grandeur: 'H' | 'Q'): string {
  const params = new URLSearchParams({
    code_entite: code,
    grandeur_hydro: grandeur,
    size: '160',
    sort: 'desc',
    fields: OBS_FIELDS,
  });
  return `${API.hydro}/observations_tr?${params.toString()}`;
}

function withCacheBuster(url: string): string {
  // Hub'Eau responses are cached by browsers/CDNs; a minute bucket is enough.
  const bucket = Math.floor(Date.now() / 60_000);
  return `${url}&_=${bucket}`;
}

async function fetchStations(
  lat: number,
  lon: number,
  radiusKm: number,
  signal?: AbortSignal,
): Promise<RawStation[]> {
  const raw = await getJSON<StationsResponse>(stationsUrl(lat, lon, radiusKm), {
    signal,
    timeoutMs: 22_000,
  });
  return raw.data ?? [];
}

interface ParsedSeries {
  latest: HydroReading | null;
  history: { t: number; v: number }[];
}

function parseSeries(
  observations: RawObservation[],
  code: string,
  grandeur: 'H' | 'Q',
): ParsedSeries {
  const divisor = grandeur === 'H' ? 1000 : 1000; // mm → m, L/s → m³/s
  const points = observations
    .filter(
      (obs) =>
        (!obs.code_station || obs.code_station === code) &&
        obs.grandeur_hydro === grandeur &&
        typeof obs.resultat_obs === 'number' &&
        Number.isFinite(obs.resultat_obs) &&
        typeof obs.date_obs === 'string',
    )
    .map((obs) => ({
      t: new Date(obs.date_obs as string).getTime(),
      v: (obs.resultat_obs as number) / divisor,
    }))
    .filter((point) => Number.isFinite(point.t))
    .sort((a, b) => a.t - b.t);

  const deduped: { t: number; v: number }[] = [];
  for (const point of points) {
    const last = deduped[deduped.length - 1];
    if (last && Math.abs(last.t - point.t) < 60_000) continue;
    deduped.push(point);
  }

  const last = deduped[deduped.length - 1];
  // Fenêtre glissante de 8 h se terminant à la dernière observation connue
  // (robuste aux stations qui publient avec un léger différé).
  const windowStart = last ? last.t - 8 * 3_600_000 : 0;
  const recent = deduped.filter((point) => point.t >= windowStart);
  return {
    latest: last
      ? { value: last.v, date: new Date(last.t).toISOString() }
      : null,
    history: recent.slice(-160),
  };
}

async function fetchObservations(
  code: string,
  grandeur: 'H' | 'Q',
  signal?: AbortSignal,
): Promise<RawObservation[]> {
  const raw = await getJSON<ObservationsResponse>(
    withCacheBuster(observationsUrl(code, grandeur)),
    { signal, timeoutMs: 20_000 },
  );
  return raw.data ?? [];
}

function stationLinks(code: string) {
  return {
    vigicruesUrl: `https://www.vigicrues.gouv.fr/station/${encodeURIComponent(code)}`,
    hydroportailUrl: `https://www.hydro.eaufrance.fr/stationhydro/${encodeURIComponent(code)}/fiche`,
  };
}

export async function fetchHydro(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<HydroData> {
  const empty: HydroData = { stations: [], radiusKm: 0, hasFlow: false, fetchedAt: Date.now() };
  if (!isInFrance(lat, lon)) return empty;

  let radiusKm = 60;
  let rawStations = await fetchStations(lat, lon, radiusKm, signal);
  const unique = new Map<string, RawStation>();
  const add = (stations: RawStation[]) => {
    for (const station of stations) {
      if (station.code_station) unique.set(station.code_station, station);
    }
  };
  add(rawStations);
  if (unique.size < 5) {
    radiusKm = 150;
    rawStations = await fetchStations(lat, lon, radiusKm, signal);
    add(rawStations);
  }

  const stations = Array.from(unique.values())
    .map((station) => {
      const stationLat = station.latitude_station ?? Number.NaN;
      const stationLon = station.longitude_station ?? Number.NaN;
      return {
        station,
        distanceKm:
          Number.isFinite(stationLat) && Number.isFinite(stationLon)
            ? haversineKm({ lat, lon }, { lat: stationLat, lon: stationLon })
            : Number.POSITIVE_INFINITY,
      };
    })
    .filter((item) => item.station.code_station && Number.isFinite(item.distanceKm))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 5);

  if (!stations.length) {
    return { ...empty, radiusKm };
  }

  const detailed = await Promise.all(
    stations.map(async ({ station, distanceKm }): Promise<HydroStation> => {
      const code = station.code_station as string;
      const siteCode = station.code_site ?? '';
      const [heightObs, flowObs] = await Promise.all([
        fetchObservations(code, 'H', signal).catch(() => [] as RawObservation[]),
        fetchObservations(code, 'Q', signal).catch(() => [] as RawObservation[]),
      ]);
      const height = parseSeries(heightObs, code, 'H');
      const flow = parseSeries(flowObs, code, 'Q');
      return {
        code,
        siteCode,
        name: station.libelle_station ?? code,
        river: station.libelle_cours_eau ?? null,
        commune: station.libelle_commune ?? null,
        department: station.libelle_departement ?? null,
        lat: station.latitude_station ?? lat,
        lon: station.longitude_station ?? lon,
        distanceKm,
        height: height.latest,
        flow: flow.latest,
        heightHistory: height.history,
        flowHistory: flow.history,
        ...stationLinks(code),
      };
    }),
  );

  return {
    stations: detailed,
    radiusKm,
    hasFlow: detailed.some((station) => station.flow !== null),
    fetchedAt: Date.now(),
  };
}

export function stationFreshness(station: HydroStation): number | null {
  const dates = [station.height?.date, station.flow?.date]
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value));
  if (!dates.length) return null;
  return Math.round((Date.now() - Math.max(...dates)) / 60_000);
}
