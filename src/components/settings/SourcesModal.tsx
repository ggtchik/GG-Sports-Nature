import { ACTIVE_SOURCES, STUDIED_SOURCES } from '../../core/sources';
import { Modal } from '../ui/Modal';
import { Icon } from '../ui/Icon';

export function SourcesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      title="Sources, licences et méthode"
      subtitle="Ce que l’application affiche, d’où cela vient, et ce qu’elle n’affiche pas"
      onClose={onClose}
      wide
      footer={
        <button type="button" className="btn btn--primary" onClick={onClose}>
          Fermer
        </button>
      }
    >
      <section className="stack">
        <h3 className="card__title">
          <Icon name="clipboard" size={16} /> Principes
        </h3>
        <ul className="stack" style={{ gap: 6, fontSize: 13.5, color: 'var(--ink-2)' }}>
          <li>• Aucune donnée n’est inventée : une valeur absente est affichée « — » avec son explication.</li>
          <li>
            • Chaque module indique sa source, sa nature (temps réel, quasi temps réel, prévision, calcul local) et
            l’horodatage annoncé par la source.
          </li>
          <li>• Une prévision n’est jamais présentée comme une mesure ; un calcul de modèle n’est jamais présenté comme officiel.</li>
          <li>• Les valeurs restent dans leur unité d’origine ; les conversions n’ont lieu qu’à l’affichage.</li>
          <li>• Aucune clé d’API secrète n’est requise par défaut. La seule clé possible (api-maree.fr) est fournie par l’utilisateur et stockée localement.</li>
        </ul>
      </section>

      <div className="divider" />

      <section className="stack">
        <h3 className="card__title">
          <Icon name="database" size={16} /> Sources utilisées
        </h3>
        <div className="stack" style={{ gap: 14 }}>
          {ACTIVE_SOURCES.map((source) => (
            <div key={source.id} className="stack" style={{ gap: 4 }}>
              <div className="inline" style={{ gap: 8 }}>
                <strong style={{ fontSize: 13.5 }}>{source.name}</strong>
                <span className="chip chip--outline" style={{ height: 20, fontSize: 10.5 }}>
                  {source.nature}
                </span>
                {source.keyRequired && (
                  <span className="chip chip--warn" style={{ height: 20, fontSize: 10.5 }}>
                    clé requise
                  </span>
                )}
              </div>
              <div className="tiny dim">{source.org}</div>
              <div className="tiny" style={{ color: 'var(--ink-2)' }}>
                <strong>Mise à jour :</strong> {source.update}
              </div>
              <div className="tiny" style={{ color: 'var(--ink-2)' }}>
                <strong>Licence :</strong> {source.licence}
              </div>
              <div className="tiny" style={{ color: 'var(--ink-3)' }}>{source.notes}</div>
              <a className="source-link" href={source.url} target="_blank" rel="noreferrer noopener">
                {source.url} <Icon name="external" />
              </a>
            </div>
          ))}
        </div>
      </section>

      <div className="divider" />

      <section className="stack">
        <h3 className="card__title">
          <Icon name="alert" size={16} /> Sources étudiées et non intégrées
        </h3>
        <div className="stack" style={{ gap: 14 }}>
          {STUDIED_SOURCES.map((source) => (
            <div key={source.id} className="stack" style={{ gap: 4 }}>
              <div className="inline" style={{ gap: 8 }}>
                <strong style={{ fontSize: 13.5 }}>{source.name}</strong>
                {source.keyRequired && (
                  <span className="chip chip--warn" style={{ height: 20, fontSize: 10.5 }}>
                    clé requise
                  </span>
                )}
              </div>
              <div className="tiny" style={{ color: 'var(--ink-2)' }}>
                <strong>Pourquoi :</strong> {source.reason ?? source.notes}
              </div>
              <div className="tiny" style={{ color: 'var(--ink-3)' }}>
                Licence : {source.licence}
              </div>
              <a className="source-link" href={source.url} target="_blank" rel="noreferrer noopener">
                Consulter la source <Icon name="external" />
              </a>
            </div>
          ))}
        </div>
      </section>

      <div className="divider" />

      <section className="stack">
        <h3 className="card__title">
          <Icon name="sparkles" size={16} /> Méthodes de calcul
        </h3>
        <div className="stack" style={{ gap: 10, fontSize: 13, color: 'var(--ink-2)' }}>
          <p>
            <strong>Milieu (AUTO).</strong> Distance du spot au trait de côte le plus proche : requête Overpass
            (`natural=coastline`, rayon 10 km) puis repli sur un référentiel Natural Earth 1:10m embarqué. Seuil
            réglementaire : 5 km. Le choix manuel est toujours prioritaire.
          </p>
          <p>
            <strong>Marées.</strong> Sans clé api-maree.fr, la hauteur d’eau provient du modèle SMOC (niveau moyen de la
            mer) : les extrema sont détectés puis affinés par interpolation parabolique. Aucun coefficient n’est affiché
            dans ce cas, car il n’existe pas de source ouverte. Avec une clé, les horaires et coefficients proviennent
            d’api-maree.fr (harmoniques Ifremer/PREVIMER, CC BY) et sont signalés comme non officiels.
          </p>
          <p>
            <strong>Astronomie.</strong> Calcul local (SunCalc) : lever, coucher, crépuscules, heure dorée, course du
            soleil, phase et illumination de la lune. Les heures renvoyées par Open-Meteo servent de contrôle.
          </p>
          <p>
            <strong>Hydrologie.</strong> Stations Hub’Eau (réseau Vigicrues/PHyC) triées par distance, cinq plus proches
            retenues. Hauteurs converties de millimètres en mètres, débits de L/s en m³/s. Données brutes.
          </p>
          <p>
            <strong>Distances et frais.</strong> Itinéraire routier OSRM ; en cas d’indisponibilité, distance à vol
            d’oiseau majorée de 25 % sans durée. Les frais sont une estimation paramétrable, jamais un tarif officiel.
          </p>
          <p>
            <strong>Unités.</strong> 1 NM = 1,852 km · 1 kn = 1,852 km/h · pression en hPa · hauteurs en mètres.
            Arrondis : distances à 0,1 km, vitesses à l’unité, températures à 0,1 °C, marées à 0,01 m.
          </p>
        </div>
      </section>

      <div className="divider" />

      <p className="note">
        GG Sports-Nature est un outil d’aide à la préparation : il ne remplace ni les bulletins officiels de sécurité
        (Météo-France, SHOM, Vigicrues), ni les consignes locales, ni le jugement de l’utilisateur. Les données de
        modèle ne conviennent pas à la navigation maritime.
      </p>
    </Modal>
  );
}
