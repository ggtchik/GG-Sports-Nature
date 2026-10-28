/**
 * Open-Meteo — API météo, marine (houle, vagues, SST, niveau de la mer).
 *
 * Conditions d'utilisation : gratuit pour un usage non commercial
 * (< 10 000 appels/jour), aucune clé requise, données sous licence CC BY 4.0,
 * attribution obligatoire (affichée dans l'application).
 * Fréquence réelle : voir core/sources.ts (les modèles ne sont pas « temps
 * réel » ; l'horodatage renvoyé par l'API est affiché tel quel).
 */
import type {
  GeoPoint,
  MarineBundle,
  MarineCurrent,
  MarineDay,
  MarineHour,
  WeatherBundle,
  WeatherCurrent,
  WeatherDay,
  WeatherHour,
} from '../core/types';
import { getJson } from './http';

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const MARINE_URL = 'https://marine-api.open-meteo.com/v1/marine';

type Num = number | null | undefined;

const n = (v: Num): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const s = (v: string | null | undefined): string | null => (typeof v === 'string' && v ? v : null);

interface RawForecast {
  latitude: number;
  longitude: number;
  timezone: string;
  utc_offset_seconds: number;
  elevation?: number;
  current_units?: Record<string, string>;
  current?: Record<string, Num | string>;
  hourly?: Record<string, (number | string | null)[]>;
  daily?: Record<string, (number | string | null)[]>;
}

function buildUrl(base: string, point: GeoPoint, params: Record<string, string>): string {
  const url = new URL(base);
  url.searchParams.set('latitude', String(point.lat));
  url.searchParams.set('longitude', String(point.lon));
  url.searchParams.set('timezone', 'auto');
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
}

const FORECAST_PARAMS: Record<string, string> = {
  current: [
    'temperature_2m',
    'apparent_temperature',
    'relative_humidity_2m',
    'is_day',
    'precipitation',
    'precipitation_probability',
    'weather_code',
    'cloud_cover',
    'pressure_msl',
    'wind_speed_10m',
    'wind_direction_10m',
    'wind_gusts_10m',
    'uv_index',
    'visibility',
  ].join(','),
  hourly: [
    'temperature_2m',
    'apparent_temperature',
    'precipitation_probability',
    'precipitation',
    'weather_code',
    'cloud_cover',
    'wind_speed_10m',
    'wind_direction_10m',
    'wind_gusts_10m',
    'uv_index',
    'relative_humidity_2m',
  ].join(','),
  daily: [
    'weather_code',
    'temperature_2m_max',
    'temperature_2m_min',
    'precipitation_sum',
    'precipitation_probability_max',
    'wind_speed_10m_max',
    'wind_gusts_10m_max',
    'wind_direction_10m_dominant',
    'uv_index_max',
    'sunrise',
    'sunset',
    'daylight_duration',
  ].join(','),
  wind_speed_unit: 'kmh',
  precipitation_unit: 'mm',
  forecast_days: '7',
  models: 'best_match',
};

export async function fetchWeather(point: GeoPoint, signal?: AbortSignal): Promise<WeatherBundle> {
  const raw = await getJson<RawForecast>(buildUrl(FORECAST_URL, point, FORECAST_PARAMS), { signal });
  if (!raw.current || !raw.hourly || !raw.daily) {
    throw new Error('Structure de réponse météo inattendue');
  }

  const times = (raw.hourly.time ?? []) as string[];
  const hourly: WeatherHour[] = times.map((time, i) => ({
    time,
    weatherCode: n(raw.hourly?.weather_code?.[i] as Num),
    temperature: n(raw.hourly?.temperature_2m?.[i] as Num),
    apparent: n(raw.hourly?.apparent_temperature?.[i] as Num),
    precipitationProbability: n(raw.hourly?.precipitation_probability?.[i] as Num),
    precipitation: n(raw.hourly?.precipitation?.[i] as Num),
    cloudCover: n(raw.hourly?.cloud_cover?.[i] as Num),
    windSpeed: n(raw.hourly?.wind_speed_10m?.[i] as Num),
    windGust: n(raw.hourly?.wind_gusts_10m?.[i] as Num),
    windDirection: n(raw.hourly?.wind_direction_10m?.[i] as Num),
    uvIndex: n(raw.hourly?.uv_index?.[i] as Num),
    humidity: n(raw.hourly?.relative_humidity_2m?.[i] as Num),
  }));

  const days = (raw.daily.time ?? []) as string[];
  const daily: WeatherDay[] = days.map((date, i) => ({
    date,
    weatherCode: n(raw.daily?.weather_code?.[i] as Num),
    temperatureMax: n(raw.daily?.temperature_2m_max?.[i] as Num),
    temperatureMin: n(raw.daily?.temperature_2m_min?.[i] as Num),
    precipitationSum: n(raw.daily?.precipitation_sum?.[i] as Num),
    precipitationProbability: n(raw.daily?.precipitation_probability_max?.[i] as Num),
    windSpeedMax: n(raw.daily?.wind_speed_10m_max?.[i] as Num),
    windGustsMax: n(raw.daily?.wind_gusts_10m_max?.[i] as Num),
    windDirectionDominant: n(raw.daily?.wind_direction_10m_dominant?.[i] as Num),
    uvIndexMax: n(raw.daily?.uv_index_max?.[i] as Num),
    sunrise: s(raw.daily?.sunrise?.[i] as string),
    sunset: s(raw.daily?.sunset?.[i] as string),
    daylightDurationS: n(raw.daily?.daylight_duration?.[i] as Num),
  }));

  const current: WeatherCurrent = {
    time: String(raw.current.time ?? ''),
    temperature: n(raw.current.temperature_2m as Num),
    apparent: n(raw.current.apparent_temperature as Num),
    humidity: n(raw.current.relative_humidity_2m as Num),
    cloudCover: n(raw.current.cloud_cover as Num),
    precipitation: n(raw.current.precipitation as Num),
    precipitationProbability: n(raw.current.precipitation_probability as Num),
    pressure: n(raw.current.pressure_msl as Num),
    windSpeed: n(raw.current.wind_speed_10m as Num),
    windGust: n(raw.current.wind_gusts_10m as Num),
    windDirection: n(raw.current.wind_direction_10m as Num),
    uvIndex: n(raw.current.uv_index as Num),
    weatherCode: n(raw.current.weather_code as Num),
    isDay: raw.current.is_day === 1 ? true : raw.current.is_day === 0 ? false : null,
    visibility: n(raw.current.visibility as Num),
  };

  return {
    timezone: raw.timezone,
    utcOffsetSeconds: raw.utc_offset_seconds,
    elevationM: n(raw.elevation),
    current,
    hourly,
    daily,
    currentTime: current.time,
    model: 'best_match (modèles nationaux, résolution locale)',
  };
}

