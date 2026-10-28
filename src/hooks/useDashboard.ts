/**
 * Orchestration des données du tableau de bord.
 *
 * Chaque module possède son propre état (`loading`, `ok`, `unavailable`,
 * `error`) : une source en panne n'empêche jamais l'affichage des autres.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  ActivityId,
  CoastInfo,
  HydroBundle,
  MarineBundle,
  Milieu,
  ModuleState,
  RouteInfo,
  Spot,
  StartPosition,
  TideInfo,
  WeatherBundle,
} from '../core/types';
import type { AstroInfo } from '../core/astro';
import { computeAstro } from '../core/astro';
import { ACTIVITY_MAP, planModules } from '../core/activities';
import type { ModulePlan } from '../core/activities';
import { detectCoast, resolveMilieu } from '../core/coast';
import { extractTideInfo } from '../core/tides';
import { fetchWeather, fetchMarine } from '../api/openMeteo';
import { fetchHydrology } from '../api/hydrology';
import { fetchRoute } from '../api/routing';
import { fetchTideInfoFromApi } from '../api/mareeApi';
import { describeError } from '../api/http';
import { cacheKey, memoryGet, memorySet, persistentGet, persistentSet } from '../api/cache';
import { wallClockNow } from '../core/format';
import { useNow } from './useNow';

const WEATHER_TTL = 5 * 60_000;
const MARINE_TTL = 10 * 60_000;
const HYDRO_TTL = 5 * 60_000;
const COAST_TTL = 7 * 24 * 3600_000;
const ROUTE_TTL = 24 * 3600_000;

const idle = <T,>(): ModuleState<T> => ({ state: 'idle', data: null });
const loading = <T,>(): ModuleState<T> => ({ state: 'loading', data: null });

export interface DashboardModel {
  weather: ModuleState<WeatherBundle>;
  marine: ModuleState<MarineBundle>;
  hydro: ModuleState<HydroBundle>;
  coast: ModuleState<CoastInfo>;
  route: ModuleState<RouteInfo>;
  tides: ModuleState<TideInfo>;
  astro: AstroInfo | null;
  plan: ModulePlan;
  milieu: Milieu;
  milieuReason: string;
  milieuAuto: boolean;
  coastNotes: string[];
  wallNow: string;
  tzOffset: number;
  refresh: () => void;
  refreshing: boolean;
  lastUpdate: number;
}

export function useDashboard(
  spot: Spot | null,
  start: StartPosition | null,
  activityId: ActivityId,
  mareeKey: string,
  refreshMinutes: number,
): DashboardModel {
  const [weather, setWeather] = useState<ModuleState<WeatherBundle>>(idle);
  const [marine, setMarine] = useState<ModuleState<MarineBundle>>(idle);
  const [hydro, setHydro] = useState<ModuleState<HydroBundle>>(idle);
  const [coast, setCoast] = useState<ModuleState<CoastInfo>>(idle);
  const [route, setRoute] = useState<ModuleState<RouteInfo>>(idle);
  const [tides, setTides] = useState<ModuleState<TideInfo>>(idle);
  const [coastNotes, setCoastNotes] = useState<string[]>([]);
  const [nonce, setNonce] = useState(0);
  const [lastUpdate, setLastUpdate] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const now = useNow(30_000);

  const activity = ACTIVITY_MAP[activityId];
  const needsMarineData = activity.family !== 'terrestre';

  const refresh = useCallback(() => {
    setRefreshing(true);
    setNonce((n) => n + 1);
  }, []);

  /* ---------------------------------------------------------------- météo */
  useEffect(() => {
    if (!spot) {
      setWeather(idle());
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    const key = cacheKey(['weather', spot.lat, spot.lon]);
    const cached = memoryGet<WeatherBundle>(key, WEATHER_TTL);
    if (cached) {
      setWeather({ state: 'ok', data: cached.value, fetchedAt: cached.at });
      return () => {
        cancelled = true;
        controller.abort();
      };
    }
    setWeather(loading());
    fetchWeather(spot, controller.signal)
      .then((data) => {
        if (cancelled) return;
        memorySet(key, data);
        setWeather({ state: 'ok', data, fetchedAt: Date.now(), measuredAt: Date.parse(data.currentTime) });
        setLastUpdate(Date.now());
      })
      .catch((error) => {
        if (cancelled) return;
        setWeather({ state: 'error', data: null, error: describeError(error) });
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [spot, nonce]);

  /* -------------------------------------------------------------- littoral */
  useEffect(() => {
    if (!spot) {
      setCoast(idle());
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    const key = cacheKey(['coast', spot.lat, spot.lon]);
    const cached = persistentGet<CoastInfo>(key, COAST_TTL);
    if (cached) {
      setCoast({ state: 'ok', data: cached.value, fetchedAt: cached.at });
      setCoastNotes([]);
      return () => {
        cancelled = true;
        controller.abort();
      };
    }
    setCoast(loading());
    detectCoast(spot, { signal: controller.signal })
      .then(({ info, notes }) => {
        if (cancelled) return;
        persistentSet(key, info);
        setCoast({ state: 'ok', data: info, fetchedAt: info.fetchedAt });
        setCoastNotes(notes);
      })
      .catch((error) => {
        if (cancelled) return;
        setCoast({ state: 'error', data: null, error: describeError(error) });
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [spot, nonce]);

  /* ---------------------------------------------------------------- marine */
  useEffect(() => {
    if (!spot || !needsMarineData) {
      setMarine(idle());
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    const key = cacheKey(['marine', spot.lat, spot.lon]);
    const cached = memoryGet<MarineBundle>(key, MARINE_TTL);
    if (cached) {
      setMarine({ state: 'ok', data: cached.value, fetchedAt: cached.at });
      return () => {
        cancelled = true;
        controller.abort();
      };
    }
    setMarine(loading());
    fetchMarine(spot, controller.signal)
      .then((data) => {
        if (cancelled) return;
        memorySet(key, data);
        const hasValues =
          data.current.waveHeight !== null ||
          data.current.seaLevelHeight !== null ||
          data.current.seaSurfaceTemperature !== null ||
          data.hourly.some((h) => h.seaLevelHeight !== null);
        setMarine({
          state: hasValues ? 'ok' : 'unavailable',
          data,
          fetchedAt: Date.now(),
          error: hasValues
            ? undefined
            : 'Aucune donnée marine à ce point : le modèle ne couvre pas cette zone (point continental ou hors couverture).',
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setMarine({ state: 'error', data: null, error: describeError(error) });
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [spot, needsMarineData, nonce]);

  /* ----------------------------------------------------------- hydrologie */
  useEffect(() => {
    if (!spot || !activity.needs.hydrology) {
      setHydro(idle());
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    const key = cacheKey(['hydro', spot.lat, spot.lon]);
    const cached = memoryGet<HydroBundle>(key, HYDRO_TTL);
    if (cached) {
      setHydro({ state: 'ok', data: cached.value, fetchedAt: cached.at });
      return () => {
        cancelled = true;
        controller.abort();
      };
    }
    setHydro(loading());
    fetchHydrology(spot, controller.signal)
      .then((data) => {
        if (cancelled) return;
        memorySet(key, data);
        setHydro({
          state: data.stations.length ? 'ok' : 'unavailable',
          data,
          fetchedAt: Date.now(),
          error: data.stations.length
            ? undefined
            : `Aucune station hydrométrique référencée dans un rayon de ${data.radiusKm} km.`,
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setHydro({ state: 'error', data: null, error: describeError(error) });
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [spot, activity.needs.hydrology, nonce]);

  /* -------------------------------------------------------------- itinéraire */
  useEffect(() => {
    if (!spot || !start) {
      setRoute(idle());
      return;
    }
    const samePlace =
      Math.abs(start.lat - spot.lat) < 0.0005 && Math.abs(start.lon - spot.lon) < 0.0005;
    if (samePlace) {
      setRoute({
        state: 'ok',
        data: { distanceKm: 0, durationMin: 0, source: 'haversine', profile: 'driving' },
        fetchedAt: Date.now(),
      });
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    const key = cacheKey(['route', start.lat, start.lon, spot.lat, spot.lon]);
    const cached = persistentGet<RouteInfo>(key, ROUTE_TTL);
    if (cached) {
      setRoute({ state: 'ok', data: cached.value, fetchedAt: cached.at });
      return () => {
        cancelled = true;
        controller.abort();
      };
    }
    setRoute(loading());
    fetchRoute(start, spot, controller.signal)
      .then((data) => {
        if (cancelled) return;
        persistentSet(key, data);
        setRoute({ state: 'ok', data, fetchedAt: Date.now() });
      })
      .catch((error) => {
        if (cancelled) return;
        setRoute({ state: 'error', data: null, error: describeError(error) });
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [spot, start, nonce]);

  /* ----------------------------------------------------------- milieu effectif */
  const milieuInfo = useMemo(
    () => resolveMilieu(spot?.milieu ?? 'auto', coast.data?.distanceKm ?? null),
    [spot?.milieu, coast.data?.distanceKm],
  );

  const tzOffset = weather.data?.utcOffsetSeconds ?? -new Date().getTimezoneOffset() * 60;
  const wallNow = useMemo(() => wallClockNow(tzOffset), [tzOffset, now]);

  /* ------------------------------------------------------------------ marées */
  useEffect(() => {
    if (!marine.data) {
      setTides(idle());
      return;
    }
    const modelTide = extractTideInfo(marine.data);
    const controller = new AbortController();
    let cancelled = false;

    if (!mareeKey.trim()) {
      setTides(
        modelTide
          ? { state: 'ok', data: modelTide, fetchedAt: marine.fetchedAt }
          : {
              state: 'unavailable',
              data: null,
              error: 'Aucune hauteur d’eau marine disponible à ce point.',
            },
      );
      return () => controller.abort();
    }

    const load = async () => {
      try {
        if (!spot) throw new Error('Spot manquant');
        const apiTide = await fetchTideInfoFromApi(spot, mareeKey, wallNow, controller.signal);
        if (!cancelled) setTides({ state: 'ok', data: apiTide, fetchedAt: Date.now() });
      } catch {
        if (cancelled) return;
        setTides(
          modelTide
            ? {
                state: 'ok',
                data: modelTide,
                fetchedAt: marine.fetchedAt,
                error: 'api-maree.fr indisponible ou clé refusée : courbe du modèle affichée.',
              }
            : {
                state: 'error',
                data: null,
                error: 'Marées indisponibles (api-maree.fr injoignable et modèle sans couverture).',
              },
        );
      }
    };
    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
    // wallNow évolue chaque minute : volontairement exclu des dépendances.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marine.data, marine.fetchedAt, mareeKey, spot]);

  /* -------------------------------------------------------------- astronomie */
  const astro = useMemo<AstroInfo | null>(() => {
    if (!spot) return null;
    return computeAstro(spot, tzOffset, wallNow);
  }, [spot, tzOffset, wallNow]);

  const plan = useMemo(
    () => planModules(activityId, milieuInfo.milieu),
    [activityId, milieuInfo.milieu],
  );

  useEffect(() => {
    if (!refreshing) return;
    const id = window.setTimeout(() => setRefreshing(false), 1200);
    return () => window.clearTimeout(id);
  }, [refreshing]);

  useEffect(() => {
    if (!refreshMinutes || refreshMinutes <= 0) return;
    const id = window.setInterval(() => setNonce((n) => n + 1), refreshMinutes * 60_000);
    return () => window.clearInterval(id);
  }, [refreshMinutes]);

  return {
    weather,
    marine,
    hydro,
    coast,
    route,
    tides,
    astro,
    plan,
    milieu: milieuInfo.milieu,
    milieuReason: milieuInfo.reason,
    milieuAuto: milieuInfo.auto,
    coastNotes,
    wallNow,
    tzOffset,
    refresh,
    refreshing,
    lastUpdate,
  };
}
