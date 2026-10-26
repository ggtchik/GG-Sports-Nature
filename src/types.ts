/** Shared domain types for GG Sports Nature. */

export type ActivityId =
  | 'balade'
  | 'randonnee'
  | 'jogging'
  | 'natation'
  | 'voile'
  | 'peche'
  | 'chasse';

/** Manual context override chosen per spot. */
export type WaterMode = 'auto' | 'mer' | 'douce';
/** Context actually used to render the dashboard. */
export type Environment = 'mer' | 'douce';

export type Accent = 'sage' | 'terracotta' | 'amber' | 'ocean' | 'indigo' | 'clay' | 'moss';

export type ActivityFamily = 'terrestre' | 'nautique' | 'aquatique' | 'halieutique' | 'cynegetique';

export interface ActivityDef {
  id: ActivityId;
  label: string;
  tagline: string;
  family: ActivityFamily;
  familyLabel: string;
  /** True when the activity requires resolving sea / fresh water. */
  water: boolean;
  accent: Accent;
  description: string;
  /** What the dashboard will surface for this activity. */
  highlights: string[];
}

export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface Spot extends GeoPoint {
  id: string;
  name: string;
  detail?: string;
  postcode?: string;
  country?: string;
  mode: WaterMode;
  note?: string;
  saved: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface BasePosition extends GeoPoint {
  label: string;
  source: 'gps' | 'manuel' | 'defaut';
  accuracy?: number;
  updatedAt: number;
}

/* ------------------------------------------------------------------ weather */

export interface WeatherCurrent {
  time: string;
  temp: number;
  feels: number;
  humidity: number;
  dewPoint: number;
  pressure: number;
  cloud: number;
  uv: number;
  wind: number;
  gust: number;
  windDir: number;
  precip: number;
  code: number;
  isDay: boolean;
  visibility: number;
}

export interface WeatherHourly {
  time: string[];
  temp: number[];
  feels: number[];
  precipProb: number[];
  precip: number[];
  code: number[];
  cloud: number[];
  pressure: number[];
  wind: number[];
  gust: number[];
  windDir: number[];
  humidity: number[];
  uv: number[];
  isDay: boolean[];
}

export interface WeatherDaily {
  time: string[];
  code: number[];
  tMax: number[];
  tMin: number[];
  sunrise: string[];
  sunset: string[];
  uv: number[];
  precipSum: number[];
  precipProb: number[];
  windMax: number[];
  gustMax: number[];
  windDir: number[];
  pressure: number[];
  humidity: number[];
  cloud: number[];
}

export interface WeatherData {
  latitude: number;
  longitude: number;
  timezone: string;
  utcOffsetSeconds: number;
  current: WeatherCurrent;
  hourly: WeatherHourly;
  daily: WeatherDaily;
  fetchedAt: number;
}

/* ------------------------------------------------------------------- marine */

type Nullable = number | null;

export interface MarineCurrent {
  time: string;
  wave: Nullable;
  wavePeriod: Nullable;
  waveDir: Nullable;
  swell: Nullable;
  swellPeriod: Nullable;
  swellDir: Nullable;
  waterTemp: Nullable;
}

export interface MarineHourly {
  time: string[];
  wave: Nullable[];
  wavePeriod: Nullable[];
  waveDir: Nullable[];
  swell: Nullable[];
  swellPeriod: Nullable[];
  swellDir: Nullable[];
  windWave: Nullable[];
  waterTemp: Nullable[];
  seaLevel: Nullable[];
}

export interface MarineDaily {
  time: string[];
  waveMax: Nullable[];
  wavePeriodMax: Nullable[];
  waveDir: Nullable[];
  swellMax: Nullable[];
  swellPeriodMax: Nullable[];
  swellDir: Nullable[];
  waterTempMax: Nullable[];
  waterTempMin: Nullable[];
}

export interface MarineData {
  latitude: number;
  longitude: number;
  timezone: string;
  utcOffsetSeconds: number;
  current: MarineCurrent;
  hourly: MarineHourly;
  daily: MarineDaily;
  hasData: boolean;
  fetchedAt: number;
}

/* -------------------------------------------------------------------- tides */

export interface PortRef {
  name: string;
  region: 'Manche' | 'Atlantique' | 'Méditerranée';
  lat: number;
  lon: number;
}

export interface TideEvent {
  time: Date;
  type: 'haute' | 'basse';
  height: number;
  coefficient: number;
}

export interface TideInfo {
  available: boolean;
  events: TideEvent[];
  nextHigh: TideEvent | null;
  nextLow: TideEvent | null;
  curve: { time: Date; height: number }[];
  range: number | null;
  coefficient: number | null;
  port: PortRef | null;
  portDistanceKm: number | null;
  heightReference: 'msl';
  note?: string;
}

/* --------------------------------------------------------------------- hydro */

export interface HydroReading {
  value: number;
  date: string;
}

export interface HydroStation {
  code: string;
  siteCode: string;
  name: string;
  river: string | null;
  commune: string | null;
  department: string | null;
  lat: number;
  lon: number;
  distanceKm: number;
  height: HydroReading | null;
  flow: HydroReading | null;
  heightHistory: { t: number; v: number }[];
  flowHistory: { t: number; v: number }[];
  vigicruesUrl: string;
  hydroportailUrl: string;
}

export interface HydroData {
  stations: HydroStation[];
  radiusKm: number;
  hasFlow: boolean;
  fetchedAt: number;
}

/* ---------------------------------------------------------------- coastline */

export interface CoastInfo {
  distanceKm: number | null;
  covered: boolean;
}

/* ------------------------------------------------------------------- budget */

export interface BudgetSettings {
  roundTrip: boolean;
  consumption: number;
  fuelPrice: number;
  tollPerKm: number;
  wearPerKm: number;
  /** null = automatic (an overnight stay is added for long trips). */
  nights: number | null;
  lodging: number;
  mealsPerDay: number;
  travelers: number;
}

export interface BudgetLine {
  id: 'fuel' | 'tolls' | 'wear' | 'lodging' | 'meals';
  label: string;
  detail: string;
  amount: number;
}

export interface BudgetResult {
  straightKm: number;
  roadKmOneWay: number;
  roadKmTotal: number;
  driveMinutesOneWay: number;
  nights: number;
  autoNight: boolean;
  lines: BudgetLine[];
  total: number;
  perPerson: number;
  tollsApplied: boolean;
}

/* ------------------------------------------------------------------ sources */

export interface SourceLink {
  id: string;
  name: string;
  role: string;
  description: string;
  url: string;
  tag: 'météo' | 'marée' | 'houle' | 'rivière' | 'carte' | 'officiel';
}

/* ------------------------------------------------------------------- climat */

export interface ClimateMonth {
  /** Clé `AAAA-MM`. */
  key: string;
  /** Libellé court pour les graphiques (« janv. »). */
  short: string;
  /** Libellé complet (« janv. 2026 »). */
  label: string;
  /** Température moyenne mensuelle (°C). */
  mean: number;
  min: number;
  max: number;
  /** Cumul mensuel de précipitations (mm). */
  rain: number;
  /** Nombre de jours observés dans le mois. */
  days: number;
}

export interface ClimateData {
  months: ClimateMonth[];
  latitude: number;
  longitude: number;
  startDate: string;
  endDate: string;
  fetchedAt: number;
}
