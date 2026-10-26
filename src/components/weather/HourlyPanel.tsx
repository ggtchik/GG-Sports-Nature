import { useState } from 'react';
import { Cloud, CloudRain, Compass, Gauge, Thermometer, Wind } from 'lucide-react';
import type { WeatherData } from '../../types';
import { findNowIndex } from '../../lib/api/weather';
import { clock, num, pct, relativeMinutes, temp } from '../../lib/format';
import { compassShort } from '../../lib/geo';
import { weatherInfo } from '../../lib/weatherCodes';
import { Card, CardHead, DataSkeleton, DataTable, ErrorState, Segmented } from '../ui/kit';
import type { Column } from '../ui/kit';
import { LineChart } from '../ui/LineChart';
import type { ChartSeries } from '../ui/LineChart';
import { WeatherGlyph } from '../ui/WeatherGlyph';

type Metric = 'temp' | 'wind' | 'rain' | 'pressure' | 'cloud';

const METRIC_OPTIONS: { value: Metric; label: string; icon: React.ReactNode }[] = [
  { value: 'temp', label: 'Température', icon: <Thermometer size={13} /> },
  { value: 'wind', label: 'Vent', icon: <Wind size={13} /> },
  { value: 'rain', label: 'Pluie', icon: <CloudRain size={13} /> },
  { value: 'pressure', label: 'Pression', icon: <Gauge size={13} /> },
  { value: 'cloud', label: 'Nuages', icon: <Cloud size={13} /> },
];

interface Row {
  index: number;
  time: string;
  code: number;
  temp: number;
  prob: number;
  precip: number;
  wind: number;
  gust: number;
  dir: number;
  pressure: number;
  cloud: number;
}

interface HourlyPanelProps {
  weather: WeatherData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onDemo: () => void;
  demoMode: boolean;
  delay?: number;
}

