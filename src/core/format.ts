/**
 * Formatage : conventions d'arrondi et d'affichage (français, virgule
 * décimale). Aucune de ces fonctions ne modifie la donnée d'origine.
 */

const fr0 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const fr2 = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function num(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return '—';
  if (decimals === 0) return fr0.format(value);
  if (decimals === 2) return fr2.format(value);
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export const n1 = (v: number) => num(v, 1);
export const n0 = (v: number) => num(v, 0);

/** « — » pour toute valeur absente : on n'invente jamais de nombre. */
export function dash(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number' && !Number.isFinite(value)) return '—';
  return String(value);
}

/** « 2026-10-28T14:00 » → « 14:00 ». */
export function timeOf(iso: string | null | undefined): string {
  if (!iso) return '—';
  const m = /(\d{2}:\d{2})/.exec(iso);
  return m ? m[1].replace(':', 'h') : '—';
}

/** « 2026-10-28 » → « mer. 28 oct. ». */
export function dayShort(isoDate: string | null | undefined): string {
  if (!isoDate) return '—';
  const d = new Date(`${isoDate.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).format(d);
}

/** « 2026-10-28 » → « mercredi 28 octobre ». */
export function dayLong(isoDate: string | null | undefined): string {
  if (!isoDate) return '—';
  const d = new Date(`${isoDate.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
}

export function isToday(isoDate: string, wallNow: string): boolean {
  return isoDate.slice(0, 10) === wallNow.slice(0, 10);
}

/** Horloge locale du spot (« 2026-10-28T14:23 ») à partir du décalage API. */
export function wallClockNow(utcOffsetSeconds: number): string {
  return new Date(Date.now() + utcOffsetSeconds * 1000).toISOString().slice(0, 16);
}

export function deviceClock(ms = Date.now()): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ms));
}

export function deviceTime(ms = Date.now()): string {
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(ms));
}

/** Ancienneté lisible d'un horodatage (ms). */
export function ageLabel(ms: number | undefined, now = Date.now()): string {
  if (!ms) return '—';
  const diff = Math.max(0, now - ms);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `il y a ${d} j`;
}

/** Durée en minutes → « 1 h 12 » / « 38 min ». */
export function duration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || !Number.isFinite(minutes)) return '—';
  const total = Math.round(minutes);
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}

/** Horodatage ISO complet (avec fuseau) → « 28/10 · 10:30 », heure du terminal. */
export function stampLocal(ms: number | undefined): string {
  if (!ms) return '—';
  const d = new Date(ms);
  return `${new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' }).format(d)} · ${new Intl.DateTimeFormat(
    'fr-FR',
    { hour: '2-digit', minute: '2-digit' },
  ).format(d)}`;
}
