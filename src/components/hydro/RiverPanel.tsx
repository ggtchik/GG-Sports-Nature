import {
  ArrowDownRight,
  ArrowUpRight,
  Droplets,
  ExternalLink,
  Gauge,
  Info,
  MapPin,
  Radio,
  Waves,
} from 'lucide-react';
import type { HydroData, HydroStation } from '../../types';
import { stationFreshness } from '../../lib/api/hydro';
import { km, num, relativeMinutes } from '../../lib/format';
import { Badge, Card, CardHead, DataSkeleton, DataTable, EmptyState, ErrorState } from '../ui/kit';
import type { Column } from '../ui/kit';
import { Sparkline } from '../ui/charts';

const EXTERNAL = {
  vigicrues: 'https://www.vigicrues.gouv.fr/',
  hydroportail: 'https://hydro.eaufrance.fr/',
  hubeau: 'https://hubeau.eaufrance.fr/page/api-hydrometrie',
};

function trend(history: { t: number; v: number }[]): { delta: number; direction: 'up' | 'down' | 'flat' } {
  if (history.length < 2) return { delta: 0, direction: 'flat' };
  const delta = history[history.length - 1].v - history[0].v;
  const threshold = Math.max(0.01, Math.abs(history[0].v) * 0.015);
  if (delta > threshold) return { delta, direction: 'up' };
  if (delta < -threshold) return { delta, direction: 'down' };
  return { delta, direction: 'flat' };
}

function TrendBadge({ history, unit, digits = 2 }: { history: { t: number; v: number }[]; unit: string; digits?: number }) {
  const { delta, direction } = trend(history);
  if (direction === 'flat') {
    return <span className="trend trend--flat">stable</span>;
  }
  const Icon = direction === 'up' ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`trend trend--${direction}`}>
      <Icon size={12} /> {delta > 0 ? '+' : ''}
      {num(delta, digits)} {unit}
    </span>
  );
}

function freshnessInfo(station: HydroStation): { label: string; tone: 'success' | 'amber' | 'danger' } {
  const minutesAgo = stationFreshness(station);
  if (minutesAgo === null) return { label: 'Aucune donnée', tone: 'danger' };
  if (minutesAgo <= 120) return { label: `Temps réel · ${minutesAgo} min`, tone: 'success' };
  if (minutesAgo <= 720) return { label: `Différé · ${Math.round(minutesAgo / 60)} h`, tone: 'amber' };
  return { label: `Ancien · ${Math.round(minutesAgo / 1440)} j`, tone: 'danger' };
}

interface RiverPanelProps {
  hydro: HydroData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onDemo: () => void;
  demoMode: boolean;
  spotName: string;
  lastUpdated: number | null;
  delay?: number;
}