export function HourlyPanel({ weather, loading, error, onRetry, onDemo, demoMode, delay = 0 }: HourlyPanelProps) {
  const [metric, setMetric] = useState<Metric>('temp');
  const head = (
    <CardHead
      kicker="Évolution"
      title="Les prochaines 24 heures"
      icon={<Compass size={18} />}
      aside={
        <Segmented
          value={metric}
          options={METRIC_OPTIONS}
          onChange={setMetric}
          label="Indicateur du graphique"
          size="sm"
        />
      }
    />
  );

  if (loading && !weather) {
    return (
      <Card delay={delay}>
        {head}
        <DataSkeleton rows={6} />
      </Card>
    );
  }
  if (error && !weather) {
    return (
      <Card delay={delay}>
        {head}
        <ErrorState message={error} onRetry={onRetry} onDemo={onDemo} />
      </Card>
    );
  }
  if (!weather) return null;

  const start = findNowIndex(weather.hourly.time);
  const indexes = Array.from({ length: 24 }, (_, i) => start + i).filter(
    (index) => index < weather.hourly.time.length,
  );
  const labels = indexes.map((index) => weather.hourly.time[index]);
  const values = (key: keyof WeatherData['hourly']) =>
    indexes.map((index) => {
      const list = weather.hourly[key] as (number | boolean)[];
      const value = list[index];
      return typeof value === 'number' ? value : null;
    });

  let series: ChartSeries[] = [];
  let format = (value: number) => `${Math.round(value)}`;
  let xFormat = (label: string) => clock(label).replace(':00', 'h');
  let domain: [number, number] | undefined;
  let zeroBasedBars = false;

  if (metric === 'temp') {
    series = [
      { label: 'Température', color: 'var(--terracotta)', values: values('temp'), kind: 'area', unit: '°' },
      { label: 'Ressenti', color: 'var(--amber)', values: values('feels'), dashed: true, unit: '°' },
    ];
    format = (value) => `${Math.round(value)}°`;
  } else if (metric === 'wind') {
    series = [
      { label: 'Vent moyen', color: 'var(--ocean)', values: values('wind'), kind: 'area', unit: ' km/h' },
      { label: 'Rafales', color: 'var(--indigo)', values: values('gust'), dashed: true, unit: ' km/h' },
    ];
    format = (value) => `${Math.round(value)}`;
  } else if (metric === 'rain') {
    series = [
      { label: 'Probabilité', color: 'var(--ocean)', values: values('precipProb'), kind: 'bars', unit: ' %' },
    ];
    format = (value) => `${Math.round(value)}%`;
    domain = [0, 100];
    zeroBasedBars = true;
  } else if (metric === 'cloud') {
    series = [
      { label: 'Couverture nuageuse', color: 'var(--indigo)', values: values('cloud'), kind: 'area', unit: ' %' },
    ];
    format = (value) => `${Math.round(value)}%`;
    domain = [0, 100];
  } else {
    series = [
      { label: 'Pression', color: 'var(--sage)', values: values('pressure'), kind: 'area', unit: ' hPa' },
    ];
    format = (value) => `${Math.round(value)}`;
  }

  const rainTotal = indexes.reduce((sum, index) => sum + (weather.hourly.precip[index] || 0), 0);
  const maxProb = Math.max(...indexes.map((index) => weather.hourly.precipProb[index] ?? 0), 0);
  const maxGust = Math.max(...indexes.map((index) => weather.hourly.gust[index] ?? 0), 0);
  const maxTemp = Math.max(...indexes.map((index) => weather.hourly.temp[index] ?? -Infinity));
  const minTemp = Math.min(...indexes.map((index) => weather.hourly.temp[index] ?? Infinity));

  const rows: Row[] = indexes
    .map((index, position) => ({ index, position }))
    .filter(({ position }) => position % 3 === 0)
    .map(({ index }) => ({
      index,
      time: weather.hourly.time[index],
      code: weather.hourly.code[index],
      temp: weather.hourly.temp[index],
      prob: weather.hourly.precipProb[index],
      precip: weather.hourly.precip[index],
      wind: weather.hourly.wind[index],
      gust: weather.hourly.gust[index],
      dir: weather.hourly.windDir[index],
      pressure: weather.hourly.pressure[index],
      cloud: weather.hourly.cloud[index],
    }));

  const columns: Column<Row>[] = [
    {
      key: 'time',
      label: 'Heure',
      render: (row, position) => (
        <div className="cell-time">
          <strong>{clock(row.time)}</strong>
          <span>{position === 0 ? "aujourd'hui" : ''}</span>
        </div>
      ),
    },
    {
      key: 'sky',
      label: 'Ciel',
      render: (row) => {
        const info = weatherInfo(row.code);
        return (
          <span className="cell-sky">
            <WeatherGlyph code={row.code} size={24} />
            <span>
              {info.short}
              <em className="cell-sub">{Number.isFinite(row.cloud) ? `${Math.round(row.cloud)} % nuages` : ''}</em>
            </span>
          </span>
        );
      },
    },
    {
      key: 'temp',
      label: 'Temp.',
      align: 'right',
      render: (row) => (
        <span className="cell-strong">
          {temp(row.temp, 0)}
          <em className="cell-sub">{temp(weather.hourly.feels[row.index], 0)}</em>
        </span>
      ),
    },
    {
      key: 'rain',
      label: 'Pluie',
      align: 'right',
      render: (row) => (
        <span className={row.prob > 50 ? 'cell-wet' : ''}>
          {row.prob} %<em className="cell-sub">{row.precip > 0 ? `${num(row.precip, 1)} mm` : 'sec'}</em>
        </span>
      ),
    },
    {
      key: 'wind',
      label: 'Vent',
      align: 'right',
      render: (row) => (
        <span>
          {num(row.wind, 0)} km/h
          <em className="cell-sub">{compassShort(row.dir)}</em>
        </span>
      ),
    },
    {
      key: 'gust',
      label: 'Rafales',
      align: 'right',
      hideOnMobile: true,
      render: (row) => <span>{num(row.gust, 0)} km/h</span>,
    },
    {
      key: 'pressure',
      label: 'Pression',
      align: 'right',
      hideOnMobile: true,
      render: (row) => <span>{num(row.pressure, 0)} hPa</span>,
    },
  ];

  const summary =
    metric === 'temp'
      ? `${temp(minTemp, 0)} → ${temp(maxTemp, 0)} sur la période`
      : metric === 'wind'
        ? `Rafales jusqu’à ${num(maxGust, 0)} km/h`
        : metric === 'rain'
          ? `${pct(maxProb)} de risque max · ${num(rainTotal, 1)} mm cumulés`
          : metric === 'cloud'
            ? `${pct(
                indexes.reduce((sum, index) => sum + (weather.hourly.cloud[index] || 0), 0) / Math.max(1, indexes.length),
                0,
              )} de ciel couvert en moyenne`
            : `Pression ${num(Math.min(...indexes.map((i) => weather.hourly.pressure[i])), 0)}–${num(
                Math.max(...indexes.map((i) => weather.hourly.pressure[i])),
                0,
              )} hPa`;

  return (
    <Card className={`hourly accent--terracotta ${demoMode ? 'is-demo' : ''}`} delay={delay}>
      {head}

      <p className="chart-summary">{summary}</p>
      <LineChart
        labels={labels}
        series={series}
        height={214}
        format={format}
        xFormat={xFormat}
        yDomain={domain}
        zeroBasedBars={zeroBasedBars}
        nowIndex={0}
        ariaLabel="Évolution horaire sur 24 heures"
      />

      <div className="hourly__table">
        <div className="hourly__table-head">
          <h3>Détail sur 24 h</h3>
          <span className="updated">Source Open-Meteo · {relativeMinutes(weather.fetchedAt)}</span>
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.time}
          dense
          minWidth={620}
          caption="Évolution météo sur 24 heures"
        />
      </div>
    </Card>
  );
}
