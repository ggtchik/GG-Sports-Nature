/** Estimation des frais de déplacement — paramètres modifiables par l'utilisateur. */
import type { CostParams } from './types';

export interface CostBreakdown {
  oneWayKm: number;
  totalKm: number;
  fuel: number;
  tolls: number;
  lodging: number;
  other: number;
  total: number;
  /** `true` lorsque le calcul repose sur une distance estimée (vol d'oiseau majoré). */
  approximateDistance: boolean;
}

export const DEFAULT_COSTS: CostParams = {
  consumption: 6.5,
  fuelPrice: 1.75,
  tollPerKm: 0,
  vehicles: 1,
  roundTrip: true,
  lodging: 0,
  other: 0,
  tollsFixed: 0,
};

export function computeCosts(
  distanceKm: number | null | undefined,
  params: CostParams,
  options: { approximateDistance?: boolean } = {},
): CostBreakdown {
  const oneWay = Number.isFinite(distanceKm) && distanceKm !== null && distanceKm !== undefined
    ? (distanceKm as number)
    : 0;
  const totalKm = oneWay * (params.roundTrip ? 2 : 1) * Math.max(1, params.vehicles || 1);
  const fuel = (totalKm * Math.max(0, params.consumption)) / 100 * Math.max(0, params.fuelPrice);
  const tolls =
    params.tollsFixed > 0
      ? params.tollsFixed
      : totalKm * Math.max(0, params.tollPerKm);
  const lodging = Math.max(0, params.lodging || 0);
  const other = Math.max(0, params.other || 0);
  return {
    oneWayKm: oneWay,
    totalKm,
    fuel,
    tolls,
    lodging,
    other,
    total: fuel + tolls + lodging + other,
    approximateDistance: Boolean(options.approximateDistance),
  };
}
