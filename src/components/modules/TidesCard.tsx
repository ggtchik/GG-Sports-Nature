import { useMemo } from 'react';
import type { ModuleState, TideInfo } from '../../core/types';
import { dayShort, num, timeOf } from '../../core/format';
import { nextTideEvent, tideEventsForDay } from '../../core/tides';
import { useApp } from '../../state/AppContext';
import { Card, SourceFooter } from '../ui/Card';
import { LineChart } from '../charts/LineChart';
import { Icon } from '../ui/Icon';
import { LoadingBlock, UnavailableBlock } from '../ui/States';

interface Props {
  tides: ModuleState<TideInfo>;
  wallNow: string;
  onConfigureKey: () => void;
}

function countdown(eventTime: string, wallNow: string): string {
  const diff = (Date.parse(`${eventTime}:00Z`) - Date.parse(`${wallNow}:00Z`)) / 60000;
  if (!Number.isFinite(diff) || diff < 0) return '';
  const hours = Math.floor(diff / 60);
  const minutes = Math.round(diff % 60);
  if (hours <= 0) return `dans ${minutes} min`;
  return `dans ${hours} h ${String(minutes).padStart(2, '0')}`;
}

export function TidesCard({ tides, wallNow, onConfigureKey }: Props) {
  const { units } = useApp();

  const chart = useMemo(() => {
    if (!tides.data) return null;
    const today = wallNow.slice(0, 10);
    const points = tides.data.series.filter((p) => p.time >= `${today}T00:00` && p.time <= `${today}T23:59`);
    if (points.length < 4) return null;
    const labels = points.map((p) => p.time);
    const markers = (tides.data.events ?? [])
      .filter((e) => e.time.slice(0, 10) === today)
      .map((e) => {
        const index = points.findIndex((p) => p.time >= e.time);
        return index === -1 ? null : { index, label: `${e.type === 'high' ? 'PM' : 'BM'} ${timeOf(e.time)}`, color: e.type === 'high' ? 'var(--sea)' : 'var(--ink-3)' };
      })
      .filter((m): m is { index: number; label: string; color: string } => m !== null);
    return { labels, values: points.map((p) => p.height), markers };
  }, [tides.data, wallNow]);

  if (tides.state === 'loading' || tides.state === 'idle') {
    return (
      <Card title="Marées" icon="anchor">
        <LoadingBlock lines={3} />
      </Card>
    );
  }

  if (tides.state !== 'ok' || !tides.data) {
    return (
      <Card title="Marées" icon="anchor" tone="sea">
        <UnavailableBlock title="Marées indisponibles pour ce point">
          {tides.error ?? 'Aucune donnée de marée disponible.'}
          <div style={{ marginTop: 8 }}>
            <a href="https://maree.info/" target="_blank" rel="noreferrer noopener">
              Consulter un annuaire de marées (maree.info)
            </a>{' '}
            ·{' '}
            <a href="https://diffusion.shom.fr/marees/marees_a_la_carte.html" target="_blank" rel="noreferrer noopener">
              Prédictions officielles SHOM
            </a>
          </div>
        </UnavailableBlock>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onConfigureKey}>
          <Icon name="settings" size={14} /> Activer api-maree.fr (clé personnelle)
        </button>
      </Card>
    );
  }

  const info = tides.data;
  const next = nextTideEvent(info, wallNow);
  const todayEvents = tideEventsForDay(info, wallNow.slice(0, 10));
  const upcomingDays = [...new Set(info.events.map((e) => e.time.slice(0, 10)))]
    .filter((date) => date > wallNow.slice(0, 10))
    .slice(0, 4);

  return (
    <Card
      title="Marées"
      icon="anchor"
      tone="sea"
      subtitle={
        info.source === 'api-maree'
          ? `Port de référence : ${info.stationLabel}`
          : 'Hauteur d’eau du modèle — aucun coefficient'
      }
      footer={
        <SourceFooter
          sources={[info.source === 'api-maree' ? 'api-maree' : 'open-meteo-marine', 'shom']}
          fetchedAt={tides.fetchedAt}
          note={info.source === 'api-maree' ? 'Coefficients non officiels' : 'Réf. niveau moyen de la mer'}
        />
      }
    >
      {next && (
        <div className="tide-next">
          <div>
            <div className="eyebrow">{next.type === 'high' ? 'Prochaine pleine mer' : 'Prochaine basse mer'}</div>
            <div className="tide-next__time num">{timeOf(next.time)}</div>
          </div>
          <div style={{ paddingBottom: 6 }}>
            <div className="chip chip--sea">{units.tideHeight(next.height)}</div>
            <div className="tiny dim" style={{ marginTop: 4 }}>
              {countdown(next.time, wallNow)} · {dayShort(next.time.slice(0, 10))}
            </div>
          </div>
        </div>
      )}

      {todayEvents.length > 0 && (
        <div className="tide-events">
          {todayEvents.map((event) => (
            <div className="tide-event" key={`${event.type}-${event.time}`}>
              <span className="tide-event__type">{event.type === 'high' ? 'PM' : 'BM'}</span>
              <span className="tide-event__time num">{timeOf(event.time)}</span>
              <span className="tide-event__height">
                {units.tideHeight(event.height)}
                {event.coefficient ? ` · coef. ${event.coefficient}` : ''}
              </span>
            </div>
          ))}
        </div>
      )}

      {chart && (
        <LineChart
          labels={chart.labels}
          height={150}
          ariaLabel="Hauteur d’eau au cours de la journée"
          yFormat={(v) => num(v, 1)}
          xFormat={(label) => timeOf(label)}
          markers={chart.markers}
          highlightIndex={null}
          series={[{ label: 'Hauteur d’eau (m)', values: chart.values, color: 'var(--sea)', fill: true }]}
        />
      )}

      <div className="stats">
        <div className="stat stat--plain">
          <span className="stat__label">Marnage du jour</span>
          <span className="stat__value">{num(info.range, 2)} m</span>
        </div>
        <div className="stat stat--plain">
          <span className="stat__label">Coefficient</span>
          <span className="stat__value">
            {info.coefficient !== null ? (
              <>
                {info.coefficient} <span className="tiny dim">non officiel</span>
              </>
            ) : (
              <span className="tiny" style={{ fontWeight: 500 }}>
                non disponible
              </span>
            )}
          </span>
        </div>
        <div className="stat stat--plain">
          <span className="stat__label">Référentiel</span>
          <span className="stat__value tiny" style={{ fontWeight: 500 }}>
            {info.reference === 'ZH' ? 'zéro hydrographique' : 'niveau moyen (MSL)'}
          </span>
        </div>
      </div>

      {info.coefficient === null && (
        <div className="note note--box">
          Le coefficient de marée est une donnée SHOM non ouverte (API payante) ; il n’est pas calculé ici pour ne pas
          afficher une valeur inventée. Renseignez votre clé <a href="https://api-maree.fr/documentation" target="_blank" rel="noreferrer noopener">api-maree.fr</a> pour
          obtenir les horaires de pleine/basse mer et les coefficients.{' '}
          <button type="button" className="btn btn--quiet btn--sm" onClick={onConfigureKey} style={{ height: 24 }}>
            Configurer
          </button>
        </div>
      )}

      {info.source === 'open-meteo-model' && (
        <p className="note">
          Les heures de pleine et basse mer sont extraites de la courbe du modèle (pas horaire, interpolation
          parabolique) : elles peuvent s’écarter de plusieurs minutes des prédictions officielles. Le modèle ne tient
          pas compte des surcotes/décotes météorologiques.
        </p>
      )}

      {upcomingDays.length > 0 && (
        <div className="stack">
          <span className="eyebrow">Jours suivants</span>
          {upcomingDays.map((date) => (
            <div className="row" key={date} style={{ alignItems: 'flex-start' }}>
              <span className="tiny muted" style={{ minWidth: 74, textTransform: 'capitalize' }}>
                {dayShort(date)}
              </span>
              <span className="tiny" style={{ textAlign: 'right' }}>
                {tideEventsForDay(info, date)
                  .map((event) => `${event.type === 'high' ? 'PM' : 'BM'} ${timeOf(event.time)} (${num(event.height, 2)} m)`)
                  .join(' · ')}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
