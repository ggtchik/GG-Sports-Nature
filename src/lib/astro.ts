import { getMoonIllumination, getMoonPosition, getMoonTimes, getPosition, getTimes } from 'suncalc';

export interface SkyPathPoint {
  time: Date;
  altitude: number;
  azimuth: number;
}

export interface MoonPhaseEvent {
  key: 'new' | 'first' | 'full' | 'last';
  label: string;
  date: Date;
  emoji: string;
}

export interface SkyData {
  date: Date;
  sunrise: Date | null;
  sunset: Date | null;
  dawn: Date | null;
  dusk: Date | null;
  goldenHour: Date | null;
  solarNoon: Date | null;
  dayLengthMinutes: number | null;
  sunAltitude: number;
  sunAzimuth: number;
  isDay: boolean;
  sunPath: SkyPathPoint[];
  moonrise: Date | null;
  moonset: Date | null;
  moonTransit: Date | null;
  moonFraction: number;
  moonPhase: number;
  moonPhaseName: string;
  moonAge: number;
  waxing: boolean;
  moonAltitude: number;
  nextPhases: MoonPhaseEvent[];
  daylightProgress: number | null;
  nextSunEvent: { type: 'lever' | 'coucher'; time: Date; tomorrow: boolean } | null;
  isNight: boolean;
}

const MOON_PHASES: { max: number; name: string }[] = [
  { max: 0.032, name: 'Nouvelle lune' },
  { max: 0.216, name: 'Premier croissant' },
  { max: 0.284, name: 'Premier quartier' },
  { max: 0.466, name: 'Lune gibbeuse croissante' },
  { max: 0.534, name: 'Pleine lune' },
  { max: 0.716, name: 'Lune gibbeuse décroissante' },
  { max: 0.784, name: 'Dernier quartier' },
  { max: 1.001, name: 'Dernier croissant' },
];

export function moonPhaseName(phase: number): string {
  const p = ((phase % 1) + 1) % 1;
  return MOON_PHASES.find((entry) => p <= entry.max)?.name ?? 'Nouvelle lune';
}

export const SYNODIC_MONTH = 29.530588853;

/** Elongation of the Moon from the Sun in radians (0 = new, π = full). */
export function moonElongationRad(date: Date): number {
  return getMoonIllumination(date).phase * Math.PI * 2;
}

/** Mean anomaly of the Moon in radians — drives the spring/neap modulation. */
export function lunarAnomalyRad(date: Date): number {
  const days = (date.getTime() - Date.UTC(2000, 0, 1, 12)) / 86_400_000;
  const deg = 134.963_4 + 13.064_993 * days;
  return ((deg % 360) + 360) % 360 * (Math.PI / 180);
}

/**
 * Estimated tidal coefficient (SHOM scale, 20–120). This is an astronomical
 * estimate, not the official Brest-referenced value.
 */
export function estimateTideCoefficient(date: Date): number {
  const elongation = moonElongationRad(date);
  const anomaly = lunarAnomalyRad(date);
  const amplitude = 36 + 12 * Math.cos(anomaly);
  const raw = 70 + amplitude * Math.cos(elongation * 2);
  return Math.round(Math.max(20, Math.min(120, raw)));
}

const golden = (value: Date | null | undefined): Date | null =>
  value instanceof Date && !Number.isNaN(value.getTime()) ? value : null;

function nextPhases(from: Date): MoonPhaseEvent[] {
  const targets: { key: MoonPhaseEvent['key']; value: number; label: string; emoji: string }[] = [
    { key: 'new', value: 0, label: 'Nouvelle lune', emoji: '🌑' },
    { key: 'first', value: 0.25, label: 'Premier quartier', emoji: '🌓' },
    { key: 'full', value: 0.5, label: 'Pleine lune', emoji: '🌕' },
    { key: 'last', value: 0.75, label: 'Dernier quartier', emoji: '🌗' },
  ];
  const events: MoonPhaseEvent[] = [];
  const stepHours = 3;
  const horizonDays = 40;
  let prevTime = from.getTime();
  let prevPhase = getMoonIllumination(from).phase;

  for (let h = stepHours; h <= horizonDays * 24; h += stepHours) {
    const time = prevTime + stepHours * 3_600_000;
    let phase = getMoonIllumination(new Date(time)).phase;

    // New moon wrap: phase jumps from ~1 to ~0.
    if (phase < prevPhase) {
      const fraction = (1 - prevPhase) / (1 - prevPhase + phase || 1);
      const crossing = prevTime + fraction * (time - prevTime);
      events.push({ key: 'new', label: 'Nouvelle lune', emoji: '🌑', date: new Date(crossing) });
      for (const target of targets) {
        if (target.value > 0 && target.value <= phase) {
          const localFraction = (target.value - 0) / (phase || 1);
          events.push({
            key: target.key,
            label: target.label,
            emoji: target.emoji,
            date: new Date(prevTime + localFraction * (time - prevTime)),
          });
        }
      }
    } else {
      for (const target of targets) {
        if (prevPhase < target.value && phase >= target.value) {
          const fraction = (target.value - prevPhase) / (phase - prevPhase || 1);
          events.push({
            key: target.key,
            label: target.label,
            emoji: target.emoji,
            date: new Date(prevTime + fraction * (time - prevTime)),
          });
        }
      }
    }

    prevTime = time;
    prevPhase = phase;
  }

  return events
    .filter((event) => event.date.getTime() > from.getTime())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 4);
}

