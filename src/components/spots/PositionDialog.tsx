import { useEffect, useState } from 'react';
import { Check, LocateFixed, MapPin, Navigation } from 'lucide-react';
import type { BasePosition } from '../../types';
import type { GeoResult } from '../../lib/api/geocode';
import { coordLabel } from '../../lib/geo';
import { Badge } from '../ui/kit';
import { Modal } from '../ui/Modal';
import { PlaceSearch } from './PlaceSearch';

interface PositionDialogProps {
  open: boolean;
  position: BasePosition;
  locating: boolean;
  onClose: () => void;
  onLocate: () => void;
  onApply: (position: BasePosition) => void;
}

export function PositionDialog({ open, position, locating, onClose, onLocate, onApply }: PositionDialogProps) {
  const [lat, setLat] = useState(String(position.lat));
  const [lon, setLon] = useState(String(position.lon));
  const [label, setLabel] = useState(position.label);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLat(String(position.lat));
    setLon(String(position.lon));
    setLabel(position.label);
    setError(null);
  }, [open, position]);

  const latNum = Number(lat.replace(',', '.'));
  const lonNum = Number(lon.replace(',', '.'));
  const valid = Number.isFinite(latNum) && Math.abs(latNum) <= 90 && Number.isFinite(lonNum) && Math.abs(lonNum) <= 180;

  const pick = (result: GeoResult) => {
    setLat(String(result.lat));
    setLon(String(result.lon));
    setLabel(result.name);
    setError(null);
  };

  const apply = () => {
    if (!valid) {
      setError('Coordonnées invalides : latitude entre -90 et 90, longitude entre -180 et 180.');
      return;
    }
    onApply({
      lat: Number(latNum.toFixed(5)),
      lon: Number(lonNum.toFixed(5)),
      label: label.trim() || 'Ma position',
      source: 'manuel',
      updatedAt: Date.now(),
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ma position de départ"
      kicker="Étape 1 · D’où partez-vous ?"
      size="md"
      footer={
        <div className="dialog-footer">
          <span className="dialog-footer__hint">Utilisée pour calculer les distances et le budget trajet.</span>
          <div className="dialog-footer__right">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Annuler
            </button>
            <button type="button" className="btn btn--primary" onClick={apply} disabled={!valid}>
              <Check size={16} /> Définir comme départ
            </button>
          </div>
        </div>
      }
    >
      <div className="position-dialog">
        <div className="position-current">
          <span className="position-current__icon">
            <Navigation size={18} />
          </span>
          <div>
            <span className="mini-label">Position actuelle</span>
            <strong>{position.label}</strong>
            <span className="muted">
              {coordLabel(position.lat, position.lon)} ·{' '}
              {position.source === 'gps' ? 'GPS' : position.source === 'manuel' ? 'saisie manuelle' : 'position par défaut'}
            </span>
          </div>
          <button type="button" className="btn btn--sm" onClick={onLocate} disabled={locating}>
            <LocateFixed size={14} /> {locating ? 'Localisation…' : 'Me localiser'}
          </button>
        </div>

        <div className="position-divider">
          <span>ou choisir un point de départ</span>
        </div>

        <PlaceSearch onPick={pick} compact />

        <div className="coord-grid">
          <label>
            <span>Latitude</span>
            <input type="text" inputMode="decimal" value={lat} onChange={(event) => setLat(event.target.value)} />
          </label>
          <label>
            <span>Longitude</span>
            <input type="text" inputMode="decimal" value={lon} onChange={(event) => setLon(event.target.value)} />
          </label>
        </div>
        <label className="field">
          <span>Nom du point de départ</span>
          <input type="text" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Ex. Bordeaux" />
        </label>

        {error ? <p className="search-error">{error}</p> : null}

        <div className="position-tip">
          <Badge tone="sage">
            <MapPin size={11} /> Astuce
          </Badge>
          <p>
            La géolocalisation est demandée par votre navigateur. Si vous refusez, vous pouvez saisir vos coordonnées
            ou rechercher une ville : la position est enregistrée uniquement sur cet appareil.
          </p>
        </div>
      </div>
    </Modal>
  );
}
