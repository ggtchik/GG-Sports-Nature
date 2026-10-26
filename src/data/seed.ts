import type { BasePosition, Spot } from '../types';

const now = Date.now();

export const SEED_SPOTS: Spot[] = [
  {
    id: 'spot-dune-du-pilat',
    name: 'Dune du Pilat',
    detail: 'La Teste-de-Buch · Gironde',
    postcode: '33260',
    country: 'France',
    lat: 44.5886,
    lon: -1.2114,
    mode: 'auto',
    note: 'Plus haute dune d’Europe, face au banc d’Arguin. Idéal pour une sortie en fin de journée.',
    saved: true,
    createdAt: now,
    updatedAt: now,
  },
];

export const DEFAULT_POSITION: BasePosition = {
  lat: 44.8378,
  lon: -0.5792,
  label: 'Bordeaux',
  source: 'defaut',
  updatedAt: now,
};

export const DEFAULT_ACTIVITY = 'peche' as const;

export const APP_VERSION = '1.0.0';
