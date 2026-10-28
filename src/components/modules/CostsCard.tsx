import { useState } from 'react';
import type { ModuleState, RouteInfo } from '../../core/types';
import { computeCosts } from '../../core/costs';
import { num } from '../../core/format';
import { duration } from '../../core/format';
import { useApp } from '../../state/AppContext';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { UnavailableBlock } from '../ui/States';

interface Props {
  route: ModuleState<RouteInfo>;
}

function euro(value: number): string {
  return `${num(value, 2)} €`;
}

export function CostsCard({ route }: Props) {
  const { units, settings, updateCosts } = useApp();
  const [open, setOpen] = useState(false);
  const costs = settings.costs;
  const breakdown = computeCosts(route.data?.distanceKm ?? null, costs, {
    approximateDistance: route.data?.source === 'haversine',
  });
  const hasDistance = Boolean(route.data);

  return (
    <Card
      title="Frais de déplacement"
      icon="euro"
      subtitle="Estimation modifiable — aucun tarif officiel n’est utilisé"
      actions={
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <Icon name="settings" size={14} /> Paramètres
        </button>
      }
      footer={<span className="note">Calcul local : carburant, péages éventuels, hébergement et frais libres.</span>}
    >
      {!hasDistance && (
        <UnavailableBlock title="Distance non calculable">
          Renseignez une position de départ pour estimer les frais.
        </UnavailableBlock>
      )}

      {open && (
        <div className="stack" style={{ gap: 12 }}>
          <div className="costs-grid">
            <label className="field">
              <span className="field__label">Consommation (L/100 km)</span>
              <input
                className="input"
                type="number"
                min="0"
                step="0.1"
                inputMode="decimal"
                value={costs.consumption}
                onChange={(event) => updateCosts({ consumption: Number(event.target.value) })}
              />
            </label>
            <label className="field">
              <span className="field__label">Carburant (€/L)</span>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={costs.fuelPrice}
                onChange={(event) => updateCosts({ fuelPrice: Number(event.target.value) })}
              />
            </label>
            <label className="field">
              <span className="field__label">Péages (€/km)</span>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={costs.tollPerKm}
                onChange={(event) => updateCosts({ tollPerKm: Number(event.target.value) })}
              />
            </label>
            <label className="field">
              <span className="field__label">Péages forfait (€)</span>
              <input
                className="input"
                type="number"
                min="0"
                step="0.5"
                inputMode="decimal"
                value={costs.tollsFixed}
                onChange={(event) => updateCosts({ tollsFixed: Number(event.target.value) })}
              />
            </label>
            <label className="field">
              <span className="field__label">Véhicules</span>
              <input
                className="input"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={costs.vehicles}
                onChange={(event) => updateCosts({ vehicles: Math.max(1, Number(event.target.value)) })}
              />
            </label>
            <label className="field">
              <span className="field__label">Hébergement (€)</span>
              <input
                className="input"
                type="number"
                min="0"
                step="1"
                inputMode="decimal"
                value={costs.lodging}
                onChange={(event) => updateCosts({ lodging: Number(event.target.value) })}
              />
            </label>
            <label className="field">
              <span className="field__label">Autres frais (€)</span>
              <input
                className="input"
                type="number"
                min="0"
                step="1"
                inputMode="decimal"
                value={costs.other}
                onChange={(event) => updateCosts({ other: Number(event.target.value) })}
              />
            </label>
          </div>
          <label className="check">
            <input
              type="checkbox"
              checked={costs.roundTrip}
              onChange={(event) => updateCosts({ roundTrip: event.target.checked })}
            />
            Trajet aller-retour
          </label>
          <p className="note">
            Le prix du carburant évolue : la valeur par défaut est un simple repère, à remplacer par le prix constaté.
            Les péages dépendent du trajet réel et ne peuvent pas être déduits de la seule distance.
          </p>
        </div>
      )}

      <table className="costs-table">
        <tbody>
          <tr>
            <td>Distance {costs.roundTrip ? '(aller-retour)' : '(aller)'}</td>
            <td>{hasDistance ? `${units.distance(breakdown.totalKm)}` : '—'}</td>
          </tr>
          {route.data?.durationMin !== null && route.data?.durationMin !== undefined && (
            <tr>
              <td>Durée estimée du trajet</td>
              <td>{duration(route.data.durationMin * (costs.roundTrip ? 2 : 1))}</td>
            </tr>
          )}
          <tr>
            <td>Carburant</td>
            <td>{euro(breakdown.fuel)}</td>
          </tr>
          <tr>
            <td>Péages</td>
            <td>{euro(breakdown.tolls)}</td>
          </tr>
          <tr>
            <td>Hébergement</td>
            <td>{euro(breakdown.lodging)}</td>
          </tr>
          <tr>
            <td>Autres frais</td>
            <td>{euro(breakdown.other)}</td>
          </tr>
          <tr>
            <td>Total estimé</td>
            <td>{euro(breakdown.total)}</td>
          </tr>
        </tbody>
      </table>

      {route.data?.source === 'haversine' && (
        <p className="note">
          Distance estimée à vol d’oiseau majorée de 25 % (routeur indisponible) — la durée réelle n’est pas affichée.
        </p>
      )}
      <p className="note">
        Estimation indicative, hors usure, assurance et stationnement. Tous les paramètres sont modifiables ci-dessus et
        conservés sur cet appareil.
      </p>
    </Card>
  );
}
