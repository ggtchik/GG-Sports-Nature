import { weatherCodeInfo } from '../../core/weatherCodes';
import type { WeatherIconKind } from '../../core/weatherCodes';
import { Icon } from './Icon';
import type { IconName } from './Icon';

const MAP: Record<WeatherIconKind, { icon: IconName; tone: string }> = {
  'clear-day': { icon: 'sun', tone: 'var(--sun)' },
  'clear-night': { icon: 'moon', tone: 'var(--sea-2)' },
  'partly-day': { icon: 'cloudSun', tone: 'var(--sun)' },
  'partly-night': { icon: 'cloud', tone: 'var(--sea-2)' },
  cloudy: { icon: 'cloud', tone: 'var(--ink-3)' },
  fog: { icon: 'fog', tone: 'var(--ink-3)' },
  drizzle: { icon: 'drizzle', tone: 'var(--sea-2)' },
  rain: { icon: 'rain', tone: 'var(--sea)' },
  showers: { icon: 'rain', tone: 'var(--sea)' },
  snow: { icon: 'snow', tone: 'var(--sea-2)' },
  storm: { icon: 'storm', tone: 'var(--accent)' },
};

export function WeatherGlyph({
  code,
  isDay = true,
  size = 20,
  colored = true,
}: {
  code: number | null | undefined;
  isDay?: boolean;
  size?: number;
  colored?: boolean;
}) {
  const info = weatherCodeInfo(code, isDay);
  const entry = MAP[info.icon];
  return (
    <span title={info.label} style={{ display: 'inline-flex', color: colored ? entry.tone : 'inherit' }}>
      <Icon name={entry.icon} size={size} />
    </span>
  );
}

export function weatherLabel(code: number | null | undefined, isDay = true): string {
  return weatherCodeInfo(code, isDay).label;
}
