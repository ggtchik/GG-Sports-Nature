/**
 * Climatologie mensuelle — Open-Meteo Archive (ERA5, gratuit, sans clé).
 *
 * On récupère 12 mois de températures et de précipitations quotidiennes,
 * puis on agrège par mois pour la courbe d'évolution annuelle.
 */
import type { ClimateData, ClimateMonth } from '../../types';
import { getJSON } from './http';

export const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';

const DAILY_FIELDS = [
  'temperature_2m_mean',
  'temperature_2m_min',
  'temperature_2m_max',
  'precipitation_sum',
];

const shortFmt = new Intl.DateTimeFormat('fr-FR', { month: 'short' });
const labelFmt = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric' });

function iso(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Fenêtre glissante de 12 mois s'arrêtant avant le délai de publication de l'archive. */
export function climateWindow(now = new Date()): { startDate: string; endDate: string } {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 364);
  return { startDate: iso(start), endDate: iso(end) };
}

export function climateUrl(lat: number, lon: number, now = new Date()): string {
  const { startDate, endDate } = climateWindow(now);
  return `${ARCHIVE_URL}?${new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    start_date: startDate,
    end_date: endDate,
    daily: DAILY_FIELDS.join(','),
    timezone: 'auto',
  })}`;
}

interface RawClimate {
  latitude?: number;
  longitude?: number;
  daily?: {
    time?: string[];
    temperature_2m_mean?: (number | null)[];
    temperature_2m_min?: (number | null)[];
    temperature_2m_max?: (number | null)[];
    precipitation_sum?: (number | null)[];
  };
}

interface Bucket {
  key: string;
  sumMean: number;
  meanCount: number;
  min: number;
  max: number;
  rain: number;
  days: number;
  reference: Date;
}

const finite = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export async function fetchClimate(lat: number, lon: number, signal?: AbortSignal): Promise<ClimateData> {
  const { startDate, endDate } = climateWindow();
  const raw = await getJSON<RawClimate>(climateUrl(lat, lon), { signal });
  const daily = raw.daily;
  const times = daily?.time ?? [];
  if (!daily || times.length === 0) {
    throw new Error('Aucune donnée de climatologie disponible pour ce lieu');
  }

  const buckets = new Map<string, Bucket>();

  times.forEach((time, index) => {
    const [year, month] = time.split('-').map(Number);
    if (!year || !month) return;
    const key = `${year}-${String(month).padStart(2, '0')}`;
    const mean = daily.temperature_2m_mean?.[index];
    const min = daily.temperature_2m_min?.[index];
    const max = daily.temperature_2m_max?.[index];
    const rain = daily.precipitation_sum?.[index];

    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        key,
        sumMean: 0,
        meanCount: 0,
        min: Number.POSITIVE_INFINITY,
        max: Number.NEGATIVE_INFINITY,
        rain: 0,
        days: 0,
        reference: new Date(year, month - 1, 15),
      };
      buckets.set(key, bucket);
    }
    if (finite(mean)) {
      bucket.sumMean += mean;
      bucket.meanCount += 1;
      bucket.days += 1;
    }
    if (finite(min)) bucket.min = Math.min(bucket.min, min);
    if (finite(max)) bucket.max = Math.max(bucket.max, max);
    if (finite(rain)) bucket.rain += rain;
  });

  const months: ClimateMonth[] = [...buckets.values()]
    .filter((bucket) => bucket.meanCount >= 8)
    .sort((a, b) => a.key.localeCompare(b.key))
    .slice(-12)
    .map((bucket) => ({
      key: bucket.key,
      short: shortFmt.format(bucket.reference).replace('.', ''),
      label: labelFmt.format(bucket.reference),
      mean: bucket.sumMean / bucket.meanCount,
      min: Number.isFinite(bucket.min) ? bucket.min : Number.NaN,
      max: Number.isFinite(bucket.max) ? bucket.max : Number.NaN,
      rain: bucket.rain,
      days: bucket.days,
    }))
    .filter((month) => Number.isFinite(month.mean));

  if (months.length === 0) {
    throw new Error('Climatologie indisponible pour ce lieu');
  }

  return {
    months,
    latitude: typeof raw.latitude === 'number' ? raw.latitude : lat,
    longitude: typeof raw.longitude === 'number' ? raw.longitude : lon,
    startDate,
    endDate,
    fetchedAt: Date.now(),
  };
}
