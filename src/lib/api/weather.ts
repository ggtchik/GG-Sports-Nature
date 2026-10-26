import type { WeatherCurrent, WeatherDaily, WeatherData, WeatherHourly } from '../../types';
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

const num = (bag: RawBag | undefined, key: string, fallback = Number.NaN): number => {
  const value = bag?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const str = (bag: RawBag | undefined, key: string, fallback = ''): string => {
  const value = bag?.[key];
  return typeof value === 'string' ? value : fallback;
};

const numArr = (bag: RawBag | undefined, key: string): number[] => {
  const value = bag?.[key];
  if (!Array.isArray(value)) return [];
  return value.map((item) => (typeof item === 'number' && Number.isFinite(item) ? item : Number.NaN));
};

const boolArr = (bag: RawBag | undefined, key: string): boolean[] => {
  const value = bag?.[key];
  if (!Array.isArray(value)) return [];
  return value.map((item) => item === 1 || item === true);
};

const strArr = (bag: RawBag | undefined, key: string): string[] => {
  const value = bag?.[key];
  if (!Array.isArray(value)) return [];
  return value.map((item) => (typeof item === 'string' ? item : ''));
};

const HOURLY_FIELDS = [
  'temperature_2m',
  'apparent_temperature',
  'precipitation_probability',
  'precipitation',
  'weather_code',
  'cloud_cover',
  'pressure_msl',
  'wind_speed_10m',
  'wind_gusts_10m',
  'wind_direction_10m',
  'relative_humidity_2m',
  'uv_index',
  'is_day',
];

const DAILY_FIELDS = [
  'weather_code',
  'temperature_2m_max',
  'temperature_2m_min',
  'sunrise',
  'sunset',
  'uv_index_max',
  'precipitation_sum',
  'precipitation_probability_max',
  'wind_speed_10m_max',
  'wind_gusts_10m_max',
  'wind_direction_10m_dominant',
  'pressure_msl_mean',
  'relative_humidity_2m_mean',
  'cloud_cover_mean',
];

export function weatherUrl(lat: number, lon: number): string {
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    timezone: 'auto',
    forecast_days: '7',
    forecast_hours: '48',
    wind_speed_unit: 'kmh',
    temperature_unit: 'celsius',
    precipitation_unit: 'mm',
    current:
      'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index,visibility,dew_point_2m',
    hourly: HOURLY_FIELDS.join(','),
    daily: DAILY_FIELDS.join(','),
  });
  return `${API.weather}?${params.toString()}`;
}

