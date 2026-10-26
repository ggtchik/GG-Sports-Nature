import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Crosshair,
  LocateFixed,
  MapPin,
  Search,
  Trash2,
  Waves,
} from 'lucide-react';
import type { BasePosition, Environment, Spot, WaterMode } from '../../types';
import type { GeoResult } from '../../lib/api/geocode';
import { reverseGeocode } from '../../lib/api/geocode';
import { coastDistanceKm } from '../../lib/coastline';
import { km, num } from '../../lib/format';
import { coordLabel, haversineKm, makeId } from '../../lib/geo';
import { getCurrentPosition } from '../../lib/geolocation';
import { Badge, Segmented } from '../ui/kit';
import type { SegmentOption } from '../ui/kit';
import { Modal } from '../ui/Modal';
import { PlaceSearch } from './PlaceSearch';
import { useToast } from '../ui/Toast';

type Tab = 'search' | 'spots' | 'coords';

const TAB_OPTIONS: SegmentOption<Tab>[] = [
  { value: 'search', label: 'Rechercher', icon: <Search size={13} /> },
  { value: 'spots', label: 'Mes spots', icon: <MapPin size={13} /> },
  { value: 'coords', label: 'Coordonnées', icon: <Crosshair size={13} /> },
];

const MODE_OPTIONS: SegmentOption<WaterMode>[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'mer', label: 'En mer' },
  { value: 'douce', label: 'Eau douce' },
];

interface SpotDialogProps {
  open: boolean;
  initialSpot: Spot | null;
  editing: boolean;
  spots: Spot[];
  position: BasePosition;
  onClose: () => void;
  onApply: (spot: Spot, save: boolean) => void;
  onDelete: (id: string) => void;
  onSelect: (spot: Spot) => void;
  onCreateNew: () => void;
}

