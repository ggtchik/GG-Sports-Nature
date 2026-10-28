import type { ModuleState, WeatherBundle } from '../../core/types';
import { timeOf, ageLabel, stampLocal } from '../../core/format';
import { beaufort, cardinal, uvLevel } from '../../core/units';
import { useApp } from '../../state/AppContext';
import { Icon } from '../ui/Icon';
import { UnavailableBlock } from '../ui/States';
import { weatherLabel } from '../ui/WeatherGlyph';
import { WeatherGlyph } from '../ui/WeatherGlyph';
import { SOURCES } from '../../core/sources';

interface Props {
  weather: ModuleState<WeatherBundle>;
  marineContext: boolean;
}

export function CurrentWeatherCard({ weather, marineContext }: Props) {
  const { units } = useApp();

  if (weather.state === 'loading' || weather.state === 'idle') {
    return (
      <section className="hero-weather">
        <div className="hero-weather__label">Conditions actuelles</div>
        <div style={{ marginTop: 16, maxWidth: 460 }}>
          <div className="skeleton skeleton--block" style={{ height: 96, opacity: 0.3 }} />
        </div>
        <p className="hero-weather__meta">Récupération des données Open-Meteo…</p>
      </section>
    );
  }

  if (weather.state === 'error' || !weather.data) {
    return (
      <section className="hero-weather" style={{ display: 'block' }}>
        <div className="hero-weather__label">Conditions actuelles</div>
        <div style={{ marginTop: 14, color: 'rgba(244,241,232,.9)' }}>
          <UnavailableBlock title="Météo indisponible" tone="error">
            {weather.error}
          </UnavailableBlock>
        </div>
      </section>
    );
  }

  const { current, daily } = weather.data;
  const condition = weatherLabel(current.weatherCode, current.isDay ?? true);
  const wind = beaufort(current.windSpeed);
  const uv = uvLevel(current.uvIndex);
  const windCtx = marineContext ? 'marine' : 'terrain';
  const today = daily[0];

  return (
    <section className="hero-weather" aria-label="Conditions actuelles">
      <div className="hero-weather__top">
        <div>
          <div className="hero-weather__label">Conditions actuelles · {timeOf(current.time)}</div>
          <div className="hero-weather__temp">
            <span className="hero-weather__value num">
              {current.temperature === null ? '—' : current.temperature.toFixed(1).replace('.', ',')}
            </span>
            <span className="hero-weather__unit">°C</span>
          </div>
          <div className="hero-weather__condition">
            <span>{condition}</span>
            {current.apparent !== null && (
              <span style={{ opacity: 0.7 }}>· ressenti {units.temperature(current.apparent)}</span>
            )}
          </div>
        </div>
        <div className="hero-weather__icon">
          <WeatherGlyph code={current.weatherCode} isDay={current.isDay ?? true} size={40} colored={false} />
        </div>
      </div>

      <dl className="hero-weather__grid">
        <div className="hero-weather__stat">
          <dt>
            <Icon name="wind" size={12} /> Vent
          </dt>
          <dd>
            {units.speed(current.windSpeed, windCtx)} {current.windDirection !== null && cardinal(current.windDirection)}
          </dd>
        </div>
        <div className="hero-weather__stat">
          <dt>
            <Icon name="wind" size={12} /> Rafales
          </dt>
          <dd>{units.speed(current.windGust, windCtx)}</dd>
        </div>
        <div className="hero-weather__stat" title={wind ? `Beaufort ${wind.force} — ${wind.label}` : undefined}>
          <dt>
            <Icon name="compass" size={12} /> Force
          </dt>
          <dd>{wind ? `${wind.force} Bft` : '—'}</dd>
        </div>
        <div className="hero-weather__stat">
          <dt>
            <Icon name="gauge" size={12} /> Pression
          </dt>
          <dd>{units.pressure(current.pressure)}</dd>
        </div>
        <div className="hero-weather__stat">
          <dt>
            <Icon name="cloud" size={12} /> Nuages
          </dt>
          <dd>{units.percent(current.cloudCover)}</dd>
        </div>
        <div className="hero-weather__stat">
          <dt>
            <Icon name="rain" size={12} /> Pluie
          </dt>
          <dd>{units.precipitation(current.precipitation)}</dd>
        </div>
        <div className="hero-weather__stat">
          <dt>
            <Icon name="droplet" size={12} /> Risque
          </dt>
          <dd>{units.percent(current.precipitationProbability)}</dd>
        </div>
        <div className="hero-weather__stat">
          <dt>
            <Icon name="sun" size={12} /> UV
          </dt>
          <dd>
            {units.uv(current.uvIndex)} {uv ? `· ${uv.label}` : ''}
          </dd>
        </div>
        <div className="hero-weather__stat">
          <dt>
            <Icon name="droplet" size={12} /> Humidité
          </dt>
          <dd>{units.percent(current.humidity)}</dd>
        </div>
        <div className="hero-weather__stat">
          <dt>
            <Icon name="eye" size={12} /> Visibilité
          </dt>
          <dd>
            {current.visibility === null ? '—' : `${(current.visibility / 1000).toFixed(0)} km`}
          </dd>
        </div>
        <div className="hero-weather__stat">
          <dt>
            <Icon name="sunrise" size={12} /> Jour
          </dt>
          <dd>{today?.daylightDurationS ? `${Math.round(today.daylightDurationS / 3600)} h ${Math.round((today.daylightDurationS % 3600) / 60)}` : '—'}</dd>
        </div>
      </dl>

      <div className="hero-weather__meta">
        <span>
          Prévision issue de la passe {timeOf(current.time)} · reçue {ageLabel(weather.fetchedAt)} ({stampLocal(weather.fetchedAt)})
        </span>
        <a href={SOURCES['open-meteo'].url} target="_blank" rel="noreferrer noopener">
          Source : Open-Meteo
        </a>
      </div>
    </section>
  );
}
