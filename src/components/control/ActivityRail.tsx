import type { ActivityId } from '../../types';
import { ACTIVITIES } from '../../data/activities';
import { ActivityIcon } from '../ui/ActivityIcon';

export function ActivityRail({
  activity,
  onChange,
}: {
  activity: ActivityId;
  onChange: (activity: ActivityId) => void;
}) {
  return (
    <section className="rail" aria-labelledby="rail-title">
      <div className="rail__head">
        <div>
          <p className="card-kicker">Étape 1 · Votre activité</p>
          <h2 id="rail-title" className="rail__title">
            Qu’allez-vous faire aujourd’hui&nbsp;?
          </h2>
        </div>
        <p className="rail__hint">
          Les modules du tableau de bord s’adaptent à l’activité et au contexte du spot.
        </p>
      </div>
      <div className="rail__scroller" role="group" aria-label="Choix de l’activité">
        {ACTIVITIES.map((item, index) => {
          const active = item.id === activity;
          return (
            <button
              key={item.id}
              type="button"
              className={`activity-chip accent--${item.accent} ${active ? 'is-active' : ''}`}
              aria-pressed={active}
              onClick={() => onChange(item.id)}
              style={{ '--d': `${index * 35}ms` } as React.CSSProperties}
            >
              <span className="activity-chip__icon">
                <ActivityIcon id={item.id} size={21} strokeWidth={1.7} />
              </span>
              <span className="activity-chip__text">
                <span className="activity-chip__label">{item.label}</span>
                <span className="activity-chip__tagline">{item.tagline}</span>
              </span>
              {active ? <span className="activity-chip__check" aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
