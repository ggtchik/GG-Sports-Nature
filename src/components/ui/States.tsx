import type { ReactNode } from 'react';
import { Icon } from './Icon';

export function LoadingBlock({ lines = 3, block = true }: { lines?: number; block?: boolean }) {
  return (
    <div className="stack" aria-busy="true" aria-live="polite">
      {block && <div className="skeleton skeleton--block" />}
      {Array.from({ length: lines }).map((_, index) => (
        <div key={index} className="skeleton skeleton--line" style={{ width: `${90 - index * 12}%` }} />
      ))}
      <span className="sr-only">Chargement des données…</span>
    </div>
  );
}

export function UnavailableBlock({
  title = 'Donnée indisponible',
  children,
  tone = 'warn',
  action,
}: {
  title?: string;
  children?: ReactNode;
  tone?: 'warn' | 'error' | 'info';
  action?: ReactNode;
}) {
  return (
    <div className={`state ${tone === 'error' ? 'state--error' : tone === 'warn' ? 'state--warn' : ''}`.trim()}>
      <div className="state__title">
        <Icon name={tone === 'error' ? 'alert' : 'info'} size={15} />
        {title}
      </div>
      {children && <div>{children}</div>}
      {action}
    </div>
  );
}

export function EmptyBlock({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="state">
      <div className="state__title">
        <Icon name="info" size={15} />
        {title}
      </div>
      {children && <div>{children}</div>}
    </div>
  );
}
