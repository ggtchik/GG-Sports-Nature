import type { ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import { SOURCES } from '../../core/sources';
import type { DataSource } from '../../core/sources';
import { stampLocal } from '../../core/format';

interface CardProps {
  title?: ReactNode;
  icon?: IconName;
  subtitle?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  tone?: 'default' | 'sea' | 'earth' | 'tinted';
  className?: string;
  children: ReactNode;
  id?: string;
}

export function Card({
  title,
  icon,
  subtitle,
  actions,
  footer,
  tone = 'default',
  className = '',
  children,
  id,
}: CardProps) {
  const toneClass =
    tone === 'sea' ? 'card--sea' : tone === 'earth' ? 'card--earth' : tone === 'tinted' ? 'card--tinted' : '';
  return (
    <section className={`card ${toneClass} ${className}`.trim()} id={id}>
      {(title || actions) && (
        <header className="card__head">
          <div>
            {title && (
              <h2 className="card__title">
                {icon && <Icon name={icon} size={17} />}
                {title}
              </h2>
            )}
            {subtitle && <p className="card__sub">{subtitle}</p>}
          </div>
          {actions && <div className="inline">{actions}</div>}
        </header>
      )}
      <div className="card__body">{children}</div>
      {footer && <footer className="card__foot">{footer}</footer>}
    </section>
  );
}

interface SourceFooterProps {
  sources: (keyof typeof SOURCES | DataSource)[];
  fetchedAt?: number;
  updatedLabel?: string;
  note?: ReactNode;
}

/** Pied de carte normalisé : lien source + horodatage réel. */
export function SourceFooter({ sources, fetchedAt, updatedLabel, note }: SourceFooterProps) {
  const list = sources
    .map((entry) => (typeof entry === 'string' ? SOURCES[entry] : entry))
    .filter(Boolean) as DataSource[];

  return (
    <>
      <div className="inline">
        {list[0] && (
          <span className="chip chip--outline" style={{ height: 21, fontSize: 10.5 }} title="Nature de la donnée">
            {list[0].nature}
          </span>
        )}
        {list.map((source, index) => (
          <span key={source.id} className="inline" style={{ gap: 6 }}>
            {index > 0 && <span className="dim">·</span>}
            <a
              className="source-link"
              href={source.url}
              target="_blank"
              rel="noreferrer noopener"
              title={source.notes}
            >
              {source.name}
              <Icon name="external" />
            </a>
          </span>
        ))}
      </div>
      <div className="inline" style={{ gap: 10 }}>
        {note && <span>{note}</span>}
        {updatedLabel && <span>{updatedLabel}</span>}
        {fetchedAt ? <span>Reçu {stampLocal(fetchedAt)}</span> : null}
      </div>
    </>
  );
}
