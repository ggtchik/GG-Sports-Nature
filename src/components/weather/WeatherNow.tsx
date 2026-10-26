import {
  ArrowDown,
  ArrowUp,
  Cloud,
  CloudRain,
  Droplets,
  Eye,
  Gauge,
  Sun,
  Thermometer,
  Umbrella,
  Wind,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { WeatherData } from '../../types';
import { clock, km, num, pct, relativeMinutes, temp } from '../../lib/format';
import { findNowIndex } from '../../lib/api/weather';
import { compassLong, compassShort } from '../../lib/geo';
import {
  humidityLabel,
  pressureLabel,
  uvLabel,
  weatherInfo,
  windLabel,
} from '../../lib/weatherCodes';
import { Card, CardHead, DataSkeleton, ErrorState, Meter } from '../ui/kit';
import { WeatherGlyph } from '../ui/WeatherGlyph';
import { WindCompass } from '../ui/charts';

function MiniStat({
  icon,
  label,
  value,
  unit,
  sub,
  meter,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  unit?: string;
  sub?: ReactNode;
  meter?: { value: number | null; max?: number; tone?: 'sage' | 'amber' | 'ocean' | 'terracotta' | 'indigo' };
}) {
  return (
    <div className="mini-stat">
      <div className="mini-stat__top">
        <span className="mini-stat__icon">{icon}</span>
        <span className="mini-stat__label">{label}</span>
      </div>
      <p className="mini-stat__value">
        {value}
        {unit ? <em>{unit}</em> : null}
      </p>
      {meter ? <Meter value={meter.value} max={meter.max} tone={meter.tone} /> : null}
      {sub ? <p className="mini-stat__sub">{sub}</p> : null}
    </div>
  );
}

interface WeatherNowProps {
  weather: WeatherData | null;
  loading: boolean;
  error: string | null;
  updatedAt: number | null;
  onRetry: () => void;
  onDemo: () => void;
  demoMode: boolean;
  delay?: number;
}

export function WeatherNow({
  weather,
  loading,
  error,
  updatedAt,
  onRetry,
  onDemo,
  demoMode,
  delay = 0,
}: WeatherNowProps) {
  if (loading && !weather) {
    return (
      <Card className="weather-now" delay={delay}>
        <CardHead kicker="Temps réel" title="Conditions actuelles" icon={<Sun size={18} />} />
        <DataSkeleton rows={6} />
      </Card>
    );
  }

  if (error && !weather) {
    return (
      <Card className="weather-now" delay={delay}>
        <CardHead kicker="Temps réel" title="Conditions actuelles" icon={<Sun size={18} />} />
        <ErrorState message={error} onRetry={onRetry} onDemo={onDemo} />
      </Card>
    );
  }

  if (!weather) return null;

  const current = weather.current;
  const nowIndex = findNowIndex(weather.hourly.time);
  const rainRisk = weather.hourly.precipProb[nowIndex];
  const info = weatherInfo(current.code);
  const uv = uvLabel(current.uv);
  const today = weather.daily;

  return (
    <Card className={`weather-now accent--ocean ${demoMode ? 'is-demo' : ''}`} delay={delay}>
      <CardHead
        kicker="Temps réel"
        title="Conditions actuelles"
        icon={<Sun size={18} />}
        aside={<span className="updated">{relativeMinutes(updatedAt ?? weather.fetchedAt)}</span>}
      />

      <div className="now-hero">
        <WeatherGlyph code={current.code} isDay={current.isDay} size={82} />
        <div className="now-hero__text">
          <p className="now-hero__temp">
            {num(current.temp, 1).replace(',0', '')}
            <span>°C</span>
          </p>
          <p className="now-hero__desc">{info.label}</p>
          <p className="now-hero__feels">
            Ressenti {temp(current.feels, 0)} · {windLabel(current.wind)}
          </p>
        </div>
      </div>

      <div className="now-range">
        <span>
          <ArrowUp size={13} /> {temp(today.tMax[0], 0)}
        </span>
        <span>
          <ArrowDown size={13} /> {temp(today.tMin[0], 0)}
        </span>
        <span className="now-range__grow" />
        <span>
          <Umbrella size={13} /> {pct(rainRisk, 0)} de risque
        </span>
      </div>

      <div className="mini-grid">
        <MiniStat
          icon={<Cloud size={14} />}
          label="Couverture"
          value={num(current.cloud, 0)}
          unit="%"
          sub={current.cloud > 80 ? 'ciel couvert' : current.cloud > 40 ? 'nuageux' : 'dégagé'}
          meter={{ value: current.cloud, tone: 'sage' }}
        />
        <MiniStat
          icon={<Sun size={14} />}
          label="Indice UV"
          value={num(current.uv, 1).replace(',0', '')}
          sub={uv.label}
          meter={{ value: current.uv, max: 12, tone: 'amber' }}
        />
        <MiniStat
          icon={<Droplets size={14} />}
          label="Humidité"
          value={num(current.humidity, 0)}
          unit="%"
          sub={humidityLabel(current.humidity)}
          meter={{ value: current.humidity, tone: 'ocean' }}
        />
        <MiniStat
          icon={<Gauge size={14} />}
          label="Pression"
          value={num(current.pressure, 0)}
          unit="hPa"
          sub={pressureLabel(current.pressure)}
          meter={{ value: current.pressure, max: 1050, tone: 'indigo' }}
        />
        <MiniStat
          icon={<Wind size={14} />}
          label="Rafales"
          value={num(current.gust, 0)}
          unit="km/h"
          sub={`vent ${compassShort(current.windDir)} ${num(current.wind, 0)} km/h`}
        />
        <MiniStat
          icon={<Eye size={14} />}
          label="Visibilité"
          value={km(current.visibility / 1000, 0)}
          sub={current.visibility > 15_000 ? 'excellente' : current.visibility > 6_000 ? 'correcte' : 'réduite'}
        />
      </div>

      <div className="now-wind">
        <WindCompass direction={current.windDir} speed={current.wind} gust={current.gust} size={122} />
        <div className="now-wind__text">
          <p className="mini-label">Direction du vent</p>
          <h3>
            {compassLong(current.windDir)} <span>({compassShort(current.windDir)})</span>
          </h3>
          <p>
            Vent moyen <strong>{num(current.wind, 0)} km/h</strong> · rafales <strong>{num(current.gust, 0)} km/h</strong>
          </p>
          <p className="muted">
            <CloudRain size={12} /> {pct(rainRisk, 0)} de risque de pluie · {clock(current.time)} locale
          </p>
        </div>
      </div>

      <div className="card-foot">
        <span className="source-tag">
          <Thermometer size={12} /> Modèle Open-Meteo
        </span>
        <span>Mis à jour {relativeMinutes(weather.fetchedAt)}</span>
      </div>
    </Card>
  );
}
