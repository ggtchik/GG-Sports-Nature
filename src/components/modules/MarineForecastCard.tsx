import type { MarineBundle, ModuleState } from '../../core/types';
import { dayShort } from '../../core/format';
import { cardinal } from '../../core/units';
import { useApp } from '../../state/AppContext';
import { Card, SourceFooter } from '../ui/Card';
import { LoadingBlock, UnavailableBlock } from '../ui/States';

export function MarineForecastCard({ marine }: { marine: ModuleState<MarineBundle> }) {
  const { units } = useApp();

  if (marine.state === 'loading' || marine.state === 'idle') {
    return (
      <Card title="Prévisions marines" icon="calendar">
        <LoadingBlock lines={3} />
      </Card>
    );
  }

  if (marine.state !== 'ok' || !marine.data) {
    return (
      <Card title="Prévisions marines" icon="calendar">
        <UnavailableBlock title="Prévisions marines indisponibles">
          {marine.error ?? 'Pas de couverture marine à ce point.'}
        </UnavailableBlock>
      </Card>
    );
  }

  const days = marine.data.daily.slice(0, 5);

  return (
    <Card
      title="Prévisions marines"
      icon="calendar"
      subtitle="Houle et vagues à 5 jours"
      footer={<SourceFooter sources={['open-meteo-marine']} fetchedAt={marine.fetchedAt} />}
    >
      <div className="table-wrap">
        <table className="table table--responsive">
          <thead>
            <tr>
              <th scope="col">Jour</th>
              <th scope="col" className="num-cell">Vagues max</th>
              <th scope="col" className="num-cell">Direction</th>
              <th scope="col" className="num-cell">Période</th>
              <th scope="col" className="num-cell">Houle max</th>
              <th scope="col" className="num-cell">Direction</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day, index) => (
              <tr key={day.date}>
                <td data-label="Jour">
                  <strong style={{ textTransform: 'capitalize' }}>
                    {index === 0 ? "Aujourd'hui" : dayShort(day.date)}
                  </strong>
                </td>
                <td data-label="Vagues max" className="num-cell">{units.height(day.waveHeightMax)}</td>
                <td data-label="Direction" className="num-cell">{cardinal(day.waveDirectionDominant)}</td>
                <td data-label="Période" className="num-cell">
                  {day.wavePeriodMax === null ? '—' : `${day.wavePeriodMax.toFixed(1).replace('.', ',')} s`}
                </td>
                <td data-label="Houle max" className="num-cell">{units.height(day.swellHeightMax)}</td>
                <td data-label="Direction" className="num-cell">{cardinal(day.swellDirectionDominant)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">Prévisions de modèle : la hauteur réelle peut varier localement (bathymétrie, abris).</p>
    </Card>
  );
}
