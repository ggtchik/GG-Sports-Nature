import type { MarineData, PortRef, TideEvent, TideInfo } from '../types';
import { estimateTideCoefficient } from './astro';
import { haversineKm } from './geo';

export const PORTS: PortRef[] = [
  { name: 'Dunkerque', region: 'Manche', lat: 51.034, lon: 2.377 },
  { name: 'Calais', region: 'Manche', lat: 50.958, lon: 1.851 },
  { name: 'Boulogne-sur-Mer', region: 'Manche', lat: 50.726, lon: 1.614 },
  { name: 'Dieppe', region: 'Manche', lat: 49.923, lon: 1.078 },
  { name: 'Fécamp', region: 'Manche', lat: 49.757, lon: 0.374 },
  { name: 'Le Havre', region: 'Manche', lat: 49.494, lon: 0.108 },
  { name: 'Ouistreham', region: 'Manche', lat: 49.286, lon: -0.259 },
  { name: 'Cherbourg', region: 'Manche', lat: 49.639, lon: -1.616 },
  { name: 'Granville', region: 'Manche', lat: 48.838, lon: -1.597 },
  { name: 'Saint-Malo', region: 'Manche', lat: 48.649, lon: -2.026 },
  { name: 'Saint-Brieuc', region: 'Manche', lat: 48.513, lon: -2.765 },
  { name: 'Roscoff', region: 'Manche', lat: 48.726, lon: -3.985 },
  { name: 'Brest', region: 'Atlantique', lat: 48.39, lon: -4.486 },
  { name: 'Douarnenez', region: 'Atlantique', lat: 48.092, lon: -4.33 },
  { name: 'Concarneau', region: 'Atlantique', lat: 47.875, lon: -3.919 },
  { name: 'Lorient', region: 'Atlantique', lat: 47.748, lon: -3.366 },
  { name: 'Quiberon', region: 'Atlantique', lat: 47.484, lon: -3.12 },
  { name: 'Vannes', region: 'Atlantique', lat: 47.655, lon: -2.76 },
  { name: 'Saint-Nazaire', region: 'Atlantique', lat: 47.273, lon: -2.214 },
  { name: 'Pornic', region: 'Atlantique', lat: 47.115, lon: -2.104 },
  { name: 'Noirmoutier', region: 'Atlantique', lat: 46.999, lon: -2.228 },
  { name: 'Les Sables-d’Olonne', region: 'Atlantique', lat: 46.496, lon: -1.784 },
  { name: 'La Rochelle', region: 'Atlantique', lat: 46.16, lon: -1.151 },
  { name: 'Fouras', region: 'Atlantique', lat: 45.988, lon: -1.093 },
  { name: 'Royan', region: 'Atlantique', lat: 45.62, lon: -1.028 },
  { name: 'Arcachon', region: 'Atlantique', lat: 44.661, lon: -1.172 },
  { name: 'Capbreton', region: 'Atlantique', lat: 43.642, lon: -1.448 },
  { name: 'Biarritz', region: 'Atlantique', lat: 43.483, lon: -1.559 },
  { name: 'Saint-Jean-de-Luz', region: 'Atlantique', lat: 43.389, lon: -1.663 },
  { name: 'Île d’Yeu', region: 'Atlantique', lat: 46.727, lon: -2.348 },
  { name: 'Belle-Île', region: 'Atlantique', lat: 47.346, lon: -3.152 },
  { name: 'Marseille', region: 'Méditerranée', lat: 43.296, lon: 5.37 },
  { name: 'Toulon', region: 'Méditerranée', lat: 43.124, lon: 5.928 },
  { name: 'Hyères', region: 'Méditerranée', lat: 43.121, lon: 6.129 },
  { name: 'Nice', region: 'Méditerranée', lat: 43.695, lon: 7.285 },
  { name: 'Sète', region: 'Méditerranée', lat: 43.407, lon: 3.702 },
  { name: 'Port-Vendres', region: 'Méditerranée', lat: 42.518, lon: 3.106 },
  { name: 'Ajaccio', region: 'Méditerranée', lat: 41.919, lon: 8.739 },
  { name: 'Bastia', region: 'Méditerranée', lat: 42.703, lon: 9.45 },
  { name: 'Calvi', region: 'Méditerranée', lat: 42.568, lon: 8.757 },
  { name: 'Bonifacio', region: 'Méditerranée', lat: 41.388, lon: 9.159 },
  { name: 'Saint-Florent', region: 'Méditerranée', lat: 42.681, lon: 9.303 },
];

export const TIDE_DISCLAIMER =
  'Horaires et hauteurs issus du modèle océanique Open-Meteo (maille ~8 km), relatifs au niveau moyen de la mer. Coefficients estimés par calcul astronomique (échelle SHOM de 20 à 120). Ne pas utiliser pour la navigation.';

