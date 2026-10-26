export type WeatherIconKind =
  | 'clear'
  | 'partly'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'heavy-rain'
  | 'snow'
  | 'thunder';

export interface WeatherInfo {
  label: string;
  short: string;
  icon: WeatherIconKind;
  tone: 'warm' | 'cool' | 'grey' | 'wet' | 'snow';
}

const INFO: Record<number, WeatherInfo> = {
  0: { label: 'Ciel dégagé', short: 'Dégagé', icon: 'clear', tone: 'warm' },
  1: { label: 'Plutôt dégagé', short: 'Peu nuageux', icon: 'clear', tone: 'warm' },
  2: { label: 'Partiellement nuageux', short: 'Éclaircies', icon: 'partly', tone: 'cool' },
  3: { label: 'Couvert', short: 'Couvert', icon: 'cloudy', tone: 'grey' },
  45: { label: 'Brouillard', short: 'Brouillard', icon: 'fog', tone: 'grey' },
  48: { label: 'Brouillard givrant', short: 'Brouillard', icon: 'fog', tone: 'grey' },
  51: { label: 'Bruine légère', short: 'Bruine', icon: 'drizzle', tone: 'wet' },
  53: { label: 'Bruine', short: 'Bruine', icon: 'drizzle', tone: 'wet' },
  55: { label: 'Bruine dense', short: 'Bruine', icon: 'drizzle', tone: 'wet' },
  56: { label: 'Bruine verglaçante', short: 'Verglas', icon: 'drizzle', tone: 'wet' },
  57: { label: 'Bruine verglaçante dense', short: 'Verglas', icon: 'drizzle', tone: 'wet' },
  61: { label: 'Pluie faible', short: 'Pluie', icon: 'rain', tone: 'wet' },
  63: { label: 'Pluie modérée', short: 'Pluie', icon: 'rain', tone: 'wet' },
  65: { label: 'Pluie forte', short: 'Forte pluie', icon: 'heavy-rain', tone: 'wet' },
  66: { label: 'Pluie verglaçante', short: 'Verglas', icon: 'rain', tone: 'wet' },
  67: { label: 'Pluie verglaçante forte', short: 'Verglas', icon: 'rain', tone: 'wet' },
  71: { label: 'Neige faible', short: 'Neige', icon: 'snow', tone: 'snow' },
  73: { label: 'Neige modérée', short: 'Neige', icon: 'snow', tone: 'snow' },
  75: { label: 'Neige forte', short: 'Neige', icon: 'snow', tone: 'snow' },
  77: { label: 'Grains de neige', short: 'Neige', icon: 'snow', tone: 'snow' },
  80: { label: 'Averses faibles', short: 'Averses', icon: 'rain', tone: 'wet' },
  81: { label: 'Averses', short: 'Averses', icon: 'rain', tone: 'wet' },
  82: { label: 'Averses violentes', short: 'Averses', icon: 'heavy-rain', tone: 'wet' },
  85: { label: 'Averses de neige', short: 'Averses', icon: 'snow', tone: 'snow' },
  86: { label: 'Averses de neige fortes', short: 'Averses', icon: 'snow', tone: 'snow' },
  95: { label: 'Orage', short: 'Orage', icon: 'thunder', tone: 'wet' },
  96: { label: 'Orage avec grêle', short: 'Orage', icon: 'thunder', tone: 'wet' },
  99: { label: 'Orage violent', short: 'Orage', icon: 'thunder', tone: 'wet' },
};

export function weatherInfo(code: number | null | undefined): WeatherInfo {
  if (code === null || code === undefined) {
    return { label: 'Conditions inconnues', short: '—', icon: 'cloudy', tone: 'grey' };
  }
  return (
    INFO[code] ?? {
      label: 'Conditions variables',
      short: 'Variable',
      icon: 'partly',
      tone: 'cool',
    }
  );
}

export function uvLabel(index: number | null | undefined): {
  label: string;
  level: 'low' | 'moderate' | 'high' | 'very-high' | 'extreme';
} {
  if (index === null || index === undefined || !Number.isFinite(index)) {
    return { label: '—', level: 'low' };
  }
  if (index < 3) return { label: 'Faible', level: 'low' };
  if (index < 6) return { label: 'Modéré', level: 'moderate' };
  if (index < 8) return { label: 'Élevé', level: 'high' };
  if (index < 11) return { label: 'Très élevé', level: 'very-high' };
  return { label: 'Extrême', level: 'extreme' };
}

export function windLabel(kmh: number | null | undefined): string {
  if (kmh === null || kmh === undefined || !Number.isFinite(kmh)) return '—';
  if (kmh < 2) return 'Calme';
  if (kmh < 6) return 'Très léger';
  if (kmh < 12) return 'Léger';
  if (kmh < 20) return 'Modéré';
  if (kmh < 29) return 'Assez fort';
  if (kmh < 39) return 'Fort';
  if (kmh < 50) return 'Très fort';
  if (kmh < 62) return 'Tempête';
  return 'Ouragan';
}

export function humidityLabel(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  if (value < 30) return 'Très sec';
  if (value < 50) return 'Sec';
  if (value < 70) return 'Confortable';
  if (value < 85) return 'Humide';
  return 'Très humide';
}

export function pressureLabel(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  if (value < 995) return 'Dépression';
  if (value < 1009) return 'Basse';
  if (value <= 1022) return 'Stable';
  if (value <= 1035) return 'Haute';
  return 'Anticyclone';
}

export function seaStateLabel(wave: number | null | undefined): string {
  if (wave === null || wave === undefined || !Number.isFinite(wave)) return '—';
  if (wave < 0.2) return 'Calme (0)';
  if (wave < 0.5) return 'Ridée (1)';
  if (wave < 1.25) return 'Peu agitée (2)';
  if (wave < 2.5) return 'Agitée (3)';
  if (wave < 4) return 'Forte (4)';
  if (wave < 6) return 'Très forte (5)';
  if (wave < 9) return 'Grosse (6)';
  return 'Énorme (7+)';
}
