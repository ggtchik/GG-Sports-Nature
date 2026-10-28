import { useEffect, useMemo, useState } from 'react';
import type { CoastInfo, MilieuMode, SearchResult, Spot } from '../../core/types';
import { ACTIVITIES, ACTIVITY_MAP } from '../../core/activities';
import { haversineKm } from '../../core/geo';
import { detectCoast, resolveMilieu } from '../../core/coast';
import { UNIT_LABELS } from '../../core/units';
import { useApp } from '../../state/AppContext';
import { PositionPicker } from '../position/PositionPicker';
import { PlaceSearch } from '../spots/PlaceSearch';
import { SpotForm } from '../spots/SpotForm';
import type { SpotDraft } from '../spots/SpotForm';
import { Icon } from '../ui/Icon';
import { Segmented } from '../ui/Segmented';

const STEPS = [
  { key: 'position', title: 'Position de départ', hint: 'Géolocalisation ou saisie manuelle' },
  { key: 'activity', title: 'Activité', hint: 'Terrestre, aquatique ou nautique' },
  { key: 'spot', title: 'Spot', hint: 'Recherche, spots enregistrés ou création' },
  { key: 'milieu', title: 'Milieu', hint: 'AUTO · MER · EAU DOUCE' },
  { key: 'units', title: 'Unités', hint: 'STANDARD · NAUTIQUE · DOUBLE' },
] as const;

interface Props {
  onOpenDashboard: () => void;
}

