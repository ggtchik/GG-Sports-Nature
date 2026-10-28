import { useState } from 'react';
import type { StartPosition } from '../../core/types';
import { reverseGeocode } from '../../api/geocoding';
import { formatCoords } from '../../core/geo';
import { PlaceSearch } from '../spots/PlaceSearch';
import { Icon } from '../ui/Icon';

interface Props {
  value: StartPosition | null;
  onChange: (position: StartPosition | null) => void;
}

export function PositionPicker({ value, onChange }: Props) {
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locate = () => {
    if (!('geolocation' in navigator)) {
      setError('La géolocalisation n’est pas disponible dans ce navigateur.');
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const label = (await reverseGeocode({ lat: latitude, lon: longitude })) ?? 'Ma position actuelle';
        onChange({
          lat: latitude,
          lon: longitude,
          label,
          origin: 'geolocation',
          accuracyM: accuracy,
        });
        setLocating(false);
      },
      (geoError) => {
        setLocating(false);
        setError(
          geoError.code === geoError.PERMISSION_DENIED
            ? 'Autorisation refusée. Vous pouvez saisir une position manuellement.'
            : geoError.code === geoError.TIMEOUT
              ? 'La géolocalisation a expiré. Réessayez ou saisissez une adresse.'
              : 'Position indisponible : saisissez une adresse ou des coordonnées.',
        );
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  };

  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="inline" style={{ gap: 8 }}>
        <button type="button" className="btn btn--primary" onClick={locate} disabled={locating}>
          <Icon name="locate" size={15} />
          {locating ? 'Localisation…' : 'Ma position actuelle'}
        </button>
        {value && (
          <button type="button" className="btn btn--quiet btn--sm" onClick={() => onChange(null)}>
            <Icon name="close" size={13} /> Effacer
          </button>
        )}
      </div>

      {error && <p className="note" style={{ color: 'var(--warn)' }}>{error}</p>}

      {value ? (
        <div className="note note--box">
          <strong>{value.label}</strong>
          <br />
          {formatCoords(value)}
          {value.accuracyM ? ` · précision ±${Math.round(value.accuracyM)} m` : ''}
          <br />
          <span className="tiny dim">
            {value.origin === 'geolocation' ? 'Géolocalisation du terminal' : 'Saisie manuelle'}
          </span>
        </div>
      ) : (
        <p className="note">Aucune position de départ : la distance et les frais ne seront pas calculés.</p>
      )}

      <div className="field">
        <span className="field__label">Ou saisir un lieu</span>
        <PlaceSearch
          actionLabel="Définir"
          placeholder="Adresse, commune, code postal ou coordonnées…"
          onSelect={(place) =>
            onChange({
              lat: place.lat,
              lon: place.lon,
              label: place.label,
              origin: 'manual',
            })
          }
        />
      </div>
    </div>
  );
}
