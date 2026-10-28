/**
 * Génère src/data/coastline.json — tracé de référence terre/mer utilisé comme
 * repli local pour la détection automatique du milieu (le service en ligne OSM
 * Overpass reste la source prioritaire, plus précise).
 *
 * Source : Natural Earth 1:10m « land » (domaine public), distribuée par le
 * paquet npm `world-atlas` (world-atlas@2.0.2).
 *
 * Encodage compact :
 *   { meta, lines: number[][], grid: { "cx,cy": number[] } }
 *   lines[i] = [x0, y0, dx1, dy1, dx2, dy2, …]  (entiers en millièmes de degré)
 *
 * Usage : npm i -D world-atlas@2.0.2 && npm run data:coastline
 * Le fichier produit est versionné : le build n'exige aucun accès réseau.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { feature } from 'topojson-client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const topoPath = path.join(root, 'node_modules/world-atlas/land-10m.json');
const outPath = path.join(root, 'src/data/coastline.json');

if (!fs.existsSync(topoPath)) {
  console.error('world-atlas introuvable : npm i -D world-atlas@2.0.2 puis relancez.');
  process.exit(1);
}

const TOLERANCE = 0.012; // ~1,3 km, suffisant pour trancher un seuil de 5 km
const SCALE = 1000; // millièmes de degré (~110 m)
const CELL = 1; // maille de l'index spatial, en degrés
const TINY = 0.05; // îlots : un point suffit

function perpDistance(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  if (dx === 0 && dy === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy);
  const tc = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + tc * dx), p[1] - (a[1] + tc * dy));
}

function simplify(points, tol) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [start, end] = stack.pop();
    let maxDist = -1;
    let index = -1;
    for (let i = start + 1; i < end; i++) {
      const d = perpDistance(points[i], points[start], points[end]);
      if (d > maxDist) {
        maxDist = d;
        index = i;
      }
    }
    if (maxDist > tol && index > 0) {
      keep[index] = 1;
      stack.push([start, index], [index, end]);
    }
  }
  const out = [];
  for (let i = 0; i < points.length; i++) if (keep[i]) out.push(points[i]);
  return out;
}

const topo = JSON.parse(fs.readFileSync(topoPath, 'utf8'));
const geo = feature(topo, topo.objects.land);

const lines = [];
let totalPoints = 0;
let tinyIslands = 0;

for (const f of geo.features) {
  const g = f.geometry;
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  for (const poly of polys) {
    for (const ring of poly) {
      if (ring.length < 4) continue;
      let simplified = simplify(ring, TOLERANCE);
      if (simplified.length < 2) continue;

      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (const [x, y] of simplified) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
      if (Math.max(maxX - minX, maxY - minY) < TINY) {
        const cx = Math.round(((minX + maxX) / 2) * SCALE);
        const cy = Math.round(((minY + maxY) / 2) * SCALE);
        lines.push([cx, cy]);
        totalPoints += 1;
        tinyIslands++;
        continue;
      }

      const flat = [];
      let prevX = null;
      let prevY = null;
      for (const [lon, lat] of simplified) {
        const x = Math.round(lon * SCALE);
        const y = Math.round(lat * SCALE);
        if (x === prevX && y === prevY) continue;
        flat.push(x, y);
        prevX = x;
        prevY = y;
      }
      if (flat.length < 4) continue;
      lines.push(flat);
      totalPoints += flat.length / 2;
    }
  }
}

// Delta encoding : [x0, y0, dx, dy, …]
const encoded = lines.map((flat) => {
  if (flat.length === 2) return flat;
  const out = [flat[0], flat[1]];
  for (let i = 2; i < flat.length; i++) out.push(flat[i] - flat[i - 2]);
  return out;
});

const grid = new Map();
const addToCell = (key, li) => {
  let arr = grid.get(key);
  if (!arr) grid.set(key, (arr = []));
  if (arr[arr.length - 1] !== li) arr.push(li);
};

encoded.forEach((flat, li) => {
  if (flat.length === 2) {
    addToCell(`${Math.floor(flat[0] / (CELL * SCALE))},${Math.floor(flat[1] / (CELL * SCALE))}`, li);
    return;
  }
  let x = flat[0];
  let y = flat[1];
  for (let i = 2; i < flat.length; i += 2) {
    const x2 = x + flat[i];
    const y2 = y + flat[i + 1];
    const c0 = Math.floor(Math.min(x, x2) / (CELL * SCALE));
    const c1 = Math.floor(Math.max(x, x2) / (CELL * SCALE));
    const r0 = Math.floor(Math.min(y, y2) / (CELL * SCALE));
    const r1 = Math.floor(Math.max(y, y2) / (CELL * SCALE));
    for (let cx = c0; cx <= c1; cx++) for (let cy = r0; cy <= r1; cy++) addToCell(`${cx},${cy}`, li);
    x = x2;
    y = y2;
  }
});

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(
  outPath,
  JSON.stringify({
    meta: {
      source: 'Natural Earth 1:10m land (domaine public)',
      licence: 'Domaine public (Natural Earth)',
      precision_m: 1300,
      scale: SCALE,
      cell_deg: CELL,
      points: totalPoints,
      lines: encoded.length,
    },
    lines: encoded,
    grid: Object.fromEntries(grid),
  }),
);

const size = fs.statSync(outPath).size;
console.log(
  `coastline.json : ${(size / 1024 / 1024).toFixed(2)} Mo — ${encoded.length} tracés, ${totalPoints} points, ${tinyIslands} îlots`,
);
