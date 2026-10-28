/**
 * Détection du milieu : distance du spot au trait de côte.
 *
 *  1. OSM / Overpass (`natural=coastline`) : source la plus précise (~10–50 m),
 *     interrogeable sans clé ; serveurs publics soumis à disponibilité.
 *  2. Natural Earth 1:10 m embarqué (~1,3 km) : repli hors ligne, chargé à la
 *     demande (aucune requête réseau).
 *  3. Sonde marine Open-Meteo : confirme qu'un point est bien en mer lorsque
 *     les deux précédentes échouent.
 *
 * Le seuil réglementaire de l'application est de 5 km : en deçà, le milieu est
 * réputé maritime ; au-delà, continental. Le choix manuel reste prioritaire.
 */
import type { CoastInfo, GeoPoint, Milieu } from './types';
import { pointToSegmentKm } from './geo';
import { getJson } from '../api/http';

export const MARITIME_THRESHOLD_KM = 5;

interface OverpassWay {
  type: string;
  id: number;
  geometry?: { lat: number; lon: number }[];
}

interface OverpassResponse {
  elements?: OverpassWay[];
}

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

function overpassQuery(point: GeoPoint, radiusM: number): string {
  return `[out:json][timeout:20];way(around:${radiusM},${point.lat.toFixed(5)},${point.lon.toFixed(
    5,
  )})[natural=coastline];out geom;`;
}

/** Distance minimale (km) du point aux tracés OSM renvoyés. */
function distanceToWays(point: GeoPoint, ways: OverpassWay[]): { distanceKm: number; nodes: number } {
  let best = Number.POSITIVE_INFINITY;
  let nodes = 0;
  for (const way of ways) {
    const geometry = way.geometry;
    if (!geometry || geometry.length === 0) continue;
    nodes += geometry.length;
    if (geometry.length === 1) {
      const d = pointToSegmentKm(point, geometry[0], geometry[0], point.lat);
      if (d < best) best = d;
      continue;
    }
    for (let i = 0; i < geometry.length - 1; i++) {
      const d = pointToSegmentKm(point, geometry[i], geometry[i + 1], point.lat);
      if (d < best) best = d;
    }
  }
  return { distanceKm: best, nodes };
}

async function osmCoast(point: GeoPoint, radiusKm: number, signal?: AbortSignal): Promise<CoastInfo | null> {
  const radiusM = Math.round(radiusKm * 1000);
  const query = overpassQuery(point, radiusM);
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const url = `${endpoint}?data=${encodeURIComponent(query)}`;
      const raw = await getJson<OverpassResponse>(url, { signal, timeoutMs: 22_000 });
      const ways = (raw.elements ?? []).filter((el) => el.type === 'way' && el.geometry?.length);
      if (ways.length === 0) return null; // aucun trait de côte dans le rayon
      const { distanceKm, nodes } = distanceToWays(point, ways);
      if (!Number.isFinite(distanceKm)) return null;
      return {
        distanceKm,
        source: 'osm',
        precisionM: 50,
        detail: `${ways.length} tronçon(s) OSM, ${nodes} points`,
        fetchedAt: Date.now(),
      };
    } catch (error) {
      if (signal?.aborted) throw error;
      // serveur suivant
    }
  }
  return null;
}

/* --------------------------------------------------------- repli local */

interface CoastFile {
  meta: { scale: number; cell_deg: number; precision_m: number; points: number; lines: number };
  lines: number[][];
  grid: Record<string, number[]>;
}

let coastFile: CoastFile | null = null;
let coastLines: Float64Array[] | null = null;
let loadPromise: Promise<void> | null = null;

async function ensureLocalCoast(): Promise<void> {
  if (coastLines) return;
  if (!loadPromise) {
    loadPromise = import('../data/coastline.json?raw').then((mod) => {
      const data = JSON.parse(mod.default) as CoastFile;
      const scale = data.meta.scale;
      coastFile = data;
      coastLines = data.lines.map((flat) => {
        if (flat.length <= 2) {
          return Float64Array.from([flat[0] / scale, flat[1] / scale]);
        }
        const out = new Float64Array(flat.length);
        let x = 0;
        let y = 0;
        for (let i = 0; i < flat.length; i += 2) {
          if (i === 0) {
            x = flat[0];
            y = flat[1];
          } else {
            x += flat[i];
            y += flat[i + 1];
          }
          out[i] = x / scale;
          out[i + 1] = y / scale;
        }
        return out;
      });
    });
  }
  await loadPromise;
}

