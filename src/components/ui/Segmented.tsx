import { Icon } from './Icon';
import type { IconName } from './Icon';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
  hint?: string;
}

interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  size?: 'sm' | 'md';
  full?: boolean;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  size = 'md',
  full = false,
}: SegmentedProps<T>) {
  return (
    <div
      className={`segmented ${size === 'sm' ? 'segmented--sm' : ''}`.trim()}
      role="group"
      aria-label={label}
      style={full ? { display: 'flex', width: '100%' } : undefined}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className="segmented__item"
          aria-pressed={value === option.value}
          title={option.hint}
          onClick={() => onChange(option.value)}
          style={full ? { flex: 1, justifyContent: 'center' } : undefined}
        >
          {option.icon && <Icon name={option.icon} size={14} />}
          {option.label}
        </button>
      ))}
    </div>
  );
}
