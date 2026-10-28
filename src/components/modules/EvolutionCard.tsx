import { useMemo, useState } from 'react';
import type { ModuleState, WeatherBundle } from '../../core/types';
import { num, timeOf } from '../../core/format';
import { cardinal, kmhToKn } from '../../core/units';
import { useApp } from '../../state/AppContext';
import { Card, SourceFooter } from '../ui/Card';
import { LineChart } from '../charts/LineChart';
import { Segmented } from '../ui/Segmented';
import { LoadingBlock, UnavailableBlock } from '../ui/States';
import { WeatherGlyph } from '../ui/WeatherGlyph';

type Range = 'today' | 'next24';

interface Props {
  weather: ModuleState<WeatherBundle>;
  wallNow: string;
  marineContext: boolean;
}

export function EvolutionCard({ weather, wallNow, marineContext }: Props) {
  const { units } = useApp();
  const [range, setRange] = useState<Range>('today');
  const [showDetails, setShowDetails] = useState(false);

  const hourly = weather.data?.hourly ?? [];
  const currentIndex = useMemo(() => {
    const key = wallNow.slice(0, 13);
    const index = hourly.findIndex((h) => h.time.slice(0, 13) >= key);
    return index === -1 ? 0 : index;
  }, [hourly, wallNow]);

  const slice = useMemo(() => {
    if (range === 'today') return hourly.filter((h) => h.time.slice(0, 10) === wallNow.slice(0, 10));
    return hourly.slice(currentIndex, currentIndex + 24);
  }, [hourly, range, wallNow, currentIndex]);

  const useKnots = units.mode === 'nautical' && marineContext;
  const speedFactor = useKnots ? kmhToKn(1) : 1;
  const speedUnit = useKnots ? 'kn' : 'km/h';
  const speedTick = (v: number) => num(v, 0);

  const labels = slice.map((h) => h.time);
  const xLabel = (label: string) => timeOf(label);

  const highlightIndex = useMemo(() => {
    if (range !== 'today') return 0;
    const key = wallNow.slice(0, 13);
    const index = slice.findIndex((h) => h.time.slice(0, 13) >= key);
    return index === -1 ? null : index;
  }, [slice, wallNow, range]);

  if (weather.state === 'loading' || weather.state === 'idle') {
    return (
      <Card title="Évolution de la journée" icon="clock">
        <LoadingBlock lines={4} />
      </Card>
    );
  }

  if (weather.state === 'error' || !weather.data) {
    return (
      <Card title="Évolution de la journée" icon="clock">
        <UnavailableBlock title="Évolution indisponible" tone="error">
          {weather.error}
        </UnavailableBlock>
      </Card>
    );
  }

  const day = weather.data.daily[0];
  const next12 = slice.slice(0, 12);
  const maxProb = Math.max(...next12.map((h) => h.precipitationProbability ?? 0), 0);
  const rainSum = next12.reduce((acc, h) => acc + (h.precipitation ?? 0), 0);

  return (
    <Card
      title="Évolution"
      icon="clock"
      subtitle={
        range === 'today'
          ? 'Détail horaire de la journée en cours'
          : 'Synthèse des 24 prochaines heures'
      }
      actions={
        <Segmented
          label="Période"
          size="sm"
          value={range}
          onChange={setRange}
          options={[
            { value: 'today', label: "Aujourd'hui" },
            { value: 'next24', label: '24 h' },
          ]}
        />
      }
      footer={
        <SourceFooter
          sources={['open-meteo']}
          fetchedAt={weather.fetchedAt}
          note={`Passe du modèle : ${timeOf(weather.data.current.time)}`}
        />
      }
    >
      <div className="stats">
        <div className="stat stat--plain">
          <span className="stat__label">Températures</span>
          <span className="stat__value num">
            {units.temperature(day?.temperatureMin)} → {units.temperature(day?.temperatureMax)}
          </span>
        </div>
        <div className="stat stat--plain">
          <span className="stat__label">Pluie sur 12 h</span>
          <span className="stat__value num">{units.precipitation(rainSum)}</span>
        </div>
        <div className="stat stat--plain">
          <span className="stat__label">Risque max (12 h)</span>
          <span className="stat__value num">{units.percent(maxProb)}</span>
        </div>
        <div className="stat stat--plain">
          <span className="stat__label">Rafales max</span>
          <span className="stat__value num">
            {units.speed(
              Math.max(...slice.map((h) => h.windGust ?? 0)),
              marineContext ? 'marine' : 'terrain',
            )}
          </span>
        </div>
      </div>

      <div>
        <div className="row" style={{ marginBottom: 4 }}>
          <span className="eyebrow">Température</span>
          <span className="tiny dim">°C · ressenti en pointillés</span>
        </div>
        <LineChart
          labels={labels}
          height={150}
          ariaLabel="Température et ressenti heure par heure"
          yFormat={(v) => num(v, 0)}
          xFormat={xLabel}
          highlightIndex={highlightIndex}
          series={[
            { label: 'Température', values: slice.map((h) => h.temperature), color: 'var(--accent)', fill: true },
            {
              label: 'Ressenti',
              values: slice.map((h) => h.apparent),
              color: 'var(--ink-3)',
              dashed: true,
            },
          ]}
        />
      </div>

      <div>
        <div className="row" style={{ marginBottom: 4 }}>
          <span className="eyebrow">Vent</span>
          <span className="tiny dim">
            {speedUnit}
            {units.dual ? ' · affichage kn en info-bulle' : ''}
          </span>
        </div>
        <LineChart
          labels={labels}
          height={140}
          ariaLabel="Vitesse moyenne du vent et rafales"
          yFormat={(v) => `${speedTick(v)}`}
          xFormat={xLabel}
          highlightIndex={highlightIndex}
          series={[
            {
              label: `Vent moyen (${speedUnit})`,
              values: slice.map((h) => (h.windSpeed === null ? null : h.windSpeed * speedFactor)),
              color: 'var(--sea-2)',
              fill: true,
            },
            {
              label: `Rafales (${speedUnit})`,
              values: slice.map((h) => (h.windGust === null ? null : h.windGust * speedFactor)),
              color: 'var(--accent)',
              dashed: true,
            },
          ]}
        />
      </div>

      <div>
        <div className="row" style={{ marginBottom: 4 }}>
          <span className="eyebrow">Précipitations</span>
          <span className="tiny dim">mm par heure</span>
        </div>
        <LineChart
          labels={labels}
          height={110}
          ariaLabel="Précipitations heure par heure"
          yFormat={(v) => num(v, 1)}
          xFormat={xLabel}
          zeroBased
          highlightIndex={highlightIndex}
          showLegend={false}
          series={[
            {
              label: 'Précipitations',
              values: slice.map((h) => h.precipitation),
              color: 'var(--sea)',
              kind: 'bar',
            },
          ]}
        />
      </div>

      <button
        type="button"
        className="btn btn--quiet btn--sm"
        onClick={() => setShowDetails((v) => !v)}
        aria-expanded={showDetails}
        style={{ alignSelf: 'flex-start' }}
      >
        {showDetails ? 'Masquer le détail horaire' : 'Afficher le détail horaire'}
      </button>

      {showDetails && (
        <div className="table-wrap">
          <table className="table table--responsive">
            <thead>
              <tr>
                <th scope="col">Heure</th>
                <th scope="col">Temps</th>
                <th scope="col" className="num-cell">Temp.</th>
                <th scope="col" className="num-cell">Vent</th>
                <th scope="col" className="num-cell">Rafales</th>
                <th scope="col" className="num-cell">Pluie</th>
                <th scope="col" className="num-cell">Risque</th>
              </tr>
            </thead>
            <tbody>
              {slice
                .filter((_, index) => index % 3 === 0 || index === slice.length - 1)
                .map((hour) => (
                  <tr key={hour.time} className={hour.time.slice(0, 13) === wallNow.slice(0, 13) ? 'is-now' : ''}>
                    <td data-label="Heure">
                      <strong>{timeOf(hour.time)}</strong>
                    </td>
                    <td data-label="Temps">
                      <span className="inline" style={{ gap: 6 }}>
                        <WeatherGlyph code={hour.weatherCode} isDay={true} size={16} />
                      </span>
                    </td>
                    <td data-label="Temp." className="num-cell">
                      {units.temperature(hour.temperature)}
                    </td>
                    <td data-label="Vent" className="num-cell">
                      {units.speed(hour.windSpeed, marineContext ? 'marine' : 'terrain')}{' '}
                      <span className="dim">{cardinal(hour.windDirection)}</span>
                    </td>
                    <td data-label="Rafales" className="num-cell">
                      {units.speed(hour.windGust, marineContext ? 'marine' : 'terrain')}
                    </td>
                    <td data-label="Pluie" className="num-cell">
                      {units.precipitation(hour.precipitation)}
                    </td>
                    <td data-label="Risque" className="num-cell">
                      {units.percent(hour.precipitationProbability)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