export function SetupWizard({ onOpenDashboard }: Props) {
  const { settings, spots, activeSpot, updateSettings, addSpot, updateSpot, removeSpot, selectSpot, setStart, notify } =
    useApp();
  const [openStep, setOpenStep] = useState<number>(0);
  const [formOpen, setFormOpen] = useState(false);
  const [formInitial, setFormInitial] = useState<Spot | null>(null);
  const [formPrefill, setFormPrefill] = useState<Partial<SpotDraft> | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [coast, setCoast] = useState<CoastInfo | null>(null);
  const [coastError, setCoastError] = useState<string | null>(null);

  const ready = Boolean(activeSpot);
  const resolved = useMemo(
    () => resolveMilieu(activeSpot?.milieu ?? 'auto', coast?.distanceKm ?? null),
    [activeSpot?.milieu, coast?.distanceKm],
  );

  useEffect(() => {
    if (!activeSpot || activeSpot.milieu !== 'auto') {
      setCoast(null);
      setCoastError(null);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    setDetecting(true);
    setCoastError(null);
    detectCoast(activeSpot, { signal: controller.signal })
      .then(({ info }) => {
        if (!cancelled) {
          setCoast(info);
          setDetecting(false);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setCoastError(error instanceof Error ? error.message : 'Détection impossible');
          setDetecting(false);
        }
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [activeSpot]);

  const handlePickPlace = (place: SearchResult) => {
    setFormInitial(null);
    setFormPrefill({
      name: place.name || place.label.split(',')[0],
      commune: place.commune,
      postcode: place.postcode,
      lat: place.lat,
      lon: place.lon,
      milieu: 'auto',
    });
    setFormOpen(true);
  };

  const handleSubmit = (draft: SpotDraft) => {
    if (formInitial) {
      updateSpot(formInitial.id, draft);
      notify('Spot mis à jour.', 'success');
    } else {
      const created = addSpot(draft);
      notify(`« ${created.name} » enregistré.`, 'success');
    }
    setFormOpen(false);
    setFormInitial(null);
    setFormPrefill(null);
    setOpenStep(3);
  };

  const summaries: Record<(typeof STEPS)[number]['key'], string> = {
    position: settings.start ? settings.start.label : 'Non renseignée (facultatif)',
    activity: ACTIVITY_MAP[settings.activity]?.label ?? '—',
    spot: activeSpot ? `${activeSpot.name}${activeSpot.commune ? ` · ${activeSpot.commune}` : ''}` : 'Aucun spot sélectionné',
    milieu: activeSpot
      ? activeSpot.milieu === 'auto'
        ? detecting
          ? 'Détection en cours…'
          : `AUTO → ${resolved.milieu === 'mer' ? 'MER' : 'EAU DOUCE'}`
        : activeSpot.milieu === 'mer'
          ? 'MER (imposé)'
          : 'EAU DOUCE (imposé)'
      : 'En attente du spot',
    units: UNIT_LABELS[settings.units].label,
  };

  return (
    <div className="setup">
      <aside className="setup__intro">
        <div className="brand" style={{ color: 'inherit' }}>
          <span className="brand__mark" style={{ background: 'rgba(244,239,227,.14)', color: '#f4efe3' }}>
            <Icon name="mountain" size={20} />
          </span>
          <span className="brand__text">
            <span className="brand__name">GG Sports-Nature</span>
            <span className="brand__tag" style={{ color: 'rgba(244,239,227,.55)' }}>
              Station outdoor & nautique
            </span>
          </span>
        </div>

        <div>
          <p className="eyebrow">Préparation de sortie</p>
          <h1 className="setup__title">
            Toutes vos conditions,
            <br />
            au bon endroit.
          </h1>
        </div>

        <p className="setup__lede">
          Météo, astronomie, marées, houle, hydrologie et accès : un seul tableau de bord, alimenté par des sources
          publiques identifiées, horodaté et sans donnée inventée.
        </p>

        <div className="setup__features">
          <div className="setup__feature">
            <Icon name="waves" size={16} />
            <span>Détection automatique du milieu à partir du trait de côte (seuil de 5 km), toujours modifiable.</span>
          </div>
          <div className="setup__feature">
            <Icon name="compass" size={16} />
            <span>Unités standard, nautiques ou double affichage, appliquées instantanément à toute l’application.</span>
          </div>
          <div className="setup__feature">
            <Icon name="database" size={16} />
            <span>Source, licence et heure de mise à jour affichées sur chaque module.</span>
          </div>
        </div>

        <div className="setup__foot">
          <button type="button" className="btn btn--primary" onClick={onOpenDashboard} disabled={!ready}>
            {ready ? 'Ouvrir le tableau de bord' : 'Choisissez un spot pour continuer'}
            {ready && <Icon name="arrowRight" size={15} />}
          </button>
        </div>
        <p className="note" style={{ color: 'rgba(244,239,227,.55)', maxWidth: '38ch' }}>
          Aucune inscription. Spots, réglages et clés éventuelles restent dans votre navigateur.
        </p>
      </aside>

      <div className="setup__flow">
        {STEPS.map((step, index) => {
          const open = openStep === index;
          const complete =
            step.key === 'position'
              ? Boolean(settings.start)
              : step.key === 'spot'
                ? Boolean(activeSpot)
                : step.key === 'milieu'
                  ? Boolean(activeSpot)
                  : step.key === 'units'
                    ? true
                    : true;

          return (
            <section className="step" key={step.key} data-open={open} data-complete={complete}>
              <button
                type="button"
                className="step__head"
                onClick={() => setOpenStep(open ? -1 : index)}
                aria-expanded={open}
              >
                <span className="step__index">{complete && !open ? <Icon name="check" size={14} /> : index + 1}</span>
                <span className="step__titles">
                  <span className="step__title">{step.title}</span>
                  <span className="step__summary">{summaries[step.key]}</span>
                </span>
                <span className="step__chevron">
                  <Icon name="chevronDown" size={18} />
                </span>
              </button>

              {open && (
                <div className="step__body">
                  {step.key === 'position' && (
                    <>
                      <p className="note">
                        Elle sert à calculer la distance jusqu’au spot, la durée du trajet et les frais. Elle peut rester
                        vide.
                      </p>
                      <PositionPicker value={settings.start} onChange={setStart} />
                    </>
                  )}

                  {step.key === 'activity' && (
                    <>
                      <div className="activities">
                        {ACTIVITIES.map((activity) => (
                          <button
                            key={activity.id}
                            type="button"
                            className="activity-tile"
                            aria-pressed={settings.activity === activity.id}
                            onClick={() => {
                              updateSettings({ activity: activity.id });
                              setOpenStep(2);
                            }}
                          >
                            <span className="activity-tile__emoji">{activity.emoji}</span>
                            <span className="activity-tile__label">{activity.label}</span>
                            <span className="activity-tile__hint">{activity.blurb}</span>
                          </button>
                        ))}
                      </div>
                      <p className="note">
                        Les activités terrestres n’affichent aucune donnée maritime, même sur un spot en bord de mer.
                      </p>
                    </>
                  )}

                  {step.key === 'spot' && (
                    <>
                      <PlaceSearch actionLabel="Rechercher" onSelect={handlePickPlace} />

                      <div className="inline" style={{ gap: 8 }}>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => {
                            setFormInitial(null);
                            setFormPrefill({
                              name: '',
                              milieu: 'auto',
                              lat: settings.start?.lat ?? 0,
                              lon: settings.start?.lon ?? 0,
                            });
                            setFormOpen(true);
                          }}
                        >
                          <Icon name="plus" size={14} /> Créer un spot manuellement
                        </button>
                        {settings.start && (
                          <button
                            type="button"
                            className="btn btn--quiet btn--sm"
                            onClick={() => {
                              setFormInitial(null);
                              setFormPrefill({
                                name: settings.start?.label ?? 'Mon spot',
                                lat: settings.start?.lat ?? 0,
                                lon: settings.start?.lon ?? 0,
                                milieu: 'auto',
                              });
                              setFormOpen(true);
                            }}
                          >
                            <Icon name="locate" size={14} /> Utiliser ma position
                          </button>
                        )}
                      </div>

                      {spots.length > 0 ? (
                        <div className="stack" style={{ gap: 8 }}>
                          <span className="eyebrow">Spots enregistrés ({spots.length})</span>
                          {spots.map((spot) => {
                            const active = activeSpot?.id === spot.id;
                            const distance = settings.start ? haversineKm(settings.start, spot) : null;
                            return (
                              <div className={`spot-row ${active ? 'spot-row--active' : ''}`.trim()} key={spot.id}>
                                <button
                                  type="button"
                                  className="spot-row__main"
                                  onClick={() => {
                                    selectSpot(spot.id);
                                    setOpenStep(3);
                                  }}
                                  aria-pressed={active}
                                >
                                  <span className="spot-row__name">{spot.name}</span>
                                  <span className="spot-row__meta">
                                    {[spot.commune, spot.postcode].filter(Boolean).join(' · ') || 'Coordonnées GPS'}
                                    {distance !== null ? ` · ${distance.toFixed(1).replace('.', ',')} km à vol d’oiseau` : ''}
                                  </span>
                                </button>
                                <div className="spot-row__actions">
                                  <button
                                    type="button"
                                    className="icon-btn"
                                    aria-label={`Modifier ${spot.name}`}
                                    onClick={() => {
                                      setFormInitial(spot);
                                      setFormPrefill(null);
                                      setFormOpen(true);
                                    }}
                                  >
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
                            );
                          })}
                        </div>
                      ) : (
                        <p className="note">
                          Aucun spot enregistré. Recherchez un lieu, cliquez sur un résultat, ajustez le nom puis
                          enregistrez-le : il restera disponible sur cet appareil.
                        </p>
                      )}
                    </>
                  )}

                  {step.key === 'milieu' && (
                    <>
                      {!activeSpot ? (
                        <p className="note">Sélectionnez d’abord un spot.</p>
                      ) : (
                        <>
                          <Segmented
                            label="Contexte du milieu"
                            full
                            value={activeSpot.milieu}
                            onChange={(value: MilieuMode) => updateSpot(activeSpot.id, { milieu: value })}
                            options={[
                              { value: 'auto', label: 'AUTO' },
                              { value: 'mer', label: 'MER' },
                              { value: 'eau_douce', label: 'EAU DOUCE' },
                            ]}
                          />
                          <div className="note--box note">
                            <strong>Détection :</strong>{' '}
                            {activeSpot.milieu !== 'auto'
                              ? `contexte imposé manuellement (${activeSpot.milieu === 'mer' ? 'MER' : 'EAU DOUCE'}), prioritaire sur la détection.`
                              : detecting
                                ? 'calcul de la distance au littoral…'
                                : coastError
                                  ? `distance au littoral indisponible (${coastError}).`
                                  : coast
                                    ? `spot à ${coast.distanceKm.toFixed(1).replace('.', ',')} km du trait de côte (${coast.source === 'osm' ? 'OpenStreetMap' : 'référentiel embarqué ±1,3 km'}) → ${resolved.milieu === 'mer' ? 'MER' : 'EAU DOUCE'}.`
                                    : 'en attente.'}
                          </div>
                          <p className="note">
                            Règle : à moins de 5 km d’une zone maritime, le spot est considéré comme maritime. Au-delà,
                            il est continental (eau douce). Le choix manuel reste toujours prioritaire, notamment pour
                            les estuaires et les spot situés à la limite terre/mer.
                          </p>
                        </>
                      )}
                    </>
                  )}

                  {step.key === 'units' && (
                    <>
                      <div className="option-grid">
                        {(['standard', 'nautical', 'dual'] as const).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            className="option-card"
                            aria-pressed={settings.units === mode}
                            onClick={() => updateSettings({ units: mode })}
                          >
                            <span className="option-card__title">{UNIT_LABELS[mode].label}</span>
                            <span className="option-card__sample">
                              {mode === 'standard' && '12,4 km · 24 km/h · 2,3 m'}
                              {mode === 'nautical' && '6,7 NM · 13 kn · 2,3 m'}
                              {mode === 'dual' && '12,4 km / 6,7 NM · 24 km/h / 13 kn'}
                            </span>
                            <span className="option-card__hint">{UNIT_LABELS[mode].hint}</span>
                          </button>
                        ))}
                      </div>
                      <p className="note">
                        Le sélecteur est global : chaque tableau, graphique et carte se met à jour immédiatement, sans
                        rechargement. Les valeurs d’origine des API ne sont jamais modifiées.
                      </p>
                    </>
                  )}
                </div>
              )}
            </section>
          );
        })}

        <div className="banner">
          <Icon name="info" size={16} />
          <span className="grow">
            {ready
              ? `Prêt : ${activeSpot?.name} · ${ACTIVITY_MAP[settings.activity]?.label} · ${resolved.milieu === 'mer' ? 'Mer' : 'Eau douce'}`
              : 'Sélectionnez un spot pour ouvrir le tableau de bord.'}
          </span>
          <button type="button" className="btn btn--primary btn--sm" onClick={onOpenDashboard} disabled={!ready}>
            Tableau de bord
          </button>
        </div>
      </div>

      <SpotForm
        open={formOpen}
        initial={formInitial}
        prefill={formPrefill}
        onClose={() => {
          setFormOpen(false);
          setFormInitial(null);
          setFormPrefill(null);
        }}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
