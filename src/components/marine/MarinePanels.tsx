import {
  Anchor,
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Droplets,
  Info,
  Ruler,
  Timer,
  Waves,
  Wind,
} from 'lucide-react';
import type { MarineData, TideInfo } from '../../types';
import { dailyWaterTemperature } from '../../lib/api/marine';
import { clock, dayMonth, km, minutes, num, relativeMinutes, temp, weekday } from '../../lib/format';
import { compassLong, compassShort } from '../../lib/geo';
import { seaStateLabel } from '../../lib/weatherCodes';
import { TIDE_DISCLAIMER } from '../../lib/tides';
import { Badge, Card, CardHead, DataSkeleton, DataTable, EmptyState, ErrorState } from '../ui/kit';
import type { Column } from '../ui/kit';
import { LineChart } from '../ui/LineChart';
import { WindCompass } from '../ui/charts';

const PORTAL_URLS = {
  mareeInfo: 'https://www.maree.info/',
  shom: 'https://data.shom.fr/',
  windguru: 'https://www.windguru.cz/',
  surfReport: 'https://www.surf-report.com/',
  windy: 'https://www.windy.com/',
};

/* -------------------------------------------------------------------- tides */

function tideCoefficientLabel(coefficient: number | null): string {
  if (coefficient === null) return '—';
  if (coefficient >= 100) return 'Grande vive-eau';
  if (coefficient >= 70) return 'Vive-eau';
  if (coefficient >= 45) return 'Marée moyenne';
  return 'Mortes-eaux';
}

interface TideCardProps {
  tides: TideInfo | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onDemo: () => void;
  demoMode: boolean;
  spotName: string;
  delay?: number;
}