export function RiverPanel({
  hydro,
  loading,
  error,
  onRetry,
  onDemo,
  demoMode,
  spotName,
  lastUpdated,
  delay = 0,
}: RiverPanelProps) {
  const head = (
    <CardHead
      kicker="Vigicrues · Hub’Eau · temps réel"
      title="Hauteur d’eau & débit des rivières"
      icon={<Waves size={18} />}
      aside={
        hydro && hydro.stations.length ? (
          <Badge tone="sage">
            <Radio size={11} /> {hydro.stations.length} stations · rayon {km(hydro.radiusKm, 0)}
          </Badge>
        ) : null
      }
    />
  );

  if (loading && !hydro) {
    return (
      <Card className="river-card" delay={delay}>
        {head}
        <DataSkeleton rows={5} />
      </Card>
    );
  }

  if (error && !hydro) {
    return (
      <Card className="river-card" delay={delay}>
        {head}
        <ErrorState
          title="Les stations hydrométriques ne répondent pas"
          message={error}
          onRetry={onRetry}
          onDemo={onDemo}
        />
        <div className="card-foot">
          <a className="link-btn" href={EXTERNAL.vigicrues} target="_blank" rel="noopener noreferrer">
            Consulter Vigicrues <ExternalLink size={12} />
          </a>
          <a className="link-btn" href={EXTERNAL.hubeau} target="_blank" rel="noopener noreferrer">
            API Hub’Eau <ExternalLink size={12} />
          </a>
        </div>
      </Card>
    );
  }

  if (!hydro) return null;

  if (!hydro.stations.length) {
    return (
      <Card className="river-card" delay={delay}>
        {head}
        <EmptyState
          icon={<Droplets size={20} />}
          title="Aucune station hydrométrique à proximité"
          message={`Le référentiel Hub’Eau / Vigicrues ne recense pas de station en service dans un rayon de 150 km autour de ${spotName}. Les données publiques couvrent la France métropolitaine.`}
        >
          <a className="btn btn--sm" href={EXTERNAL.vigicrues} target="_blank" rel="noopener noreferrer">
            Ouvrir Vigicrues <ExternalLink size={13} />
          </a>
        </EmptyState>
      </Card>
    );
  }

  const heights = hydro.stations.map((station) => station.height?.value).filter((value): value is number => typeof value === 'number');
  const flows = hydro.stations.map((station) => station.flow?.value).filter((value): value is number => typeof value === 'number');
  const maxHeight = heights.length ? Math.max(...heights) : null;
  const totalFlow = flows.length ? flows.reduce((sum, value) => sum + value, 0) : null;
  const liveCount = hydro.stations.filter((station) => {
    const minutesAgo = stationFreshness(station);
    return minutesAgo !== null && minutesAgo <= 120;
  }).length;

  const columns: Column<HydroStation>[] = [
    {
      key: 'index',
      label: '#',
      render: (_station, index) => <span className="station-index">{index + 1}</span>,
    },
    {
      key: 'station',
      label: 'Station',
      render: (station) => (
        <div className="station-cell">
          <strong>{station.name}</strong>
          <span>
            {station.river ?? 'Cours d’eau non nommé'}
            {station.commune ? ` · ${station.commune}` : ''}
            {station.department ? ` (${station.department})` : ''}
          </span>
          <em>{station.code}</em>
        </div>
      ),
    },
    {
      key: 'distance',
      label: 'Distance',
      align: 'right',
      render: (station) => (
        <span>
          <MapPin size={12} aria-hidden="true" /> {km(station.distanceKm)}
        </span>
      ),
    },
    {
      key: 'height',
      label: 'Hauteur',
      align: 'right',
      render: (station) => (
        <span>
          <strong className="mono">{station.height ? `${num(station.height.value, 2)} m` : '—'}</strong>
          <em className="cell-sub">
            {station.height ? relativeMinutes(station.height.date) : 'non publiée'}
          </em>
        </span>
      ),
    },
    {
      key: 'trend',
      label: 'Tendance 8 h',
      align: 'right',
      render: (station) => (
        <div className="station-trend">
          <Sparkline
            values={station.heightHistory.map((point) => point.v)}
            color={trend(station.heightHistory).direction === 'down' ? 'var(--ocean)' : 'var(--terracotta)'}
            width={78}
            height={24}
          />
          <TrendBadge history={station.heightHistory} unit="m" />
        </div>
      ),
    },
    {
      key: 'flow',
      label: 'Débit',
      align: 'right',
      render: (station) => (
        <span>
          <strong className="mono">{station.flow ? `${num(station.flow.value, 1)} m³/s` : '—'}</strong>
          <em className="cell-sub">
            {station.flow ? `${station.flow.value * 1000 >= 1000 ? `${num(station.flow.value * 1000, 0)} L/s` : ''}` : 'débit non publié'}
          </em>
        </span>
      ),
    },
    {
      key: 'freshness',
      label: 'Fraîcheur',
      align: 'right',
      hideOnMobile: true,
      render: (station) => {
        const info = freshnessInfo(station);
        return <span className={`freshness freshness--${info.tone}`}>{info.label}</span>;
      },
    },
    {
      key: 'links',
      label: 'Sources',
      align: 'right',
      render: (station) => (
        <div className="station-links">
          <a href={station.vigicruesUrl} target="_blank" rel="noopener noreferrer" className="link-btn" title="Fiche Vigicrues">
            Vigicrues <ExternalLink size={11} />
          </a>
          <a href={station.hydroportailUrl} target="_blank" rel="noopener noreferrer" className="link-btn" title="HydroPortail">
            HydroPortail <ExternalLink size={11} />
          </a>
        </div>
      ),
    },
  ];

  return (
    <Card className={`river-card accent--sage ${demoMode ? 'is-demo' : ''}`} delay={delay} id="rivieres">
      {head}

      <div className="river-summary">
        <div>
          <span className="mini-label"><Radio size={12} /> Stations en service</span>
          <strong>{hydro.stations.length}</strong>
          <em>{liveCount} en temps réel</em>
        </div>
        <div>
          <span className="mini-label"><Gauge size={12} /> Hauteur max.</span>
          <strong>{maxHeight !== null ? `${num(maxHeight, 2)} m` : '—'}</strong>
          <em>sur les 5 stations</em>
        </div>
        <div>
          <span className="mini-label"><Droplets size={12} /> Débit cumulé</span>
          <strong>{totalFlow !== null ? `${num(totalFlow, 1)} m³/s` : '—'}</strong>
          <em>{hydro.hasFlow ? 'somme des stations' : 'débits non publiés'}</em>
        </div>
        <div>
          <span className="mini-label"><MapPin size={12} /> Recherche</span>
          <strong>{km(hydro.radiusKm, 0)}</strong>
          <em>rayon autour de {spotName}</em>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={hydro.stations}
        rowKey={(station) => station.code}
        minWidth={980}
        caption="Relevés des stations hydrométriques les plus proches"
        footer={
          <tr>
            <td colSpan={columns.length} className="table__foot">
              <span>
                <Info size={12} /> Données brutes ou pré-validées Hub’Eau (hauteur en m, débit en m³/s). Les cotes sont
                relatives au zéro de l’échelle de chaque station.
              </span>
              <span className="updated">{lastUpdated ? `Actualisé ${relativeMinutes(lastUpdated)}` : ''}</span>
            </td>
          </tr>
        }
      />

      <div className="river-foot">
        <div>
          <p className="mini-label">Prochaines étapes</p>
          <p className="muted">
            Vérifiez la vigilance crues avant de partir et consultez les cinq stations pour situer la tendance du
            bassin. Un débit en hausse rapide peut rendre les berges dangereuses.
          </p>
        </div>
        <div className="river-foot__links">
          <a className="btn btn--sm" href={EXTERNAL.vigicrues} target="_blank" rel="noopener noreferrer">
            Vigicrues <ExternalLink size={12} />
          </a>
          <a className="btn btn--sm btn--ghost" href={EXTERNAL.hydroportail} target="_blank" rel="noopener noreferrer">
            HydroPortail <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {demoMode ? (
        <p className="demo-note">Stations et relevés simulés — désactivez le mode démo pour interroger Hub’Eau.</p>
      ) : null}
    </Card>
  );
}
