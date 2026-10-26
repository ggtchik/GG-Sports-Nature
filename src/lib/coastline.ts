/**
 * Distance to the sea, computed offline from a simplified Natural Earth 1:10m
 * coastline (Western Europe). Used to decide between the marine and freshwater
 * dashboards when the spot context is set to "auto".
 */
import { COASTLINE_DATA } from './coastlineData';

type Line = [number, number][];

const BBOX = { minLon: -6.2, maxLon: 10.8, minLat: 40.6, maxLat: 51.8 };
const RAD = Math.PI / 180;

let linesCache: Line[] | null = null;
const resultCache = new Map<string, number | null>();

function decode(): Line[] {
  if (linesCache) return linesCache;
  const lines: Line[] = [];
  for (const rawLine of COASTLINE_DATA.split(';')) {
    let x = 0;
    let y = 0;
    const line: Line = [];
    for (const token of rawLine.split(',')) {
      const [dx, dy] = token.split('.');
      x += parseInt(dx, 36);
      y += parseInt(dy, 36);
      line.push([x / 1000, y / 1000]);
    }
    if (line.length > 1) lines.push(line);
  }
  linesCache = lines;
  return lines;
}

/**
 * Nearest coastline distance in km, or null when the point is outside the
 * bundled coverage (Western Europe). Local equirectangular projection is
 * accurate to well under 1 % at these distances.
 */
export function coastDistanceKm(lat: number, lon: number): number | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < BBOX.minLat || lat > BBOX.maxLat || lon < BBOX.minLon || lon > BBOX.maxLon) {
    return null;
  }
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  const cached = resultCache.get(key);
  if (cached !== undefined) return cached;

  const kx = 111.32 * Math.cos(lat * RAD);
  const ky = 110.57;
  let best = Infinity;

  for (const line of decode()) {
    for (let i = 0; i < line.length - 1; i++) {
      const ax = (line[i][0] - lon) * kx;
      const ay = (line[i][1] - lat) * ky;
      const bx = (line[i + 1][0] - lon) * kx;
      const by = (line[i + 1][1] - lat) * ky;
      const dx = bx - ax;
      const dy = by - ay;
      const lenSq = dx * dx + dy * dy;
      let t = 0;
      if (lenSq > 0) {
        t = -(ax * dx + ay * dy) / lenSq;
        if (t < 0) t = 0;
        else if (t > 1) t = 1;
      }
      const px = ax + t * dx;
      const py = ay + t * dy;
      const d = px * px + py * py;
      if (d < best) best = d;
    }
  }

  const km = Number.isFinite(best) ? Math.sqrt(best) : null;
  resultCache.set(key, km);
  return km;
}

export const COASTLINE_SOURCE = {
  name: 'Natural Earth 1:10m',
  note: 'Distance au littoral estimée hors-ligne (précision ~300 m).',
  url: 'https://www.naturalearthdata.com/',
};