export function computeSky(lat: number, lon: number, date = new Date()): SkyData {
  const times = getTimes(date, lat, lon);
  const moonTimes = getMoonTimes(date, lat, lon);
  const illum = getMoonIllumination(date);
  const nowPos = getPosition(date, lat, lon);
  const moonPos = getMoonPosition(date, lat, lon);

  const sunrise = golden(times.sunrise);
  const sunset = golden(times.sunset);
  const solarNoon = golden(times.solarNoon);
  const dawn = golden(times.dawn);
  const dusk = golden(times.dusk);
  const goldenHour = golden(times.goldenHour);

  let dayLengthMinutes: number | null = null;
  if (sunrise && sunset) {
    dayLengthMinutes = Math.round((sunset.getTime() - sunrise.getTime()) / 60000);
  }

  let daylightProgress: number | null = null;
  if (sunrise && sunset && sunset > sunrise) {
    daylightProgress = Math.min(
      1,
      Math.max(0, (date.getTime() - sunrise.getTime()) / (sunset.getTime() - sunrise.getTime())),
    );
  }

  // Sun path sampled every 5 minutes, from dawn to dusk when available.
  const start = sunrise ?? dawn;
  const end = sunset ?? dusk;
  const sunPath: SkyPathPoint[] = [];
  if (start && end && end > start) {
    const steps = 96;
    for (let i = 0; i <= steps; i++) {
      const t = start.getTime() + ((end.getTime() - start.getTime()) * i) / steps;
      const pos = getPosition(new Date(t), lat, lon);
      sunPath.push({ time: new Date(t), altitude: pos.altitude, azimuth: pos.azimuth });
    }
  }

  let nextSunEvent: SkyData['nextSunEvent'] = null;
  const nowTs = date.getTime();
  if (sunrise && sunrise.getTime() > nowTs) {
    nextSunEvent = { type: 'lever', time: sunrise, tomorrow: false };
  } else if (sunset && sunset.getTime() > nowTs) {
    nextSunEvent = { type: 'coucher', time: sunset, tomorrow: false };
  } else {
    const tomorrow = getTimes(new Date(nowTs + 86_400_000), lat, lon);
    if (tomorrow.sunrise) {
      nextSunEvent = { type: 'lever', time: tomorrow.sunrise, tomorrow: true };
    }
  }

  return {
    date,
    sunrise,
    sunset,
    dawn,
    dusk,
    goldenHour,
    solarNoon,
    dayLengthMinutes,
    sunAltitude: nowPos.altitude,
    sunAzimuth: nowPos.azimuth,
    isDay: nowPos.altitude > -0.833,
    sunPath,
    moonrise: golden(moonTimes.rise),
    moonset: golden(moonTimes.set),
    moonTransit: golden(moonTimes.transit),
    moonFraction: illum.fraction,
    moonPhase: illum.phase,
    moonPhaseName: moonPhaseName(illum.phase),
    moonAge: illum.phase * SYNODIC_MONTH,
    waxing: illum.waxing,
    moonAltitude: moonPos.altitude,
    nextPhases: nextPhases(date),
    daylightProgress,
    nextSunEvent,
    isNight: nowPos.altitude <= -0.833,
  };
}

/**
 * SVG path for the illuminated part of the Moon, for an orthographic view.
 * `fraction` 0..1, `waxing` true when the lit limb is on the right.
 */
export function moonLitPath(fraction: number, waxing: boolean, radius: number): string {
  const r = radius;
  const k = Math.min(1, Math.max(0, fraction));
  if (k < 0.005) return '';
  if (k > 0.995) return `M 0 ${-r} A ${r} ${r} 0 1 1 0 ${r} A ${r} ${r} 0 1 1 0 ${-r} Z`;

  const rx = Math.abs(1 - 2 * k) * r;
  const gibbous = k > 0.5;
  const side = waxing ? 1 : -1;
  const steps = 72;
  const lit: string[] = [];
  const terminator: string[] = [];

  for (let i = 0; i <= steps; i++) {
    const y = -r + (2 * r * i) / steps;
    const limb = Math.sqrt(Math.max(0, r * r - y * y));
    const ellipse = rx * Math.sqrt(Math.max(0, 1 - (y * y) / (r * r)));
    const limbX = side * limb;
    const termX = side * (gibbous ? -ellipse : ellipse);
    lit.push(`${i === 0 ? 'M' : 'L'} ${limbX.toFixed(2)} ${y.toFixed(2)}`);
    terminator.push(`L ${termX.toFixed(2)} ${y.toFixed(2)}`);
  }

  return `${lit.join(' ')} ${terminator.reverse().join(' ')} Z`;
}
