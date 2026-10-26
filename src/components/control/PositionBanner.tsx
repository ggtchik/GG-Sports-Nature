import { LocateFixed, MapPin, X } from 'lucide-react';
import type { BasePosition } from '../../types';
import { Spinner } from '../ui/kit';

export function PositionBanner({
  position,
  locating,
  onLocate,
  onOpenPosition,
  onDismiss,
}: {
  position: BasePosition;
  locating: boolean;
  onLocate: () => void;
  onOpenPosition: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="position-banner" role="note">
      <span className="position-banner__icon">
        <MapPin size={16} />
      </span>
      <p>
        <strong>Position de départ par défaut : {position.label}.</strong> Activez votre position pour calculer les
        distances réelles, le budget trajet et le point de départ des itinéraires.
      </p>
      <div className="position-banner__actions">
        <button type="button" className="btn btn--sm btn--primary" onClick={onLocate} disabled={locating}>
          {locating ? <Spinner size={14} /> : <LocateFixed size={14} />}
          {locating ? 'Localisation…' : 'Me localiser'}
        </button>
        <button type="button" className="btn btn--sm btn--ghost" onClick={onOpenPosition}>
          Saisir ma position
        </button>
        <button type="button" className="icon-btn icon-btn--ghost" onClick={onDismiss} aria-label="Masquer ce rappel">
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
