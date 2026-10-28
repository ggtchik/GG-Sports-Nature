import type { ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from './Icon';

interface StatProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: IconName;
  size?: 'md' | 'lg';
  plain?: boolean;
  title?: string;
}

export function Stat({ label, value, hint, icon, size = 'md', plain = false, title }: StatProps) {
  return (
    <div className={`stat ${plain ? 'stat--plain' : ''}`.trim()} title={title}>
      <div className="stat__label">
        {icon && <Icon name={icon} size={12} />}
        {label}
      </div>
      <div className={`stat__value ${size === 'lg' ? 'stat__value--lg' : ''}`.trim()}>{value}</div>
      {hint && <div className="stat__hint">{hint}</div>}
    </div>
  );
}