interface RawMarine {
  timezone: string;
  utc_offset_seconds: number;
  current?: Record<string, Num | string>;
  hourly?: Record<string, (number | string | null)[]>;
  daily?: Record<string, (number | string | null)[]>;
}

const MARINE_PARAMS: Record<string, string> = {
  current: [
    'wave_height',
    'wave_period',
    'wave_direction',
    'swell_wave_height',
    'swell_wave_period',
    'swell_wave_direction',
    'sea_surface_temperature',
    'sea_level_height_msl',
  ].join(','),
  hourly: [
    'sea_level_height_msl',
    'wave_height',
    'wave_period',
    'wave_direction',
    'swell_wave_height',
    'swell_wave_period',
    'swell_wave_direction',
    'sea_surface_temperature',
  ].join(','),
  daily: [
    'wave_height_max',
    'wave_direction_dominant',
    'wave_period_max',
    'swell_wave_height_max',
    'swell_wave_direction_dominant',
    'swell_wave_period_max',
  ].join(','),
  forecast_days: '7',
  length_unit: 'metric',
};

export async function fetchMarine(point: GeoPoint, signal?: AbortSignal): Promise<MarineBundle> {
  const raw = await getJson<RawMarine>(buildUrl(MARINE_URL, point, MARINE_PARAMS), { signal });
  if (!raw.current || !raw.hourly || !raw.daily) {
    throw new Error('Structure de réponse marine inattendue');
  }

  const times = (raw.hourly.time ?? []) as string[];
  const hourly: MarineHour[] = times.map((time, i) => ({
    time,
    waveHeight: n(raw.hourly?.wave_height?.[i] as Num),
    wavePeriod: n(raw.hourly?.wave_period?.[i] as Num),
    waveDirection: n(raw.hourly?.wave_direction?.[i] as Num),
    swellHeight: n(raw.hourly?.swell_wave_height?.[i] as Num),
    swellPeriod: n(raw.hourly?.swell_wave_period?.[i] as Num),
    swellDirection: n(raw.hourly?.swell_wave_direction?.[i] as Num),
    seaLevelHeight: n(raw.hourly?.sea_level_height_msl?.[i] as Num),
    seaSurfaceTemperature: n(raw.hourly?.sea_surface_temperature?.[i] as Num),
  }));

  const days = (raw.daily.time ?? []) as string[];
  const daily: MarineDay[] = days.map((date, i) => ({
    date,
    waveHeightMax: n(raw.daily?.wave_height_max?.[i] as Num),
    waveDirectionDominant: n(raw.daily?.wave_direction_dominant?.[i] as Num),
    wavePeriodMax: n(raw.daily?.wave_period_max?.[i] as Num),
    swellHeightMax: n(raw.daily?.swell_wave_height_max?.[i] as Num),
    swellDirectionDominant: n(raw.daily?.swell_wave_direction_dominant?.[i] as Num),
    swellPeriodMax: n(raw.daily?.swell_wave_period_max?.[i] as Num),
  }));

  const current: MarineCurrent = {
    time: String(raw.current.time ?? ''),
    waveHeight: n(raw.current.wave_height as Num),
    wavePeriod: n(raw.current.wave_period as Num),
    waveDirection: n(raw.current.wave_direction as Num),
    swellHeight: n(raw.current.swell_wave_height as Num),
    swellPeriod: n(raw.current.swell_wave_period as Num),
    swellDirection: n(raw.current.swell_wave_direction as Num),
    seaSurfaceTemperature: n(raw.current.sea_surface_temperature as Num),
    seaLevelHeight: n(raw.current.sea_level_height_msl as Num),
  };

  return {
    timezone: raw.timezone,
    utcOffsetSeconds: raw.utc_offset_seconds,
    current,
    hourly,
    daily,
  };
}