export function nearestPort(lat: number, lon: number): { port: PortRef; distanceKm: number } {
  let best = PORTS[0];
  let bestDistance = Infinity;
  for (const port of PORTS) {
    const distance = haversineKm({ lat, lon }, { lat: port.lat, lon: port.lon });
    if (distance < bestDistance) {
      bestDistance = distance;
      best = port;
    }
  }
  return { port: best, distanceKm: bestDistance };
}

function isNum(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

interface Sample {
  time: Date;
  value: number;
}

export function computeTides(marine: MarineData | null, lat: number, lon: number): TideInfo {
  const { port, distanceKm } = nearestPort(lat, lon);
  const empty: TideInfo = {
    available: false,
    events: [],
    nextHigh: null,
    nextLow: null,
    curve: [],
    range: null,
    coefficient: null,
    port,
    portDistanceKm: distanceKm,
    heightReference: 'msl',
    note: 'Hauteurs de marée non disponibles pour ce point.',
  };

  if (!marine) return empty;

  const samples: Sample[] = [];
  const times = marine.hourly.time;
  for (let i = 0; i < times.length; i++) {
    const value = marine.hourly.seaLevel[i];
    if (isNum(value)) {
      const time = new Date(times[i]);
      if (!Number.isNaN(time.getTime())) samples.push({ time, value });
    }
  }
  if (samples.length < 8) return empty;

  const values = samples.map((s) => s.value);
  const overallRange = Math.max(...values) - Math.min(...values);
  if (overallRange < 0.05) {
    return {
      ...empty,
      note: 'Marée quasi nulle à ce point (Méditerranée) : le niveau varie de moins de 5 cm.',
      range: overallRange,
      curve: samples.map((s) => ({ time: s.time, height: s.value })),
    };
  }

  const rawEvents: { time: Date; height: number; type: 'haute' | 'basse' }[] = [];
  for (let i = 1; i < samples.length - 1; i++) {
    const prev = samples[i - 1].value;
    const cur = samples[i].value;
    const next = samples[i + 1].value;
    const isHigh = cur >= prev && cur > next;
    const isLow = cur <= prev && cur < next;
    if (!isHigh && !isLow) continue;
    const denominator = prev - 2 * cur + next;
    let shift = denominator !== 0 ? (0.5 * (prev - next)) / denominator : 0;
    shift = Math.max(-0.5, Math.min(0.5, shift));
    const time = new Date(samples[i].time.getTime() + shift * 3_600_000);
    const height = cur - 0.25 * (prev - next) * shift;
    rawEvents.push({ time, height, type: isHigh ? 'haute' : 'basse' });
  }

  // Keep a clean high/low alternation.
  const cleaned: typeof rawEvents = [];
  for (const event of rawEvents) {
    const last = cleaned[cleaned.length - 1];
    if (last && last.type === event.type) {
      if (
        (event.type === 'haute' && event.height > last.height) ||
        (event.type === 'basse' && event.height < last.height)
      ) {
        cleaned[cleaned.length - 1] = event;
      }
      continue;
    }
    if (last && event.time.getTime() - last.time.getTime() < 2 * 3_600_000) continue;
    cleaned.push(event);
  }

  const events: TideEvent[] = cleaned.map((event) => ({
    time: event.time,
    type: event.type,
    height: event.height,
    coefficient: estimateTideCoefficient(event.time),
  }));

  const now = Date.now();
  const nextHigh = events.find((e) => e.type === 'haute' && e.time.getTime() > now) ?? null;
  const nextLow = events.find((e) => e.type === 'basse' && e.time.getTime() > now) ?? null;

  const highs = events.filter((e) => e.type === 'haute');
  const lows = events.filter((e) => e.type === 'basse');
  let range: number | null = null;
  if (highs.length && lows.length) {
    const sampleHigh = highs[0].height;
    const sampleLow = lows[0].height;
    range = Math.abs(sampleHigh - sampleLow);
  }

  const todayEvents = events.filter(
    (event) => event.time.toDateString() === new Date().toDateString(),
  );
  const coefficient = (todayEvents.length ? todayEvents : events.slice(0, 2)).reduce(
    (max, event) => Math.max(max, event.coefficient),
    0,
  );

  return {
    available: events.length > 0,
    events,
    nextHigh,
    nextLow,
    curve: samples.map((s) => ({ time: s.time, height: s.value })),
    range,
    coefficient: coefficient || null,
    port,
    portDistanceKm: distanceKm,
    heightReference: 'msl',
  };
}

export function tideTypeLabel(type: TideEvent['type']): string {
  return type === 'haute' ? 'Haute mer' : 'Basse mer';
}
