import type { ModuleState, WeatherBundle } from '../../core/types';
import { dayShort } from '../../core/format';
import { cardinal, uvLevel } from '../../core/units';
import { useApp } from '../../state/AppContext';
import { Card, SourceFooter } from '../ui/Card';
import { LoadingBlock, UnavailableBlock } from '../ui/States';
import { WeatherGlyph, weatherLabel } from '../ui/WeatherGlyph';

interface Props {
  weather: ModuleState<WeatherBundle>;
  marineContext: boolean;
}

export function ForecastCard({ weather, marineContext }: Props) {
  const { units } = useApp();

  if (weather.state === 'loading' || weather.state === 'idle') {
    return (
      <Card title="Prévisions à 5 jours" icon="calendar">
        <LoadingBlock lines={4} />
      </Card>
    );
  }

  if (weather.state === 'error' || !weather.data) {
    return (
      <Card title="Prévisions à 5 jours" icon="calendar">
        <UnavailableBlock title="Prévisions indisponibles" tone="error">
          {weather.error}
        </UnavailableBlock>
      </Card>
    );
  }

  const days = weather.data.daily.slice(0, 5);

  return (
    <Card
      title="Prévisions à 5 jours"
      icon="calendar"
      subtitle="Modèle national — mise à jour à chaque passe"
      footer={<SourceFooter sources={['open-meteo']} fetchedAt={weather.fetchedAt} />}
    >
      <div className="table-wrap">
        <table className="table table--responsive">
          <thead>
            <tr>
              <th scope="col">Jour</th>
              <th scope="col">Conditions</th>
              <th scope="col" className="num-cell">Min / Max</th>
              <th scope="col" className="num-cell">Pluie</th>
              <th scope="col" className="num-cell">Vent max</th>
              <th scope="col" className="num-cell">Rafales</th>
              <th scope="col" className="num-cell">UV</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day, index) => {
              const uv = uvLevel(day.uvIndexMax);
              return (
                <tr key={day.date}>
                  <td data-label="Jour">
                    <strong style={{ textTransform: 'capitalize' }}>{index === 0 ? "Aujourd'hui" : dayShort(day.date)}</strong>
                  </td>
                  <td data-label="Conditions">
                    <span className="inline" style={{ gap: 8 }}>
                      <WeatherGlyph code={day.weatherCode} size={18} />
                      <span className="tiny">{weatherLabel(day.weatherCode)}</span>
                    </span>
                  </td>
                  <td data-label="Min / Max" className="num-cell">
                    {units.temperature(day.temperatureMin)} / {units.temperature(day.temperatureMax)}
                  </td>
                  <td data-label="Pluie" className="num-cell">
                    {units.precipitation(day.precipitationSum)}
                    <span className="dim tiny"> · {units.percent(day.precipitationProbability)}</span>
                  </td>
                  <td data-label="Vent max" className="num-cell">
                    {units.speed(day.windSpeedMax, marineContext ? 'marine' : 'terrain')}{' '}
                    <span className="dim tiny">{cardinal(day.windDirectionDominant)}</span>
                  </td>
                  <td data-label="Rafales" className="num-cell">
                    {units.speed(day.windGustsMax, marineContext ? 'marine' : 'terrain')}
                  </td>
                  <td data-label="UV" className="num-cell">
                    {day.uvIndexMax === null ? '—' : `${units.uv(day.uvIndexMax)}${uv ? ` · ${uv.label}` : ''}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="note">
        Prévisions issues des modèles numériques : elles ne constituent pas des observations. Au-delà de 72 h,
        l’incertitude augmente sensiblement.
      </p>
    </Card>
  );
}
