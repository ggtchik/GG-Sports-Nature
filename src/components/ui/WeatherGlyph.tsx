import { useId } from 'react';
import { weatherInfo } from '../../lib/weatherCodes';

interface WeatherGlyphProps {
  code: number;
  isDay?: boolean;
  size?: number;
  className?: string;
}

function Sun({ cx = 32, cy = 32, r = 12, id }: { cx?: number; cy?: number; r?: number; id: string }) {
  const rays = Array.from({ length: 8 }, (_, i) => {
    const angle = (i * Math.PI) / 4;
    const inner = r + 4;
    const outer = r + 8.5;
    return {
      x1: cx + Math.cos(angle) * inner,
      y1: cy + Math.sin(angle) * inner,
      x2: cx + Math.cos(angle) * outer,
      y2: cy + Math.sin(angle) * outer,
    };
  });
  return (
    <g>
      {rays.map((ray, index) => (
        <line
          key={index}
          x1={ray.x1}
          y1={ray.y1}
          x2={ray.x2}
          y2={ray.y2}
          stroke="var(--glyph-sun-b, #dfa04c)"
          strokeWidth="2.2"
          strokeLinecap="round"
          opacity="0.85"
        />
      ))}
      <circle cx={cx} cy={cy} r={r} fill={`url(#${id}-sun)`} />
      <circle cx={cx - r * 0.28} cy={cy - r * 0.3} r={r * 0.42} fill="#fff" opacity="0.32" />
    </g>
  );
}

function Moon({ cx = 32, cy = 30, r = 14, id }: { cx?: number; cy?: number; r?: number; id: string }) {
  return (
    <g>
      <path
        d={`M ${cx + r * 0.9} ${cy - r * 0.55}
            A ${r} ${r} 0 1 0 ${cx + r * 0.35} ${cy + r * 0.95}
            A ${r * 0.82} ${r * 0.82} 0 1 1 ${cx + r * 0.9} ${cy - r * 0.55} Z`}
        fill={`url(#${id}-moon)`}
      />
      <circle cx={cx + 22} cy={cy - 16} r="1.3" fill="#f4e7cf" opacity="0.9" />
      <circle cx={cx - 20} cy={cy - 18} r="1" fill="#f4e7cf" opacity="0.7" />
      <circle cx={cx + 15} cy={cy - 24} r="0.9" fill="#f4e7cf" opacity="0.8" />
    </g>
  );
}

function Cloud({
  x = 0,
  y = 0,
  scale = 1,
  id,
  tone = 'light',
}: {
  x?: number;
  y?: number;
  scale?: number;
  id: string;
  tone?: 'light' | 'dark';
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <g fill={`url(#${id}-cloud-${tone})`}>
        <circle cx="23" cy="36" r="9" />
        <circle cx="34" cy="30" r="12.5" />
        <circle cx="45" cy="35" r="9.5" />
        <rect x="22" y="34" width="25" height="11" rx="5.5" />
      </g>
      <ellipse cx="32" cy="24.5" rx="10" ry="5" fill="#fff" opacity="0.22" />
    </g>
  );
}

