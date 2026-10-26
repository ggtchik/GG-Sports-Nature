import type { BasePosition, BudgetResult, BudgetSettings, Spot } from '../types';
import { driveMinutes, haversineKm, roadDistanceKm } from './geo';

export const DEFAULT_BUDGET_SETTINGS: BudgetSettings = {
  roundTrip: true,
  consumption: 6.2,
  fuelPrice: 1.86,
  tollPerKm: 0.095,
  wearPerKm: 0.07,
  nights: null,
  lodging: 92,
  mealsPerDay: 24,
  travelers: 2,
};

export function computeBudget(
  base: BasePosition | null,
  spot: Spot | null,
  settings: BudgetSettings,
): BudgetResult {
  const straightKm = base && spot ? haversineKm(base, spot) : 0;
  const roadKmOneWay = roadDistanceKm(straightKm);
  const roadKmTotal = settings.roundTrip ? roadKmOneWay * 2 : roadKmOneWay;
  const autoNight = roadKmTotal > 420;
  const nights = settings.nights === null ? (autoNight ? 1 : 0) : Math.max(0, settings.nights);
  const tollsApplied = roadKmTotal >= 70;

  const fuel = (roadKmTotal / 100) * settings.consumption * settings.fuelPrice;
  const tolls = tollsApplied ? roadKmTotal * settings.tollPerKm : 0;
  const wear = roadKmTotal * settings.wearPerKm;
  const lodging = nights * settings.lodging;
  const meals = nights * settings.travelers * settings.mealsPerDay;

  const lines: BudgetResult['lines'] = [
    {
      id: 'fuel',
      label: 'Carburant',
      detail: `${roadKmTotal.toFixed(0)} km · ${settings.consumption.toFixed(1)} L/100 km · ${settings.fuelPrice
        .toFixed(2)
        .replace('.', ',')} €/L`,
      amount: fuel,
    },
    {
      id: 'tolls',
      label: 'Péages',
      detail: tollsApplied
        ? `≈ ${(settings.tollPerKm * 100).toFixed(1).replace('.', ',')} € / 100 km`
        : 'Pas de péage estimé sur ce trajet',
      amount: tolls,
    },
    {
      id: 'wear',
      label: 'Usure & entretien',
      detail: `${(settings.wearPerKm * 100).toFixed(0)} centimes / km`,
      amount: wear,
    },
    {
      id: 'lodging',
      label: 'Hébergement',
      detail: nights > 0 ? `${nights} nuit${nights > 1 ? 's' : ''} · ${settings.lodging} €` : 'Sortie à la journée',
      amount: lodging,
    },
    {
      id: 'meals',
      label: 'Repas',
      detail:
        nights > 0
          ? `${settings.travelers} pers. · ${settings.mealsPerDay} € / jour`
          : 'Restauration non comptée sur une journée',
      amount: meals,
    },
  ];

  const total = lines.reduce((sum, line) => sum + line.amount, 0);
  const perPerson = settings.travelers > 0 ? total / settings.travelers : total;

  return {
    straightKm,
    roadKmOneWay,
    roadKmTotal,
    driveMinutesOneWay: driveMinutes(roadKmOneWay),
    nights,
    autoNight: settings.nights === null,
    lines,
    total,
    perPerson,
    tollsApplied,
  };
}
