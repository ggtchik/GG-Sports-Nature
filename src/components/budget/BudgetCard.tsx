import { useState } from 'react';
import { BedDouble, Car, ChevronDown, Euro, Fuel, Info, SlidersHorizontal, UtensilsCrossed } from 'lucide-react';
import type { BasePosition, BudgetResult, BudgetSettings, Spot } from '../../types';
import { euro, km, minutes, num } from '../../lib/format';
import { Card, CardHead, Segmented } from '../ui/kit';
import type { SegmentOption } from '../ui/kit';
import { Donut } from '../ui/charts';

const SLICE_COLORS: Record<string, string> = {
  fuel: 'var(--terracotta)',
  tolls: 'var(--amber)',
  wear: 'var(--sage)',
  lodging: 'var(--indigo)',
  meals: 'var(--clay)',
};

const NIGHT_OPTIONS: SegmentOption<string>[] = [
  { value: 'auto', label: 'Auto' },
  { value: '0', label: '0' },
  { value: '1', label: '1' },
  { value: '2', label: '2' },
];

interface BudgetCardProps {
  base: BasePosition;
  spot: Spot;
  result: BudgetResult;
  settings: BudgetSettings;
  onChange: (settings: BudgetSettings) => void;
  delay?: number;
}

export function BudgetCard({ base, spot, result, settings, onChange, delay = 0 }: BudgetCardProps) {
  const [open, setOpen] = useState(false);
  const slices = result.lines
    .filter((line) => line.amount > 0.005)
    .map((line) => ({ label: line.label, value: line.amount, color: SLICE_COLORS[line.id] ?? 'var(--ink-3)' }));

  const update = (patch: Partial<BudgetSettings>) => onChange({ ...settings, ...patch });

  return (
    <Card className="budget" delay={delay} id="budget">
      <CardHead
        kicker="Budget · estimation"
        title="Le coût de la sortie"
        icon={<Euro size={18} />}
        aside={
          <button
            type="button"
            className={`btn btn--sm btn--ghost ${open ? 'is-active' : ''}`}
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
          >
            <SlidersHorizontal size={14} /> Ajuster
            <ChevronDown size={13} className={open ? 'rotate-180' : ''} />
          </button>
        }
      />

      <div className="budget-top">
        <div className="budget-total">
          <p className="mini-label">Total estimé</p>
          <p className="budget-total__value">{euro(result.total, 2)}</p>
          <p className="budget-total__meta">
            {settings.travelers} personne{settings.travelers > 1 ? 's' : ''} · {euro(result.perPerson, 2)} / pers.
          </p>
          <p className="budget-route">
            {km(result.straightKm)} à vol d’oiseau · {km(result.roadKmOneWay)} par la route
            {settings.roundTrip ? ' · aller-retour' : ' · aller simple'}
          </p>
          <div className="budget-badges">
            <span>
              <Car size={12} /> {km(result.roadKmTotal)} au total
            </span>
            <span>
              <Info size={12} /> ~{minutes(result.driveMinutesOneWay)} de route
            </span>
            <span>
              <BedDouble size={12} /> {result.nights} nuit{result.nights > 1 ? 's' : ''}
              {result.autoNight ? ' (auto)' : ''}
            </span>
          </div>
        </div>

        <Donut
          slices={slices.length ? slices : [{ label: 'Aucun frais', value: 1, color: 'var(--surface-3)' }]}
          size={168}
          thickness={18}
          centerLabel="Total"
          centerValue={euro(result.total, 0)}
          format={(value) => euro(value, 2)}
        />
      </div>

      <div className="table-wrap">
        <table className="table table--dense budget-table">
          <caption className="sr-only">
            Détail du budget de déplacement entre {base.label} et {spot.name}
          </caption>
          <thead>
            <tr>
              <th scope="col">Poste</th>
              <th scope="col" className="hide-mobile">
                Détail
              </th>
              <th scope="col" className="is-right">
                Montant
              </th>
            </tr>
          </thead>
          <tbody>
            {result.lines.map((line) => {
              const Icon =
                line.id === 'fuel'
                  ? Fuel
                  : line.id === 'tolls'
                    ? Euro
                    : line.id === 'wear'
                      ? Car
                      : line.id === 'lodging'
                        ? BedDouble
                        : UtensilsCrossed;
              return (
                <tr key={line.id}>
                  <td>
                    <span className="budget-table__label">
                      <span className="budget-table__icon" style={{ color: SLICE_COLORS[line.id] }}>
                        <Icon size={15} />
                      </span>
                      {line.label}
                    </span>
                  </td>
                  <td className="hide-mobile">
                    <span className="budget-table__detail">{line.detail}</span>
                  </td>
                  <td className="is-right cell-strong">{euro(line.amount, 2)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3}>
                <span>
                  {km(result.roadKmTotal)} aller-retour · {minutes(result.driveMinutesOneWay)} de route ·{' '}
                  {result.nights} nuit{result.nights > 1 ? 's' : ''}
                </span>
                <strong>{euro(result.total, 2)}</strong>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {open ? (
        <div className="budget-settings">
          <p className="mini-label">
            <SlidersHorizontal size={12} /> Paramètres du calcul
          </p>
          <div className="budget-form">
            <label>
              <span>Voyageurs</span>
              <input
                type="number"
                min={1}
                max={9}
                step={1}
                value={settings.travelers}
                onChange={(event) => update({ travelers: Math.max(1, Number(event.target.value) || 1) })}
              />
            </label>
            <label>
              <span>Consommation (L/100 km)</span>
              <input
                type="number"
                min={0}
                max={30}
                step={0.1}
                value={settings.consumption}
                onChange={(event) => update({ consumption: Math.max(0, Number(event.target.value) || 0) })}
              />
            </label>
            <label>
              <span>Carburant (€/L)</span>
              <input
                type="number"
                min={0}
                max={5}
                step={0.01}
                value={settings.fuelPrice}
                onChange={(event) => update({ fuelPrice: Math.max(0, Number(event.target.value) || 0) })}
              />
            </label>
            <label>
              <span>Péage (€/km)</span>
              <input
                type="number"
                min={0}
                max={1}
                step={0.005}
                value={settings.tollPerKm}
                onChange={(event) => update({ tollPerKm: Math.max(0, Number(event.target.value) || 0) })}
              />
            </label>
            <label>
              <span>Usure (€/km)</span>
              <input
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={settings.wearPerKm}
                onChange={(event) => update({ wearPerKm: Math.max(0, Number(event.target.value) || 0) })}
              />
            </label>
            <label>
              <span>Hébergement (€/nuit)</span>
              <input
                type="number"
                min={0}
                step={1}
                value={settings.lodging}
                onChange={(event) => update({ lodging: Math.max(0, Number(event.target.value) || 0) })}
              />
            </label>
            <label>
              <span>Repas (€/pers./jour)</span>
              <input
                type="number"
                min={0}
                step={1}
                value={settings.mealsPerDay}
                onChange={(event) => update({ mealsPerDay: Math.max(0, Number(event.target.value) || 0) })}
              />
            </label>
            <div className="budget-form__group">
              <span>Nuits sur place</span>
              <Segmented
                value={settings.nights === null ? 'auto' : String(settings.nights)}
                options={NIGHT_OPTIONS}
                onChange={(value) => update({ nights: value === 'auto' ? null : Number(value) })}
                label="Nuits sur place"
                size="sm"
              />
            </div>
            <div className="budget-form__group">
              <span>Type de trajet</span>
              <Segmented
                value={settings.roundTrip ? 'ar' : 'as'}
                options={[
                  { value: 'ar', label: 'Aller-retour' },
                  { value: 'as', label: 'Aller simple' },
                ]}
                onChange={(value) => update({ roundTrip: value === 'ar' })}
                label="Type de trajet"
                size="sm"
              />
            </div>
          </div>
          <p className="budget-note">
            Estimation indicative pour un trajet depuis <strong>{base.label}</strong> vers <strong>{spot.name}</strong>.
            Carburant, péages et usure sont modifiables. L’hébergement est ajouté automatiquement au-delà de 420 km
            aller-retour ({num(result.roadKmTotal, 0)} km calculés).
          </p>
        </div>
      ) : null}

      <div className="card-foot">
        <span className="source-tag">
          <Euro size={12} /> Prix moyens France · {new Date().getFullYear()}
        </span>
        <span className="updated">Paramètres enregistrés localement</span>
      </div>
    </Card>
  );
}
