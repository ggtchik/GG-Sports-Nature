import { Moon, Sunrise, Sunset, Sun } from 'lucide-react';
import type { SkyData } from '../../lib/astro';
import { moonLitPath } from '../../lib/astro';
import { clock, dayMonth, minutes } from '../../lib/format';
import { Badge, Card, CardHead } from '../ui/kit';

const RAD = Math.PI / 180;

function SunArc({ sky }: { sky: SkyData }) {
  const width = 640;
  const height = 258;
  const padX = 52;
  const horizon = 186;
  const archTop = 44;

  const maxAlt = Math.max(
    8,
    ...sky.sunPath.map((point) => point.altitude),
  );
  const normalized = (altitude: number) =>
    Math.max(0, Math.sin(Math.max(0, altitude) * RAD) / Math.sin(maxAlt * RAD));

  const points = sky.sunPath.map((point, index) => {
    const n = Math.max(1, sky.sunPath.length - 1);
    return {
      x: padX + (index / n) * (width - padX * 2),
      y: horizon - normalized(point.altitude) * (horizon - archTop),
      time: point.time,
    };
  });

  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');

  const progress = sky.daylightProgress;
  const sunX = progress !== null ? padX + progress * (width - padX * 2) : padX;
  const sunY = horizon - normalized(sky.sunAltitude) * (horizon - archTop);
  const showSun = !sky.isNight && progress !== null;

  const noonProgress =
    sky.sunPath.length > 1
      ? Math.min(
          1,
          Math.max(
            0,
            (sky.sunPath.reduce((bestIndex, point, index) => (point.altitude > sky.sunPath[bestIndex].altitude ? index : bestIndex), 0)) /
              (sky.sunPath.length - 1),
          ),
        )
      : 0.5;
  const noonX = padX + noonProgress * (width - padX * 2);

  const progressPath =
    showSun && progress !== null
      ? points
          .filter((_, index) => index / (points.length - 1) <= progress + 0.02)
          .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
          .join(' ')
      : '';

  const terrain = `M 0 ${horizon} L 0 ${horizon + 12} C 70 ${horizon - 10} 96 ${horizon + 26} 160 ${horizon + 16} C 224 ${horizon + 6} 244 ${horizon + 34} 306 ${horizon + 26} C 360 ${horizon + 19} 380 ${horizon + 2} 436 ${horizon + 12} C 500 ${horizon + 24} 530 ${horizon + 44} 600 ${horizon + 30} L ${width} ${horizon + 14} L ${width} ${horizon} Z`;

  return (
    <div className="sun-arc">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Course du soleil dans le ciel">
        <defs>
          <linearGradient id="sun-arc-fill" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="var(--sun-arc-a)" stopOpacity="0.05" />
            <stop offset="100%" stopColor="var(--sun-arc-a)" stopOpacity="0.35" />
          </linearGradient>
          <linearGradient id="sun-arc-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--sun-arc-b)" />
            <stop offset="50%" stopColor="var(--sun-arc-c)" />
            <stop offset="100%" stopColor="var(--sun-arc-b)" />
          </linearGradient>
          <radialGradient id="sun-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--sun-glow-a)" stopOpacity="0.85" />
            <stop offset="100%" stopColor="var(--sun-glow-a)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="sun-arc-progress" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--sun-arc-a)" />
            <stop offset="100%" stopColor="var(--sun-arc-c)" />
          </linearGradient>
        </defs>

        <g stroke="var(--chart-grid)" strokeWidth="1" strokeDasharray="2 7">
          <line x1={padX} y1={archTop - 12} x2={padX} y2={horizon} />
          <line x1={noonX} y1={archTop - 12} x2={noonX} y2={horizon} />
          <line x1={width - padX} y1={archTop - 12} x2={width - padX} y2={horizon} />
        </g>

        {points.length > 1 ? (
          <>
            <path d={`${path} L ${width - padX} ${horizon} L ${padX} ${horizon} Z`} fill="url(#sun-arc-fill)" opacity="0.8" />
            <path d={path} fill="none" stroke="var(--sun-arc-muted)" strokeWidth="2" strokeDasharray="3 6" strokeLinecap="round" />
          </>
        ) : (
          <line x1={padX} y1={horizon - 4} x2={width - padX} y2={horizon - 4} stroke="var(--sun-arc-muted)" strokeDasharray="3 6" />
        )}

        {progressPath ? (
          <path d={progressPath} fill="none" stroke="url(#sun-arc-progress)" strokeWidth="3.4" strokeLinecap="round" />
        ) : null}

        <line x1={20} y1={horizon} x2={width - 20} y2={horizon} stroke="var(--line-strong)" strokeWidth="1.2" />
        <path d={terrain} fill="var(--sun-terrain)" />
        <path d={terrain} fill="none" stroke="var(--sun-terrain-line)" strokeWidth="1" opacity="0.5" />

        {showSun ? (
          <g>
            <circle cx={sunX} cy={sunY} r="34" fill="url(#sun-glow)" />
            <circle cx={sunX} cy={sunY} r="9.5" fill="var(--sun-dot)" />
            <circle cx={sunX} cy={sunY} r="15" fill="none" stroke="var(--sun-dot)" strokeWidth="1" opacity="0.35" />
            <circle cx={sunX} cy={sunY} r="22" fill="none" stroke="var(--sun-dot)" strokeWidth="1" opacity="0.15" />
          </g>
        ) : (
          <g>
            <circle cx={sunX} cy={horizon - 58} r="26" fill="url(#sun-glow)" opacity="0.45" />
            <path
              d={`M ${sunX + 8} ${horizon - 72} a 11 11 0 1 0 5 19 a 8.5 8.5 0 0 1 -5 -19`}
              fill="var(--moon-lit-b)"
              opacity="0.9"
            />
          </g>
        )}

        <g className="sun-arc__labels">
          <line x1={padX} y1={horizon} x2={padX} y2={horizon + 6} stroke="var(--ink-3)" />
          <line x1={width - padX} y1={horizon} x2={width - padX} y2={horizon + 6} stroke="var(--ink-3)" />
          <text x={padX} y={horizon + 24} textAnchor="start" className="chart-axis">
            {clock(sky.sunrise)}
          </text>
          <text x={noonX} y={horizon + 24} textAnchor="middle" className="chart-axis">
            {clock(sky.solarNoon)} · zénith
          </text>
          <text x={width - padX} y={horizon + 24} textAnchor="end" className="chart-axis">
            {clock(sky.sunset)}
          </text>
          <text x={18} y={horizon - 8} className="sun-arc__horizon">
            horizon
          </text>
        </g>
      </svg>

      <div className="sun-arc__legend">
        <span>
          <Sun size={13} /> Lever {clock(sky.sunrise)}
        </span>
        <span>
          <Sunset size={13} /> Coucher {clock(sky.sunset)}
        </span>
        <span className="sun-arc__legend-grow" />
        <span>{sky.dayLengthMinutes ? `${minutes(sky.dayLengthMinutes)} de jour` : '—'}</span>
      </div>
    </div>
  );
}

