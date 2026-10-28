/**
 * Marées.
 *
 * Deux sources possibles, jamais mélangées :
 *  - `api-maree` : pleines/basses mers et coefficients calculés à partir des
 *    composantes harmoniques Ifremer/PREVIMER (nécessite une clé personnelle).
 *  - `open-meteo-model` : hauteur d'eau du modèle SMOC (Météo-France/Copernicus),
 *    relative au niveau moyen de la mer. Les extrema sont extraits et affinés
 *    par interpolation parabolique. Aucun coefficient n'est alors affiché :
 *    cette donnée n'est pas ouverte (SHOM).
 *
 * L'application n'invente jamais d'horaire de marée ni de coefficient.
 */
import type { MarineBundle, TideEvent, TideInfo } from './types';
import { num } from './format';

interface Point {
  /** Microsoft epoch (ms) dérivé de l'heure locale du spot. */
  t: number;
  time: string;
  height: number;
}

function parseWall(iso: string): number {
  // « 2026-10-28T14:00 » : interprété en UTC, ce qui suffit pour les écarts.
  const ms = Date.parse(`${iso.slice(0, 16)}:00Z`);
  return Number.isFinite(ms) ? ms : NaN;
}

function toWall(ms: number): string {
  return new Date(ms).toISOString().slice(0, 16);
}

export function extractTideInfo(marine: MarineBundle): TideInfo | null {
  const series: Point[] = marine.hourly
    .filter((h) => h.seaLevelHeight !== null && Number.isFinite(h.seaLevelHeight))
    .map((h) => ({ t: parseWall(h.time), time: h.time, height: h.seaLevelHeight as number }))
    .filter((p) => Number.isFinite(p.t));

  if (series.length < 12) return null;

  const events: TideEvent[] = [];
  const hourMs = 3600_000;

  for (let i = 1; i < series.length - 1; i++) {
    const prev = series[i - 1].height;
    const curr = series[i].height;
    const next = series[i + 1].height;
    const isMax = curr >= prev && curr >= next && (curr > prev || curr > next);
    const isMin = curr <= prev && curr <= next && (curr < prev || curr < next);
    if (!isMax && !isMin) continue;

    const denom = prev - 2 * curr + next;
    const shift = Math.abs(denom) > 1e-9 ? (0.5 * (prev - next)) / denom : 0;
    const clampedShift = Math.max(-1, Math.min(1, shift));
    const height = curr - 0.25 * (prev - next) * clampedShift;
    const t = series[i].t + clampedShift * hourMs;
    events.push({ type: isMax ? 'high' : 'low', time: toWall(t), height });
  }

  // Un plateau (mer étale, modèle à faible amplitude) peut produire deux extrema
  // consécutifs de même nature : on ne conserve que le plus marqué.
  const merged: TideEvent[] = [];
  for (const event of events) {
    const last = merged[merged.length - 1];
    const gapH = last ? (parseWall(event.time) - parseWall(last.time)) / hourMs : Infinity;
    if (last && last.type === event.type && gapH < 5) {
      const keepNew = event.type === 'high' ? event.height > last.height : event.height < last.height;
      if (keepNew) merged[merged.length - 1] = event;
      continue;
    }
    merged.push(event);
  }

  if (merged.length === 0) return null;

  // Marnage du jour en cours : amplitude maximale de la journée.
  const today = series[0].time.slice(0, 10);
  const todayValues = series.filter((p) => p.time.slice(0, 10) === today).map((p) => p.height);
  const todayRange = todayValues.length
    ? Math.max(...todayValues) - Math.min(...todayValues)
    : Math.max(...series.map((p) => p.height)) - Math.min(...series.map((p) => p.height));

  return {
    events: merged,
    range: todayRange,
    coefficient: null,
    coefficientEstimated: false,
    series: series.map((p) => ({ time: p.time, height: p.height })),
    reference: 'MSL',
    source: 'open-meteo-model',
    stationLabel: 'Modèle SMOC — niveau moyen de la mer',
    attribution: 'Modèle SMOC (Météo-France / Copernicus) via Open-Meteo — hauteurs relatives au niveau moyen de la mer.',
  };
}

/** Prochain événement à venir (PM ou BM) par rapport à l'heure locale du spot. */
export function nextTideEvent(info: TideInfo, wallNow: string): TideEvent | null {
  return info.events.find((event) => event.time >= wallNow) ?? null;
}

export function tideEventsForDay(info: TideInfo, date: string): TideEvent[] {
  return info.events.filter((event) => event.time.slice(0, 10) === date);
}

/** Marnage du jour, formaté en mètres (toujours issu du modèle). */
export function rangeLabel(range: number): string {
  return `${num(range, 2)} m`;
}
