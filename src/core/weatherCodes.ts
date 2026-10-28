/** Codes WMO utilisés par Open-Meteo → libellé français + pictogramme. */

export type WeatherIconKind =
  | 'clear-day'
  | 'clear-night'
  | 'partly-day'
  | 'partly-night'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'showers'
  | 'snow'
  | 'storm';

export interface WeatherCodeInfo {
  label: string;
  icon: WeatherIconKind;
}

const CODES: Record<number, WeatherCodeInfo> = {
  0: { label: 'Ciel dégagé', icon: 'clear-day' },
  1: { label: 'Peu nuageux', icon: 'partly-day' },
  2: { label: 'Partiellement nuageux', icon: 'partly-day' },
  3: { label: 'Couvert', icon: 'cloudy' },
  45: { label: 'Brouillard', icon: 'fog' },
  48: { label: 'Brouillard givrant', icon: 'fog' },
  51: { label: 'Bruine faible', icon: 'drizzle' },
  53: { label: 'Bruine modérée', icon: 'drizzle' },
  55: { label: 'Bruine dense', icon: 'drizzle' },
  56: { label: 'Bruine verglaçante faible', icon: 'drizzle' },
  57: { label: 'Bruine verglaçante dense', icon: 'drizzle' },
  61: { label: 'Pluie faible', icon: 'rain' },
  63: { label: 'Pluie modérée', icon: 'rain' },
  65: { label: 'Pluie forte', icon: 'rain' },
  66: { label: 'Pluie verglaçante faible', icon: 'rain' },
  67: { label: 'Pluie verglaçante forte', icon: 'rain' },
  71: { label: 'Neige faible', icon: 'snow' },
  73: { label: 'Neige modérée', icon: 'snow' },
  75: { label: 'Neige forte', icon: 'snow' },
  77: { label: 'Grains de neige', icon: 'snow' },
  80: { label: 'Averses faibles', icon: 'showers' },
  81: { label: 'Averses modérées', icon: 'showers' },
  82: { label: 'Averses violentes', icon: 'showers' },
  85: { label: 'Averses de neige faibles', icon: 'snow' },
  86: { label: 'Averses de neige fortes', icon: 'snow' },
  95: { label: 'Orage', icon: 'storm' },
  96: { label: 'Orage avec grêle fine', icon: 'storm' },
  99: { label: 'Orage avec grêle forte', icon: 'storm' },
};

export function weatherCodeInfo(code: number | null | undefined, isDay = true): WeatherCodeInfo {
  if (code === null || code === undefined || !(code in CODES)) {
    return { label: 'Condition non communiquée', icon: isDay ? 'cloudy' : 'partly-night' };
  }
  const info = CODES[code];
  if (!isDay) {
    if (info.icon === 'clear-day') return { label: info.label, icon: 'clear-night' };
    if (info.icon === 'partly-day') return { label: info.label, icon: 'partly-night' };
  }
  return info;
}