export function WeatherGlyph({ code, isDay = true, size = 64, className }: WeatherGlyphProps) {
  const rawId = useId();
  const id = rawId.replace(/[:]/g, '');
  const info = weatherInfo(code);
  const kind = info.icon;

  const drops = (count: number, offset = 0) =>
    Array.from({ length: count }, (_, i) => (
      <line
        key={i}
        x1={22 + i * 8 + offset}
        y1={46}
        x2={20.5 + i * 8 + offset}
        y2={53}
        stroke="var(--glyph-rain, #4a8fa3)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    ));

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={info.label}
    >
      <defs>
        <radialGradient id={`${id}-sun`} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="var(--glyph-sun-a, #ffe0a4)" />
          <stop offset="55%" stopColor="var(--glyph-sun-b, #f2b25f)" />
          <stop offset="100%" stopColor="var(--glyph-sun-c, #dd8f46)" />
        </radialGradient>
        <linearGradient id={`${id}-moon`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--glyph-moon-a, #f7ecd7)" />
          <stop offset="100%" stopColor="var(--glyph-moon-b, #d8c8ad)" />
        </linearGradient>
        <linearGradient id={`${id}-cloud-light`} x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0%" stopColor="var(--glyph-cloud-a, #ffffff)" />
          <stop offset="100%" stopColor="var(--glyph-cloud-b, #dfd6c7)" />
        </linearGradient>
        <linearGradient id={`${id}-cloud-dark`} x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0%" stopColor="var(--glyph-cloud-dark-a, #c9c4bb)" />
          <stop offset="100%" stopColor="var(--glyph-cloud-dark-b, #a8a49c)" />
        </linearGradient>
      </defs>

      {kind === 'clear' &&
        (isDay ? <Sun id={id} /> : <Moon id={id} />)}

      {kind === 'partly' && (
        <g>
          {isDay ? <Sun cx={23} cy={23} r={9} id={id} /> : <Moon cx={23} cy={22} r={10} id={id} />}
          <Cloud x={6} y={8} scale={0.82} id={id} />
        </g>
      )}

      {kind === 'cloudy' && (
        <g>
          <Cloud x={2} y={2} scale={0.7} id={id} tone="dark" />
          <Cloud x={8} y={8} scale={0.92} id={id} />
        </g>
      )}

      {kind === 'fog' && (
        <g>
          <Cloud x={8} y={2} scale={0.9} id={id} />
          <g stroke="var(--glyph-cloud-dark-a, #bbb6ad)" strokeWidth="2.4" strokeLinecap="round">
            <line x1="18" y1="48" x2="44" y2="48" opacity="0.9" />
            <line x1="22" y1="54" x2="48" y2="54" opacity="0.65" />
            <line x1="16" y1="59" x2="38" y2="59" opacity="0.4" />
          </g>
        </g>
      )}

      {(kind === 'drizzle' || kind === 'rain' || kind === 'heavy-rain') && (
        <g>
          <Cloud x={8} y={0} scale={0.9} id={id} tone={kind === 'heavy-rain' ? 'dark' : 'light'} />
          {kind === 'drizzle' &&
            [0, 1, 2].map((i) => (
              <circle
                key={i}
                cx={22 + i * 9}
                cy={50 + (i % 2) * 4}
                r="2"
                fill="var(--glyph-rain, #4a8fa3)"
                opacity="0.85"
              />
            ))}
          {kind === 'rain' && drops(3)}
          {kind === 'heavy-rain' && (
            <g>
              {drops(3)}
              {drops(3, 3)}
            </g>
          )}
        </g>
      )}

      {kind === 'snow' && (
        <g>
          <Cloud x={8} y={0} scale={0.9} id={id} />
          {[0, 1, 2].map((i) => (
            <g
              key={i}
              stroke="var(--glyph-snow, #8fb3c4)"
              strokeWidth="1.8"
              strokeLinecap="round"
              transform={`translate(${23 + i * 9} ${50 + (i % 2) * 3})`}
            >
              <line x1="-3" y1="0" x2="3" y2="0" />
              <line x1="0" y1="-3" x2="0" y2="3" />
              <line x1="-2.1" y1="-2.1" x2="2.1" y2="2.1" />
              <line x1="-2.1" y1="2.1" x2="2.1" y2="-2.1" />
            </g>
          ))}
        </g>
      )}

      {kind === 'thunder' && (
        <g>
          <Cloud x={8} y={0} scale={0.9} id={id} tone="dark" />
          <path
            d="M34 43 L26 54 h6 l-3 8 10-12h-6z"
            fill="var(--glyph-bolt, #e7a83e)"
            stroke="var(--glyph-bolt, #e7a83e)"
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </g>
      )}
    </svg>
  );
}
