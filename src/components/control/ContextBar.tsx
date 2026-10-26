import { ChevronDown, Info, LocateFixed, MapPin, Navigation } from 'lucide-react';
import type { ActivityDef, BasePosition, CoastInfo, Environment, Spot, WaterMode } from '../../types';
import { km, minutes } from '../../lib/format';
import { driveMinutes, roadDistanceKm } from '../../lib/geo';
import { Badge, Segmented } from '../ui/kit';
import type { SegmentOption } from '../ui/kit';

const MODE_OPTIONS: SegmentOption<WaterMode>[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'mer', label: 'En mer' },
  { value: 'douce', label: 'Eau douce' },
];

interface ContextBarProps {
  spot: Spot;
  activity: ActivityDef;
  environment: Environment;
  coast: CoastInfo;
  distanceKm: number | null;
  position: BasePosition;
  locating: boolean;
  onOpenSpot: () => void;
  onOpenPosition: () => void;
  onModeChange: (mode: WaterMode) => void;
}

export function ContextBar({
  spot,
  activity,
  environment,
  coast,
  distanceKm,
  position,
  locating,
  onOpenSpot,
  onOpenPosition,
  onModeChange,
}: ContextBarProps) {
  const coastal = coast.distanceKm;
  const autoHint =
    coastal === null
      ? 'Hors de la zone d’estimation du littoral : choisissez manuellement.'
      : coastal <= 5
        ? `Littoral estimé à ${km(coastal)} → contexte maritime appliqué.`
        : `Littoral estimé à ${km(coastal)} (> 5 km) → eaux continentales.`;

  const road = distanceKm === null ? null : roadDistanceKm(distanceKm);

  return (
    <section className="context" aria-label="Spot et contexte">
      <button type="button" className="context__spot" onClick={onOpenSpot}>
        <span className="context__spot-icon">
          <MapPin size={19} />
        </span>
        <span className="context__spot-text">
          <span className="context__label">Étape 2 · Spot sélectionné</span>
          <strong>{spot.name}</strong>
          <span className="context__detail">
            {spot.detail || `${spot.lat.toFixed(3)}, ${spot.lon.toFixed(3)}`}
            {spot.saved ? '' : ' · non enregistré'}
          </span>
        </span>
        <ChevronDown size={18} className="context__chevron" />
      </button>

      <div className="context__divider" aria-hidden="true" />

      {activity.water ? (
        <div className="context__mode">
          <div className="context__mode-head">
            <span className="context__label">
              Contexte <Info size={12} aria-hidden="true" />
            </span>
            <Badge tone={environment === 'mer' ? 'ocean' : 'sage'}>
              {environment === 'mer' ? 'En mer' : 'Eaux douces'}
            </Badge>
          </div>
          <Segmented
            value={spot.mode}
            options={MODE_OPTIONS}
            onChange={onModeChange}
            label="Contexte du spot"
            size="sm"
          />
          <p className="context__hint">
            {spot.mode === 'auto' ? autoHint : spot.mode === 'mer' ? 'Contexte maritime forcé.' : 'Contexte eaux douces forcé.'}
          </p>
        </div>
      ) : (
        <div className="context__mode">
          <div className="context__mode-head">
            <span className="context__label">Contexte</span>
            <Badge tone="sage">Terrestre</Badge>
          </div>
          <p className="context__hint">Météo détaillée, lumière et carte du spot.</p>
        </div>
      )}

      <div className="context__divider" aria-hidden="true" />

      <button type="button" className="context__distance" onClick={onOpenPosition}>
        <span className="context__distance-icon">
          {locating ? <LocateFixed size={17} className="spin" /> : <Navigation size={17} />}
        </span>
        <span>
          <span className="context__label">Depuis {position.label}</span>
          <strong>{distanceKm === null ? '—' : km(distanceKm)}</strong>
          <span className="context__detail">
            {road === null ? 'Position à définir' : `${km(road)} par la route · ${minutes(driveMinutes(road))}`}
          </span>
        </span>
      </button>
    </section>
  );
}
