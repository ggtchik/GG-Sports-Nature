import type { MarineBundle, ModuleState } from '../../core/types';
import { cardinal } from '../../core/units';
import { num, timeOf } from '../../core/format';
import { useApp } from '../../state/AppContext';
import { Card, SourceFooter } from '../ui/Card';
import { LineChart } from '../charts/LineChart';
import { LoadingBlock, UnavailableBlock } from '../ui/States';

interface Props {
  marine: ModuleState<MarineBundle>;
  wallNow: string;
}

function Direction({ degrees, label }: { degrees: number | null; label: string }) {
  if (degrees === null) return <span className="dim">—</span>;
  return (
    <span className="inline" style={{ gap: 6, justifyContent: 'flex-end' }}>
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" style={{ transform: `rotate(${degrees}deg)` }}>
        <path
          d="M12 3 18 20 12 16.4 6 20 12 3Z"
          fill="var(--sea)"
          stroke="var(--sea)"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />
      </svg>
      {cardinal(degrees)} <span className="tiny dim">{label}</span>
    </span>
  );
}

export function MarineCard({ marine, wallNow }: Props) {
  const { units } = useApp();

  if (marine.state === 'loading' || marine.state === 'idle') {
    return (
      <Card title="Houle & vagues" icon="waves" tone="sea">
        <LoadingBlock lines={3} />
      </Card>
    );
  }

  if (marine.state !== 'ok' || !marine.data) {
    return (
      <Card title="Houle & vagues" icon="waves" tone="sea">
        <UnavailableBlock title="Données maritimes indisponibles">
          {marine.error ?? 'Aucune donnée marine pour ce point.'}
          <div style={{ marginTop: 6 }}>
            Le modèle marine couvre les zones maritimes (résolution ≈ 8 km) ; un point situé à l’intérieur des terres
            n’a pas de donnée de houle.
          </div>
        </UnavailableBlock>
      </Card>
    );
  }

  const { current, hourly } = marine.data;
  const today = wallNow.slice(0, 10);
  const points = hourly.filter((h) => h.time >= `${today}T00:00` && h.time <= `${today}T23:59`);

  return (
    <Card
      title="Houle & vagues"
      icon="waves"
      tone="sea"
      subtitle={`Hauteur totale, houle et vagues — relevé modèle ${timeOf(current.time)}`}
      footer={<SourceFooter sources={['open-meteo-marine']} fetchedAt={marine.fetchedAt} note="Modèle MFWAM / SMOC" />}
    >
      <div className="stats">
        <div className="stat">
          <span className="stat__label">Vagues · hauteur</span>
          <span className="stat__value num">{units.height(current.waveHeight)}</span>
          <span className="stat__hint">période {current.wavePeriod === null ? '—' : `${num(current.wavePeriod, 1)} s`}</span>
        </div>
        <div className="stat">
          <span className="stat__label">Vagues · direction</span>
          <span className="stat__value">
            <Direction degrees={current.waveDirection} label="provenance" />
          </span>
        </div>
        <div className="stat">
          <span className="stat__label">Houle · hauteur</span>
          <span className="stat__value num">{units.height(current.swellHeight)}</span>
          <span className="stat__hint">période {current.swellPeriod === null ? '—' : `${num(current.swellPeriod, 1)} s`}</span>
        </div>
        <div className="stat">
          <span className="stat__label">Houle · direction</span>
          <span className="stat__value">
            <Direction degrees={current.swellDirection} label="provenance" />
          </span>
        </div>
      </div>

      {points.length > 2 && (
        <LineChart
          labels={points.map((p) => p.time)}
          height={150}
          ariaLabel="Hauteur des vagues et de la houle sur la journée"
          yFormat={(v) => num(v, 1)}
          xFormat={(label) => timeOf(label)}
          series={[
            { label: 'Vagues (m)', values: points.map((p) => p.waveHeight), color: 'var(--sea)', fill: true },
            { label: 'Houle (m)', values: points.map((p) => p.swellHeight), color: 'var(--sea-2)', dashed: true },
          ]}
        />
      )}

      <p className="note">
        Hauteurs significatives issues d’un modèle numérique (pas de 3 h, résolution ≈ 8 km) : elles ne remplacent pas
        une observation locale ni les bulletins de sécurité marine.
      </p>
    </Card>
  );
}