export function TideCard({ tides, loading, error, onRetry, onDemo, demoMode, spotName, delay = 0 }: TideCardProps) {
  const head = (
    <CardHead
      kicker="Marées · modèle océanique"
      title="Marées & coefficients"
      icon={<Anchor size={18} />}
      aside={
        tides?.port ? (
          <span className="updated">
            Port de référence <strong>{tides.port.name}</strong>
            {tides.portDistanceKm !== null ? ` · ${km(tides.portDistanceKm, 0)}` : ''}
          </span>
        ) : null
      }
    />
  );

  if (loading && !tides) {
    return (
      <Card className="tide-card" delay={delay}>
        {head}
        <DataSkeleton rows={5} />
      </Card>
    );
  }
  if (error && !tides) {
    return (
      <Card className="tide-card" delay={delay}>
        {head}
        <ErrorState message={error} onRetry={onRetry} onDemo={onDemo} />
      </Card>
    );
  }
  if (!tides) return null;

  if (!tides.available) {
    return (
      <Card className="tide-card" delay={delay}>
        {head}
        <EmptyState
          icon={<Waves size={20} />}
          title="Pas de cycle de marée exploitable ici"
          message={tides.note ?? 'Le modèle océanique ne fournit pas de hauteur d’eau pour ce point.'}
        >
          <a className="btn btn--sm" href={PORTAL_URLS.mareeInfo} target="_blank" rel="noopener noreferrer">
            Horaires officiels sur Marée info <ArrowUpRight size={13} />
          </a>
          <a className="btn btn--sm btn--ghost" href={PORTAL_URLS.shom} target="_blank" rel="noopener noreferrer">
            Données SHOM <ArrowUpRight size={13} />
          </a>
        </EmptyState>
      </Card>
    );
  }

  const curve = tides.curve.slice(0, 49);
  const labels = curve.map((point) => point.time.toISOString());
  const events = tides.events.slice(0, 8);
  const markers = events
    .map((event) => {
      const target = event.time.getTime();
      let bestIndex = -1;
      let bestDelta = Infinity;
      curve.forEach((point, index) => {
        const delta = Math.abs(point.time.getTime() - target);
        if (delta < bestDelta) {
          bestDelta = delta;
          bestIndex = index;
        }
      });
      if (bestIndex < 0 || bestDelta > 2 * 3_600_000) return null;
      return {
        index: bestIndex,
        label: event.type === 'haute' ? 'PM' : 'BM',
        tone: event.type === 'haute' ? ('high' as const) : ('low' as const),
      };
    })
    .filter((marker): marker is { index: number; label: string; tone: 'high' | 'low' } => marker !== null);

  const next = tides.nextHigh;
  const nextLow = tides.nextLow;
  const range = tides.range;

  const columns: Column<TideInfo['events'][number]>[] = [
    {
      key: 'type',
      label: 'Marée',
      render: (event) => (
        <Badge tone={event.type === 'haute' ? 'ocean' : 'sage'}>
          {event.type === 'haute' ? 'Haute mer' : 'Basse mer'}
        </Badge>
      ),
    },
    {
      key: 'time',
      label: 'Heure',
      render: (event) => (
        <div className="cell-day">
          <strong>{clock(event.time)}</strong>
          <span>{weekday(event.time)} {dayMonth(event.time)}</span>
        </div>
      ),
    },
    {
      key: 'height',
      label: 'Hauteur',
      align: 'right',
      render: (event) => (
        <span className="cell-strong">
          {event.height > 0 ? '+' : ''}
          {num(event.height, 2)} m
          <em className="cell-sub">réf. niveau moyen</em>
        </span>
      ),
    },
    {
      key: 'coefficient',
      label: 'Coefficient',
      align: 'right',
      render: (event) => (
        <span>
          <strong>{event.coefficient}</strong>
          <em className="cell-sub">{event.coefficient >= 70 ? 'vive-eau' : 'mortes-eaux'}</em>
        </span>
      ),
    },
    {
      key: 'in',
      label: 'Dans',
      align: 'right',
      hideOnMobile: true,
      render: (event) => {
        const diff = (event.time.getTime() - Date.now()) / 60000;
        return <span>{diff > 0 ? minutes(diff) : 'passée'}</span>;
      },
    },
  ];

  return (
    <Card className={`tide-card accent--ocean ${demoMode ? 'is-demo' : ''}`} delay={delay} id="marees">
      {head}

      <div className="tide-top">
        <div className="tide-tile">
          <span className="tide-tile__label">
            <ArrowUp size={13} /> Prochaine haute mer
          </span>
          <p className="tide-tile__time">{clock(next?.time)}</p>
          <p className="tide-tile__meta">
            {next ? `${next.height > 0 ? '+' : ''}${num(next.height, 2)} m · coef. ${next.coefficient}` : '—'}
          </p>
        </div>
        <div className="tide-tile">
          <span className="tide-tile__label">
            <ArrowDown size={13} /> Prochaine basse mer
          </span>
          <p className="tide-tile__time">{clock(nextLow?.time)}</p>
          <p className="tide-tile__meta">
            {nextLow ? `${nextLow.height > 0 ? '+' : ''}${num(nextLow.height, 2)} m · coef. ${nextLow.coefficient}` : '—'}
          </p>
        </div>
        <div className="tide-tile tide-tile--coef">
          <span className="tide-tile__label">Coefficient du jour</span>
          <p className="tide-tile__time">{tides.coefficient ?? '—'}</p>
          <p className="tide-tile__meta">{tideCoefficientLabel(tides.coefficient)}</p>
          <div className="coef-bar" aria-hidden="true">
            <span style={{ width: `${Math.min(100, ((tides.coefficient ?? 0) / 120) * 100)}%` }} />
          </div>
          <span className="tide-tile__range">Marnage ≈ {range !== null ? `${num(range, 1)} m` : '—'}</span>
        </div>
      </div>

      <div className="tide-chart">
        <p className="mini-label">Niveau de la mer sur 48 heures · {spotName}</p>
        <LineChart
          labels={labels}
          series={[
            {
              label: 'Hauteur d’eau',
              color: 'var(--ocean)',
              values: curve.map((point) => point.height),
              kind: 'area',
              unit: ' m',
            },
          ]}
          markers={markers}
          height={200}
          format={(value) => `${value.toFixed(1)}`}
          xFormat={(label) => clock(label)}
          ariaLabel="Courbe de marée sur 48 heures"
        />
      </div>

      <DataTable
        columns={columns}
        rows={events}
        rowKey={(event) => `${event.time.toISOString()}-${event.type}`}
        dense
        minWidth={560}
        caption="Horaires de marée"
      />

      <div className="card-foot card-foot--stack">
        <span className="source-tag">
          <Info size={12} /> {TIDE_DISCLAIMER}
        </span>
        <span className="card-foot__links">
          <a className="link-btn" href={PORTAL_URLS.mareeInfo} target="_blank" rel="noopener noreferrer">
            Marée info <ArrowUpRight size={12} />
          </a>
          <a className="link-btn" href={PORTAL_URLS.shom} target="_blank" rel="noopener noreferrer">
            SHOM <ArrowUpRight size={12} />
          </a>
        </span>
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------------- waves */

interface WavesCardProps {
  marine: MarineData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onDemo: () => void;
  demoMode: boolean;
  spotName: string;
  delay?: number;
}

export function WavesCard({ marine, loading, error, onRetry, onDemo, demoMode, spotName, delay = 0 }: WavesCardProps) {
  const head = (
    <CardHead
      kicker="Houle & vagues"
      title="Conditions en mer"
      icon={<Waves size={18} />}
      aside={
        marine ? (
          <Badge tone="ocean">{seaStateLabel(marine.current.wave)}</Badge>
        ) : null
      }
    />
  );

  if (loading && !marine) {
    return (
      <Card className="waves-card" delay={delay}>
        {head}
        <DataSkeleton rows={5} />
      </Card>
    );
  }
  if (error && !marine) {
    return (
      <Card className="waves-card" delay={delay}>
        {head}
        <ErrorState message={error} onRetry={onRetry} onDemo={onDemo} />
      </Card>
    );
  }
  if (!marine) return null;

  if (!marine.hasData) {
    return (
      <Card className="waves-card" delay={delay}>
        {head}
        <EmptyState
          icon={<Waves size={20} />}
          title="Aucune donnée marine à ce point"
          message={`Le modèle océanique ne couvre pas « ${spotName} ». Si le spot est en mer, forcez le contexte maritime ou consultez un fournisseur spécialisé.`}
        >
          <a className="btn btn--sm" href={PORTAL_URLS.windguru} target="_blank" rel="noopener noreferrer">
            Windguru <ArrowUpRight size={13} />
          </a>
          <a className="btn btn--sm btn--ghost" href={PORTAL_URLS.surfReport} target="_blank" rel="noopener noreferrer">
            Surf-Report <ArrowUpRight size={13} />
          </a>
        </EmptyState>
      </Card>
    );
  }

  const current = marine.current;
  const direction = current.waveDir ?? current.swellDir ?? null;

  return (
    <Card className={`waves-card accent--indigo ${demoMode ? 'is-demo' : ''}`} delay={delay} id="houle">
      {head}

      <div className="waves-top">
        <div className="wave-hero">
          <p className="mini-label">Hauteur significative</p>
          <p className="wave-hero__value">
            {current.wave !== null ? num(current.wave, 1) : '—'}
            <span>m</span>
          </p>
          <p className="wave-hero__meta">
            période {current.wavePeriod !== null ? `${num(current.wavePeriod, 1)} s` : '—'} · {seaStateLabel(current.wave)}
          </p>
        </div>
        <WindCompass
          direction={direction}
          size={124}
          ariaLabel={`Direction de la houle ${compassLong(direction)}`}
          readout={
            <p>
              {direction !== null ? compassShort(direction) : '—'}
              <em> · {compassLong(direction)}</em>
            </p>
          }
        />
      </div>

      <div className="wave-grid">
        <div className="wave-item">
          <span className="mini-label"><Waves size={12} /> Houle</span>
          <strong>{current.swell !== null ? `${num(current.swell, 1)} m` : '—'}</strong>
          <em>{current.swellPeriod !== null ? `${num(current.swellPeriod, 1)} s` : '—'} · {compassShort(current.swellDir)}</em>
        </div>
        <div className="wave-item">
          <span className="mini-label"><Wind size={12} /> Vagues de vent</span>
          <strong>{marine.hourly.windWave[0] !== null ? `${num(marine.hourly.windWave[0], 1)} m` : '—'}</strong>
          <em>mer du vent</em>
        </div>
        <div className="wave-item">
          <span className="mini-label"><Droplets size={12} /> Eau</span>
          <strong>{current.waterTemp !== null ? temp(current.waterTemp, 1) : '—'}</strong>
          <em>température de surface</em>
        </div>
        <div className="wave-item">
          <span className="mini-label"><Timer size={12} /> Période</span>
          <strong>{current.wavePeriod !== null ? `${num(current.wavePeriod, 1)} s` : '—'}</strong>
          <em>{current.wavePeriod !== null && current.wavePeriod > 9 ? 'houle longue' : 'houle courte'}</em>
        </div>
        <div className="wave-item">
          <span className="mini-label"><ArrowUp size={12} /> Direction</span>
          <strong>{compassShort(direction)}</strong>
          <em>{compassLong(direction)}</em>
        </div>
        <div className="wave-item">
          <span className="mini-label"><Ruler size={12} /> État de mer</span>
          <strong>{seaStateLabel(current.wave)}</strong>
          <em>échelle Douglas</em>
        </div>
      </div>

      <div className="card-foot">
        <span className="source-tag">
          <Waves size={12} /> Modèle vague Open-Meteo
        </span>
        <span className="updated">{relativeMinutes(marine.fetchedAt)}</span>
      </div>
    </Card>
  );
}

/* ---------------------------------------------------------- marine forecast */

interface MarineForecastProps {
  marine: MarineData | null;
  loading: boolean;
  demoMode: boolean;
  delay?: number;
}

interface MarineRow {
  index: number;
  time: string;
  wave: number | null;
  period: number | null;
  direction: number | null;
  swell: number | null;
  swellPeriod: number | null;
  waterMax: number | null;
  waterMin: number | null;
}

export function MarineForecast({ marine, loading, demoMode, delay = 0 }: MarineForecastProps) {
  const head = (
    <CardHead
      kicker="Marine · 5 jours"
      title="Prévisions de houle et de vagues"
      icon={<Waves size={18} />}
      aside={
        <div className="head-links">
          <a className="link-btn" href={PORTAL_URLS.windguru} target="_blank" rel="noopener noreferrer">
            Windguru <ArrowUpRight size={12} />
          </a>
          <a className="link-btn" href={PORTAL_URLS.windy} target="_blank" rel="noopener noreferrer">
            Windy <ArrowUpRight size={12} />
          </a>
        </div>
      }
    />
  );

  if (loading && !marine) {
    return (
      <Card delay={delay}>
        {head}
        <DataSkeleton rows={5} />
      </Card>
    );
  }
  if (!marine || !marine.hasData) return null;

  const water = dailyWaterTemperature(marine);
  const rows: MarineRow[] = marine.daily.time.slice(0, 6).map((time, index) => ({
    index,
    time,
    wave: marine.daily.waveMax[index],
    period: marine.daily.wavePeriodMax[index],
    direction: marine.daily.waveDir[index],
    swell: marine.daily.swellMax[index],
    swellPeriod: marine.daily.swellPeriodMax[index],
    waterMax: marine.daily.waterTempMax[index] ?? water.max[index] ?? null,
    waterMin: marine.daily.waterTempMin[index] ?? water.min[index] ?? null,
  }));

  const columns: Column<MarineRow>[] = [
    {
      key: 'day',
      label: 'Jour',
      render: (row) => (
        <div className="cell-day">
          <strong>{row.index === 0 ? "Aujourd'hui" : row.index === 1 ? 'Demain' : weekday(row.time, true)}</strong>
          <span>{dayMonth(row.time)}</span>
        </div>
      ),
    },
    {
      key: 'wave',
      label: 'Vagues max.',
      align: 'right',
      render: (row) => (
        <span className="cell-strong">
          {row.wave !== null ? `${num(row.wave, 1)} m` : '—'}
          <em className="cell-sub">{seaStateLabel(row.wave)}</em>
        </span>
      ),
    },
    {
      key: 'period',
      label: 'Période',
      align: 'right',
      render: (row) => <span>{row.period !== null ? `${num(row.period, 1)} s` : '—'}</span>,
    },
    {
      key: 'direction',
      label: 'Direction',
      align: 'right',
      render: (row) => (
        <span>
          {compassShort(row.direction)}
          <em className="cell-sub">{compassLong(row.direction)}</em>
        </span>
      ),
    },
    {
      key: 'swell',
      label: 'Houle',
      align: 'right',
      render: (row) => (
        <span>
          {row.swell !== null ? `${num(row.swell, 1)} m` : '—'}
          <em className="cell-sub">{row.swellPeriod !== null ? `${num(row.swellPeriod, 1)} s` : '—'}</em>
        </span>
      ),
    },
    {
      key: 'water',
      label: 'Eau',
      align: 'right',
      hideOnMobile: true,
      render: (row) => (
        <span>
          {row.waterMax !== null ? temp(row.waterMax, 1) : '—'}
          <em className="cell-sub">min. {row.waterMin !== null ? temp(row.waterMin, 1) : '—'}</em>
        </span>
      ),
    },
  ];

  return (
    <Card className={`marine-forecast accent--indigo ${demoMode ? 'is-demo' : ''}`} delay={delay} id="marine">
      {head}
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.time}
        minWidth={680}
        caption="Prévisions marines sur cinq jours"
        footer={
          <tr>
            <td colSpan={columns.length} className="table__foot">
              <span>
                <Info size={12} /> Houle et vagues issues du modèle Open-Meteo (DWD / modèles européens 5 km). Pour la
                navigation, référez-vous aux bulletins officiels.
              </span>
            </td>
          </tr>
        }
      />
    </Card>
  );
}
