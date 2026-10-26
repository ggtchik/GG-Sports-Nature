/**
 * Deterministic, clearly-labelled demo data used when the network is
 * unavailable or when the user explicitly enables demo mode.
 */
import { getMoonIllumination, getMoonTimes, getTimes } from 'suncalc';
import type {
  ClimateData,
  ClimateMonth,
  HydroData,
  HydroStation,
  MarineData,
  MarineHourly,
  WeatherDaily,
  WeatherData,
  WeatherHourly,
} from '../types';
import { computeSky } from './astro';
import { haversineKm, makeId } from './geo';

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFrom(lat: number, lon: number, salt = 0): number {
  const day = Math.floor(Date.now() / 86_400_000);
  return Math.abs(Math.round(lat * 1000) * 73856093 + Math.round(lon * 1000) * 19349663 + day * 83492791 + salt);
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function localISO(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function dayISO(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function seasonalBase(lat: number, date: Date): number {
  const doy = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86_400_000);
  const seasonal = 12.5 + 8.5 * Math.cos(((doy - 200) / 365) * Math.PI * 2);
  return seasonal + (47.5 - lat) * 0.55;
}

function cloudIcon(cloud: number, precip: number, isDay: boolean): number {
  if (!isDay) return cloud > 60 ? 3 : 0;
  if (precip > 2.5) return 63;
  if (precip > 0.4) return 61;
  if (cloud > 85) return 3;
  if (cloud > 55) return 2;
  if (cloud > 22) return 1;
  return 0;
}

export function demoWeather(lat: number, lon: number): WeatherData {
  const now = new Date();
  const day = startOfDay(now);
  const random = mulberry32(seedFrom(lat, lon, 11));
  const hourly: WeatherHourly = {
    time: [],
    temp: [],
    feels: [],
    precipProb: [],
    precip: [],
    code: [],
    cloud: [],
    pressure: [],
    wind: [],
    gust: [],
    windDir: [],
    humidity: [],
    uv: [],
    isDay: [],
  };

  const base = seasonalBase(lat, now);
  const cloudBase = 25 + random() * 50;
  const windBase = 6 + random() * 16;
  const windDirBase = random() * 360;
  const pressureBase = 1008 + random() * 16;
  let phase = random() * Math.PI * 2;

  for (let hour = 0; hour < 72; hour++) {
    const date = new Date(day.getTime() + hour * 3_600_000);
    const sun = getTimes(date, lat, lon);
    const daylight = sun.sunrise && sun.sunset && date >= sun.sunrise && date <= sun.sunset;
    const progress =
      sun.sunrise && sun.sunset
        ? Math.min(1, Math.max(0, (date.getTime() - sun.sunrise.getTime()) / (sun.sunset.getTime() - sun.sunrise.getTime())))
        : 0;
    phase += 0.12;
    const cloud = Math.max(0, Math.min(100, cloudBase + 26 * Math.sin(phase * 0.7) + (random() - 0.5) * 14));
    const rainBoost = cloud > 78 ? (cloud - 78) / 22 : 0;
    const precipProb = Math.round(Math.min(95, Math.max(2, cloud * 0.55 + rainBoost * 35)));
    const precip = rainBoost > 0.45 ? Math.round((rainBoost - 0.4) * 6 * 10) / 10 : 0;
    const diurnal = daylight ? Math.sin(progress * Math.PI) * 5.2 : -1.2;
    const temp = base + diurnal + (random() - 0.5) * 0.7;
    const humidity = Math.round(Math.min(98, Math.max(38, 94 - diurnal * 3.2 + (random() - 0.5) * 6)));
    const wind = Math.max(2, windBase + 5 * Math.sin(phase * 0.4) + (random() - 0.5) * 4);
    hourly.time.push(localISO(date));
    hourly.temp.push(Math.round(temp * 10) / 10);
    hourly.feels.push(Math.round((temp - (wind > 18 ? 1.4 : 0.4)) * 10) / 10);
    hourly.precipProb.push(precipProb);
    hourly.precip.push(precip);
    hourly.cloud.push(Math.round(cloud));
    hourly.pressure.push(Math.round(pressureBase + 4 * Math.sin(phase * 0.18)));
    hourly.wind.push(Math.round(wind));
    hourly.gust.push(Math.round(wind * (1.45 + random() * 0.35)));
    hourly.windDir.push(Math.round((windDirBase + 18 * Math.sin(phase * 0.25) + 360) % 360));
    hourly.humidity.push(humidity);
    hourly.uv.push(daylight ? Math.round(Math.sin(progress * Math.PI) * 5.6 * 10) / 10 : 0);
    hourly.isDay.push(Boolean(daylight));
    hourly.code.push(cloudIcon(cloud, precip, Boolean(daylight)));
  }

  const daily: WeatherDaily = {
    time: [],
    code: [],
    tMax: [],
    tMin: [],
    sunrise: [],
    sunset: [],
    uv: [],
    precipSum: [],
    precipProb: [],
    windMax: [],
    gustMax: [],
    windDir: [],
    pressure: [],
    humidity: [],
    cloud: [],
  };

  for (let offset = 0; offset < 7; offset++) {
    const date = new Date(day.getTime() + offset * 86_400_000);
    const sun = getTimes(date, lat, lon);
    const slice = hourly.time
      .map((time, index) => ({ time, index }))
      .filter((item) => item.time.startsWith(dayISO(date)));
    const temps = slice.map((item) => hourly.temp[item.index]);
    const clouds = slice.map((item) => hourly.cloud[item.index]);
    const rains = slice.map((item) => hourly.precipProb[item.index]);
    const winds = slice.map((item) => hourly.wind[item.index]);
    const gusts = slice.map((item) => hourly.gust[item.index]);
    const pressures = slice.map((item) => hourly.pressure[item.index]);
    const humidities = slice.map((item) => hourly.humidity[item.index]);
    const preps = slice.map((item) => hourly.precip[item.index]);
    const tMax = temps.length ? Math.max(...temps) + offset * 0.15 : base + 5;
    const tMin = temps.length ? Math.min(...temps) - offset * 0.1 : base - 4;
    const cloud = clouds.length ? clouds.reduce((a, b) => a + b, 0) / clouds.length : cloudBase;
    const rain = preps.length ? preps.reduce((a, b) => a + b, 0) : 0;
    daily.time.push(dayISO(date));
    daily.code.push(cloudIcon(cloud, rain, true));
    daily.tMax.push(Math.round(tMax * 10) / 10);
    daily.tMin.push(Math.round(tMin * 10) / 10);
    daily.sunrise.push(localISO(sun.sunrise ?? new Date(date.getTime() + 7 * 3_600_000)));
    daily.sunset.push(localISO(sun.sunset ?? new Date(date.getTime() + 19 * 3_600_000)));
    daily.uv.push(Math.round((5.2 - Math.abs(offset - 2) * 0.3) * 10) / 10);
    daily.precipSum.push(Math.round(rain * 10) / 10);
    daily.precipProb.push(rains.length ? Math.round(Math.max(...rains)) : 10);
    daily.windMax.push(winds.length ? Math.round(Math.max(...winds)) : Math.round(windBase));
    daily.gustMax.push(gusts.length ? Math.round(Math.max(...gusts)) : Math.round(windBase * 1.5));
    daily.windDir.push(hourly.windDir[offset * 24 + 12] ?? Math.round(windDirBase));
    daily.pressure.push(pressures.length ? Math.round(pressures.reduce((a, b) => a + b, 0) / pressures.length) : Math.round(pressureBase));
    daily.humidity.push(humidities.length ? Math.round(humidities.reduce((a, b) => a + b, 0) / humidities.length) : 72);
    daily.cloud.push(Math.round(cloud));
  }

  const index = Math.min(now.getHours(), hourly.time.length - 1);
  return {
    latitude: lat,
    longitude: lon,
    timezone: 'Europe/Paris',
    utcOffsetSeconds: -now.getTimezoneOffset() * 60,
    current: {
      time: hourly.time[index],
      temp: hourly.temp[index],
      feels: hourly.feels[index],
      humidity: hourly.humidity[index],
      dewPoint: hourly.temp[index] - (100 - hourly.humidity[index]) / 5,
      pressure: hourly.pressure[index],
      cloud: hourly.cloud[index],
      uv: hourly.uv[index],
      wind: hourly.wind[index],
      gust: hourly.gust[index],
      windDir: hourly.windDir[index],
      precip: hourly.precip[index],
      code: hourly.code[index],
      isDay: hourly.isDay[index],
      visibility: 24_000,
    },
    hourly,
    daily,
    fetchedAt: Date.now(),
  };
}

export function demoMarine(lat: number, lon: number): MarineData {
  const now = new Date();
  const day = startOfDay(now);
  const random = mulberry32(seedFrom(lat, lon, 23));
  const moon = getMoonIllumination(now);
  const moonTimes = getMoonTimes(now, lat, lon);
  const transit = moonTimes.transit ?? new Date(now.getTime() + 4 * 3_600_000);
  const springFactor = 0.55 + 0.5 * Math.abs(Math.cos(moon.phase * Math.PI * 2));
  const amplitude = 1.9 * springFactor;
  const waterTempBase = 14 + 4 * Math.cos(((now.getMonth() - 7) / 12) * Math.PI * 2) + (46 - lat) * 0.25;
  const waveBase = 0.9 + random() * 1.1;
  const periodBase = 6.5 + random() * 3.5;
  const direction = 250 + random() * 70;
  const swellDirection = direction - 10 + random() * 20;

  const hourly: MarineHourly = {
    time: [],
    wave: [],
    wavePeriod: [],
    waveDir: [],
    swell: [],
    swellPeriod: [],
    swellDir: [],
    windWave: [],
    waterTemp: [],
    seaLevel: [],
  };

  for (let hour = 0; hour < 96; hour++) {
    const date = new Date(day.getTime() + hour * 3_600_000);
    const hoursSinceTransit = (date.getTime() - transit.getTime()) / 3_600_000;
    const tide =
      amplitude * Math.cos((hoursSinceTransit / 12.4206) * Math.PI * 2) +
      0.18 * Math.cos((hoursSinceTransit / 24) * Math.PI * 2 + 0.8) +
      0.06 * Math.sin((hoursSinceTransit / 6.2) * Math.PI * 2);
    const wave = Math.max(0.1, waveBase + 0.5 * Math.sin(hour / 9) + (random() - 0.5) * 0.15);
    const swell = wave * (0.55 + random() * 0.2);
    hourly.time.push(localISO(date));
    hourly.wave.push(Math.round(wave * 100) / 100);
    hourly.wavePeriod.push(Math.round((periodBase + Math.sin(hour / 12) * 1.1) * 10) / 10);
    hourly.waveDir.push(Math.round((direction + Math.sin(hour / 15) * 8 + 360) % 360));
    hourly.swell.push(Math.round(swell * 100) / 100);
    hourly.swellPeriod.push(Math.round((periodBase + 1.6 + Math.cos(hour / 16)) * 10) / 10);
    hourly.swellDir.push(Math.round((swellDirection + 360) % 360));
    hourly.windWave.push(Math.round(Math.max(0.1, wave - swell) * 100) / 100);
    hourly.waterTemp.push(Math.round((waterTempBase + Math.sin(hour / 24) * 0.25) * 10) / 10);
    hourly.seaLevel.push(Math.round(tide * 100) / 100);
  }

  const daily = {
    time: [] as string[],
    waveMax: [] as (number | null)[],
    wavePeriodMax: [] as (number | null)[],
    waveDir: [] as (number | null)[],
    swellMax: [] as (number | null)[],
    swellPeriodMax: [] as (number | null)[],
    swellDir: [] as (number | null)[],
    waterTempMax: [] as (number | null)[],
    waterTempMin: [] as (number | null)[],
  };

  for (let offset = 0; offset < 7; offset++) {
    const date = new Date(day.getTime() + offset * 86_400_000);
    const key = dayISO(date);
    const indexes = hourly.time
      .map((time, index) => ({ time, index }))
      .filter((item) => item.time.startsWith(key))
      .map((item) => item.index);
    const take = (arr: (number | null)[], fn: 'max' | 'min' | 'avg') => {
      const values = indexes.map((i) => arr[i]).filter((v): v is number => v !== null);
      if (!values.length) return null;
      if (fn === 'max') return Math.max(...values);
      if (fn === 'min') return Math.min(...values);
      return values.reduce((a, b) => a + b, 0) / values.length;
    };
    daily.time.push(key);
    daily.waveMax.push(take(hourly.wave, 'max'));
    daily.wavePeriodMax.push(take(hourly.wavePeriod, 'max'));
    daily.waveDir.push(take(hourly.waveDir, 'avg'));
    daily.swellMax.push(take(hourly.swell, 'max'));
    daily.swellPeriodMax.push(take(hourly.swellPeriod, 'max'));
    daily.swellDir.push(take(hourly.swellDir, 'avg'));
    daily.waterTempMax.push(take(hourly.waterTemp, 'max'));
    daily.waterTempMin.push(take(hourly.waterTemp, 'min'));
  }

  return {
    latitude: lat,
    longitude: lon,
    timezone: 'Europe/Paris',
    utcOffsetSeconds: -now.getTimezoneOffset() * 60,
    current: {
      time: hourly.time[now.getHours()],
      wave: hourly.wave[now.getHours()] ?? null,
      wavePeriod: hourly.wavePeriod[now.getHours()] ?? null,
      waveDir: hourly.waveDir[now.getHours()] ?? null,
      swell: hourly.swell[now.getHours()] ?? null,
      swellPeriod: hourly.swellPeriod[now.getHours()] ?? null,
      swellDir: hourly.swellDir[now.getHours()] ?? null,
      waterTemp: hourly.waterTemp[now.getHours()] ?? null,
    },
    hourly,
    daily,
    hasData: true,
    fetchedAt: Date.now(),
  };
}

const DEMO_RIVERS = [
  'Le Grand Ruisseau',
  'La Rivière du Moulin',
  'Le Canal des Prés',
  'L’Affluent Nord',
  'La Source du Vallon',
];

export function demoHydro(lat: number, lon: number, placeName: string): HydroData {
  const now = Date.now();
  const random = mulberry32(seedFrom(lat, lon, 37));
  const stations: HydroStation[] = DEMO_RIVERS.map((river, index) => {
    const angle = (index / DEMO_RIVERS.length) * Math.PI * 2;
    const distance = 3.5 + index * 4.2 + random() * 2;
    const stationLat = lat + Math.cos(angle) * (distance / 111);
    const stationLon = lon + Math.sin(angle) * (distance / 85);
    const baseHeight = 0.8 + index * 0.35 + random() * 0.5;
    const baseFlow = 4 + index * 3.5 + random() * 3;
    const heightHistory = Array.from({ length: 24 }, (_, i) => ({
      t: now - (23 - i) * 20 * 60_000,
      v: Math.max(0.05, baseHeight + Math.sin(i / 3 + index) * 0.08 + (random() - 0.5) * 0.03),
    }));
    const flowHistory = Array.from({ length: 24 }, (_, i) => ({
      t: now - (23 - i) * 20 * 60_000,
      v: Math.max(0.1, baseFlow + Math.sin(i / 4 + index) * 0.6 + (random() - 0.5) * 0.3),
    }));
    const code = `DEMO${(index + 1).toString().padStart(3, '0')}`;
    return {
      code,
      siteCode: code,
      name: `${river} à ${placeName}`,
      river,
      commune: placeName,
      department: 'Démonstration',
      lat: stationLat,
      lon: stationLon,
      distanceKm: haversineKm({ lat, lon }, { lat: stationLat, lon: stationLon }),
      height: {
        value: heightHistory[heightHistory.length - 1].v,
        date: new Date(now - 4 * 60_000).toISOString(),
      },
      flow: {
        value: flowHistory[flowHistory.length - 1].v,
        date: new Date(now - 6 * 60_000).toISOString(),
      },
      heightHistory,
      flowHistory,
      vigicruesUrl: 'https://www.vigicrues.gouv.fr/',
      hydroportailUrl: 'https://hydro.eaufrance.fr/',
    };
  });
  return { stations, radiusKm: 45, hasFlow: true, fetchedAt: Date.now() };
}

export function demoSpotId(): string {
  return makeId('demo');
}

export function demoSky(lat: number, lon: number) {
  return computeSky(lat, lon, new Date());
}

/* ------------------------------------------------------------------ climat */

const monthShort = new Intl.DateTimeFormat('fr-FR', { month: 'short' });
const monthLong = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric' });

export function demoClimate(lat: number, lon: number): ClimateData {
  const now = new Date();
  const random = mulberry32(seedFrom(lat, lon, 23));
  const months: ClimateMonth[] = [];

  for (let offset = 11; offset >= 0; offset--) {
    const reference = new Date(now.getFullYear(), now.getMonth() - offset, 15);
    const base = seasonalBase(lat, reference);
    const mean = base + (random() - 0.5) * 1.6;
    const annual = Math.sin(((reference.getMonth() + 0.5) / 12) * Math.PI * 2 - 0.4);
    months.push({
      key: `${reference.getFullYear()}-${pad(reference.getMonth() + 1)}`,
      short: monthShort.format(reference).replace('.', ''),
      label: monthLong.format(reference),
      mean,
      min: mean - 4.4 - random() * 1.6,
      max: mean + 4.8 + random() * 1.8,
      rain: Math.max(3, 58 - annual * 22 + (random() - 0.5) * 26),
      days: new Date(reference.getFullYear(), reference.getMonth() + 1, 0).getDate(),
    });
  }

  const first = months[0];
  const last = months[months.length - 1];
  const [fy, fm] = first.key.split('-').map(Number);
  const [ly, lm] = last.key.split('-').map(Number);

  return {
    months,
    latitude: lat,
    longitude: lon,
    startDate: dayISO(new Date(fy, fm - 1, 1)),
    endDate: dayISO(new Date(ly, lm, 0)),
    fetchedAt: Date.now(),
  };
}
