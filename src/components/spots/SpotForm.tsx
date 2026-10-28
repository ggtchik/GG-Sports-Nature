import { useEffect, useState } from 'react';
import type { MilieuMode, Spot } from '../../core/types';
import { parseCoordinates } from '../../api/geocoding';
import { formatCoords } from '../../core/geo';
import { Modal } from '../ui/Modal';
import { Segmented } from '../ui/Segmented';
import { Icon } from '../ui/Icon';
import { PlaceSearch } from './PlaceSearch';

export interface SpotDraft {
  name: string;
  commune?: string;
  postcode?: string;
  lat: number;
  lon: number;
  milieu: MilieuMode;
  note?: string;
}

interface Props {
  open: boolean;
  initial?: Spot | null;
  prefill?: Partial<SpotDraft> | null;
  onClose: () => void;
  onSubmit: (draft: SpotDraft) => void;
}

export function SpotForm({ open, initial, prefill, onClose, onSubmit }: Props) {
  const [draft, setDraft] = useState<SpotDraft>({
    name: '',
    commune: '',
    postcode: '',
    lat: 0,
    lon: 0,
    milieu: 'auto',
    note: '',
  });
  const [coordsText, setCoordsText] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const base: SpotDraft = initial
      ? {
          name: initial.name,
          commune: initial.commune ?? '',
          postcode: initial.postcode ?? '',
          lat: initial.lat,
          lon: initial.lon,
          milieu: initial.milieu,
          note: initial.note ?? '',
        }
      : {
          name: prefill?.name ?? '',
          commune: prefill?.commune ?? '',
          postcode: prefill?.postcode ?? '',
          lat: prefill?.lat ?? 0,
          lon: prefill?.lon ?? 0,
          milieu: prefill?.milieu ?? 'auto',
          note: prefill?.note ?? '',
        };
    setDraft(base);
    setCoordsText(base.lat || base.lon ? `${base.lat}, ${base.lon}` : '');
    setError(null);
  }, [open, initial, prefill]);

  const hasCoords = Number.isFinite(draft.lat) && Number.isFinite(draft.lon) && (draft.lat !== 0 || draft.lon !== 0);

  return (
    <Modal
      open={open}
      title={initial ? 'Modifier le spot' : 'Nouveau spot'}
      subtitle="Enregistré uniquement sur cet appareil (localStorage)"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Annuler
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              if (!draft.name.trim()) {
                setError('Donnez un nom au spot.');
                return;
              }
              if (!hasCoords) {
                setError('Renseignez des coordonnées valides.');
                return;
              }
              onSubmit({ ...draft, name: draft.name.trim() });
            }}
          >
            <Icon name="check" size={15} /> Enregistrer
          </button>
        </>
      }
    >
      <div className="stack" style={{ gap: 14 }}>
        <label className="field">
          <span className="field__label">Nom du spot *</span>
          <input
            className="input"
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            placeholder="Lac de Cazaux, Pointe de la Torche…"
            autoFocus={!initial}
          />
        </label>

        <div className="costs-grid">
          <label className="field">
            <span className="field__label">Commune</span>
            <input
              className="input"
              value={draft.commune}
              onChange={(event) => setDraft({ ...draft, commune: event.target.value })}
              placeholder="La Teste-de-Buch"
            />
          </label>
          <label className="field">
            <span className="field__label">Code postal</span>
            <input
              className="input"
              value={draft.postcode}
              onChange={(event) => setDraft({ ...draft, postcode: event.target.value })}
              placeholder="33260"
              inputMode="numeric"
            />
          </label>
        </div>

        <div className="field">
          <span className="field__label">Rechercher l’emplacement</span>
          <PlaceSearch
            actionLabel="Chercher"
            onSelect={(place) =>
              setDraft((prev) => ({
                ...prev,
                name: prev.name || place.name,
                commune: place.commune ?? prev.commune,
                postcode: place.postcode ?? prev.postcode,
                lat: place.lat,
                lon: place.lon,
              }))
            }
          />
        </div>

        <label className="field">
          <span className="field__label">Coordonnées (latitude, longitude)</span>
          <input
            className="input"
            value={coordsText}
            onChange={(event) => {
              const text = event.target.value;
              setCoordsText(text);
              const parsed = parseCoordinates(text);
              if (parsed) setDraft((prev) => ({ ...prev, lat: parsed.lat, lon: parsed.lon }));
            }}
            placeholder="44.8378, -0.5792"
          />
          <span className="tiny dim">
            {hasCoords ? formatCoords(draft) : 'Aucune coordonnée valide pour le moment'}
          </span>
        </label>

        <div className="field">
          <span className="field__label">Contexte du spot</span>
          <Segmented
            label="Contexte du milieu"
            value={draft.milieu}
            onChange={(value) => setDraft({ ...draft, milieu: value })}
            options={[
              { value: 'auto', label: 'AUTO' },
              { value: 'mer', label: 'MER' },
              { value: 'eau_douce', label: 'EAU DOUCE' },
            ]}
          />
          <span className="tiny dim">
            AUTO : maritime si le spot est à moins de 5 km du littoral. Le choix manuel est prioritaire.
          </span>
        </div>

        <label className="field">
          <span className="field__label">Note (facultatif)</span>
          <input
            className="input"
            value={draft.note}
            onChange={(event) => setDraft({ ...draft, note: event.target.value })}
            placeholder="Mise à l’eau, parking, accès…"
          />
        </label>

        {error && <p className="note" style={{ color: 'var(--err)' }}>{error}</p>}
      </div>
    </Modal>
  );
}
