/**
 * Modèle de données de GG Sports-Nature.
 *
 * Règle structurante : toute valeur issue d'une API est conservée dans son
 * unité d'origine (km/h, m, hPa, °C, mm, m³/s…). Les conversions n'ont lieu
 * qu'à l'affichage (voir core/units.ts). Aucune donnée n'est inventée : chaque
 * module expose un état explicite (`ok`, `unavailable`, `error`) et sa source.
 */

export type UnitMode = 'standard' | 'nautical' | 'dual';
export type MilieuMode = 'auto' | 'mer' | 'eau_douce';
export type Milieu = 'mer' | 'eau_douce';

export type ActivityId =
  | 'balade'
  | 'randonnee'
  | 'jogging'
  | 'natation'
  | 'nautisme'
  | 'peche'
  | 'chasse';

export type LoadState = 'idle' | 'loading' | 'ok' | 'unavailable' | 'error';

export interface ModuleState<T> {
  state: LoadState;
  data: T | null;
  error?: string;
  /** Horodatage (ms) de la réception de la donnée. */
  fetchedAt?: number;
  /** Horodatage (ms) de la mesure/du calcul annoncé par la source. */
  measuredAt?: number;
}

export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface Spot extends GeoPoint {
  id: string;
  name: string;
  commune?: string;
  postcode?: string;
  /** Contexte imposé par l'utilisateur ; `auto` = détection géographique. */
  milieu: MilieuMode;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StartPosition extends GeoPoint {
  label: string;
  origin: 'geolocation' | 'manual' | 'spot';
  accuracyM?: number;
}

/* ------------------------------------------------------------------ météo */

export interface WeatherCurrent {
  time: string;
  temperature: number | null;
  apparent: number | null;
  humidity: number | null;
  cloudCover: number | null;
  precipitation: number | null;
  precipitationProbability: number | null;
  pressure: number | null;
  windSpeed: number | null;
  windGust: number | null;
  windDirection: number | null;
  uvIndex: number | null;
  weatherCode: number | null;
  isDay: boolean | null;
  visibility: number | null;
}

export interface WeatherHour {
  time: string;
  temperature: number | null;
  weatherCode: number | null;
  apparent: number | null;
  precipitationProbability: number | null;
  precipitation: number | null;
  cloudCover: number | null;
  windSpeed: number | null;
  windGust: number | null;
  windDirection: number | null;
  uvIndex: number | null;
  humidity: number | null;
}

export interface WeatherDay {
  date: string;
  weatherCode: number | null;
  temperatureMax: number | null;
  temperatureMin: number | null;
  precipitationSum: number | null;
  precipitationProbability: number | null;
  windSpeedMax: number | null;
  windGustsMax: number | null;
  windDirectionDominant: number | null;
  uvIndexMax: number | null;
  sunrise: string | null;
  sunset: string | null;
  daylightDurationS: number | null;
}

export interface WeatherBundle {
  timezone: string;
  utcOffsetSeconds: number;
  elevationM: number | null;
  current: WeatherCurrent;
  hourly: WeatherHour[];
  daily: WeatherDay[];
  /** Heure annoncée par le modèle pour la condition « actuelle ». */
  currentTime: string;
  model?: string;
}

/* ----------------------------------------------------------------- marine */

export interface MarineCurrent {
  time: string;
  waveHeight: number | null;
  wavePeriod: number | null;
  waveDirection: number | null;
  swellHeight: number | null;
  swellPeriod: number | null;
  swellDirection: number | null;
  seaSurfaceTemperature: number | null;
  seaLevelHeight: number | null;
}

export interface MarineHour {
  time: string;
  waveHeight: number | null;
  wavePeriod: number | null;
  waveDirection: number | null;
  swellHeight: number | null;
  swellPeriod: number | null;
  swellDirection: number | null;
  seaLevelHeight: number | null;
  seaSurfaceTemperature: number | null;
}

export interface MarineDay {
  date: string;
  waveHeightMax: number | null;
  waveDirectionDominant: number | null;
  wavePeriodMax: number | null;
  swellHeightMax: number | null;
  swellDirectionDominant: number | null;
  swellPeriodMax: number | null;
}

export interface MarineBundle {
  timezone: string;
  utcOffsetSeconds: number;
  current: MarineCurrent;
  hourly: MarineHour[];
  daily: MarineDay[];
}

/* ------------------------------------------------------------ hydrologie */

export interface HydroSample {
  at: string;
  value: number;
}

export interface HydroStation {
  code: string;
  /** Site hydrométrique SANDRE (les mesures peuvent être portées par le site). */
  siteCode?: string | null;
  name: string;
  river: string | null;
  commune: string | null;
  lat: number;
  lon: number;
  distanceKm: number;
  /** Hauteur d'eau en mètres. */
  height: HydroSample | null;
  /** Débit en m³/s. */
  flow: HydroSample | null;
  /** Historique de hauteur (m), du plus ancien au plus récent. */
  heightSeries: HydroSample[];
  /** Historique de débit (m³/s). */
  flowSeries: HydroSample[];
}

export interface HydroBundle {
  stations: HydroStation[];
  radiusKm: number;
  /** Nombre de stations candidates avant sélection des 5 plus proches. */
  candidateCount: number;
  /** Message explicite si les mesures n'ont pas pu être récupérées. */
  measurementError?: string | null;
}

/* ------------------------------------------------------------------ côte */

export interface CoastInfo {
  /** Distance au trait de côte le plus proche, en km. */
  distanceKm: number;
  source: 'osm' | 'natural-earth' | 'marine-probe';
  /** Précision annoncée de la source, en mètres. */
  precisionM: number;
  /** Nombre de segments pris en compte par la source. */
  detail: string;
  fetchedAt: number;
}

/* ----------------------------------------------------------------- marée */

export interface TideEvent {
  type: 'high' | 'low';
  /** Heure locale du spot, ISO sans fuseau (« 2026-10-28T06:12 »). */
  time: string;
  /** Hauteur d'eau en mètres (référentiel indiqué par `TideInfo.reference`). */
  height: number;
  /** Coefficient de marée, uniquement fourni par api-maree.fr sur les pleines mers. */
  coefficient?: number | null;
}

export interface TideInfo {
  events: TideEvent[];
  /** Marnage du jour en cours, en mètres. */
  range: number;
  /** Coefficient de marée : `null` si la source ne le fournit pas. */
  coefficient: number | null;
  coefficientEstimated: boolean;
  series: { time: string; height: number }[];
  reference: 'MSL' | 'ZH';
  source: 'open-meteo-model' | 'api-maree';
  /** Port de référence (api-maree) ou modèle utilisé. */
  stationLabel: string;
  attribution: string;
}

/* --------------------------------------------------------------- trajets */

export interface RouteInfo {
  distanceKm: number;
  /** `null` lorsque seule une distance à vol d'oiseau est disponible. */
  durationMin: number | null;
  source: 'osrm' | 'haversine';
  profile: 'driving';
}

/* ------------------------------------------------------------- résultats */

export interface SearchResult extends GeoPoint {
  label: string;
  name: string;
  commune?: string;
  postcode?: string;
  type: string;
  source: 'BAN' | 'Nominatim' | 'Open-Meteo';
  score?: number;
}

export interface DashboardData {
  weather: ModuleState<WeatherBundle>;
  marine: ModuleState<MarineBundle>;
  hydro: ModuleState<HydroBundle>;
  coast: ModuleState<CoastInfo>;
  route: ModuleState<RouteInfo>;
  seaProbe: ModuleState<{ seaPoint: boolean; sample: GeoPoint | null }>;
}

/* ------------------------------------------------------------- réglages */

export interface CostParams {
  /** Consommation en L/100 km. */
  consumption: number;
  /** Prix du carburant en €/L. */
  fuelPrice: number;
  /** Péages estimés en €/km. */
  tollPerKm: number;
  /** Nombre de véhicules (ou de pleins) — multiplicateur du carburant. */
  vehicles: number;
  /** Aller-retour. */
  roundTrip: boolean;
  /** Hébergement (€, total du séjour). */
  lodging: number;
  /** Autres frais (€). */
  other: number;
  /** Valeurs saisies manuellement pour les péages (€), prioritaire si > 0. */
  tollsFixed: number;
}

export interface Settings {
  units: UnitMode;
  start: StartPosition | null;
  activeSpotId: string | null;
  activity: ActivityId;
  costs: CostParams;
  /** Relais CORS local (facultatif), ex. `/__proxy`. */
  proxy: string;
  /** Clé personnelle api-maree.fr (facultative) : marées officielles + coefficients. */
  mareeKey: string;
  theme: 'light' | 'dark';
  refreshMinutes: number;
  showMarineLayers: boolean;
}
