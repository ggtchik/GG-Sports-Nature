import type { MarineBundle, Milieu, ModuleState } from '../../core/types';
import { num } from '../../core/format';
import { Card, SourceFooter } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { UnavailableBlock } from '../ui/States';

interface Props {
  marine: ModuleState<MarineBundle>;
  milieu: Milieu;
}

export function WaterTemperatureCard({ marine, milieu }: Props) {
  const sst = marine.data?.current.seaSurfaceTemperature ?? null;

  if (milieu === 'eau_douce') {
    return (
      <Card title="Température de l’eau" icon="droplet" tone="earth">
        <UnavailableBlock title="Non disponible pour ce point">
          Aucune source publique ouverte ne publie la température des lacs, étangs et plans d’eau en temps réel. La
          température de surface de la mer (SST) d’Open-Meteo ne couvre pas les eaux intérieures : elle n’est donc pas
          affichée ici pour éviter toute valeur trompeuse.
          <div style={{ marginTop: 8 }} className="tiny">
            Pour les cours d’eau surveillés, des chroniques existent sur{' '}
            <a href="https://hubeau.eaufrance.fr/page/api-temperature-continu" target="_blank" rel="noreferrer noopener">
              Hub’Eau — température des cours d’eau
            </a>.
          </div>
        </UnavailableBlock>
        <p className="note">
          Repère de sécurité : une eau inférieure à 15 °C expose à l’hypothermie lors d’une baignade prolongée ; une
          combinaison est recommandée. Cette indication ne remplace pas l’avis d’un professionnel.
        </p>
      </Card>
    );
  }

  if (marine.state !== 'ok' || sst === null) {
    return (
      <Card title="Température de l’eau" icon="droplet" tone="sea">
        <UnavailableBlock title="SST indisponible">
          {marine.error ?? 'La température de surface de la mer n’est pas fournie par le modèle pour ce point.'}
        </UnavailableBlock>
      </Card>
    );
  }

  const values = (marine.data?.hourly ?? [])
    .map((h) => h.seaSurfaceTemperature)
    .filter((v): v is number => v !== null && Number.isFinite(v));
  const min = values.length ? Math.min(...values) : null;
  const max = values.length ? Math.max(...values) : null;

  return (
    <Card
      title="Température de l’eau"
      icon="droplet"
      tone="sea"
      footer={<SourceFooter sources={['open-meteo-marine']} fetchedAt={marine.fetchedAt} note="SST — modèle Météo-France, pas 6 h" />}
    >
      <div className="stats">
        <div className="stat">
          <span className="stat__label">Surface de la mer</span>
          <span className="stat__value stat__value--lg num">
            {num(sst, 1)} <span style={{ fontSize: 14, fontWeight: 500 }}>°C</span>
          </span>
          <span className="stat__hint">relevé modèle</span>
        </div>
        <div className="stat">
          <span className="stat__label">Min / max (7 j)</span>
          <span className="stat__value num">
            {min === null ? '—' : `${num(min, 1)} / ${num(max ?? min, 1)}`}
          </span>
          <span className="stat__hint">°C</span>
        </div>
      </div>
      <p className="note">
        <Icon name="info" size={12} /> Température de surface issue du modèle SMOC (résolution ≈ 8 km), mise à jour
        quotidiennement : elle peut différer de la température ressentie près du bord.
      </p>
    </Card>
  );
}
