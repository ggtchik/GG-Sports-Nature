#!/usr/bin/env node
/**
 * GG Sports Nature — génération de `archive.zip`.
 *
 * Archive le code source complet (src, scripts, configuration) ainsi que
 * l'application autonome déjà compilée (`dist/index.html`, un seul fichier
 * HTML contenant tout le CSS/JS). Aucune dépendance externe : l'archive ZIP
 * est écrite directement avec node:zlib.
 */
import { deflateRawSync } from 'node:zlib';
import { copyFileSync, existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = path.join(root, 'archive.zip');

const ROOT_FILES = [
  'index.html',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'vite.config.ts',
  'README.md',
  '.gitignore',
];
const SOURCE_DIRS = ['src', 'scripts'];
const EXTRA_FILES = ['dist/index.html'];

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.arena', '.vite', 'coverage']);

/* ------------------------------------------------------------------ crc32 */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i++) crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/* --------------------------------------------------------------- zip utils */
function dosDateTime(date) {
  const year = Math.max(1980, date.getFullYear());
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dateBits = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, date: dateBits };
}

/**
 * Écrit une archive ZIP (deflate, UTF-8) à partir d'une liste
 * d'entrées `{ name, data, mtime }`.
 */
function createZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const raw = entry.data;
    const crc = crc32(raw);
    const deflated = deflateRawSync(raw, { level: 9 });
    const useDeflate = deflated.length < raw.length;
    const body = useDeflate ? deflated : raw;
    const method = useDeflate ? 8 : 0;
    const { time, date } = dosDateTime(entry.mtime);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // noms de fichiers en UTF-8
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);

    localParts.push(local, name, body);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4); // version made by (DOS)
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30); // extra
    central.writeUInt16LE(0, 32); // commentaire
    central.writeUInt16LE(0, 34); // disque
    central.writeUInt16LE(0, 36); // attributs internes
    central.writeUInt32LE((0o100644 << 16) >>> 0, 38); // attributs externes (fichier 644)
    central.writeUInt32LE(offset, 42);

    centralParts.push(central, name);
    offset += local.length + name.length + body.length;
  }

  const centralSize = centralParts.reduce((size, part) => size + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, ...centralParts, end]);
}

/* ---------------------------------------------------------------- collect */
function walk(dir, prefix) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const absolute = path.join(dir, name);
    const relative = prefix ? `${prefix}/${name}` : name;
    const stats = statSync(absolute);
    if (stats.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue;
      files.push(...walk(absolute, relative));
    } else if (stats.isFile()) {
      files.push({ name: relative, absolute, mtime: stats.mtime });
    }
  }
  return files;
}

const entries = [];
const seen = new Set();

function add(relative, absolute, mtime) {
  if (seen.has(relative)) return;
  seen.add(relative);
  entries.push({ name: relative, data: readFileSync(absolute), mtime });
}

for (const file of ROOT_FILES) {
  const absolute = path.join(root, file);
  if (existsSync(absolute) && statSync(absolute).isFile()) add(file, absolute, statSync(absolute).mtime);
}

for (const dir of SOURCE_DIRS) {
  const absolute = path.join(root, dir);
  if (!existsSync(absolute)) continue;
  for (const file of walk(absolute, dir)) add(file.name, file.absolute, file.mtime);
}

for (const file of EXTRA_FILES) {
  const absolute = path.join(root, file);
  if (existsSync(absolute) && statSync(absolute).isFile()) add(file, absolute, statSync(absolute).mtime);
}

if (!seen.has('dist/index.html')) {
  console.warn('⚠  dist/index.html introuvable — lancez `npm run build` pour inclure l’application autonome.');
}

entries.sort((a, b) => a.name.localeCompare(b.name));

const archive = createZip(entries);
writeFileSync(OUTPUT, archive);

const distDir = path.join(root, 'dist');
if (existsSync(distDir)) {
  copyFileSync(OUTPUT, path.join(distDir, 'archive.zip'));
}

const kb = (archive.length / 1024).toFixed(0);
const sourceKb = entries.reduce((size, entry) => size + entry.data.length, 0);
console.log(`✓ archive.zip — ${entries.length} fichiers, ${kb} Ko (${(sourceKb / 1024).toFixed(0)} Ko avant compression)`);
console.log('  → ' + path.relative(process.cwd(), OUTPUT) || 'archive.zip');
if (existsSync(distDir)) console.log('  → dist/archive.zip (copie pour le lien de téléchargement de l’application)');
