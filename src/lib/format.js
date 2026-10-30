export const KM_PER_NM = 1.852;
export const KMH_PER_KNOT = 1.852;

const numberFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });

export function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function formatNumber(value, digits = 1) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(Number(value));
}

export function formatTemperature(value) {
  return value === null || value === undefined || !Number.isFinite(Number(value)) ? '—' : `${formatNumber(value, 0)}°`;
}

export function formatDistance(distanceKm, units = 'standard') {
  if (distanceKm === null || distanceKm === undefined || !Number.isFinite(distanceKm)) return '—';
  const km = numberFormat.format(distanceKm);
  const nauticalMiles = numberFormat.format(distanceKm / KM_PER_NM);
  if (units === 'nautical') return `${nauticalMiles} NM`;
  if (units === 'double') return `${km} km / ${nauticalMiles} NM`;
  return `${km} km`;
}

export function formatWind(speedKmh, units = 'standard') {
  if (speedKmh === null || speedKmh === undefined || !Number.isFinite(speedKmh)) return '—';
  const kmh = formatNumber(speedKmh, 0);
  const knots = formatNumber(speedKmh / KMH_PER_KNOT, 0);
  if (units === 'nautical') return `${knots} kn`;
  if (units === 'double') return `${kmh} km/h · ${knots} kn`;
  return `${kmh} km/h`;
}

export function formatHeight(meters) {
  return meters === null || meters === undefined || meters === '' || !Number.isFinite(Number(meters))
    ? '—'
    : `${formatNumber(meters, 1)} m`;
}

export function formatPressure(value) {
  return value === null || value === undefined || value === '' || !Number.isFinite(Number(value)) ? '—' : `${formatNumber(value, 0)} hPa`;
}

export function formatPercent(value) {
  return value === null || value === undefined || value === '' || !Number.isFinite(Number(value)) ? '—' : `${formatNumber(value, 0)} %`;
}

export function formatPrecipitation(value) {
  return value === null || value === undefined || value === '' || !Number.isFinite(Number(value)) ? '—' : `${formatNumber(value, 1)} mm`;
}

export function formatDirection(degrees) {
  if (degrees === null || degrees === undefined || !Number.isFinite(Number(degrees))) return '—';
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
  return `${directions[Math.round(((Number(degrees) % 360) + 360) % 360 / 22.5) % 16]} · ${formatNumber(degrees, 0)}°`;
}

export function formatTime(value, options = {}) {
  if (!value) return '—';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value) && !/(?:Z|[+-]\d{2}:?\d{2})$/.test(value)) {
    return value.match(/T(\d{2}:\d{2})/)?.[1] || '—';
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    const match = String(value).match(/T(\d{2}:\d{2})/);
    return match ? match[1] : '—';
  }
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  }).format(date);
}

export function formatDate(value, options = {}) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    ...options,
  }).format(date);
}

export function formatDateTime(value) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatDuration(from, to) {
  if (!from || !to) return '—';
  const minutes = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60000);
  if (!Number.isFinite(minutes) || minutes < 0) return '—';
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours} h ${String(remainder).padStart(2, '0')}` : `${remainder} min`;
}

export function getMoonInfo(date = new Date()) {
  const julianDate = date.getTime() / 86400000 + 2440587.5;
  const cycle = ((julianDate - 2451550.1) / 29.530588853 % 1 + 1) % 1;
  const illumination = (1 - Math.cos(2 * Math.PI * cycle)) / 2;
  let phase;
  if (cycle < 0.035 || cycle > 0.965) phase = 'Nouvelle lune';
  else if (cycle < 0.215) phase = 'Premier croissant';
  else if (cycle < 0.285) phase = 'Premier quartier';
  else if (cycle < 0.465) phase = 'Gibbeuse croissante';
  else if (cycle < 0.535) phase = 'Pleine lune';
  else if (cycle < 0.715) phase = 'Gibbeuse décroissante';
  else if (cycle < 0.785) phase = 'Dernier quartier';
  else phase = 'Dernier croissant';

  const emojiIndex = Math.round(cycle * 8) % 8;
  return {
    phase,
    illumination: Math.round(illumination * 100),
    waxing: cycle < 0.5,
    emoji: ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'][emojiIndex],
  };
}

export function haversineKm(first, second) {
  if (!first || !second) return null;
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(second.latitude - first.latitude);
  const longitudeDelta = toRadians(second.longitude - first.longitude);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(toRadians(first.latitude))
      * Math.cos(toRadians(second.latitude))
      * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function parseCoordinates(query) {
  const matches = query.trim().match(/^\s*(-?\d{1,2}(?:[.,]\d+)?)\s*[,; ]\s*(-?\d{1,3}(?:[.,]\d+)?)\s*$/);
  if (!matches) return null;
  const latitude = Number(matches[1].replace(',', '.'));
  const longitude = Number(matches[2].replace(',', '.'));
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}

export function weatherDescription(code) {
  const descriptions = {
    0: 'Ciel dégagé',
    1: 'Principalement dégagé',
    2: 'Partiellement nuageux',
    3: 'Couvert',
    45: 'Brouillard',
    48: 'Brouillard givrant',
    51: 'Bruine légère',
    53: 'Bruine modérée',
    55: 'Bruine dense',
    56: 'Bruine verglaçante légère',
    57: 'Bruine verglaçante dense',
    61: 'Pluie faible',
    63: 'Pluie modérée',
    65: 'Pluie forte',
    66: 'Pluie verglaçante légère',
    67: 'Pluie verglaçante forte',
    71: 'Neige faible',
    73: 'Neige modérée',
    75: 'Neige forte',
    77: 'Grains de neige',
    80: 'Averses faibles',
    81: 'Averses modérées',
    82: 'Averses violentes',
    85: 'Averses de neige faibles',
    86: 'Averses de neige fortes',
    95: 'Orage',
    96: 'Orage et grêle faible',
    99: 'Orage et grêle forte',
  };
  return descriptions[Number(code)] || 'Conditions météo';
}

export function weatherSymbol(code, isDay = true) {
  if (code === null || code === undefined || code === '' || !Number.isFinite(Number(code))) return '—';
  const value = Number(code);
  if (value === 0) return isDay ? '☀' : '☾';
  if (value === 1 || value === 2) return isDay ? '⛅' : '☁';
  if (value === 3 || (value >= 45 && value <= 48)) return '☁';
  if (value >= 51 && value <= 67) return '🌦';
  if (value >= 71 && value <= 86) return '❄';
  if (value >= 95) return '⛈';
  return '☀';
}

export function localDayLabel(value) {
  if (!value) return '—';
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(date).replace('.', '');
}
