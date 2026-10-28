/** Catalogue des activités et modules à afficher selon le milieu. */
import type { ActivityId, Milieu } from './types';

export interface Activity {
  id: ActivityId;
  label: string;
  emoji: string;
  family: 'terrestre' | 'aquatique' | 'nautique' | 'halieutique';
  blurb: string;
  /** Profil de modules complémentaires. */
  needs: {
    /** Marées, houle, vagues, prévisions marines. */
    coastal: boolean;
    /** Stations hydrologiques (cours d'eau). */
    hydrology: boolean;
    /** Température de l'eau (mer ou eau douce). */
    waterTemperature: boolean;
    /** Sécurité mer : coefficient, marnage, vents. */
    marineSafety: boolean;
  };
}

export const ACTIVITIES: Activity[] = [
  {
    id: 'balade',
    label: 'Balade',
    emoji: '🥾',
    family: 'terrestre',
    blurb: 'Sortie courte, météo et lumière avant de partir.',
    needs: { coastal: false, hydrology: false, waterTemperature: false, marineSafety: false },
  },
  {
    id: 'randonnee',
    label: 'Randonnée',
    emoji: '🏔️',
    family: 'terrestre',
    blurb: 'Journée complète : évolution horaire, UV, vent, crépuscule.',
    needs: { coastal: false, hydrology: false, waterTemperature: false, marineSafety: false },
  },
  {
    id: 'jogging',
    label: 'Jogging',
    emoji: '🏃',
    family: 'terrestre',
    blurb: 'Créneau idéal selon température ressentie, pluie et vent.',
    needs: { coastal: false, hydrology: false, waterTemperature: false, marineSafety: false },
  },
  {
    id: 'natation',
    label: 'Natation',
    emoji: '🏊',
    family: 'aquatique',
    blurb: 'Eau libre : température de l’eau, UV, vent, marées en mer.',
    needs: { coastal: true, hydrology: false, waterTemperature: true, marineSafety: false },
  },
  {
    id: 'nautisme',
    label: 'Nautisme',
    emoji: '⛵',
    family: 'nautique',
    blurb: 'Voile et bateau à moteur : vent réel, rafales, houle, marées.',
    needs: { coastal: true, hydrology: false, waterTemperature: true, marineSafety: true },
  },
  {
    id: 'peche',
    label: 'Pêche',
    emoji: '🎣',
    family: 'halieutique',
    blurb: 'Eau douce : hauteurs et débits des stations proches. Mer : marées et houle.',
    needs: { coastal: true, hydrology: true, waterTemperature: false, marineSafety: false },
  },
  {
    id: 'chasse',
    label: 'Chasse',
    emoji: '🦌',
    family: 'terrestre',
    blurb: 'Lever/coucher du soleil, vent, pluie et visibilité.',
    needs: { coastal: false, hydrology: false, waterTemperature: false, marineSafety: false },
  },
];

export const ACTIVITY_MAP: Record<ActivityId, Activity> = Object.fromEntries(
  ACTIVITIES.map((activity) => [activity.id, activity]),
) as Record<ActivityId, Activity>;

export interface ModulePlan {
  /** Marées / houle / vagues / prévisions marines. */
  coastal: boolean;
  hydrology: boolean;
  waterTemperature: boolean;
  marineSafety: boolean;
  /** Le milieu est maritime pour cette combinaison. */
  marine: boolean;
}

/**
 * Règle métier centrale : une activité terrestre n'affiche JAMAIS de données
 * maritimes, même si le spot est en bord de mer.
 */
export function planModules(activityId: ActivityId, milieu: Milieu): ModulePlan {
  const activity = ACTIVITY_MAP[activityId];
  const marine = milieu === 'mer';
  const terrestrialFamily = activity.family === 'terrestre';

  return {
    marine,
    coastal: marine && activity.needs.coastal && !terrestrialFamily,
    hydrology: activity.needs.hydrology && !marine,
    waterTemperature: activity.needs.waterTemperature,
    marineSafety: marine && activity.needs.marineSafety && !terrestrialFamily,
  };
}

export function activityLabel(activityId: ActivityId): string {
  return ACTIVITY_MAP[activityId]?.label ?? activityId;
}
