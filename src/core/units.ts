/**
 * Sélecteur global d'unités et conversions d'affichage.
 *
 * - Les données restent stockées dans leur unité source (km, km/h, m, °C, hPa,
 *   mm, m³/s). Ce module ne fait que convertir pour l'affichage.
 * - Trois modes : `standard`, `nautical`, `dual` (double affichage).
 * - Les arrondis sont définis une seule fois, ici, pour toute l'application.
 */
import type { UnitMode } from './types';
import { n0, n1, num } from './format';

export const KM_PER_NM = 1.852;
export const KMH_PER_KN = 1.852;

export const UNIT_LABELS: Record<UnitMode, { label: string; hint: string }> = {
  standard: { label: 'Standard', hint: 'km · km/h · °C · hPa · m' },
  nautical: { label: 'Nautique', hint: 'NM · kn · °C · hPa · m' },
  dual: { label: 'Double', hint: 'km / NM · km/h / kn' },
};

export type DistanceContext = 'terrain' | 'marine';
export type SpeedContext = 'terrain' | 'marine';

export const kmToNm = (km: number) => km / KM_PER_NM;
export const nmToKm = (nm: number) => nm * KM_PER_NM;
export const kmhToKn = (kmh: number) => kmh / KMH_PER_KN;
export const knToKmh = (kn: number) => kn * KMH_PER_KN;

/* ------------------------------------------------------------- arrondis */

/** Distance : 1 décimale jusqu'à 100 km, entière au-delà. */
function distanceDecimals(km: number): number {
  return Math.abs(km) >= 100 ? 0 : 1;
}

function formatKm(km: number): string {
  return `${num(km, distanceDecimals(km))} km`;
}

function formatNm(km: number): string {
  const nm = kmToNm(km);
  return `${num(nm, Math.abs(nm) >= 100 ? 0 : 1)} NM`;
}

/** Vitesse : entier (km/h comme nœuds) — précision suffisante et homogène. */
function formatKmh(kmh: number): string {
  return `${n0(kmh)} km/h`;
}

function formatKn(kmh: number): string {
  return `${n0(kmhToKn(kmh))} kn`;
}

/* ------------------------------------------------------------ formateur */

export interface Units {
  mode: UnitMode;
  /** Distance parcourue au sol (trajet, rayon, distance de marche). */
  distance: (km: number | null | undefined, ctx?: DistanceContext) => string;
  /** Vitesse du vent ou d'un déplacement. */
  speed: (kmh: number | null | undefined, ctx?: SpeedContext) => string;
  /** Champ de hauteur générique (houle, vague, hauteur d'eau). */
  height: (m: number | null | undefined) => string;
  /** Hauteur de marée : 2 décimales (précision décimétrique du modèle). */
  tideHeight: (m: number | null | undefined) => string;
  /** Profondeur / hauteur d'eau d'une station hydrologique. */
  waterLevel: (m: number | null | undefined) => string;
  temperature: (c: number | null | undefined) => string;
  pressure: (hPa: number | null | undefined) => string;
  precipitation: (mm: number | null | undefined) => string;
  percent: (p: number | null | undefined) => string;
  uv: (v: number | null | undefined) => string;
  flow: (m3s: number | null | undefined) => string;
  /** Séparateur de double affichage, exposé pour les légendes. */
  dual: boolean;
}

const EMPTY = '—';

