import { useEffect, useMemo, useState } from 'react';
import type { MilieuMode, Spot } from '../../core/types';
import { ACTIVITIES, ACTIVITY_MAP } from '../../core/activities';
import { useApp } from '../../state/AppContext';
import { useDashboard } from '../../hooks/useDashboard';
import { SourceFooter } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { Segmented } from '../ui/Segmented';
import { SpotAccessCard } from '../modules/SpotAccessCard';
import { MapCard } from '../modules/MapCard';
import { CurrentWeatherCard } from '../modules/CurrentWeatherCard';
import { EvolutionCard } from '../modules/EvolutionCard';
import { AstroCard } from '../modules/AstroCard';
import { TidesCard } from '../modules/TidesCard';
import { MarineCard } from '../modules/MarineCard';
import { MarineForecastCard } from '../modules/MarineForecastCard';
import { WaterTemperatureCard } from '../modules/WaterTemperatureCard';
import { HydrologyCard } from '../modules/HydrologyCard';
import { ForecastCard } from '../modules/ForecastCard';
import { CostsCard } from '../modules/CostsCard';
import { SourcesCard } from '../modules/SourcesCard';
import type { SourceRowModel } from '../modules/SourcesCard';
import { deviceTime, stampLocal } from '../../core/format';
import { SOURCES } from '../../core/sources';

const EMPTY_STATIONS: never[] = [];

interface Props {
  spot: Spot;
  onEditSpot: () => void;
  onOpenSettings: () => void;
  onOpenMethod: () => void;
  onChangeSetup: () => void;
}