function MoonDisc({ sky }: { sky: SkyData }) {
  const size = 200;
  const center = size / 2;
  const radius = 62;
  const path = moonLitPath(sky.moonFraction, sky.waxing, radius);
  const stars = [
    [26, 30, 1.2], [58, 16, 0.9], [168, 34, 1.3], [178, 88, 0.8],
    [24, 108, 1], [48, 172, 1.1], [152, 166, 0.9], [186, 140, 1.2],
    [96, 12, 0.7], [14, 74, 0.7],
  ];

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="moon-disc" role="img" aria-label={`${sky.moonPhaseName}, ${Math.round(sky.moonFraction * 100)} % éclairée`}>
      <defs>
        <radialGradient id="moon-halo" cx="50%" cy="50%" r="50%">
          <stop offset="35%" stopColor="var(--moon-glow)" stopOpacity="0.42" />
          <stop offset="100%" stopColor="var(--moon-glow)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="moon-dark" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="var(--moon-dark-b)" />
          <stop offset="100%" stopColor="var(--moon-dark-a)" />
        </radialGradient>
        <radialGradient id="moon-lit" cx="35%" cy="28%" r="80%">
          <stop offset="0%" stopColor="var(--moon-lit-a)" />
          <stop offset="70%" stopColor="var(--moon-lit-b)" />
          <stop offset="100%" stopColor="var(--moon-lit-c)" />
        </radialGradient>
        <clipPath id="moon-clip">
          <circle cx={center} cy={center} r={radius} />
        </clipPath>
      </defs>

      {stars.map(([x, y, r], index) => (
        <circle key={index} cx={x} cy={y} r={r} fill="var(--moon-star)" opacity={0.35 + ((index * 17) % 50) / 100} />
      ))}
      <circle cx={center} cy={center} r={radius + 30} fill="url(#moon-halo)" />

      <g clipPath="url(#moon-clip)">
        <circle cx={center} cy={center} r={radius} fill="url(#moon-dark)" />
        {path ? <path d={path} transform={`translate(${center} ${center})`} fill="url(#moon-lit)" /> : null}
        <g fill="var(--moon-crater)" opacity="0.22">
          <circle cx={center - 22} cy={center - 18} r="10" />
          <circle cx={center + 18} cy={center + 6} r="14" />
          <circle cx={center - 6} cy={center + 30} r="7" />
          <circle cx={center + 28} cy={center - 30} r="5" />
          <circle cx={center - 34} cy={center + 12} r="4.5" />
          <circle cx={center + 6} cy={center - 38} r="6" />
          <circle cx={center + 36} cy={center + 30} r="4" />
        </g>
      </g>
      <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--moon-rim)" strokeWidth="1" />
    </svg>
  );
}