export function normalizeWeather(raw: RawResponse): WeatherData {
  const hourlyRaw = raw.hourly;
  const currentRaw = raw.current;
  const dailyRaw = raw.daily;

  const times = strArr(hourlyRaw, 'time');
  const temp = numArr(hourlyRaw, 'temperature_2m');
  const hourly: WeatherHourly = {
    time: times,
    temp,
    feels: numArr(hourlyRaw, 'apparent_temperature'),
    precipProb: numArr(hourlyRaw, 'precipitation_probability'),
    precip: numArr(hourlyRaw, 'precipitation'),
    code: numArr(hourlyRaw, 'weather_code'),
    cloud: numArr(hourlyRaw, 'cloud_cover'),
    pressure: numArr(hourlyRaw, 'pressure_msl'),
    wind: numArr(hourlyRaw, 'wind_speed_10m'),
    gust: numArr(hourlyRaw, 'wind_gusts_10m'),
    windDir: numArr(hourlyRaw, 'wind_direction_10m'),
    humidity: numArr(hourlyRaw, 'relative_humidity_2m'),
    uv: numArr(hourlyRaw, 'uv_index'),
    isDay: boolArr(hourlyRaw, 'is_day'),
  };

  // Fall back to the closest hourly slot when `current` is incomplete.
  const nowIndex = findNowIndex(hourly.time);
  const fallback = (key: keyof WeatherHourly, index: number): number => {
    const value = hourly[key][index];
    return typeof value === 'number' ? value : Number.NaN;
  };

  const current: WeatherCurrent = {
    time: str(currentRaw, 'time') || hourly.time[nowIndex] || new Date().toISOString(),
    temp: num(currentRaw, 'temperature_2m', fallback('temp', nowIndex)),
    feels: num(currentRaw, 'apparent_temperature', fallback('feels', nowIndex)),
    humidity: num(currentRaw, 'relative_humidity_2m', fallback('humidity', nowIndex)),
    dewPoint: num(currentRaw, 'dew_point_2m', Number.NaN),
    pressure: num(currentRaw, 'pressure_msl', fallback('pressure', nowIndex)),
    cloud: num(currentRaw, 'cloud_cover', fallback('cloud', nowIndex)),
    uv: num(currentRaw, 'uv_index', fallback('uv', nowIndex)),
    wind: num(currentRaw, 'wind_speed_10m', fallback('wind', nowIndex)),
    gust: num(currentRaw, 'wind_gusts_10m', fallback('gust', nowIndex)),
    windDir: num(currentRaw, 'wind_direction_10m', fallback('windDir', nowIndex)),
    precip: num(currentRaw, 'precipitation', fallback('precip', nowIndex)),
    code: num(currentRaw, 'weather_code', fallback('code', nowIndex)),
    isDay: num(currentRaw, 'is_day', 0) === 1,
    visibility: num(currentRaw, 'visibility', 20_000),
  };

  const daily: WeatherDaily = {
    time: strArr(dailyRaw, 'time'),
    code: numArr(dailyRaw, 'weather_code'),
    tMax: numArr(dailyRaw, 'temperature_2m_max'),
    tMin: numArr(dailyRaw, 'temperature_2m_min'),
    sunrise: strArr(dailyRaw, 'sunrise'),
    sunset: strArr(dailyRaw, 'sunset'),
    uv: numArr(dailyRaw, 'uv_index_max'),
    precipSum: numArr(dailyRaw, 'precipitation_sum'),
    precipProb: numArr(dailyRaw, 'precipitation_probability_max'),
    windMax: numArr(dailyRaw, 'wind_speed_10m_max'),
    gustMax: numArr(dailyRaw, 'wind_gusts_10m_max'),
    windDir: numArr(dailyRaw, 'wind_direction_10m_dominant'),
    pressure: numArr(dailyRaw, 'pressure_msl_mean'),
    humidity: numArr(dailyRaw, 'relative_humidity_2m_mean'),
    cloud: numArr(dailyRaw, 'cloud_cover_mean'),
  };

  return {
    latitude: raw.latitude ?? 0,
    longitude: raw.longitude ?? 0,
    timezone: raw.timezone ?? 'Europe/Paris',
    utcOffsetSeconds: raw.utc_offset_seconds ?? 3600,
    current,
    hourly,
    daily,
    fetchedAt: Date.now(),
  };
}

export async function fetchWeather(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<WeatherData> {
  const raw = await getJSON<RawResponse>(weatherUrl(lat, lon), { signal });
  return normalizeWeather(raw);
}

/** Index of the current (or next) hourly slot. */
export function findNowIndex(times: string[], now = new Date()): number {
  const target = now.getTime();
  let best = 0;
  let bestDelta = Infinity;
  for (let i = 0; i < times.length; i++) {
    const time = new Date(times[i]).getTime();
    if (!Number.isFinite(time)) continue;
    const delta = Math.abs(time - target);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = i;
    }
  }
  return best;
}

export function next24Hours(weather: WeatherData): number[] {
  const start = findNowIndex(weather.hourly.time);
  const end = Math.min(weather.hourly.time.length, start + 24);
  return Array.from({ length: Math.max(0, end - start) }, (_, i) => start + i);
}

export function next3HourlySlots(weather: WeatherData): number[] {
  const start = findNowIndex(weather.hourly.time);
  const end = Math.min(weather.hourly.time.length, start + 24);
  const slots: number[] = [];
  for (let i = start; i < end; i++) {
    if ((i - start) % 3 === 0) slots.push(i);
  }
  return slots;
}
