import type { HydroBundle, HydroSample, HydroStation, ModuleState } from '../../core/types';
import { ageLabel } from '../../core/format';
import { useApp } from '../../state/AppContext';
import { Card, SourceFooter } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { LoadingBlock, UnavailableBlock } from '../ui/States';
import { Sparkline } from '../charts/Sparkline';

const OBS_FORMAT = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

const TIME_FORMAT = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  hour: '2-digit',
  minute: '2-digit',
});

function formatObs(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const ageHours = (Date.now() - date.getTime()) / 3600_000;
  return ageHours < 24 ? TIME_FORMAT.format(date) : OBS_FORMAT.format(date);
}

/**
 * Tendance sur une fenêtre glissante (6 h par défaut) : comparer deux mesures
 * consécutives ne dirait rien de la dynamique réelle de la rivière.
 */
function trend(
  series: HydroSample[],
  windowHours = 6,
): { direction: 'up' | 'down' | 'flat'; delta: number; windowHours: number } | null {
  if (series.length < 2) return null;
  const last = series[series.length - 1];
  const target = Date.parse(last.at) - windowHours * 3600_000;
  let baseline = series[0];
  for (const sample of series) {
    if (Date.parse(sample.at) <= target) baseline = sample;
  }
  const hours = Math.max(0.25, (Date.parse(last.at) - Date.parse(baseline.at)) / 3600_000);
  const delta = last.value - baseline.value;
  const direction = Math.abs(delta) < 0.005 ? 'flat' : delta > 0 ? 'up' : 'down';
  return { direction, delta, windowHours: Math.round(hours) };
}

function StationRow({ station }: { station: HydroStation }) {
  const { units } = useApp();
  const heightTrend = trend(station.heightSeries);
  const flowTrend = trend(station.flowSeries);
  const stale =
    station.height && Date.now() - Date.parse(station.height.at) > 6 * 3600_000 ? true : false;

  return (
    <div className="station">
      <div>
        <div className="station__name">
          {station.name}
          {stale && <span className="chip chip--warn" style={{ height: 20, fontSize: 10.5 }}>mesure ancienne</span>}
        </div>
        <div className="tiny dim">
          {[station.river, station.commune].filter(Boolean).join(' · ') || 'Cours d’eau non précisé'}
        </div>
      </div>
      <div className="station__values">
        <div className="station__value">
          <strong>{station.height ? units.waterLevel(station.height.value) : '—'}</strong>
          <span>hauteur</span>
        </div>
        <div className="station__value">
          <strong>{station.flow ? units.flow(station.flow.value) : '—'}</strong>
          <span>débit</span>
        </div>
      </div>
      <div className="station__meta">
        <span className="inline" style={{ gap: 4 }}>
          <Icon name="pin" size={11} /> {units.distance(station.distanceKm)}
        </span>
        <span>Station {station.code}</span>
        {station.height && (
          <span>
            Relevé {formatObs(station.height.at)} ({ageLabel(Date.parse(station.height.at))})
          </span>
        )}
        {heightTrend && heightTrend.direction !== 'flat' && (
          <span className="inline" style={{ gap: 2 }}>
            <Icon name={heightTrend.direction === 'up' ? 'arrowUp' : 'arrowDown'} size={11} />
            {Math.abs(heightTrend.delta * 100).toFixed(0)} cm en {heightTrend.windowHours} h
          </span>
        )}
        {flowTrend && flowTrend.direction !== 'flat' && (
          <span className="tiny">
            débit {flowTrend.direction === 'up' ? 'en hausse' : 'en baisse'}
          </span>
        )}
      </div>
      {station.heightSeries.length > 2 && (
        <div className="station__spark">
          <Sparkline
            values={station.heightSeries.map((s) => s.value)}
            width={260}
            height={30}
            color="var(--sea-2)"
            ariaLabel={`Évolution récente de la hauteur à ${station.name}`}
          />
        </div>
      )}
    </div>
  );
}

export function HydrologyCard({ hydro }: { hydro: ModuleState<HydroBundle> }) {
  if (hydro.state === 'loading' || hydro.state === 'idle') {
    return (
      <Card title="Hydrologie — stations proches" icon="waves" tone="earth">
        <LoadingBlock lines={4} />
      </Card>
    );
  }

  if (hydro.state === 'error') {
    return (
      <Card title="Hydrologie — stations proches" icon="waves" tone="earth">
        <UnavailableBlock title="Données hydrologiques indisponibles" tone="error">
          {hydro.error}
          <div style={{ marginTop: 8 }}>
            <a href="https://www.vigicrues.gouv.fr/" target="_blank" rel="noreferrer noopener">
              Consulter Vigicrues
            </a>
          </div>
        </UnavailableBlock>
      </Card>
    );
  }

  const bundle = hydro.data;
  if (!bundle || bundle.stations.length === 0) {
    return (
      <Card title="Hydrologie — stations proches" icon="waves" tone="earth">
        <UnavailableBlock title="Aucune station à proximité">
          {hydro.error ??
            `Aucune station hydrométrique du réseau national n’est référencée dans un rayon de ${bundle?.radiusKm ?? 60} km autour de ce spot.`}
          <div style={{ marginTop: 8 }}>
            <a href="https://www.vigicrues.gouv.fr/" target="_blank" rel="noreferrer noopener">
              Carte Vigicrues
            </a>
          </div>
        </UnavailableBlock>
      </Card>
    );
  }

  return (
    <Card
      title="Hydrologie — stations proches"
      icon="waves"
      tone="earth"
      subtitle={`${bundle.stations.length} stations retenues · ${bundle.candidateCount} recensées dans un rayon de ${bundle.radiusKm} km`}
      footer={
        <SourceFooter
          sources={['hubeau', 'vigicrues']}
          fetchedAt={hydro.fetchedAt}
          note="Hauteurs converties de mm en m à la réception"
        />
      }
    >
      {bundle.measurementError && (
        <UnavailableBlock title="Mesures partielles">{bundle.measurementError}</UnavailableBlock>
      )}
      <div>
        {bundle.stations.map((station) => (
          <StationRow key={station.code} station={station} />
        ))}
      </div>
      <p className="note">
        Stations sélectionnées par distance au spot parmi le référentiel national. Les mesures sont brutes, non
        validées, et peuvent manquer pour une station (maintenance, transmission). Heures affichées en heure de Paris.
      </p>
    </Card>
  );
}
