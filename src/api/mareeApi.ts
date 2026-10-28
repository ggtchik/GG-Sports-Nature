/**
 * api-maree.fr — intégration FACULTATIVE.
 *
 * L'application fonctionne sans cette source. Si l'utilisateur renseigne sa
 * propre clé (créée sur api-maree.fr, stockée uniquement dans son navigateur),
 * les horaires de pleine/basse mer et les coefficients proviennent alors de
 * composantes harmoniques Ifremer/PREVIMER (licence CC BY 4.0). La clé n'est
 * jamais exposée dans l'URL : elle est transmise en en-tête Authorization.
 *
 * Quotas annoncés : 360 requêtes/h, 1500 hauteurs/requête, fenêtre J-30 → J+30.
 */
import type { GeoPoint, TideInfo } from '../core/types';
import { haversineKm } from '../core/geo';
import { getJson } from './http';

const BASE = 'https://api-maree.fr';

export interface MareeSite {
  site_id: string;
  site_name: string;
  latitude: number;
  longitude: number;
  demo?: boolean;
}

interface SitesResponse {
  sites?: MareeSite[];
}

interface ExtremaResponse {
  site_id: string;
  site_name: string;
  timezone: string;
  unit: string;
  data?: {
    date: string;
    extrema: { type: 'PM' | 'BM'; time: string; height: number; coef?: number }[];
  }[];
  attribution?: string;
}

interface WaterLevelsResponse {
  data?: { time: string; height: number }[];
  attribution?: string;
}

function auth(key: string): Record<string, string> {
  return { authorization: `Bearer ${key.trim()}` };
}

export async function findNearestSite(
  point: GeoPoint,
  key: string,
  signal?: AbortSignal,
): Promise<MareeSite | null> {
  const raw = await getJson<SitesResponse>(`${BASE}/sites`, { signal, headers: auth(key), timeoutMs: 12_000 });
  const sites = raw.sites ?? [];
  if (sites.length === 0) return null;
  return sites
    .map((site) => ({ site, distance: haversineKm(point, { lat: site.latitude, lon: site.longitude }) }))
    .sort((a, b) => a.distance - b.distance)[0].site;
}

function dateOnly(iso: string): string {
  return iso.slice(0, 10);
}

export async function fetchTideInfoFromApi(
  point: GeoPoint,
  key: string,
  wallNow: string,
  signal?: AbortSignal,
): Promise<TideInfo & { site: MareeSite; siteDistanceKm: number }> {
  const site = await findNearestSite(point, key, signal);
  if (!site) throw new Error('Aucun port de référence disponible pour cette clé.');

  const siteDistanceKm = haversineKm(point, { lat: site.latitude, lon: site.longitude });
  if (siteDistanceKm > 150) {
    throw new Error(
      `Le port de référence le plus proche (${site.site_name}) est à ${Math.round(siteDistanceKm)} km : la prédiction ne serait pas représentative.`,
    );
  }

  const from = dateOnly(wallNow);
  const toDate = new Date(`${from}T12:00:00Z`);
  toDate.setUTCDate(toDate.getUTCDate() + 4);
  const to = toDate.toISOString().slice(0, 10);

  const extremaUrl = new URL(`${BASE}/tide-extrema`);
  extremaUrl.searchParams.set('site', site.site_id);
  extremaUrl.searchParams.set('from', from);
  extremaUrl.searchParams.set('to', to);
  extremaUrl.searchParams.set('tz', 'Europe/Paris');

  const levelsUrl = new URL(`${BASE}/water-levels`);
  levelsUrl.searchParams.set('site', site.site_id);
  levelsUrl.searchParams.set('from', `${from}T00:00`);
  levelsUrl.searchParams.set('to', `${to}T23:59`);
  levelsUrl.searchParams.set('step', '30');
  levelsUrl.searchParams.set('tz', 'Europe/Paris');

  const [extrema, levels] = await Promise.all([
    getJson<ExtremaResponse>(extremaUrl.toString(), { signal, headers: auth(key), timeoutMs: 15_000 }),
    getJson<WaterLevelsResponse>(levelsUrl.toString(), { signal, headers: auth(key), timeoutMs: 15_000 }).catch(
      () => ({ data: [] }) as WaterLevelsResponse,
    ),
  ]);

  const events = (extrema.data ?? []).flatMap((day) =>
    day.extrema.map((item) => ({
      type: item.type === 'PM' ? ('high' as const) : ('low' as const),
      time: `${day.date}T${item.time}`,
      height: item.height,
      coefficient: item.coef ?? null,
    })),
  );

  if (events.length === 0) throw new Error('Aucun extrême de marée renvoyé par api-maree.fr.');

  const todayEvents = events.filter((e) => e.time.slice(0, 10) === from);
  const heights = todayEvents.map((e) => e.height);
  const range = heights.length >= 2 ? Math.max(...heights) - Math.min(...heights) : 0;
  const firstCoef = todayEvents.find((e) => typeof e.coefficient === 'number')?.coefficient ?? null;

  return {
    events,
    range,
    coefficient: firstCoef,
    coefficientEstimated: false,
    series: (levels.data ?? []).map((p) => ({ time: p.time.slice(0, 16), height: p.height })),
    reference: 'ZH',
    source: 'api-maree',
    stationLabel: site.site_name,
    attribution:
      extrema.attribution ??
      'Données de marée fournies par api-maree.fr (CC BY), calculées à partir de composantes harmoniques Ifremer / PREVIMER (CC BY). Coefficients non officiels, impropres à la navigation.',
    site,
    siteDistanceKm,
  };
}
