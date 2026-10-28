/**
 * Itinéraire routier départ → spot.
 *
 *  1. OSRM (routeur de démonstration openstreetmap.de / project-osrm.org) :
 *     distance et durée réelles par la route, données OSM (ODbL).
 *     Serveur de démonstration : pas de garantie de disponibilité (usage
 *     raisonnable, pas de trafic intensif).
 *  2. Repli : distance à vol d'oiseau majorée de 25 %, sans durée.
 */
import type { GeoPoint, RouteInfo } from '../core/types';
import { haversineKm } from '../core/geo';
import { getJson } from './http';

interface OsrmResponse {
  code: string;
  routes?: { distance: number; duration: number }[];
}

const ROUTERS = [
  (a: GeoPoint, b: GeoPoint) =>
    `https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false&alternatives=false&steps=false`,
  (a: GeoPoint, b: GeoPoint) =>
    `https://routing.openstreetmap.de/r35/routed-car/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false&alternatives=false&steps=false`,
];

export async function fetchRoute(
  from: GeoPoint,
  to: GeoPoint,
  signal?: AbortSignal,
): Promise<RouteInfo> {
  const straight = haversineKm(from, to);
  if (straight < 0.15) {
    return { distanceKm: straight, durationMin: 0, source: 'haversine', profile: 'driving' };
  }

  for (const build of ROUTERS) {
    try {
      const raw = await getJson<OsrmResponse>(build(from, to), { signal, timeoutMs: 15_000 });
      const route = raw.routes?.[0];
      if (raw.code === 'Ok' && route && Number.isFinite(route.distance)) {
        return {
          distanceKm: route.distance / 1000,
          durationMin: Number.isFinite(route.duration) ? route.duration / 60 : null,
          source: 'osrm',
          profile: 'driving',
        };
      }
    } catch {
      /* routeur suivant */
    }
  }

  // Repli assumé : distance à vol d'oiseau majorée, sans durée annoncée.
  return {
    distanceKm: straight * 1.25,
    durationMin: null,
    source: 'haversine',
    profile: 'driving',
  };
}
