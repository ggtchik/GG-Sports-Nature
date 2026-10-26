import { useState } from 'react';
import { compassLong, compassShort } from '../../lib/geo';
import { num } from '../../lib/format';

/* --------------------------------------------------------------- sparkline */

export function Sparkline({
  values,
  color = 'var(--sage)',
  width = 96,
  height = 28,
  strokeWidth = 1.8,
}: {
  values: number[];
  color?: string;
  width?: number;
  height?: number;
  strokeWidth?: number;
}) {
  if (values.length < 2) {
    return <span className="sparkline sparkline--empty" style={{ width, height }}>—</span>;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * (width - 2) + 1;
    const y = height - 3 - ((value - min) / range) * (height - 6);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const last = points[points.length - 1].split(',');
  return (
    <svg width={width} height={height} className="sparkline" aria-hidden="true">
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r="2.2" fill={color} />
    </svg>
  );
}

/* ------------------------------------------------------------------ donut */

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

export function Donut({
  slices,
  size = 196,
  thickness = 20,
  centerLabel,
  centerValue,
  format = (value) => num(value, 2),
}: {
  slices: DonutSlice[];
  size?: number;
  thickness?: number;
  centerLabel: string;
  centerValue: string;
  format?: (value: number) => string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const total = slices.reduce((sum, slice) => sum + Math.max(0, slice.value), 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const gap = slices.length > 1 ? 3 : 0;
  let offset = 0;

  return (
    <div className="donut">
      <div className="donut__chart" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={centerLabel}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--surface-3)"
            strokeWidth={thickness}
          />
          {slices.map((slice, index) => {
            const fraction = total > 0 ? Math.max(0, slice.value) / total : 0;
            const length = Math.max(0, fraction * circumference - gap);
            const dash = `${length} ${circumference - length}`;
            const element = (
              <circle
                key={slice.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth={active === index ? thickness + 4 : thickness}
                strokeDasharray={dash}
                strokeDashoffset={-offset}
                strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                className="donut__slice"
                onPointerEnter={() => setActive(index)}
                onPointerLeave={() => setActive(null)}
                style={{ opacity: active === null || active === index ? 1 : 0.45 }}
              />
            );
            offset += fraction * circumference;
            return element;
          })}
        </svg>
        <div className="donut__center">
          <p className="donut__value">{active !== null ? format(slices[active].value) : centerValue}</p>
          <p className="donut__label">{active !== null ? slices[active].label : centerLabel}</p>
        </div>
      </div>
      <ul className="donut__legend">
        {slices.map((slice, index) => (
          <li key={slice.label} className={active === index ? 'is-active' : ''}>
            <span className="donut__swatch" style={{ background: slice.color }} />
            <span className="donut__legend-label">{slice.label}</span>
            <span className="donut__legend-value">{format(slice.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ----------------------------------------------------------- wind compass */

export function WindCompass({
  direction,
  speed,
  gust,
  size = 128,
  readout,
  ariaLabel,
}: {
  direction: number | null;
  speed?: number | null;
  gust?: number | null;
  size?: number;
  readout?: React.ReactNode;
  ariaLabel?: string;
}) {
  const angle = direction ?? 0;
  const ticks = Array.from({ length: 16 }, (_, i) => i * 22.5);
  const center = size / 2;
  const outer = size / 2 - 4;
  return (
    <div className="compass" style={{ width: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={ariaLabel ?? `Vent ${compassLong(direction)}`}
      >
        <circle cx={center} cy={center} r={outer} fill="var(--surface-2)" stroke="var(--line)" />
        <circle cx={center} cy={center} r={outer - 12} fill="none" stroke="var(--line)" strokeDasharray="2 5" />
        {ticks.map((tick) => {
          const rad = ((tick - 90) * Math.PI) / 180;
          const isMain = tick % 90 === 0;
          const inner = outer - (isMain ? 10 : 5);
          return (
            <line
              key={tick}
              x1={center + Math.cos(rad) * (outer - 2)}
              y1={center + Math.sin(rad) * (outer - 2)}
              x2={center + Math.cos(rad) * inner}
              y2={center + Math.sin(rad) * inner}
              stroke={isMain ? 'var(--ink-2)' : 'var(--ink-3)'}
              strokeWidth={isMain ? 1.6 : 1}
              opacity={isMain ? 0.7 : 0.4}
            />
          );
        })}
        {[
          { label: 'N', angle: 0 },
          { label: 'E', angle: 90 },
          { label: 'S', angle: 180 },
          { label: 'O', angle: 270 },
        ].map((item) => {
          const rad = ((item.angle - 90) * Math.PI) / 180;
          return (
            <text
              key={item.label}
              x={center + Math.cos(rad) * (outer - 20)}
              y={center + Math.sin(rad) * (outer - 20) + 3.5}
              textAnchor="middle"
              className="compass__cardinal"
            >
              {item.label}
            </text>
          );
        })}
        <g transform={`rotate(${angle} ${center} ${center})`}>
          <path
            d={`M ${center} ${center - outer + 26} L ${center + 7} ${center + 2} L ${center} ${center - 4} L ${center - 7} ${center + 2} Z`}
            fill="var(--terracotta)"
          />
          <path
            d={`M ${center} ${center + 2} L ${center + 6} ${center + 20} L ${center} ${center + 15} L ${center - 6} ${center + 20} Z`}
            fill="var(--ink-3)"
            opacity="0.28"
          />
        </g>
        <circle cx={center} cy={center} r="4" fill="var(--surface)" stroke="var(--ink-2)" strokeWidth="1.5" />
      </svg>
      <div className="compass__readout">
        <strong>{compassShort(direction)}</strong>
        <span>{compassLong(direction)}</span>
        {readout ?? (
          <p>
            {speed === null || speed === undefined ? '—' : `${Math.round(speed)} km/h`}
            {gust ? <em> · raf. {Math.round(gust)}</em> : null}
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ mini gauge */

export function ArcGauge({
  value,
  max = 100,
  label,
  valueLabel,
  tone = 'sage',
  size = 108,
}: {
  value: number | null;
  max?: number;
  label: string;
  valueLabel: string;
  tone?: 'sage' | 'amber' | 'ocean' | 'terracotta' | 'indigo';
  size?: number;
}) {
  const ratio = value === null || !Number.isFinite(value) ? 0 : Math.max(0, Math.min(1, value / max));
  const radius = size / 2 - 9;
  const circumference = Math.PI * radius;
  const center = size / 2;
  return (
    <div className={`arc-gauge arc-gauge--${tone}`} style={{ width: size }}>
      <svg width={size} height={size / 2 + 10} viewBox={`0 0 ${size} ${size / 2 + 10}`} aria-hidden="true">
        <path
          d={`M ${center - radius} ${center} A ${radius} ${radius} 0 0 1 ${center + radius} ${center}`}
          fill="none"
          stroke="var(--surface-3)"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d={`M ${center - radius} ${center} A ${radius} ${radius} 0 0 1 ${center + radius} ${center}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${ratio * circumference} ${circumference}`}
        />
      </svg>
      <div className="arc-gauge__text">
        <strong>{valueLabel}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}
