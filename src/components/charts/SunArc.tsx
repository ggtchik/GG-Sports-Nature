import type { AstroInfo } from '../../core/astro';
import { timeOf } from '../../core/format';

/**
 * Course du soleil sur la journée locale, avec l'instant présent.
 * Le tracé est issu du calcul local (SunCalc), pas d'une image décorative.
 */
export function SunArc({
  astro,
  wallNow,
  height = 132,
}: {
  astro: AstroInfo;
  wallNow: string;
  height?: number;
}) {
  const W = 320;
  const H = height;
  const horizon = H - 30;
  const top = 12;
  const x = (t: number) => 14 + t * (W - 28);
  const y = (alt: number) => horizon - Math.max(-0.15, Math.min(1, alt / 90)) * (horizon - top);

  const points = astro.sunPath.map((p) => ({ x: x(p.t), y: y(p.altitude), alt: p.altitude }));
  const above = points.filter((p) => p.alt >= 0);

  const hours = Number(wallNow.slice(11, 13)) + Number(wallNow.slice(14, 16)) / 60;
  const tNow = Math.min(1, Math.max(0, hours / 24));
  const idx = Math.min(points.length - 1, Math.round(tNow * (points.length - 1)));
  const nowPoint = points[idx];
  const nowAlt = astro.sunPath[idx]?.altitude ?? -90;

  const arcPath = above.length
    ? above.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    : '';

  const horizonY = y(0);

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Course du soleil : lever ${timeOf(astro.sunrise)}, coucher ${timeOf(astro.sunset)}`}
      style={{ display: 'block', width: '100%', height: 'auto', overflow: 'visible' }}
    >
      <defs>
        <linearGradient id="sun-arc" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#d8a24a" />
          <stop offset="50%" stopColor="#e6b95e" />
          <stop offset="100%" stopColor="#c98a4b" />
        </linearGradient>
        <linearGradient id="sun-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(224,163,62,0.16)" />
          <stop offset="100%" stopColor="rgba(224,163,62,0)" />
        </linearGradient>
      </defs>

      <rect x={0} y={0} width={W} height={horizonY} fill="url(#sun-sky)" rx={10} />

      {arcPath && (
        <>
          <path
            d={`${arcPath} L${above[above.length - 1].x},${horizonY} L${above[0].x},${horizonY} Z`}
            fill="rgba(224,163,62,0.08)"
            stroke="none"
          />
          <path d={arcPath} fill="none" stroke="url(#sun-arc)" strokeWidth={2} strokeLinecap="round" />
        </>
      )}

      <line x1={10} y1={horizonY} x2={W - 10} y2={horizonY} stroke="var(--line-2)" strokeWidth={1} />

      {/* Repères du lever et du coucher */}
      {astro.sunrise && (
        <g>
          <line
            x1={x(((Number(astro.sunrise.slice(11, 13)) + Number(astro.sunrise.slice(14, 16)) / 60) / 24))}
            y1={horizonY - 5}
            x2={x(((Number(astro.sunrise.slice(11, 13)) + Number(astro.sunrise.slice(14, 16)) / 60) / 24))}
            y2={horizonY + 5}
            stroke="var(--sun)"
            strokeWidth={2}
          />
        </g>
      )}
      {astro.sunset && (
        <g>
          <line
            x1={x(((Number(astro.sunset.slice(11, 13)) + Number(astro.sunset.slice(14, 16)) / 60) / 24))}
            y1={horizonY - 5}
            x2={x(((Number(astro.sunset.slice(11, 13)) + Number(astro.sunset.slice(14, 16)) / 60) / 24))}
            y2={horizonY + 5}
            stroke="var(--accent)"
            strokeWidth={2}
          />
        </g>
      )}

      {nowPoint && (
        <g>
          <circle
            cx={nowPoint.x}
            cy={nowPoint.y}
            r={9}
            fill={nowAlt > 0 ? 'rgba(230,185,94,0.28)' : 'rgba(120,140,150,0.16)'}
          />
          <circle
            cx={nowPoint.x}
            cy={nowPoint.y}
            r={4.5}
            fill={nowAlt > 0 ? '#e6b95e' : 'var(--ink-3)'}
            stroke="var(--surface)"
            strokeWidth={1.5}
          />
        </g>
      )}

      <text x={10} y={H - 8} fontSize={9.5} fill="var(--ink-3)">
        Lever {timeOf(astro.sunrise)}
      </text>
      <text x={W - 10} y={H - 8} fontSize={9.5} fill="var(--ink-3)" textAnchor="end">
        Coucher {timeOf(astro.sunset)}
      </text>
    </svg>
  );
}
