import { useState } from 'react';
import { MapPin, Navigation, Pencil, Plus, Trash2, Waves } from 'lucide-react';
import type { BasePosition, CoastInfo, Spot } from '../../types';
import { km } from '../../lib/format';
import { haversineKm } from '../../lib/geo';
import { coastDistanceKm } from '../../lib/coastline';
import { Badge, Card, CardHead, EmptyState } from '../ui/kit';

interface SpotsPanelProps {
  spots: Spot[];
  activeSpot: Spot;
  position: BasePosition;
  onSelect: (spot: Spot) => void;
  onEdit: (spot: Spot) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
  delay?: number;
}

const MODE_LABEL: Record<Spot['mode'], string> = {
  auto: 'Auto',
  mer: 'Mer',
  douce: 'Eau douce',
};

function modeTone(mode: Spot['mode']): 'sage' | 'ocean' | 'amber' {
  if (mode === 'mer') return 'ocean';
  if (mode === 'douce') return 'sage';
  return 'amber';
}

function coastOf(spot: Spot): CoastInfo {
  return { distanceKm: coastDistanceKm(spot.lat, spot.lon), covered: coastDistanceKm(spot.lat, spot.lon) !== null };
}

export function SpotsPanel({
  spots,
  activeSpot,
  position,
  onSelect,
  onEdit,
  onDelete,
  onCreate,
  delay = 0,
}: SpotsPanelProps) {
  const [confirming, setConfirming] = useState<string | null>(null);

  return (
    <Card className="spots" delay={delay} id="spots">
      <CardHead
        kicker="Bibliothèque"
        title="Mes spots"
        icon={<MapPin size={18} />}
        aside={
          <div className="head-links">
            <Badge tone="neutral">{spots.length}</Badge>
            <button type="button" className="btn btn--sm" onClick={onCreate}>
              <Plus size={14} /> Nouveau
            </button>
          </div>
        }
      />

      {!spots.length ? (
        <EmptyState
          icon={<MapPin size={20} />}
          title="Aucun spot enregistré"
          message="Enregistrez un lieu pour le retrouver en un clic et comparer les conditions entre vos sorties."
        >
          <button type="button" className="btn btn--sm" onClick={onCreate}>
            <Plus size={14} /> Créer mon premier spot
          </button>
        </EmptyState>
      ) : (
        <ul className="spot-list">
          {spots.map((spot) => {
            const active = spot.id === activeSpot.id;
            const distance = haversineKm(position, spot);
            const coast = coastOf(spot);
            return (
              <li key={spot.id} className={active ? 'is-active' : ''}>
                <button type="button" className="spot-row__main" onClick={() => onSelect(spot)}>
                  <span className="spot-row__pin">
                    <MapPin size={16} />
                  </span>
                  <span className="spot-row__text">
                    <span className="spot-row__name">
                      {spot.name}
                      {active ? <Badge tone="sage">Affiché</Badge> : null}
                    </span>
                    <span className="spot-row__detail">
                      {spot.detail || `${spot.lat.toFixed(3)}, ${spot.lon.toFixed(3)}`}
                    </span>
                    <span className="spot-row__meta">
                      <Badge tone={modeTone(spot.mode)}>{MODE_LABEL[spot.mode]}</Badge>
                      {coast.distanceKm !== null ? (
                        <span>
                          <Waves size={11} /> littoral {km(coast.distanceKm)}
                        </span>
                      ) : null}
                      <span>
                        <Navigation size={11} /> {km(distance)}
                      </span>
                    </span>
                    {spot.note ? <em className="spot-row__note">{spot.note}</em> : null}
                  </span>
                </button>
                <div className="spot-row__actions">
                  <button type="button" className="icon-btn icon-btn--ghost" onClick={() => onEdit(spot)} aria-label={`Modifier ${spot.name}`}>
                    <Pencil size={14} />
                  </button>
                  {confirming === spot.id ? (
                    <button
                      type="button"
                      className="btn btn--sm btn--danger"
                      onClick={() => {
                        onDelete(spot.id);
                        setConfirming(null);
                      }}
                      onBlur={() => setConfirming(null)}
                    >
                      Confirmer
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="icon-btn icon-btn--ghost"
                      onClick={() => setConfirming(spot.id)}
                      aria-label={`Supprimer ${spot.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="card-foot">
        <span className="source-tag">
          <MapPin size={12} /> Spots modifiables et supprimables
        </span>
        <span className="updated">Stockés sur cet appareil</span>
      </div>
    </Card>
  );
}
