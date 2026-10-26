import {
  ArrowUpRight,
  Cloud,
  Compass,
  Droplets,
  MapPinned,
  RefreshCw,
  Sun,
  Thermometer,
  Waves,
  Wind,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type {
  ActivityDef,
  BasePosition,
  CoastInfo,
  Environment,
  Spot,
  TideInfo,
  WeatherData,
} from '../../types';
import { clock, fullDate, km, minutes, num, temp, timeAgoLabel } from '../../lib/format';
import { compassLong, compassShort } from '../../lib/geo';
import { uvLabel, weatherInfo, windLabel } from '../../lib/weatherCodes';
import type { SkyData } from '../../lib/astro';
import { ActivityIcon } from '../ui/ActivityIcon';
import { Badge, IconButton, Skeleton, Spinner } from '../ui/kit';
import { WeatherGlyph } from '../ui/WeatherGlyph';

interface KpiTileProps {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  unit?: string;
  sub?: ReactNode;
  accent?: 'sun' | 'wind' | 'tide' | 'uv';
  loading?: boolean;
}

function KpiTile({ icon, label, value, unit, sub, accent = 'sun', loading }: KpiTileProps) {
  return (
    <div className={`kpi kpi--${accent}`}>
      <div className="kpi__top">
        <span className="kpi__icon">{icon}</span>
        <span className="kpi__label">{label}</span>
      </div>
      {loading ? (
        <Skeleton width="70%" height={30} radius={9} />
      ) : (
        <p className="kpi__value">
          {value}
          {unit ? <em>{unit}</em> : null}
        </p>
      )}
      <p className="kpi__sub">{sub}</p>
    </div>
  );
}

interface HeroProps {
  spot: Spot;
  activity: ActivityDef;
  environment: Environment;
  coast: CoastInfo;
  distanceKm: number | null;
  position: BasePosition;
  weather: WeatherData | null;
  weatherLoading: boolean;
  weatherError: string | null;
  tides: TideInfo | null;
  sky: SkyData;
  demoMode: boolean;
  refreshing: boolean;
  onOpenSpot: () => void;
  onRefresh: () => void;
  lastUpdated: number | null;
}

export function Hero({
  spot,
  activity,
  environment,
  coast,
  distanceKm,
  position,
  weather,
  weatherLoading,
  weatherError,
  tides,
  sky,
  demoMode,
  refreshing,
  onOpenSpot,
  onRefresh,
  lastUpdated,
}: HeroProps) {
  const current = weather?.current;
  const info = weatherInfo(current?.code);
  const uv = uvLabel(current?.uv);
  const marineTurn = activity.water && environment === 'mer';
  const tide = tides?.nextHigh ?? tides?.nextLow ?? null;
  const nextSun = sky.nextSunEvent;
  const sunIn = nextSun ? minutes((nextSun.time.getTime() - Date.now()) / 60000) : null;

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${position.lat},${position.lon}&destination=${spot.lat},${spot.lon}&travelmode=driving`;

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero__decor" aria-hidden="true">
        <svg viewBox="0 0 800 420" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="hero-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--hero-glow-a)" stopOpacity="0.9" />
              <stop offset="100%" stopColor="var(--hero-glow-b)" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="648" cy="82" r="190" fill="url(#hero-glow)" />
          <g fill="none" stroke="var(--hero-line)" strokeWidth="1">
            <path d="M-30 330C120 240 210 372 360 300s230-140 420-84 130 90 260 70" />
            <path d="M-30 356C120 266 214 396 362 326s232-134 422-78 128 92 258 74" />
            <path d="M-30 382C120 292 218 420 366 352s234-128 424-72 126 94 256 78" />
            <path d="M-30 408C120 318 222 444 370 378s236-122 426-66 124 96 254 82" />
            <path d="M-30 300C120 212 206 348 356 276s228-146 418-90 132 86 262 64" />
          </g>
          <g stroke="var(--hero-line)" fill="none" opacity="0.65">
            <path d="M596 84l10-10 10 10-10 10z" />
            <path d="M700 190l7-7 7 7-7 7z" />
            <path d="M540 230l6-6 6 6-6 6z" />
          </g>
        </svg>
      </div>

      <div className="hero__grid">
        <div className="hero__main">
          <div className="hero__eyebrow">
            <span className="hero__date">{fullDate(new Date())}</span>
            <span className="hero__dot" aria-hidden="true" />
            <Badge tone={activity.accent} icon={<ActivityIcon id={activity.id} size={13} />}>
              {activity.label}
            </Badge>
            {activity.water ? (
              <Badge tone={environment === 'mer' ? 'ocean' : 'sage'}>
                {environment === 'mer' ? 'Mer' : 'Eaux douces'}
              </Badge>
            ) : (
              <Badge tone="sage">Terrestre</Badge>
            )}
            {demoMode ? <Badge tone="demo">Démonstration</Badge> : null}
          </div>

          <h1 id="hero-title" className="hero__title">
            {spot.name}
          </h1>
          <p className="hero__sub">
            {spot.detail ? <span>{spot.detail}</span> : null}
            <span className="hero__coords">
              {spot.lat.toFixed(4)}° · {spot.lon.toFixed(4)}°
            </span>
            {coast.distanceKm !== null ? (
              <span className="hero__coast">
                <Waves size={13} /> littoral à {km(coast.distanceKm)}
              </span>
            ) : null}
            {distanceKm !== null ? (
              <span className="hero__coast">
                <MapPinned size={13} /> {km(distanceKm)} de {position.label}
              </span>
            ) : null}
          </p>

          <div className="hero__weatherline">
            {weatherLoading ? (
              <Skeleton width={220} height={18} />
            ) : current ? (
              <>
                <WeatherGlyph code={current.code} isDay={current.isDay} size={44} />
                <p>
                  <strong>{temp(current.temp, 0)}</strong>
                  <span>{info.label}</span>
                </p>
                <p className="hero__weather-meta">
                  Ressenti {temp(current.feels, 0)} · {windLabel(current.wind)} {Math.round(current.wind)} km/h ·{' '}
                  {current.precip > 0 ? 'précipitations en cours' : 'temps sec'}
                </p>
              </>
            ) : (
              <p className="hero__weather-meta">{weatherError ?? 'Météo en attente…'}</p>
            )}
          </div>

          <div className="hero__actions">
            <button type="button" className="btn btn--primary" onClick={onOpenSpot}>
              <MapPinned size={16} />
              Changer de spot
            </button>
            <a className="btn btn--ghost" href={directionsUrl} target="_blank" rel="noopener noreferrer">
              <Compass size={16} />
              Itinéraire
              <ArrowUpRight size={14} />
            </a>
            <IconButton label="Actualiser les données" onClick={onRefresh} disabled={refreshing}>
              {refreshing ? <Spinner size={17} /> : <RefreshCw size={17} />}
            </IconButton>
            <span className="hero__updated">
              {refreshing ? 'Actualisation…' : `Mis à jour ${timeAgoLabel(lastUpdated)}`}
            </span>
          </div>
        </div>

        <div className="hero__kpis">
          <KpiTile
            icon={<Thermometer size={15} />}
            label="Température"
            value={current ? `${num(current.temp, 1).replace(',0', '')}` : '—'}
            unit="°C"
            sub={
              current
                ? `Ressenti ${temp(current.feels, 0)} · ${current.cloud > 70 ? 'ciel chargé' : current.cloud > 30 ? 'éclaircies' : 'ciel clair'}`
                : weatherError ?? 'En attente'
            }
            accent="sun"
            loading={weatherLoading}
          />
          <KpiTile
            icon={<Wind size={15} />}
            label="Vent moyen"
            value={current ? num(current.wind, 0) : '—'}
            unit="km/h"
            sub={
              current
                ? `${compassShort(current.windDir)} · rafales ${num(current.gust, 0)} km/h`
                : 'En attente'
            }
            accent="wind"
            loading={weatherLoading}
          />
          {marineTurn ? (
            <KpiTile
              icon={<Waves size={15} />}
              label={tide?.type === 'basse' ? 'Prochaine basse mer' : 'Prochaine haute mer'}
              value={tide ? clock(tide.time).replace(':', 'h') : '—'}
              sub={
                tide
                  ? `${tide.type === 'haute' ? 'Haute' : 'Basse'} · coef. ${tide.coefficient} · ${tide.height > 0 ? '+' : ''}${num(tide.height, 2)} m`
                  : 'Marée indisponible'
              }
              accent="tide"
              loading={weatherLoading && !tides}
            />
          ) : (
            <KpiTile
              icon={<Sun size={15} />}
              label="Indice UV"
              value={current ? num(current.uv, 1).replace(',0', '') : '—'}
              sub={current ? `${uv.label} · ${uv.level === 'low' ? 'aucune protection' : 'protection conseillée'}` : 'En attente'}
              accent="uv"
              loading={weatherLoading}
            />
          )}
          <KpiTile
            icon={sky.isNight ? <Cloud size={15} /> : <Sun size={15} />}
            label={nextSun ? `${nextSun.type === 'lever' ? 'Lever' : 'Coucher'} du soleil` : 'Soleil'}
            value={nextSun ? clock(nextSun.time).replace(':', 'h') : '—'}
            sub={
              nextSun
                ? `${nextSun.tomorrow ? 'demain' : 'aujourd’hui'}${sunIn ? ` · dans ${sunIn}` : ''}`
                : `${sky.moonPhaseName}`
            }
            accent="sun"
          />
        </div>
      </div>

      <div className="hero__foot">
        <span>
          <Droplets size={13} /> Humidité {current ? `${Math.round(current.humidity)} %` : '—'}
        </span>
        <span>
          <Wind size={13} /> Vent {current ? compassLong(current.windDir) : '—'}
        </span>
        <span className="hero__foot-grow" />
        <span className="hero__foot-source">
          {activity.label} · {environment === 'mer' && activity.water ? 'contexte maritime' : activity.water ? 'contexte eaux douces' : 'contexte terrestre'}
        </span>
      </div>
    </section>
  );
}
