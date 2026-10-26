import type { GeoPoint } from '../types';

const RAD = Math.PI / 180;
const EARTH_RADIUS_KM = 6371.0088;

/** Great-circle distance in kilometres. */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = (b.lat - a.lat) * RAD;
  const dLon = (b.lon - a.lon) * RAD;
  const lat1 = a.lat * RAD;
  const lat2 = b.lat * RAD;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial bearing from `a` to `b`, degrees clockwise from north. */
export function bearingDeg(a: GeoPoint, b: GeoPoint): number {
  const lat1 = a.lat * RAD;
  const lat2 = b.lat * RAD;
  const dLon = (b.lon - a.lon) * RAD;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (Math.atan2(y, x) / RAD + 360) % 360;
}

const CARDINALS = [
  'nord',
  'nord-nord-est',
  'nord-est',
  'est-nord-est',
  'est',
  'est-sud-est',
  'sud-est',
  'sud-sud-est',
  'sud',
  'sud-sud-ouest',
  'sud-ouest',
  'ouest-sud-ouest',
  'ouest',
  'ouest-nord-ouest',
  'nord-ouest',
  'nord-nord-ouest',
];

const SHORT_CARDINALS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];

export function compassShort(deg: number | null | undefined): string {
  if (deg === null || deg === undefined || !Number.isFinite(deg)) return '—';
  const index = Math.round((((deg % 360) + 360) % 360) / 22.5) % 16;
  return SHORT_CARDINALS[index];
}

export function compassLong(deg: number | null | undefined): string {
  if (deg === null || deg === undefined || !Number.isFinite(deg)) return '—';
  const index = Math.round((((deg % 360) + 360) % 360) / 22.5) % 16;
  return CARDINALS[index];
}

/** "44.5886° N · 1.2114° O" */
export function coordLabel(lat: number, lon: number, digits = 4): string {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'O';
  return `${Math.abs(lat).toFixed(digits)}° ${ns} · ${Math.abs(lon).toFixed(digits)}° ${ew}`;
}

export function coordPair(lat: number, lon: number): string {
  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}

export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function slugify(text: string): string {
  return normalizeText(text)
    .replace(/['’]/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Estimated driving distance — bends, detours and access roads included. */
export function roadDistanceKm(straightKm: number): number {
  if (!Number.isFinite(straightKm) || straightKm <= 0) return 0;
  if (straightKm < 2) return straightKm * 1.4;
  return straightKm * 1.22 + 3;
}

export function driveMinutes(roadKm: number): number {
  if (!Number.isFinite(roadKm) || roadKm <= 0) return 0;
  // ~72 km/h average on the French network, plus 6 minutes of urban access.
  return (roadKm / 72) * 60 + 6;
}

export function isInFrance(lat: number, lon: number): boolean {
  return lat >= 41 && lat <= 51.5 && lon >= -5.5 && lon <= 9.9;
}

/** Rounds a coordinate so a "manual" input stays tidy. */
export function roundCoord(value: number, digits = 5): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function makeId(prefix = 'spot'): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}
