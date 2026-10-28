import type { ModuleState } from '../../core/types';
import { SOURCES } from '../../core/sources';
import type { DataSource } from '../../core/sources';
import { ageLabel } from '../../core/format';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';

export interface SourceRowModel {
  module: string;
  sources: DataSource[];
  state: ModuleState<unknown>['state'];
  fetchedAt?: number;
  error?: string;
}

interface Props {
  rows: SourceRowModel[];
  onOpenMethod: () => void;
}

export function SourcesCard({ rows, onOpenMethod }: Props) {
  const active = rows.filter((row) => row.state !== 'idle');

  return (
    <Card
      title="Sources & fraîcheur"
      icon="database"
      subtitle="Chaque module indique sa source, sa nature et son horodatage réel"
      actions={
        <button type="button" className="btn btn--ghost btn--sm" onClick={onOpenMethod}>
          <Icon name="info" size={14} /> Méthode
        </button>
      }
    >
      <div>
        {active.map((row) => {
          const ok = row.state === 'ok';
          const error = row.state === 'error' || row.state === 'unavailable';
          return (
            <div className="source-row" key={row.module}>
              <span
                className={`source-row__dot ${error ? 'source-row__dot--error' : ok ? '' : 'source-row__dot--idle'}`.trim()}
                aria-hidden="true"
              />
              <div className="source-row__body">
                <div className="source-row__name">{row.module}</div>
                <div className="source-row__meta">
                  {row.sources.map((source) => (
                    <a key={source.id} href={source.url} target="_blank" rel="noreferrer noopener">
                      {source.name}
                    </a>
                  ))}
                  <span>·</span>
                  <span>{row.sources[0]?.nature ?? ''}</span>
                  {ok && row.fetchedAt ? (
                    <>
                      <span>·</span>
                      <span>reçu {ageLabel(row.fetchedAt)}</span>
                    </>
                  ) : null}
                  {error ? (
                    <>
                      <span>·</span>
                      <span style={{ color: 'var(--err)' }}>{row.error ?? 'indisponible'}</span>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="note">
        {SOURCES['open-meteo'].update} Les prévisions ne sont jamais présentées comme des mesures : l’horodatage affiché
        est celui annoncé par la source.
      </p>
    </Card>
  );
}
