import type { CoastInfo, Milieu, ModuleState, RouteInfo, Spot, StartPosition } from '../../core/types';
import { formatCoords } from '../../core/geo';
import { duration, stampLocal } from '../../core/format';
import { useApp } from '../../state/AppContext';
import { Card, SourceFooter } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { Stat } from '../ui/Stat';
import { UnavailableBlock } from '../ui/States';

interface Props {
  spot: Spot;
  start: StartPosition | null;
  route: ModuleState<RouteInfo>;
  coast: ModuleState<CoastInfo>;
  milieu: Milieu;
  milieuAuto: boolean;
  milieuReason: string;
  onEdit: () => void;
}

export function SpotAccessCard({ spot, start, route, coast, milieu, milieuAuto, milieuReason, onEdit }: Props) {
  const { units } = useApp();
  const routeData = route.data;

  return (
    <Card
      title="Spot & accès"
      icon="pin"
      subtitle={[spot.commune, spot.postcode].filter(Boolean).join(' · ') || 'Localisation enregistrée'}
      actions={
        <button type="button" className="icon-btn" onClick={onEdit} aria-label="Modifier le spot" title="Modifier le spot">
          <Icon name="edit" size={16} />
        </button>
      }
      footer={
        <SourceFooter
          sources={['overpass', 'osrm']}
          fetchedAt={coast.fetchedAt}
          note={`Milieu ${milieu === 'mer' ? 'maritime' : 'continental'}`}
        />
      }
    >
      <div className="pill-row">
        <span className={`chip ${milieu === 'mer' ? 'chip--sea' : 'chip--earth'}`}>
          <Icon name={milieu === 'mer' ? 'waves' : 'mountain'} size={13} />
          {milieu === 'mer' ? 'MER' : 'EAU DOUCE'}
        </span>
        <span className="chip chip--outline">{milieuAuto ? 'Détection auto' : 'Imposé'}</span>
        {coast.data && (
          <span className="chip chip--outline" title={coast.data.detail}>
            {units.distance(coast.data.distanceKm, 'marine')} du littoral
          </span>
        )}
      </div>

      <div className="stats">
        <Stat
          label="Distance départ"
          icon="navigation"
          value={routeData ? units.distance(routeData.distanceKm) : start ? '…' : '—'}
          hint={
            routeData?.source === 'haversine'
              ? 'Estimation'
              : routeData?.durationMin !== null && routeData?.durationMin !== undefined
                ? duration(routeData.durationMin)
                : undefined
          }
        />
        <Stat label="Coordonnées" icon="compass" value={<span style={{ fontSize: 13 }}>{formatCoords(spot)}</span>} />
        <Stat
          label="Littoral le plus proche"
          icon="waves"
          value={coast.data ? units.distance(coast.data.distanceKm, 'marine') : coast.state === 'loading' ? '…' : '—'}
          hint={
            coast.data
              ? coast.data.source === 'osm'
                ? 'Trait de côte OSM'
                : 'Référentiel embarqué (±1,3 km)'
              : undefined
          }
        />
      </div>

      {!start && (
        <UnavailableBlock title="Position de départ non renseignée">
          Renseignez votre position pour obtenir la distance, la durée de trajet et l’estimation des frais.
        </UnavailableBlock>
      )}

      {route.state === 'error' && (
        <UnavailableBlock title="Distance indisponible" tone="error">
          {route.error}
        </UnavailableBlock>
      )}

      <div className="inline" style={{ gap: 8 }}>
        <a
          className="btn btn--ghost btn--sm"
          href={`https://www.openstreetmap.org/?mlat=${spot.lat}&mlon=${spot.lon}#map=14/${spot.lat}/${spot.lon}`}
          target="_blank"
          rel="noreferrer noopener"
        >
          <Icon name="external" size={14} /> Voir sur OpenStreetMap
        </a>
        {start && (
          <a
            className="btn btn--quiet btn--sm"
            href={`https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${start.lat}%2C${start.lon}%3B${spot.lat}%2C${spot.lon}`}
            target="_blank"
            rel="noreferrer noopener"
          >
            <Icon name="car" size={14} /> Itinéraire
          </a>
        )}
      </div>

      <p className="note">{milieuReason}</p>
      {spot.note && <p className="note note--box">{spot.note}</p>}
      {start && (
        <p className="note">
          Départ : {start.label} ({start.origin === 'geolocation' ? 'géolocalisation' : 'saisie manuelle'})
          {start.accuracyM ? ` · précision ±${Math.round(start.accuracyM)} m` : ''}
        </p>
      )}
      {coast.data?.source === 'osm' && coast.data.precisionM < 200 ? (
        <p className="note">
          Trait de côte interrogé le {stampLocal(coast.data.fetchedAt)} — précision de l’ordre de la dizaine de mètres.
        </p>
      ) : null}
    </Card>
  );
}
