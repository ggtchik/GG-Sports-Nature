import { AlertTriangle, WifiOff } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';

/* -------------------------------------------------------------------- card */

interface CardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  id?: string;
  flush?: boolean;
  as?: 'section' | 'div' | 'article' | 'aside';
}

export function Card({ children, className = '', delay = 0, id, flush = false, as = 'section' }: CardProps) {
  const Tag = as;
  return (
    <Tag
      id={id}
      className={`card ${flush ? 'card--flush' : ''} ${className}`.trim()}
      style={{ '--d': `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}

interface CardHeadProps {
  kicker?: ReactNode;
  title?: ReactNode;
  aside?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function CardHead({ kicker, title, aside, icon, className = '' }: CardHeadProps) {
  return (
    <header className={`card-head ${className}`.trim()}>
      <div className="card-head__main">
        {icon ? <span className="card-head__icon">{icon}</span> : null}
        <div>
          {kicker ? <p className="card-kicker">{kicker}</p> : null}
          {title ? <h2 className="card-title">{title}</h2> : null}
        </div>
      </div>
      {aside ? <div className="card-head__aside">{aside}</div> : null}
    </header>
  );
}

/* ------------------------------------------------------------------- badge */

type BadgeTone = 'neutral' | 'sage' | 'terracotta' | 'amber' | 'ocean' | 'indigo' | 'clay' | 'moss' | 'danger' | 'success' | 'demo';

export function Badge({
  children,
  tone = 'neutral',
  icon,
  className = '',
}: {
  children: ReactNode;
  tone?: BadgeTone;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <span className={`badge badge--${tone} ${className}`.trim()}>
      {icon ? <span className="badge__icon">{icon}</span> : null}
      {children}
    </span>
  );
}

export function Dot({ tone = 'sage' }: { tone?: 'sage' | 'amber' | 'danger' | 'ocean' }) {
  return <span className={`dot dot--${tone}`} aria-hidden="true" />;
}

/* -------------------------------------------------------------- segmented */

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  hint?: string;
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  size = 'md',
  className = '',
}: {
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  label: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <div className={`segmented segmented--${size} ${className}`.trim()} role="radiogroup" aria-label={label}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={option.hint}
            className={`segmented__btn ${active ? 'is-active' : ''}`}
            onClick={() => onChange(option.value)}
          >
            {option.icon}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------------- buttons */

export function IconButton({
  label,
  children,
  onClick,
  className = '',
  variant = 'ghost',
  type = 'button',
  disabled = false,
}: {
  label: string;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'ghost' | 'solid';
  type?: 'button' | 'submit';
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      className={`icon-btn icon-btn--${variant} ${className}`.trim()}
      onClick={onClick}
      aria-label={label}
      title={label}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function Spinner({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      className={`spinner ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/* --------------------------------------------------------------- skeletons */

export function Skeleton({
  width = '100%',
  height = 16,
  radius = 8,
  className = '',
}: {
  width?: number | string;
  height?: number | string;
  radius?: number;
  className?: string;
}) {
  return (
    <span
      className={`skeleton ${className}`.trim()}
      style={{ width, height, borderRadius: radius }}
      aria-hidden="true"
    />
  );
}

export function DataSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="data-skeleton" aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }, (_, index) => (
        <div className="data-skeleton__row" key={index}>
          <Skeleton width={index % 2 === 0 ? '34%' : '48%'} height={13} />
          <Skeleton width="18%" height={13} />
          <Skeleton width="12%" height={13} />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ error/empty */

export function ErrorState({
  title = 'Données momentanément indisponibles',
  message,
  onRetry,
  onDemo,
  demoLabel = 'Passer en mode démo',
}: {
  title?: string;
  message?: string | null;
  onRetry?: () => void;
  onDemo?: () => void;
  demoLabel?: string;
}) {
  return (
    <div className="state state--error">
      <span className="state__icon">
        <WifiOff size={22} />
      </span>
      <div className="state__body">
        <p className="state__title">{title}</p>
        <p className="state__message">
          {message ?? 'Vérifiez votre connexion, puis réessayez.'}{' '}
          <span className="state__hint">Les liens vers les sources restent accessibles plus bas.</span>
        </p>
        <div className="state__actions">
          {onRetry ? (
            <button type="button" className="btn btn--sm" onClick={onRetry}>
              Réessayer
            </button>
          ) : null}
          {onDemo ? (
            <button type="button" className="btn btn--sm btn--ghost" onClick={onDemo}>
              {demoLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  children,
}: {
  icon?: ReactNode;
  title: string;
  message?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="state state--empty">
      {icon ? <span className="state__icon">{icon}</span> : <span className="state__icon"><AlertTriangle size={20} /></span>}
      <div className="state__body">
        <p className="state__title">{title}</p>
        {message ? <p className="state__message">{message}</p> : null}
        {children ? <div className="state__actions">{children}</div> : null}
      </div>
    </div>
  );
}

export function DemoNote({ children = 'Données simulées pour la démonstration.' }: { children?: ReactNode }) {
  return <p className="demo-note">{children}</p>;
}

/* ------------------------------------------------------------------ tables */

export interface Column<T> {
  key: string;
  label: ReactNode;
  align?: 'left' | 'center' | 'right';
  render: (row: T, index: number) => ReactNode;
  className?: string;
  hideOnMobile?: boolean;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  empty,
  dense = false,
  minWidth = 560,
  footer,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  caption?: string;
  empty?: ReactNode;
  dense?: boolean;
  minWidth?: number;
  footer?: ReactNode;
}) {
  if (!rows.length && empty) return <>{empty}</>;
  return (
    <div className="table-wrap">
      <table className={`table ${dense ? 'table--dense' : ''}`} style={{ minWidth }}>
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`${column.align ? `is-${column.align}` : ''} ${column.hideOnMobile ? 'hide-mobile' : ''}`.trim()}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={rowKey(row, index)}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`${column.align ? `is-${column.align}` : ''} ${column.hideOnMobile ? 'hide-mobile' : ''} ${column.className ?? ''}`.trim()}
                >
                  {column.render(row, index)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {footer ? <tfoot>{footer}</tfoot> : null}
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ misc */

export function Meter({
  value,
  max = 100,
  tone = 'sage',
  label,
}: {
  value: number | null;
  max?: number;
  tone?: 'sage' | 'amber' | 'ocean' | 'terracotta' | 'indigo';
  label?: string;
}) {
  const safe = value === null || !Number.isFinite(value) ? 0 : Math.max(0, Math.min(1, value / max));
  return (
    <span className={`meter meter--${tone}`} role="img" aria-label={label ?? `${Math.round(safe * 100)} %`}>
      <span className="meter__fill" style={{ width: `${safe * 100}%` }} />
    </span>
  );
}

export function Kicker({ children }: { children: ReactNode }) {
  return <p className="card-kicker">{children}</p>;
}

export function SourceTag({ children }: { children: ReactNode }) {
  return <span className="source-tag">{children}</span>;
}