export function createUnits(mode: UnitMode): Units {
  const dual = mode === 'dual';

  const distance = (km: number | null | undefined, ctx: DistanceContext = 'terrain') => {
    if (km === null || km === undefined || !Number.isFinite(km)) return EMPTY;
    if (dual) return `${formatKm(km)} / ${formatNm(km)}`;
    if (mode === 'nautical' && ctx === 'marine') return formatNm(km);
    return formatKm(km);
  };

  const speed = (kmh: number | null | undefined, ctx: SpeedContext = 'terrain') => {
    if (kmh === null || kmh === undefined || !Number.isFinite(kmh)) return EMPTY;
    if (dual) return `${formatKmh(kmh)} / ${formatKn(kmh)}`;
    if (mode === 'nautical' && ctx === 'marine') return formatKn(kmh);
    return formatKmh(kmh);
  };

  return {
    mode,
    dual,
    distance,
    speed,
    height: (m) => (m === null || m === undefined || !Number.isFinite(m) ? EMPTY : `${n1(m)} m`),
    tideHeight: (m) => (m === null || m === undefined || !Number.isFinite(m) ? EMPTY : `${num(m, 2)} m`),
    waterLevel: (m) => (m === null || m === undefined || !Number.isFinite(m) ? EMPTY : `${num(m, 2)} m`),
    temperature: (c) => (c === null || c === undefined || !Number.isFinite(c) ? EMPTY : `${n1(c)} °C`),
    pressure: (hpa) => (hpa === null || hpa === undefined || !Number.isFinite(hpa) ? EMPTY : `${n0(hpa)} hPa`),
    precipitation: (mm) =>
      mm === null || mm === undefined || !Number.isFinite(mm) ? EMPTY : `${n1(mm)} mm`,
    percent: (p) => (p === null || p === undefined || !Number.isFinite(p) ? EMPTY : `${n0(p)} %`),
    uv: (v) => (v === null || v === undefined || !Number.isFinite(v) ? EMPTY : n1(v)),
    flow: (q) => {
      if (q === null || q === undefined || !Number.isFinite(q)) return EMPTY;
      const decimals = Math.abs(q) < 1 ? 2 : Math.abs(q) < 20 ? 1 : 0;
      return `${num(q, decimals)} m³/s`;
    },
  };
}

/* ------------------------------------------------------- rose des vents */

const CARDINALS = [
  'N',
  'NNE',
  'NE',
  'ENE',
  'E',
  'ESE',
  'SE',
  'SSE',
  'S',
  'SSO',
  'SO',
  'OSO',
  'O',
  'ONO',
  'NO',
  'NNO',
];

export function cardinal(deg: number | null | undefined): string {
  if (deg === null || deg === undefined || !Number.isFinite(deg)) return '—';
  const idx = Math.round(((deg % 360) + 360) % 360 / 22.5) % 16;
  return CARDINALS[idx];
}

/** Échelle de Beaufort (mer belle à tempête) calculée depuis les km/h. */
const BEAUFORT_KNOTS = [1, 3, 6, 10, 16, 21, 27, 33, 40, 47, 55, 63];
const BEAUFORT_LABEL = [
  'Calme',
  'Très légère brise',
  'Légère brise',
  'Petite brise',
  'Jolie brise',
  'Bonne brise',
  'Vent frais',
  'Grand frais',
  'Coup de vent',
  'Fort coup de vent',
  'Tempête',
  'Violente tempête',
  'Ouragan',
];

export function beaufort(kmh: number | null | undefined): { force: number; label: string } | null {
  if (kmh === null || kmh === undefined || !Number.isFinite(kmh)) return null;
  const kn = kmhToKn(kmh);
  let force = 0;
  while (force < BEAUFORT_KNOTS.length && kn >= BEAUFORT_KNOTS[force]) force++;
  return { force, label: BEAUFORT_LABEL[force] };
}

/* ------------------------------------------------------- indices dérivés */

/** Indice UV → qualification et couleur (OMS). */
export function uvLevel(uv: number | null | undefined): { label: string; tone: string } | null {
  if (uv === null || uv === undefined || !Number.isFinite(uv)) return null;
  if (uv < 3) return { label: 'Faible', tone: 'ok' };
  if (uv < 6) return { label: 'Modéré', tone: 'warn' };
  if (uv < 8) return { label: 'Élevé', tone: 'warn' };
  if (uv < 11) return { label: 'Très élevé', tone: 'err' };
  return { label: 'Extrême', tone: 'err' };
}
