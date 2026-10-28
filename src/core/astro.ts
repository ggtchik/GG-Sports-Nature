/**
 * Astronomie locale (SunCalc, algorithmes de Meeus) — aucun appel réseau.
 *
 * Les heures sont converties dans l'heure locale du spot (décalage fourni par
 * Open-Meteo) pour rester cohérentes avec les autres modules.
 */
import SunCalc from 'suncalc';
import type { GeoPoint } from './types';

export interface MoonInfo {
  /** Fraction éclairée (0–1). */
  illumination: number;
  /** 0 = nouvelle lune, 0.25 = premier quartier, 0.5 = pleine lune, 0.75 = dernier quartier. */
  phase: number;
  phaseName: string;
  waxing: boolean;
  ageDays: number;
  rise: string | null;
  set: string | null;
  alwaysUp: boolean;
  alwaysDown: boolean;
}

export interface AstroInfo {
  date: string;
  sunrise: string | null;
  sunset: string | null;
  solarNoon: string | null;
  civilDawn: string | null;
  civilDusk: string | null;
  goldenHourMorning: string | null;
  goldenHourEvening: string | null;
  daylightMinutes: number | null;
  /** Altitude du soleil (deg) échantillonnée sur la journée locale. */
  sunPath: { t: number; altitude: number; azimuth: number }[];
  moon: MoonInfo;
  source: 'suncalc';
}

const PHASE_NAMES = [
  'Nouvelle lune',
  'Premier croissant',
  'Premier quartier',
  'Gibbeuse croissante',
  'Pleine lune',
  'Gibbeuse décroissante',
  'Dernier quartier',
  'Dernier croissant',
];

function phaseName(phase: number): string {
  const idx = Math.round(phase * 8) % 8;
  return PHASE_NAMES[idx];
}

function toWall(date: Date | null | undefined, offsetSeconds: number): string | null {
  if (!date || Number.isNaN(date.getTime())) return null;
  return new Date(date.getTime() + offsetSeconds * 1000).toISOString().slice(0, 16);
}

export function computeAstro(point: GeoPoint, offsetSeconds: number, wallNow: string): AstroInfo {
  const localDate = wallNow.slice(0, 10);
  const reference = new Date(`${localDate}T12:00:00Z`);

  const times = SunCalc.getTimes(reference, point.lat, point.lon, 0);
  const moonIllum = SunCalc.getMoonIllumination(reference);
  const moonTimes = SunCalc.getMoonTimes(reference, point.lat, point.lon, true);

  const sunPath: { t: number; altitude: number; azimuth: number }[] = [];
  for (let i = 0; i <= 96; i++) {
    const at = new Date(reference.getTime() + (i / 96) * 24 * 3600 * 1000);
    const pos = SunCalc.getPosition(at, point.lat, point.lon);
    sunPath.push({
      t: i / 96,
      altitude: (pos.altitude * 180) / Math.PI,
      azimuth: (pos.azimuth * 180) / Math.PI,
    });
  }

  const dayLength = times.sunset && times.sunrise
    ? (times.sunset.getTime() - times.sunrise.getTime()) / 60000
    : null;

  return {
    date: localDate,
    sunrise: toWall(times.sunrise, offsetSeconds),
    sunset: toWall(times.sunset, offsetSeconds),
    solarNoon: toWall(times.solarNoon, offsetSeconds),
    civilDawn: toWall(times.dawn, offsetSeconds),
    civilDusk: toWall(times.dusk, offsetSeconds),
    goldenHourMorning: toWall(times.goldenHourEnd, offsetSeconds),
    goldenHourEvening: toWall(times.goldenHour, offsetSeconds),
    daylightMinutes: dayLength,
    sunPath,
    moon: {
      illumination: moonIllum.fraction,
      phase: moonIllum.phase,
      phaseName: phaseName(moonIllum.phase),
      waxing: moonIllum.phase < 0.5,
      ageDays: moonIllum.phase * 29.530588,
      rise: toWall(moonTimes.rise, offsetSeconds),
      set: toWall(moonTimes.set, offsetSeconds),
      alwaysUp: Boolean(moonTimes.alwaysUp),
      alwaysDown: Boolean(moonTimes.alwaysDown),
    },
    source: 'suncalc',
  };
}
