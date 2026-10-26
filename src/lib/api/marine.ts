import type { MarineCurrent, MarineDaily, MarineData, MarineHourly } from '../../types';
import { API, getJSON } from './http';

type RawBag = Record<string, unknown>;

interface RawResponse {
  latitude?: number;
  longitude?: number;
  timezone?: string;
  utc_offset_seconds?: number;
  current?: RawBag;
  hourly?: RawBag;
  daily?: RawBag;
}

const nullableArr = (bag: RawBag | undefined, key: string): (number | null)[] => {
  const value = bag?.[key];
  if (!Array.isArray(value)) return [];
  return value.map((item) =>
    typeof item === 'number' && Number.isFinite(item) ? item : null,
  );
};

const nullable = (bag: RawBag | undefined, key: string): number | null => {
  const value = bag?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

const strArr = (bag: RawBag | undefined, key: string): string[] => {
  const value = bag?.[key];
  return Array.isArray(value) ? value.map((item) => (typeof item === 'string' ? item : '')) : [];
};

const HOURLY_FIELDS = [
  'wave_height',
  'wave_period',
  'wave_direction',
  'swell_wave_height',
  'swell_wave_period',
  'swell_wave_direction',
  'wind_wave_height',
  'sea_surface_temperature',
  'sea_level_height_msl',
];

const DAILY_FIELDS = [
  'wave_height_max',
  'wave_period_max',
  'wave_direction_dominant',
  'swell_wave_height_max',
  'swell_wave_period_max',
  'swell_wave_direction_dominant',
];

export function marineUrl(lat: number, lon: number): string {
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    timezone: 'auto',
    forecast_days: '7',
    forecast_hours: '96',
    current:
      'wave_height,wave_period,wave_direction,swell_wave_height,swell_wave_period,swell_wave_direction,sea_surface_temperature',
    hourly: HOURLY_FIELDS.join(','),
    daily: DAILY_FIELDS.join(','),
  });
  return `${API.marine}?${params.toString()}`;
}

export function normalizeMarine(raw: RawResponse): MarineData {
  const hourlyRaw = raw.hourly;
  const currentRaw = raw.current;
  const dailyRaw = raw.daily;

  const hourly: MarineHourly = {
    time: strArr(hourlyRaw, 'time'),
    wave: nullableArr(hourlyRaw, 'wave_height'),
    wavePeriod: nullableArr(hourlyRaw, 'wave_period'),
    waveDir: nullableArr(hourlyRaw, 'wave_direction'),
    swell: nullableArr(hourlyRaw, 'swell_wave_height'),
    swellPeriod: nullableArr(hourlyRaw, 'swell_wave_period'),
    swellDir: nullableArr(hourlyRaw, 'swell_wave_direction'),
    windWave: nullableArr(hourlyRaw, 'wind_wave_height'),
    waterTemp: nullableArr(hourlyRaw, 'sea_surface_temperature'),
    seaLevel: nullableArr(hourlyRaw, 'sea_level_height_msl'),
  };

  const current: MarineCurrent = {
    time: typeof currentRaw?.time === 'string' ? currentRaw.time : hourly.time[0] ?? '',
    wave: nullable(currentRaw, 'wave_height'),
    wavePeriod: nullable(currentRaw, 'wave_period'),
    waveDir: nullable(currentRaw, 'wave_direction'),
    swell: nullable(currentRaw, 'swell_wave_height'),
    swellPeriod: nullable(currentRaw, 'swell_wave_period'),
    swellDir: nullable(currentRaw, 'swell_wave_direction'),
    waterTemp: nullable(currentRaw, 'sea_surface_temperature'),
  };

  const daily: MarineDaily = {
    time: strArr(dailyRaw, 'time'),
    waveMax: nullableArr(dailyRaw, 'wave_height_max'),
    wavePeriodMax: nullableArr(dailyRaw, 'wave_period_max'),
    waveDir: nullableArr(dailyRaw, 'wave_direction_dominant'),
    swellMax: nullableArr(dailyRaw, 'swell_wave_height_max'),
    swellPeriodMax: nullableArr(dailyRaw, 'swell_wave_period_max'),
    swellDir: nullableArr(dailyRaw, 'swell_wave_direction_dominant'),
    // Daily water temperature is derived client-side from the hourly series.
    waterTempMax: [],
    waterTempMin: [],
  };

  const hasData = [
    ...hourly.wave,
    ...hourly.seaLevel,
    ...hourly.waterTemp,
    ...hourly.swell,
  ].some((value) => value !== null);

  return {
    latitude: raw.latitude ?? 0,
    longitude: raw.longitude ?? 0,
    timezone: raw.timezone ?? 'Europe/Paris',
    utcOffsetSeconds: raw.utc_offset_seconds ?? 3600,
    current,
    hourly,
    daily,
    hasData,
    fetchedAt: Date.now(),
  };
}

export async function fetchMarine(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<MarineData> {
  const raw = await getJSON<RawResponse>(marineUrl(lat, lon), { signal });
  return normalizeMarine(raw);
}

/** Daily min/max sea temperature computed from the hourly series. */
export function dailyWaterTemperature(marine: MarineData): { max: (number | null)[]; min: (number | null)[] } {
  return marine.daily.time.map((day) => {
    const values: number[] = [];
    marine.hourly.time.forEach((time, index) => {
      if (!time.startsWith(day)) return;
      const value = marine.hourly.waterTemp[index];
      if (value !== null) values.push(value);
    });
    if (!values.length) return { max: null, min: null };
    return { max: Math.max(...values), min: Math.min(...values) };
  }).reduce<{ max: (number | null)[]; min: (number | null)[] }>(
    (acc, day) => {
      acc.max.push(day.max);
      acc.min.push(day.min);
      return acc;
    },
    { max: [], min: [] },
  );
}