function lineDistance(point: GeoPoint, line: Float64Array): number {
  if (line.length === 2) {
    const dLat = point.lat - line[1];
    const dLon = (point.lon - line[0]) * Math.cos((point.lat * Math.PI) / 180);
    return Math.hypot(dLat * 110.574, dLon * 111.32);
  }
  // Rejet rapide par emprise.
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < line.length; i += 2) {
    if (line[i] < minX) minX = line[i];
    if (line[i] > maxX) maxX = line[i];
    if (line[i + 1] < minY) minY = line[i + 1];
    if (line[i + 1] > maxY) maxY = line[i + 1];
  }
  const pad = 0.6;
  if (
    point.lon < minX - pad ||
    point.lon > maxX + pad ||
    point.lat < minY - pad ||
    point.lat > maxY + pad
  ) {
    return Number.POSITIVE_INFINITY;
  }
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < line.length - 2; i += 2) {
    const ax = line[i];
    const ay = line[i + 1];
    const bx = line[i + 2];
    const by = line[i + 3];
    // Distance point/segment dans un repère local (km).
    const kx = 111.32 * Math.cos((point.lat * Math.PI) / 180);
    const ky = 110.574;
    const px = (point.lon - ax) * kx;
    const py = (point.lat - ay) * ky;
    const sx = (bx - ax) * kx;
    const sy = (by - ay) * ky;
    const len2 = sx * sx + sy * sy;
    let t = len2 === 0 ? 0 : (px * sx + py * sy) / len2;
    t = Math.max(0, Math.min(1, t));
    const d = Math.hypot(px - t * sx, py - t * sy);
    if (d < best) best = d;
  }
  return best;
}

async function localCoast(point: GeoPoint, signal?: AbortSignal): Promise<CoastInfo> {
  await ensureLocalCoast();
  if (!coastLines || !coastFile) throw new Error('Référentiel côtier indisponible');

  const cell = coastFile.meta.cell_deg;
  const cx = Math.floor(point.lon / cell);
  const cy = Math.floor(point.lat / cell);
  const evaluated = new Set<number>();
  let best = Number.POSITIVE_INFINITY;
  let evaluatedLines = 0;

  for (let ring = 0; ring <= 80; ring++) {
    if (signal?.aborted) throw new Error('Requête annulée');
    for (let dx = -ring; dx <= ring; dx++) {
      for (let dy = -ring; dy <= ring; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
        const key = `${cx + dx},${cy + dy}`;
        const ids = coastFile.grid[key];
        if (!ids) continue;
        for (const id of ids) {
          if (evaluated.has(id)) continue;
          evaluated.add(id);
          evaluatedLines++;
          const d = lineDistance(point, coastLines[id]);
          if (d < best) best = d;
        }
      }
    }
    // Une ligne non encore évaluée est au moins à (ring − 1) × 100 km.
    if (Number.isFinite(best) && (ring - 1) * 100 > best) break;
  }

  return {
    distanceKm: best,
    source: 'natural-earth',
    precisionM: coastFile.meta.precision_m,
    detail: `Natural Earth 1:10m embarqué (${evaluatedLines} tracés parcourus)`,
    fetchedAt: Date.now(),
  };
}

/* ------------------------------------------------------------- décision */

export interface CoastDetection {
  info: CoastInfo;
  /** Source utilisée et raison du repli éventuel. */
  notes: string[];
}

export async function detectCoast(
  point: GeoPoint,
  options: { radiusKm?: number; signal?: AbortSignal } = {},
): Promise<CoastDetection> {
  const notes: string[] = [];
  const radius = options.radiusKm ?? 10;

  const osm = await osmCoast(point, radius, options.signal).catch(() => null);
  if (osm) {
    return { info: osm, notes };
  }
  notes.push(
    `Aucun trait de côte OSM dans un rayon de ${radius} km ou service Overpass indisponible : référentiel embarqué utilisé.`,
  );

  const local = await localCoast(point, options.signal);
  return { info: local, notes };
}

/** Milieu effectif : le choix manuel est toujours prioritaire. */
export function resolveMilieu(
  override: 'auto' | Milieu,
  coastKm: number | null | undefined,
): { milieu: Milieu; reason: string; auto: boolean } {
  if (override === 'mer' || override === 'eau_douce') {
    return {
      milieu: override,
      auto: false,
      reason: `Milieu imposé manuellement : ${override === 'mer' ? 'MER' : 'EAU DOUCE'}.`,
    };
  }
  if (coastKm === null || coastKm === undefined || !Number.isFinite(coastKm)) {
    return {
      milieu: 'eau_douce',
      auto: true,
      reason: 'Distance au littoral indisponible : contexte continental retenu par défaut.',
    };
  }
  const isSea = coastKm <= MARITIME_THRESHOLD_KM;
  return {
    milieu: isSea ? 'mer' : 'eau_douce',
    auto: true,
    reason: `Spot à ${coastKm < 10 ? coastKm.toFixed(1).replace('.', ',') : Math.round(coastKm)} km du littoral — seuil de ${MARITIME_THRESHOLD_KM} km.`,
  };
}
