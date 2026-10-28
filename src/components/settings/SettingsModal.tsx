import { useState } from 'react';
import { useApp } from '../../state/AppContext';
import { UNIT_LABELS } from '../../core/units';
import { clearCaches } from '../../api/cache';
import { Modal } from '../ui/Modal';
import { Segmented } from '../ui/Segmented';
import { Icon } from '../ui/Icon';
import { PositionPicker } from '../position/PositionPicker';

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenMethod: () => void;
  onCreateSpot: () => void;
  onEditSpot: (spot: import('../../core/types').Spot) => void;
}

export function SettingsModal({ open, onClose, onOpenMethod, onCreateSpot, onEditSpot }: Props) {
  const { settings, spots, activeSpot, updateSettings, setStart, selectSpot, removeSpot, resetAll, notify } = useApp();
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <Modal
      open={open}
      title="Réglages"
      subtitle="Préférences conservées sur cet appareil"
      onClose={onClose}
      wide
      footer={
        <button type="button" className="btn btn--primary" onClick={onClose}>
          Terminé
        </button>
      }
    >
      <section className="stack">
        <h3 className="card__title">
          <Icon name="compass" size={16} /> Unités de mesure
        </h3>
        <Segmented
          label="Unités"
          full
          value={settings.units}
          onChange={(value) => updateSettings({ units: value })}
          options={[
            { value: 'standard', label: 'STANDARD' },
            { value: 'nautical', label: 'NAUTIQUE' },
            { value: 'dual', label: 'DOUBLE' },
          ]}
        />
        <p className="note">
          {UNIT_LABELS[settings.units].hint}. Le changement est immédiat et s’applique à tous les modules. Les valeurs
          des API restent dans leur unité d’origine ; seules les conversions d’affichage changent.
        </p>
      </section>

      <div className="divider" />

      <section className="stack">
        <h3 className="card__title">
          <Icon name="pin" size={16} /> Position de départ
        </h3>
        <PositionPicker value={settings.start} onChange={setStart} />
      </section>

      <div className="divider" />

      <section className="stack">
        <h3 className="card__title">
          <Icon name="pin" size={16} /> Spots enregistrés ({spots.length})
        </h3>
        {spots.length === 0 && <p className="note">Aucun spot enregistré pour le moment.</p>}
        <div className="stack" style={{ gap: 6 }}>
          {spots.map((spot) => (
            <div key={spot.id} className={`spot-row ${activeSpot?.id === spot.id ? 'spot-row--active' : ''}`.trim()}>
              <button type="button" className="spot-row__main" onClick={() => selectSpot(spot.id)}>
                <span className="spot-row__name">{spot.name}</span>
                <span className="spot-row__meta">
                  {[spot.commune, spot.postcode].filter(Boolean).join(' · ') || `${spot.lat.toFixed(4)}, ${spot.lon.toFixed(4)}`}
                  {' · '}
                  {spot.milieu === 'auto' ? 'milieu auto' : spot.milieu === 'mer' ? 'mer imposée' : 'eau douce imposée'}
                </span>
              </button>
              <div className="spot-row__actions">
                <button type="button" className="icon-btn" aria-label={`Modifier ${spot.name}`} onClick={() => onEditSpot(spot)}>
                  <Icon name="edit" size={15} />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Supprimer ${spot.name}`}
                  onClick={() => {
                    removeSpot(spot.id);
                    notify(`« ${spot.name} » supprimé.`);
                  }}
                >
                  <Icon name="trash" size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onCreateSpot} style={{ alignSelf: 'flex-start' }}>
          <Icon name="plus" size={14} /> Nouveau spot
        </button>
      </section>

      <div className="divider" />

      <section className="stack">
        <h3 className="card__title">
          <Icon name="clock" size={16} /> Interface et actualisation
        </h3>
        <div className="costs-grid">
          <label className="field">
            <span className="field__label">Thème</span>
            <select
              className="select"
              value={settings.theme}
              onChange={(event) => updateSettings({ theme: event.target.value as 'light' | 'dark' })}
            >
              <option value="light">Clair</option>
              <option value="dark">Sombre</option>
            </select>
          </label>
          <label className="field">
            <span className="field__label">Actualisation automatique</span>
            <select
              className="select"
              value={settings.refreshMinutes}
              onChange={(event) => updateSettings({ refreshMinutes: Number(event.target.value) })}
            >
              <option value={0}>Désactivée</option>
              <option value={5}>Toutes les 5 min</option>
              <option value={15}>Toutes les 15 min</option>
              <option value={30}>Toutes les 30 min</option>
              <option value={60}>Toutes les heures</option>
            </select>
          </label>
        </div>
      </section>

      <div className="divider" />

      <section className="stack">
        <h3 className="card__title">
          <Icon name="anchor" size={16} /> Marées — clé api-maree.fr (facultatif)
        </h3>
        <label className="field">
          <span className="field__label">Clé personnelle</span>
          <input
            className="input"
            type="password"
            autoComplete="off"
            placeholder="Laisser vide pour utiliser la courbe du modèle"
            value={settings.mareeKey}
            onChange={(event) => updateSettings({ mareeKey: event.target.value })}
          />
        </label>
        <p className="note">
          Sans clé, les horaires de pleine/basse mer sont extraits de la courbe du modèle Open-Meteo et le coefficient
          est affiché comme <strong>non disponible</strong> (donnée SHOM payante). Avec une clé{' '}
          <a href="https://api-maree.fr/" target="_blank" rel="noreferrer noopener">
            api-maree.fr
          </a>
          , les horaires et coefficients proviennent des composantes harmoniques Ifremer/PREVIMER (CC BY). La clé est
          stockée uniquement dans ce navigateur et envoyée en en-tête, jamais dans une URL.
        </p>
        {settings.mareeKey && (
          <button
            type="button"
            className="btn btn--quiet btn--sm"
            onClick={() => {
              updateSettings({ mareeKey: '' });
              notify('Clé api-maree.fr supprimée.');
            }}
          >
            <Icon name="trash" size={14} /> Supprimer la clé
          </button>
        )}
      </section>

      <div className="divider" />

      <section className="stack">
        <h3 className="card__title">
          <Icon name="database" size={16} /> Accès réseau
        </h3>
        <label className="field">
          <span className="field__label">Relais CORS local (facultatif)</span>
          <input
            className="input"
            value={settings.proxy}
            placeholder="/__proxy"
            onChange={(event) => updateSettings({ proxy: event.target.value })}
          />
        </label>
        <p className="note">
          Les API sont interrogées en direct. Si un navigateur ou un réseau bloque une source (CORS), l’application
          rejoue la requête via ce relais de même origine (fourni par <code>npm run dev</code> et{' '}
          <code>npm run serve</code>). Laissez vide pour désactiver.
        </p>
        <button
          type="button"
          className="btn btn--quiet btn--sm"
          onClick={() => {
            clearCaches();
            notify('Caches locaux vidés.', 'success');
          }}
        >
          <Icon name="refresh" size={14} /> Vider les caches de données
        </button>
      </section>

      <div className="divider" />

      <section className="stack">
        <h3 className="card__title">
          <Icon name="info" size={16} /> Sources & méthode
        </h3>
        <p className="note">
          Conditions d’utilisation, licences, fréquences réelles de mise à jour et sources écartées (SHOM, Météo-France,
          maree.info, Windy…).
        </p>
        <div className="inline">
          <button type="button" className="btn btn--ghost btn--sm" onClick={onOpenMethod}>
            <Icon name="external" size={14} /> Ouvrir la documentation des sources
          </button>
        </div>
      </section>

      <div className="divider" />

      <section className="stack">
        <h3 className="card__title" style={{ color: 'var(--err)' }}>
          <Icon name="trash" size={16} /> Données locales
        </h3>
        <p className="note">
          Spots, réglages, clé éventuelle et caches sont enregistrés dans le stockage local du navigateur. Les effacer
          supprime tout, sans possibilité de restauration.
        </p>
        <div className="inline">
          {confirmReset ? (
            <>
              <button
                type="button"
                className="btn btn--accent btn--sm"
                onClick={() => {
                  resetAll();
                  clearCaches();
                  setConfirmReset(false);
                  notify('Toutes les données locales ont été effacées.');
                  onClose();
                }}
              >
                Confirmer l’effacement
              </button>
              <button type="button" className="btn btn--quiet btn--sm" onClick={() => setConfirmReset(false)}>
                Annuler
              </button>
            </>
          ) : (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmReset(true)}>
              Effacer toutes les données
            </button>
          )}
        </div>
      </section>
    </Modal>
  );
}