export function SpotDialog({
  open,
  initialSpot,
  editing,
  spots,
  position,
  onClose,
  onApply,
  onDelete,
  onSelect,
  onCreateNew,
}: SpotDialogProps) {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('search');
  const [name, setName] = useState('');
  const [detail, setDetail] = useState('');
  const [postcode, setPostcode] = useState<string | undefined>();
  const [country, setCountry] = useState<string | undefined>();
  const [lat, setLat] = useState('44.5886');
  const [lon, setLon] = useState('-1.2114');
  const [mode, setMode] = useState<WaterMode>('auto');
  const [note, setNote] = useState('');
  const [save, setSave] = useState(true);
  const [coordsError, setCoordsError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTab(initialSpot ? 'coords' : 'search');
    setName(initialSpot?.name ?? '');
    setDetail(initialSpot?.detail ?? '');
    setPostcode(initialSpot?.postcode);
    setCountry(initialSpot?.country);
    setLat(initialSpot ? String(initialSpot.lat) : String(position.lat));
    setLon(initialSpot ? String(initialSpot.lon) : String(position.lon));
    setMode(initialSpot?.mode ?? 'auto');
    setNote(initialSpot?.note ?? '');
    setSave(initialSpot ? initialSpot.saved : true);
    setCoordsError(null);
    setConfirmDelete(false);
  }, [open, initialSpot, position.lat, position.lon]);

  const latNum = Number(lat.replace(',', '.'));
  const lonNum = Number(lon.replace(',', '.'));
  const validCoords =
    Number.isFinite(latNum) && Math.abs(latNum) <= 90 && Number.isFinite(lonNum) && Math.abs(lonNum) <= 180;
  const coastKm = validCoords ? coastDistanceKm(latNum, lonNum) : null;
  const environment: Environment | null =
    coastKm === null ? null : coastKm <= 5 ? 'mer' : 'douce';
  const distanceFromBase = validCoords ? haversineKm(position, { lat: latNum, lon: lonNum }) : null;

  const pickResult = (result: GeoResult) => {
    setName(result.name);
    setDetail(result.detail);
    setPostcode(result.postcode);
    setCountry(result.country);
    setLat(String(result.lat));
    setLon(String(result.lon));
    setCoordsError(null);
    if (result.name) toast.notify(`${result.name} sélectionné`, 'success');
  };

  const useMyPosition = async () => {
    setLocating(true);
    try {
      const fix = await getCurrentPosition();
      setLat(fix.lat.toFixed(5));
      setLon(fix.lon.toFixed(5));
      const place = await reverseGeocode(fix.lat, fix.lon);
      setName(place?.name ?? 'Ma position');
      setDetail(place?.detail ?? `Précision ±${Math.round(fix.accuracy)} m`);
      setPostcode(place?.postcode);
      setCountry(place?.country);
      setCoordsError(null);
      toast.notify('Position actuelle récupérée', 'success');
    } catch (error) {
      toast.notify(error instanceof Error ? error.message : 'Localisation impossible', 'error');
    } finally {
      setLocating(false);
    }
  };

  const apply = () => {
    if (!validCoords) {
      setCoordsError('Renseignez une latitude entre -90 et 90 et une longitude entre -180 et 180.');
      setTab('coords');
      return;
    }
    if (!name.trim()) {
      setCoordsError('Donnez un nom à ce spot.');
      return;
    }
    const spot: Spot = {
      id: initialSpot?.id ?? makeId('spot'),
      name: name.trim(),
      detail: detail.trim() || undefined,
      postcode,
      country,
      lat: Number(latNum.toFixed(5)),
      lon: Number(lonNum.toFixed(5)),
      mode,
      note: note.trim() || undefined,
      saved: save,
      createdAt: initialSpot?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    };
    onApply(spot, save);
  };

  const contextLabel =
    mode === 'auto'
      ? environment === 'mer'
        ? 'Mer détectée'
        : environment === 'douce'
          ? 'Eaux douces détectées'
          : 'Contexte indéterminé'
      : mode === 'mer'
        ? 'Mer (forcé)'
        : 'Eaux douces (forcé)';

  const sortedSpots = useMemo(
    () =>
      [...spots].sort(
        (a, b) => haversineKm(position, a) - haversineKm(position, b),
      ),
    [spots, position],
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Modifier le spot' : 'Choisir un spot'}
      kicker="Étape 2 · Lieu de la sortie"
      size="lg"
      footer={
        <div className="dialog-footer">
          <div className="dialog-footer__left">
            {editing && initialSpot?.saved ? (
              confirmDelete ? (
                <>
                  <button
                    type="button"
                    className="btn btn--sm btn--danger"
                    onClick={() => {
                      onDelete(initialSpot.id);
                      onClose();
                    }}
                  >
                    Confirmer la suppression
                  </button>
                  <button type="button" className="btn btn--sm btn--ghost" onClick={() => setConfirmDelete(false)}>
                    Annuler
                  </button>
                </>
              ) : (
                <button type="button" className="btn btn--sm btn--ghost" onClick={() => setConfirmDelete(true)}>
                  <Trash2 size={14} /> Supprimer
                </button>
              )
            ) : (
              <button type="button" className="btn btn--sm btn--ghost" onClick={onCreateNew}>
                Réinitialiser
              </button>
            )}
          </div>
          <div className="dialog-footer__right">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Annuler
            </button>
            <button type="button" className="btn btn--primary" onClick={apply} disabled={!validCoords || !name.trim()}>
              <Check size={16} /> Afficher ce spot
            </button>
          </div>
        </div>
      }
    >
      <div className="spot-dialog">
        <div className="spot-dialog__left">
          <Segmented value={tab} options={TAB_OPTIONS} onChange={setTab} label="Méthode de sélection" />

          {tab === 'search' ? (
            <div className="spot-dialog__pane">
              <PlaceSearch onPick={pickResult} autoFocus />
              <p className="dialog-hint">
                Recherche par nom, adresse ou code postal via OpenStreetMap (Nominatim) avec repli sur le géocodeur
                Open-Meteo.
              </p>
            </div>
          ) : null}

          {tab === 'coords' ? (
            <div className="spot-dialog__pane">
              <div className="coord-grid">
                <label>
                  <span>Latitude</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={lat}
                    onChange={(event) => setLat(event.target.value)}
                    placeholder="44.5886"
                    aria-label="Latitude"
                  />
                </label>
                <label>
                  <span>Longitude</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={lon}
                    onChange={(event) => setLon(event.target.value)}
                    placeholder="-1.2114"
                    aria-label="Longitude"
                  />
                </label>
              </div>
              {coordsError ? <p className="search-error">{coordsError}</p> : null}
              <button type="button" className="btn btn--ghost" onClick={useMyPosition} disabled={locating}>
                <LocateFixed size={15} /> {locating ? 'Localisation…' : 'Utiliser ma position actuelle'}
              </button>
              <p className="dialog-hint">
                Vous pouvez coller des coordonnées décimales (ex. 44.5886, -1.2114) ou utiliser le GPS de l’appareil.
              </p>
            </div>
          ) : null}

          {tab === 'spots' ? (
            <div className="spot-dialog__pane">
              {sortedSpots.length === 0 ? (
                <div className="spot-picker-empty">
                  <MapPin size={20} />
                  <p>Aucun spot enregistré pour l’instant.</p>
                  <button type="button" className="btn btn--sm" onClick={onCreateNew}>
                    Créer un spot
                  </button>
                </div>
              ) : (
                <ul className="spot-picker">
                  {sortedSpots.map((spot) => {
                    const selected = initialSpot?.id === spot.id;
                    const spotCoast = coastDistanceKm(spot.lat, spot.lon);
                    return (
                      <li key={spot.id} className={selected ? 'is-selected' : ''}>
                        <button
                          type="button"
                          className="spot-picker__main"
                          onClick={() => {
                            setName(spot.name);
                            setDetail(spot.detail ?? '');
                            setPostcode(spot.postcode);
                            setCountry(spot.country);
                            setLat(String(spot.lat));
                            setLon(String(spot.lon));
                            setMode(spot.mode);
                            setNote(spot.note ?? '');
                            setSave(true);
                          }}
                        >
                          <span className="spot-picker__icon">
                            <MapPin size={15} />
                          </span>
                          <span className="spot-picker__text">
                            <strong>{spot.name}</strong>
                            <span>{spot.detail || coordLabel(spot.lat, spot.lon)}</span>
                            <em>
                              {km(haversineKm(position, spot))} de {position.label}
                              {spotCoast !== null ? ` · littoral ${km(spotCoast)}` : ''}
                            </em>
                          </span>
                          <Badge tone={spot.mode === 'mer' ? 'ocean' : spot.mode === 'douce' ? 'sage' : 'amber'}>
                            {spot.mode === 'mer' ? 'Mer' : spot.mode === 'douce' ? 'Douce' : 'Auto'}
                          </Badge>
                        </button>
                        <button
                          type="button"
                          className="btn btn--sm btn--ghost"
                          onClick={() => onSelect(spot)}
                        >
                          Afficher
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="dialog-hint">
                Sélectionnez un spot pour le charger dans la fiche, puis validez avec « Afficher ce spot ».
              </p>
            </div>
          ) : null}
        </div>

        <aside className="spot-dialog__right">
          <div className="spot-preview">
            <div className="spot-preview__top">
              <span className="spot-preview__pin">
                <MapPin size={16} />
              </span>
              <div>
                <p className="card-kicker">Fiche du spot</p>
                <h3>{name || 'Nouveau spot'}</h3>
                <p className="muted">{validCoords ? coordLabel(latNum, lonNum, 4) : 'Coordonnées invalides'}</p>
              </div>
            </div>

            <div className="spot-preview__stats">
              <div>
                <span className="mini-label">Distance du départ</span>
                <strong>{distanceFromBase !== null ? km(distanceFromBase) : '—'}</strong>
              </div>
              <div>
                <span className="mini-label">Littoral estimé</span>
                <strong>{coastKm !== null ? km(coastKm) : 'hors zone'}</strong>
              </div>
              <div>
                <span className="mini-label">Contexte</span>
                <strong className="spot-preview__context">
                  {environment === 'mer' ? <Waves size={13} /> : null}
                  {contextLabel}
                </strong>
              </div>
            </div>

            <label className="field">
              <span>Nom du spot</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex. Plage de la Salie"
                maxLength={80}
              />
            </label>

            <label className="field">
              <span>Précision du lieu</span>
              <input
                type="text"
                value={detail}
                onChange={(event) => setDetail(event.target.value)}
                placeholder="Commune, département"
                maxLength={120}
              />
            </label>

            <div className="field">
              <span>Contexte eau / mer</span>
              <Segmented value={mode} options={MODE_OPTIONS} onChange={setMode} label="Contexte du spot" size="sm" />
              <p className="field__hint">
                {mode === 'auto'
                  ? 'Détection automatique : mer si le littoral est à moins de 5 km.'
                  : 'Ce choix remplace la détection automatique.'}
              </p>
            </div>

            <label className="field">
              <span>Note personnelle <em>(facultatif)</em></span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={2}
                placeholder="Accès, parking, marée favorable…"
                maxLength={240}
              />
            </label>

            <label className="checkbox">
              <input type="checkbox" checked={save} onChange={(event) => setSave(event.target.checked)} />
              <span>
                Enregistrer dans mes spots
                <em>Retrouvez-le ensuite en un clic, modifiable et supprimable.</em>
              </span>
            </label>

            <div className="spot-preview__foot">
              <Badge tone="neutral">{spots.length} spot{spots.length > 1 ? 's' : ''} enregistré{spots.length > 1 ? 's' : ''}</Badge>
              <span className="updated">
                {validCoords ? `${num(latNum, 4)} / ${num(lonNum, 4)}` : ''}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </Modal>
  );
}