export function Dashboard({ spot, onEditSpot, onOpenSettings, onOpenMethod, onChangeSetup }: Props) {
  const { settings, units, updateSettings, updateSpot } = useApp();
  const data = useDashboard(spot, settings.start, settings.activity, settings.mareeKey, settings.refreshMinutes);
  const activity = ACTIVITY_MAP[settings.activity];
  const [updatedAt, setUpdatedAt] = useState<number>(Date.now());
  const stations = useMemo(() => data.hydro.data?.stations ?? [], [data.hydro.data]);

  useEffect(() => {
    setUpdatedAt(Date.now());
  }, [data.lastUpdate]);

  const marineContext = data.plan.marine;

  const sourceRows: SourceRowModel[] = [
    {
      module: 'Météo — conditions et prévisions',
      sources: [SOURCES['open-meteo']],
      state: data.weather.state,
      fetchedAt: data.weather.fetchedAt,
      error: data.weather.error,
    },
    {
      module: 'Milieu — distance au littoral',
      sources: [SOURCES.overpass, SOURCES['natural-earth']],
      state: data.coast.state,
      fetchedAt: data.coast.fetchedAt,
      error: data.coast.error,
    },
    ...(data.plan.coastal || data.plan.waterTemperature
      ? [
          {
            module: 'Marine — houle, vagues, température de l’eau',
            sources: [SOURCES['open-meteo-marine']],
            state: data.marine.state,
            fetchedAt: data.marine.fetchedAt,
            error: data.marine.error,
          },
        ]
      : []),
    ...(data.plan.coastal
      ? [
          {
            module: 'Marées',
            sources:
              data.tides.data?.source === 'api-maree'
                ? [SOURCES['api-maree'], SOURCES.shom]
                : [SOURCES['open-meteo-marine'], SOURCES.shom],
            state: data.tides.state,
            fetchedAt: data.tides.fetchedAt,
            error: data.tides.error,
          },
        ]
      : []),
    ...(data.plan.hydrology
      ? [
          {
            module: 'Hydrologie — stations proches',
            sources: [SOURCES.hubeau, SOURCES.vigicrues],
            state: data.hydro.state,
            fetchedAt: data.hydro.fetchedAt,
            error: data.hydro.error,
          },
        ]
      : []),
    ...(settings.start
      ? [
          {
            module: 'Distance et durée du trajet',
            sources: [SOURCES.osrm],
            state: data.route.state,
            fetchedAt: data.route.fetchedAt,
            error: data.route.error,
          },
        ]
      : []),
    {
      module: 'Astronomie',
      sources: [SOURCES.suncalc],
      state: data.astro ? 'ok' : 'idle',
      fetchedAt: Date.now(),
    },
  ];

  return (
    <>
      <header className="dash-head">
        <div className="dash-head__titles">
          <div className="pill-row">
            <span className="eyebrow">Tableau de bord</span>
            <span className="chip chip--brand">
              <span className="chip__emoji">{activity?.emoji}</span> {activity?.label}
            </span>
            <span className={`chip ${data.milieu === 'mer' ? 'chip--sea' : 'chip--earth'}`}>
              <Icon name={data.milieu === 'mer' ? 'waves' : 'mountain'} size={13} />
              {data.milieu === 'mer' ? 'MER' : 'EAU DOUCE'}
              {data.milieuAuto ? ' · auto' : ' · imposé'}
            </span>
          </div>
          <h1 className="dash-head__spot">
            {spot.name}
            {spot.commune && <span className="tiny dim" style={{ fontFamily: 'var(--font-sans)', fontWeight: 500 }}>{spot.commune}</span>}
          </h1>
          <div className="dash-head__meta">
            <span>
              <Icon name="clock" size={12} /> Actualisé à {deviceTime(updatedAt)} · actualisation{' '}
              {settings.refreshMinutes > 0 ? `toutes les ${settings.refreshMinutes} min` : 'manuelle'}
            </span>
            {data.weather.data && (
              <span>· Passe météo {data.weather.data.current.time.slice(11, 16).replace(':', 'h')}</span>
            )}
          </div>
        </div>
        <div className="dash-head__actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={onChangeSetup}>
            <Icon name="search" size={14} /> Changer
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onEditSpot}>
            <Icon name="edit" size={14} /> Spot
          </button>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={data.refresh}
            disabled={data.refreshing}
            title="Actualiser toutes les sources"
          >
            <Icon
              name="refresh"
              size={14}
              style={{ transition: 'transform .6s ease', transform: data.refreshing ? 'rotate(180deg)' : 'none' }}
            />
            Actualiser
          </button>
        </div>
      </header>

      <div className="dash-toolbar">
        <div className="dash-toolbar__group">
          <label className="inline" style={{ gap: 6 }}>
            <span className="eyebrow">Activité</span>
            <select
              className="select"
              style={{ height: 34, width: 'auto', minWidth: 130 }}
              value={settings.activity}
              onChange={(event) => updateSettings({ activity: event.target.value as typeof settings.activity })}
              aria-label="Activité"
            >
              {ACTIVITIES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.emoji} {item.label}
                </option>
              ))}
            </select>
          </label>
          <span className="eyebrow" style={{ marginLeft: 6 }}>
            Milieu
          </span>
          <Segmented
            label="Milieu"
            size="sm"
            value={spot.milieu as MilieuMode}
            onChange={(value) => updateSpot(spot.id, { milieu: value })}
            options={[
              { value: 'auto', label: 'AUTO' },
              { value: 'mer', label: 'MER' },
              { value: 'eau_douce', label: 'EAU DOUCE' },
            ]}
          />
        </div>
        <div className="dash-toolbar__group">
          <span className="eyebrow">Unités</span>
          <Segmented
            label="Unités"
            size="sm"
            value={settings.units}
            onChange={(value) => updateSettings({ units: value })}
            options={[
              { value: 'standard', label: 'STANDARD' },
              { value: 'nautical', label: 'NAUTIQUE' },
              { value: 'dual', label: 'DOUBLE' },
            ]}
          />
          <button type="button" className="icon-btn icon-btn--bordered" onClick={onOpenSettings} aria-label="Réglages">
            <Icon name="settings" size={16} />
          </button>
        </div>
      </div>

      {activity?.family === 'terrestre' && data.milieu === 'mer' && (
        <p className="note note--box" style={{ marginBottom: 16 }}>
          <Icon name="info" size={12} /> Activité terrestre sur un spot maritime : les modules maritimes (marées, houle,
          vagues) sont volontairement masqués.
        </p>
      )}

      {data.coastNotes.length > 0 && (
        <p className="note" style={{ marginBottom: 16 }}>
          {data.coastNotes.map((note) => (
            <span key={note}>{note} </span>
          ))}
        </p>
      )}

      <div className="grid">
        <div className="span-5">
          <SpotAccessCard
            spot={spot}
            start={settings.start}
            route={data.route}
            coast={data.coast}
            milieu={data.milieu}
            milieuAuto={data.milieuAuto}
            milieuReason={data.milieuReason}
            onEdit={onEditSpot}
          />
        </div>
        <div className="span-7">
          <MapCard
            spot={spot}
            start={settings.start}
            stations={data.plan.hydrology ? stations : EMPTY_STATIONS}
            milieu={data.milieu}
            showMarine={data.milieu === 'mer'}
            showHydro={data.plan.hydrology}
            showWaterways={data.plan.hydrology || (activity.id === 'natation' && data.milieu !== 'mer')}
          />
        </div>

        <div className="span-12">
          <CurrentWeatherCard weather={data.weather} marineContext={marineContext} />
        </div>

        <div className="span-8">
          <EvolutionCard weather={data.weather} wallNow={data.wallNow} marineContext={marineContext} />
        </div>
        <div className="span-4">
          <AstroCard astro={data.astro} weather={data.weather.data} wallNow={data.wallNow} />
        </div>

        {data.plan.coastal && (
          <>
            <div className="span-7">
              <TidesCard tides={data.tides} wallNow={data.wallNow} onConfigureKey={onOpenSettings} />
            </div>
            <div className="span-5">
              <MarineCard marine={data.marine} wallNow={data.wallNow} />
            </div>
          </>
        )}

        {data.plan.hydrology && (
          <div className="span-12">
            <HydrologyCard hydro={data.hydro} />
          </div>
        )}

        {data.plan.coastal && (
          <div className={data.plan.waterTemperature ? 'span-7' : 'span-12'}>
            <MarineForecastCard marine={data.marine} />
          </div>
        )}

        {data.plan.waterTemperature && (
          <div className={data.plan.coastal ? 'span-5' : 'span-12'}>
            <WaterTemperatureCard marine={data.marine} milieu={data.milieu} />
          </div>
        )}

        <div className="span-12">
          <ForecastCard weather={data.weather} marineContext={marineContext} />
        </div>

        <div className="span-6">
          <SourcesCard
            rows={[
              ...sourceRows,
              {
                module: 'Recherche de lieux (géocodage)',
                sources: [SOURCES.ban, SOURCES.nominatim],
                state: 'ok',
                fetchedAt: Date.now(),
              },
            ]}
            onOpenMethod={onOpenMethod}
          />
        </div>
        <div className="span-6">
          <CostsCard route={data.route} />
        </div>
      </div>

      <div style={{ marginTop: 22 }}>
        <SourceFooter
          sources={['open-meteo', 'open-meteo-marine', 'hubeau', 'overpass', 'suncalc']}
          note={`Données consultées le ${stampLocal(Date.now())} — fuseau du spot : ${data.weather.data?.timezone ?? 'local'} · ${units.mode}`}
        />
      </div>
    </>
  );
}
