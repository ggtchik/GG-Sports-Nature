/** French formatting helpers, tolerant to missing values. */

const nfCache = new Map<string, Intl.NumberFormat>();

function nf(digits: number, style: 'decimal' | 'currency' | 'percent' = 'decimal'): Intl.NumberFormat {
  const key = `${style}-${digits}`;
  let f = nfCache.get(key);
  if (!f) {
    f = new Intl.NumberFormat('fr-FR', {
      style,
      currency: style === 'currency' ? 'EUR' : undefined,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    nfCache.set(key, f);
  }
  return f;
}

const isNum = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export function num(value: number | null | undefined, digits = 0): string {
  if (!isNum(value)) return '—';
  return nf(digits).format(value);
}

export function temp(value: number | null | undefined, digits = 1): string {
  if (!isNum(value)) return '—';
  return `${nf(digits).format(value)}°`;
}

export function euro(value: number | null | undefined, digits = 2): string {
  if (!isNum(value)) return '—';
  return nf(digits, 'currency').format(value);
}

export function pct(value: number | null | undefined, digits = 0): string {
  if (!isNum(value)) return '—';
  return `${nf(digits).format(value)} %`;
}

export function km(value: number | null | undefined, digits = 1): string {
  if (!isNum(value)) return '—';
  if (value >= 100) return `${nf(0).format(Math.round(value))} km`;
  if (value < 1) return `${nf(2).format(value)} km`;
  return `${nf(digits).format(value)} km`;
}

export function minutes(value: number | null | undefined): string {
  if (!isNum(value)) return '—';
  const total = Math.max(0, Math.round(value));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${String(m).padStart(2, '0')}`;
}

export function durationHM(value: number | null | undefined): string {
  if (!isNum(value)) return '—';
  return minutes(value);
}

/* ------------------------------------------------------------------- dates */

export function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

const timeFmt = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
const shortTimeFmt = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
const weekdayFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });
const weekdayLongFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' });
const dayMonthFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
const fullDateFmt = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});
const dateTimeFmt = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

export function clock(value: string | Date | null | undefined): string {
  const d = parseDate(value);
  return d ? timeFmt.format(d) : '—';
}

export function shortClock(value: string | Date | null | undefined): string {
  const d = parseDate(value);
  return d ? shortTimeFmt.format(d).replace(':', 'h') : '—';
}

export function weekday(value: string | Date | null | undefined, long = false): string {
  const d = parseDate(value);
  if (!d) return '—';
  const label = long ? weekdayLongFmt.format(d) : weekdayFmt.format(d);
  return label.replace('.', '');
}

export function dayMonth(value: string | Date | null | undefined): string {
  const d = parseDate(value);
  return d ? dayMonthFmt.format(d) : '—';
}

export function fullDate(value: string | Date | null | undefined): string {
  const d = parseDate(value);
  return d ? fullDateFmt.format(d) : '—';
}

export function dateTime(value: string | Date | null | undefined): string {
  const d = parseDate(value);
  return d ? dateTimeFmt.format(d) : '—';
}

export function isToday(value: string | Date | null | undefined): boolean {
  const d = parseDate(value);
  if (!d) return false;
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

export function relativeMinutes(value: number | string | Date | null | undefined): string {
  const then =
    typeof value === 'number' ? new Date(value) : parseDate(value ?? null);
  if (!then) return '—';
  const diff = Math.round((Date.now() - then.getTime()) / 60000);
  if (diff < 1) return "à l'instant";
  if (diff < 60) return `il y a ${diff} min`;
  const h = Math.round(diff / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  return `il y a ${d} j`;
}

export function timeAgoLabel(timestamp: number | null | undefined): string {
  if (!timestamp) return '—';
  return relativeMinutes(timestamp);
}

/** Local ISO-ish "HH:MM" for an absolute date (browser timezone). */
export function hhmm(value: Date | null | undefined): string {
  if (!value) return '—';
  return timeFmt.format(value);
}

export function dayKey(value: string | Date): string {
  const d = parseDate(value);
  if (!d) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

export function plural(count: number, singular: string, pluralForm?: string): string {
  return count > 1 ? (pluralForm ?? `${singular}s`) : singular;
}
