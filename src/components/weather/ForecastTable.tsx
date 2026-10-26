import { ArrowDown, ArrowUp, CalendarDays, CloudRain, Sun, Wind } from 'lucide-react';
import type { WeatherData } from '../../types';
import { dayMonth, num, pct, relativeMinutes, temp, weekday } from '../../lib/format';
import { compassShort } from '../../lib/geo';
import { uvLabel, weatherInfo } from '../../lib/weatherCodes';
import { Card, CardHead, DataSkeleton, DataTable, ErrorState } from '../ui/kit';
import type { Column } from '../ui/kit';
import { LineChart } from '../ui/LineChart';
import { WeatherGlyph } from '../ui/WeatherGlyph';

interface DayRow {
  index: number;
  time: string;
  code: number;
  tMax: number;
  tMin: number;
  prob: number;
  precip: number;
  wind: number;
  gust: number;
  dir: number;
  pressure: number;
  uv: number;
  humidity: number;
  clouds: number;
}

interface ForecastTableProps {
  weather: WeatherData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onDemo: () => void;
  demoMode: boolean;
  onOpenMeteo: () => void;
  delay?: number;
}

const dayLabel = (time: string, index: number): string => {
  if (index === 0) return "Aujourd'hui";
  if (index === 1) return 'Demain';
  return weekday(time, true);
};

export function ForecastTable({
  weather,
  loading,
  error,
  onRetry,
  onDemo,
  demoMode,
  onOpenMeteo,
  delay = 0,
}: ForecastTableProps) {
  if (loading && !weather) {
    return (
      <Card delay={delay}>
        <CardHead kicker="Tendance" title="Prévisions 5 jours" icon={<CalendarDays size={18} />} />
        <DataSkeleton rows={6} />
      </Card>
    );
  }
  if (error && !weather) {
    return (
      <Card delay={delay}>
        <CardHead kicker="Tendance" title="Prévisions 5 jours" icon={<CalendarDays size={18} />} />
        <ErrorState message={error} onRetry={onRetry} onDemo={onDemo} />
      </Card>
    );
  }
  if (!weather) return null;

  const count = Math.min(6, weather.daily.time.length);
  const rows: DayRow[] = weather.daily.time.slice(0, count).map((time, index) => ({
    index,
    time,
    code: weather.daily.code[index],
    tMax: weather.daily.tMax[index],
    tMin: weather.daily.tMin[index],
    prob: weather.daily.precipProb[index],
    precip: weather.daily.precipSum[index],
    wind: weather.daily.windMax[index],
    gust: weather.daily.gustMax[index],
    dir: weather.daily.windDir[index],
    pressure: weather.daily.pressure[index],
    uv: weather.daily.uv[index],
    humidity: weather.daily.humidity[index],
    clouds: weather.daily.cloud[index],
  }));

  const lows = rows.map((row) => row.tMin).filter(Number.isFinite);
  const highs = rows.map((row) => row.tMax).filter(Number.isFinite);
  const globalMin = Math.min(...lows);
  const globalMax = Math.max(...highs);
  const spread = Math.max(1, globalMax - globalMin);

  const columns: Column<DayRow>[] = [
    {
      key: 'day',
      label: 'Jour',
      render: (row) => (
        <div className="cell-day">
          <strong>{dayLabel(row.time, row.index)}</strong>
          <span>{dayMonth(row.time)}</span>
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
            <WeatherGlyph code={row.code} size={26} />
            <span>
              {info.short}
              <em className="cell-sub">{row.clouds ? `${Math.round(row.clouds)} % nuages` : ''}</em>
            </span>
          </span>
        );
      },
    },
    {
      key: 'temp',
      label: 'Températures',
      render: (row) => {
        const left = ((row.tMin - globalMin) / spread) * 100;
        const width = Math.max(6, ((row.tMax - row.tMin) / spread) * 100);
        return (
          <div className="temp-range">
            <span className="temp-range__min">{temp(row.tMin, 0)}</span>
            <span className="temp-range__bar">
              <span style={{ left: `${Math.max(0, Math.min(94, left))}%`, width: `${Math.min(100, width)}%` }} />
            </span>
            <span className="temp-range__max">{temp(row.tMax, 0)}</span>
          </div>
        );
      },
    },
    {
      key: 'rain',
      label: 'Pluie',
      align: 'right',
      render: (row) => (
        <span className={row.prob >= 50 ? 'cell-wet' : ''}>
          <CloudRain size={13} aria-hidden="true" /> {pct(row.prob, 0)}
          <em className="cell-sub">{row.precip > 0 ? `${num(row.precip, 1)} mm` : 'sec'}</em>
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
          <em className="cell-sub">
            {compassShort(row.dir)} · raf. {num(row.gust, 0)}
          </em>
        </span>
      ),
    },
    {
      key: 'pressure',
      label: 'Pression',
      align: 'right',
      hideOnMobile: true,
      render: (row) => (
        <span>
          {num(row.pressure, 0)}
          <em className="cell-sub">hPa</em>
        </span>
      ),
    },
    {
      key: 'uv',
      label: 'UV',
      align: 'right',
      render: (row) => (
        <span>
          {num(row.uv, 1).replace(',0', '')}
          <em className="cell-sub">{uvLabel(row.uv).label}</em>
        </span>
      ),
    },
    {
      key: 'humidity',
      label: 'Humidité',
      align: 'right',
      hideOnMobile: true,
      render: (row) => <span>{pct(row.humidity, 0)}</span>,
    },
  ];

  return (
    <Card className={`forecast accent--amber ${demoMode ? 'is-demo' : ''}`} delay={delay} id="previsions">
      <CardHead
        kicker="Tendance · 5 jours"
        title="La semaine à venir"
        icon={<CalendarDays size={18} />}
        aside={
          <button type="button" className="link-btn" onClick={onOpenMeteo}>
            <Sun size={13} /> Voir Météo-France
          </button>
        }
      />

      <div className="forecast__chart">
        <LineChart
          labels={rows.map((row) => row.time)}
          series={[
            {
              label: 'Maximales',
              color: 'var(--terracotta)',
              values: rows.map((row) => row.tMax),
              kind: 'area',
              unit: '°',
            },
            {
              label: 'Minimales',
              color: 'var(--ocean)',
              values: rows.map((row) => row.tMin),
              kind: 'line',
              unit: '°',
            },
          ]}
          height={168}
          format={(value) => `${Math.round(value)}°`}
          xFormat={(label) => weekday(label)}
          ariaLabel="Températures maximales et minimales sur cinq jours"
        />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.time}
        minWidth={780}
        caption="Prévisions météo sur cinq jours"
        footer={
          <tr>
            <td colSpan={columns.length} className="table__foot">
              <span>
                <Wind size={12} /> Prévisions issues du modèle Open-Meteo. Consultez Météo-France pour la vigilance
                officielle.
              </span>
              <span className="updated">Actualisé {relativeMinutes(weather.fetchedAt)}</span>
            </td>
          </tr>
        }
      />

      <div className="forecast__legend">
        <span>
          <ArrowUp size={12} /> maximales
        </span>
        <span>
          <ArrowDown size={12} /> minimales
        </span>
        <span className="forecast__legend-grow" />
        <span className="updated">Heures locales</span>
      </div>
    </Card>
  );
}
