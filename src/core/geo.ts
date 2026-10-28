/** Géométrie sphérique et plane : distances, caps, emprises. */
import type { GeoPoint } from './types';
import { num } from './format';

export const EARTH_RADIUS_KM = 6371.0088;
const KM_PER_DEG_LAT = 110.574;
const KM_PER_DEG_LON_EQ = 111.32;

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function bearingDeg(a: GeoPoint, b: GeoPoint): number {
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

/** Coordonnées lisibles : « 44,8378° N · 0,5792° O ». */
export function formatCoords(p: GeoPoint, decimals = 4): string {
  const lat = `${num(Math.abs(p.lat), decimals)}° ${p.lat >= 0 ? 'N' : 'S'}`;
  const lon = `${num(Math.abs(p.lon), decimals)}° ${p.lon >= 0 ? 'E' : 'O'}`;
  return `${lat} · ${lon}`;
}

export function roundCoord(value: number, decimals = 4): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

/** Distance point → segment, en km, dans un repère local équirectangulaire. */
export function pointToSegmentKm(
  point: GeoPoint,
  a: GeoPoint,
  b: GeoPoint,
  latRef: number,
): number {
  const kx = KM_PER_DEG_LON_EQ * Math.cos((latRef * Math.PI) / 180);
  const ky = KM_PER_DEG_LAT;
  const px = (point.lon - a.lon) * kx;
  const py = (point.lat - a.lat) * ky;
  const bx = (b.lon - a.lon) * kx;
  const by = (b.lat - a.lat) * ky;
  const len2 = bx * bx + by * by;
  let t = len2 === 0 ? 0 : (px * bx + py * by) / len2;
  t = Math.max(0, Math.min(1, t));
  const dx = px - t * bx;
  const dy = py - t * by;
  return Math.hypot(dx, dy);
}

export function bboxAround(point: GeoPoint, radiusKm: number): [number, number, number, number] {
  const dLat = radiusKm / KM_PER_DEG_LAT;
  const dLon = radiusKm / (KM_PER_DEG_LON_EQ * Math.max(0.05, Math.cos((point.lat * Math.PI) / 180)));
  return [point.lon - dLon, point.lat - dLat, point.lon + dLon, point.lat + dLat];
}

/** Point décalé d'une distance (km) et d'un cap (deg) — utilisé pour les sondes. */
export function destination(point: GeoPoint, distanceKm: number, bearing: number): GeoPoint {
  const δ = distanceKm / EARTH_RADIUS_KM;
  const θ = (bearing * Math.PI) / 180;
  const φ1 = (point.lat * Math.PI) / 180;
  const λ1 = (point.lon * Math.PI) / 180;
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ));
  const λ2 =
    λ1 + Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ1), Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2));
  return { lat: (φ2 * 180) / Math.PI, lon: (((λ2 * 180) / Math.PI + 540) % 360) - 180 };
}

export function samePoint(a: GeoPoint | null | undefined, b: GeoPoint | null | undefined, eps = 1e-5): boolean {
  if (!a || !b) return false;
  return Math.abs(a.lat - b.lat) < eps && Math.abs(a.lon - b.lon) < eps;
}
