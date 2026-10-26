import type { ActivityDef, ActivityId } from '../types';

export const ACTIVITIES: ActivityDef[] = [
  {
    id: 'balade',
    label: 'Balade',
    tagline: 'Flâner au grand air',
    family: 'terrestre',
    familyLabel: 'Terrestre',
    water: false,
    accent: 'sage',
    description:
      'Sortie courte et accessible : météo heure par heure, lumière du jour et spots tranquilles autour de vous.',
    highlights: ['Météo 5 jours', 'Course du soleil', 'Carte du spot', 'Budget trajet'],
  },
  {
    id: 'randonnee',
    label: 'Randonnée',
    tagline: 'Prendre de la hauteur',
    family: 'terrestre',
    familyLabel: 'Terrestre',
    water: false,
    accent: 'moss',
    description:
      'Une journée en itinéraire : suivez la lumière, le vent, la pluie et la pression pour choisir le bon versant.',
    highlights: ['Météo 5 jours', 'Rafales & pression', 'Lever / coucher', 'Budget trajet'],
  },
  {
    id: 'jogging',
    label: 'Jogging',
    tagline: 'Courir au bon moment',
    family: 'terrestre',
    familyLabel: 'Terrestre',
    water: false,
    accent: 'terracotta',
    description:
      'Trouvez la fenêtre idéale : température ressentie, indice UV, humidité et risque de pluie heure par heure.',
    highlights: ['Créneau 24 h', 'Indice UV', 'Ressenti & humidité', 'Lune'],
  },
  {
    id: 'natation',
    label: 'Natation',
    tagline: 'Se jeter à l’eau',
    family: 'aquatique',
    familyLabel: 'Aquatique',
    water: true,
    accent: 'ocean',
    description:
      'En mer ou en eau douce, la baignade se prépare : température de l’eau, houle, marées et météo.',
    highlights: ['Eau & houle', 'Marées & coefficient', 'Météo 5 jours', 'Sécurité'],
  },
  {
    id: 'voile',
    label: 'Voile',
    tagline: 'Prendre le large',
    family: 'nautique',
    familyLabel: 'Nautique',
    water: true,
    accent: 'indigo',
    description:
      'Vent moyen, rafales, houle, période et marées : toutes les données marines pour préparer la sortie.',
    highlights: ['Vent & rafales', 'Houle & vagues', 'Marées', 'Fenêtre 5 jours'],
  },
  {
    id: 'peche',
    label: 'Pêche',
    tagline: 'Lire l’eau et le ciel',
    family: 'halieutique',
    familyLabel: 'Halieutique',
    water: true,
    accent: 'clay',
    description:
      'En mer : marées, houle et météo. En rivière : niveau d’eau et débit des stations les plus proches.',
    highlights: ['Marées ou débits', 'Houle & vagues', 'Pression atmosphérique', 'Stations Vigicrues'],
  },
  {
    id: 'chasse',
    label: 'Chasse',
    tagline: 'Observer et se préparer',
    family: 'cynegetique',
    familyLabel: 'Cynegetique',
    water: false,
    accent: 'amber',
    description:
      'Lever et coucher du soleil, phases de lune, vent et météo : les repères essentiels avant de partir.',
    highlights: ['Lumière & lune', 'Vent & direction', 'Météo 5 jours', 'Carte du spot'],
  },
];

export const ACTIVITY_MAP: Record<ActivityId, ActivityDef> = ACTIVITIES.reduce(
  (acc, activity) => ({ ...acc, [activity.id]: activity }),
  {} as Record<ActivityId, ActivityDef>,
);

export function getActivity(id: ActivityId): ActivityDef {
  return ACTIVITY_MAP[id] ?? ACTIVITIES[0];
}

export function activityNeedsWater(id: ActivityId): boolean {
  return getActivity(id).water;
}
