import { ArrowUpRight, CalendarDays, CloudRain, ThermometerSun } from 'lucide-react';
import type { ClimateData } from '../../types';
import { num, temp } from '../../lib/format';
import { Card, CardHead, DataSkeleton, ErrorState } from '../ui/kit';
import { LineChart } from '../ui/LineChart';

interface ClimateCardProps {
  climate: ClimateData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onDemo: () => void;
  demoMode: boolean;
  spotName: string;
  delay?: number;
}

const ARCHIVE_LINK = 'https://open-meteo.com/en/docs/historical-weather-api';
const CLIMAT_LINK = 'https://meteofrance.com/climat/france';
const rangeFmt = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric' });

function formatRange(value: string): string {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : rangeFmt.format(date);
}

export function ClimateCard({
  climate,
  loading,
  error,
  onRetry,
  onDemo,
  demoMode,
  spotName,
  delay = 0,
}: ClimateCardProps) {
  if (loading && !climate) {
    return (
      <Card className="climate" delay={delay} id="climat">
        <CardHead
          kicker="Climat · évolution mensuelle"
          title="L’année en un regard"
          icon={<CalendarDays size={18} />}
        />
        <DataSkeleton rows={5} />
      </Card>
    );
  }

  if (error && !climate) {
    return (
      <Card className="climate" delay={delay} id="climat">
        <CardHead
          kicker="Climat · évolution mensuelle"
          title="L’année en un regard"
          icon={<CalendarDays size={18} />}
        />
        <ErrorState
          title="Climatologie indisponible"
          message={error}
          onRetry={onRetry}
          onDemo={onDemo}
        />
      </Card>
    );
  }

  if (!climate || climate.months.length === 0) return null;

  const months = climate.months;
  const average = months.reduce((total, month) => total + month.mean, 0) / months.length;
  const rainTotal = months.reduce((total, month) => total + month.rain, 0);
  const warmest = months.reduce((best, month) => (month.mean > best.mean ? month : best), months[0]);
  const coolest = months.reduce((best, month) => (month.mean < best.mean ? month : best), months[0]);
  const amplitude = warmest.mean - coolest.mean;

  return (
    <Card className={`climate${demoMode ? ' is-demo' : ''}`} delay={delay} id="climat">
      <CardHead
        kicker="Climat · 12 derniers mois"
        title="L’année en un regard"
        icon={<CalendarDays size={18} />}
        aside={
          <>
            <span className="badge badge--terracotta">
              <ThermometerSun size={12} /> Moyenne {temp(average, 1)}
            </span>
            <span className="badge badge--ocean">
              <CloudRain size={12} /> {num(rainTotal, 0)} mm
            </span>
          </>
        }
      />

      <p className="chart-summary">
        Évolution mensuelle des températures à <strong>{spotName}</strong> — amplitude de {temp(amplitude, 1)}{' '}
        entre {coolest.short} et {warmest.short}.
      </p>

      <div className="climate__chart">
        <LineChart
          labels={months.map((month) => month.short)}
          series={[
            { label: 'Moyenne', color: 'var(--terracotta)', values: months.map((month) => month.mean), kind: 'area', unit: ' °C' },
            { label: 'Maximale', color: 'var(--amber)', values: months.map((month) => month.max), dashed: true, unit: ' °C' },
            { label: 'Minimale', color: 'var(--ocean)', values: months.map((month) => month.min), dashed: true, unit: ' °C' },
          ]}
          height={218}
          format={(value) => `${Math.round(value)}°`}
          ariaLabel={`Courbe d’évolution mensuelle des températures à ${spotName}`}
        />
        <ul className="chart-legend">
          <li>
            <span className="chart-legend__swatch" style={{ background: 'var(--terracotta)' }} /> Moyenne
          </li>
          <li>
            <span className="chart-legend__swatch" style={{ background: 'var(--amber)' }} /> Maximale
          </li>
          <li>
            <span className="chart-legend__swatch" style={{ background: 'var(--ocean)' }} /> Minimale
          </li>
          <li className="chart-legend__unit">Températures moyennes mensuelles, °C</li>
        </ul>
      </div>

      <div className="table-wrap climate__table">
        <table className="table table--dense climate-table">
          <caption className="sr-only">
            Moyennes mensuelles de température et cumul de précipitations sur les douze derniers mois à {spotName}
          </caption>
          <thead>
            <tr>
              <th scope="col">Mois</th>
              {months.map((month) => (
                <th key={month.key} scope="col" className="is-right">
                  {month.short}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Moyenne <span className="climate-unit">°C</span></th>
              {months.map((month) => (
                <td key={month.key} className="is-right cell-strong">
                  {temp(month.mean, 1)}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">Minimale <span className="climate-unit">°C</span></th>
              {months.map((month) => (
                <td key={month.key} className="is-right">
                  {temp(month.min, 1)}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">Maximale <span className="climate-unit">°C</span></th>
              {months.map((month) => (
                <td key={month.key} className="is-right">
                  {temp(month.max, 1)}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">Pluie <span className="climate-unit">mm</span></th>
              {months.map((month) => (
                <td key={month.key} className="is-right cell-wet">
                  {num(month.rain, 0)}
                </td>
              ))}
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={months.length + 1}>
                <span>
                  Cumul de pluie sur 12 mois : <strong>{num(rainTotal, 0)} mm</strong> · {num(climate.months.reduce((total, month) => total + month.days, 0), 0)} jours observés
                </span>
                <span>
                  {formatRange(climate.startDate)} → {formatRange(climate.endDate)}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="card-foot">
        <span className="source-tag">
          <CalendarDays size={12} /> {demoMode ? 'Climatologie simulée' : 'Réanalyse ERA5 · Open-Meteo Archive'}
        </span>
        <span className="card-foot__links">
          <a className="link-btn" href={ARCHIVE_LINK} target="_blank" rel="noopener noreferrer">
            Open-Meteo Archive <ArrowUpRight size={11} />
          </a>
          <a className="link-btn" href={CLIMAT_LINK} target="_blank" rel="noopener noreferrer">
            Climat Météo-France <ArrowUpRight size={11} />
          </a>
        </span>
      </div>
    </Card>
  );
}