function PhaseGlyph({ kind, size = 26 }: { kind: 'new' | 'first' | 'full' | 'last'; size?: number }) {
  const radius = size / 2 - 1.5;
  const fraction = kind === 'new' ? 0.02 : kind === 'full' ? 1 : 0.5;
  const waxing = kind !== 'last';
  const path = moonLitPath(fraction, waxing, radius);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="var(--moon-dark-b)" />
      {path ? <path d={path} transform={`translate(${size / 2} ${size / 2})`} fill="var(--moon-lit-b)" /> : null}
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--moon-rim)" strokeWidth="0.8" />
    </svg>
  );
}

export function AstronomyCard({ sky, delay = 0 }: { sky: SkyData; delay?: number }) {
  return (
    <Card className="astro" delay={delay} id="astronomie">
      <CardHead
        kicker="Astronomie · calcul local"
        title="Soleil & lune"
        icon={<Sun size={18} />}
        aside={<Badge tone="amber">Heure locale</Badge>}
      />

      <div className="astro__grid">
        <div className="astro__sun">
          <div className="astro__sun-head">
            <div>
              <p className="mini-label">Journée en cours</p>
              <p className="astro__headline">
                {clock(sky.sunrise)} <span aria-hidden="true">→</span> {clock(sky.sunset)}
              </p>
              <p className="astro__muted">
                {sky.dayLengthMinutes ? `${minutes(sky.dayLengthMinutes)} de lumière · ` : ''}
                midi solaire {clock(sky.solarNoon)}
              </p>
            </div>
            <div className="astro__pills">
              <span className="astro__pill">
                <Sunrise size={13} /> Aube {clock(sky.dawn)}
              </span>
              <span className="astro__pill">
                <Sunset size={13} /> Heure dorée {clock(sky.goldenHour)}
              </span>
            </div>
          </div>

          <SunArc sky={sky} />

          <div className="astro__facts">
            <div>
              <span className="mini-label">Hauteur du soleil</span>
              <strong>{sky.sunAltitude.toFixed(0)}°</strong>
            </div>
            <div>
              <span className="mini-label">Azimut</span>
              <strong>{sky.sunAzimuth.toFixed(0)}°</strong>
            </div>
            <div>
              <span className="mini-label">Prochain événement</span>
              <strong>
                {sky.nextSunEvent
                  ? `${sky.nextSunEvent.type === 'lever' ? 'Lever' : 'Coucher'} ${clock(sky.nextSunEvent.time)}`
                  : '—'}
              </strong>
            </div>
            <div>
              <span className="mini-label">Crépuscule</span>
              <strong>{clock(sky.dusk)}</strong>
            </div>
          </div>
        </div>

        <div className="astro__moon">
          <div className="astro__moon-visual">
            <MoonDisc sky={sky} />
          </div>
          <div className="astro__moon-info">
            <p className="mini-label">
              <Moon size={12} /> Lune
            </p>
            <h3 className="astro__moon-name">{sky.moonPhaseName}</h3>
            <p className="astro__moon-meta">
              {Math.round(sky.moonFraction * 100)} % éclairée · {sky.moonAge.toFixed(1).replace('.', ',')} jours
            </p>
            <div className="astro__moon-times">
              <span>
                <strong>{clock(sky.moonrise)}</strong> lever
              </span>
              <span>
                <strong>{clock(sky.moonset)}</strong> coucher
              </span>
            </div>
          </div>

          <ul className="astro__phases">
            {sky.nextPhases.map((phase) => (
              <li key={`${phase.key}-${phase.date.toISOString()}`}>
                <PhaseGlyph kind={phase.key} />
                <span>
                  <strong>{phase.label}</strong>
                  <em>{dayMonth(phase.date)}</em>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
