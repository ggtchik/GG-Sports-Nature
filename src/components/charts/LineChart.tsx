import { useId, useMemo, useState } from 'react';
import { useElementWidth } from '../../hooks/useElementWidth';

export interface ChartSeries {
  label: string;
  values: (number | null)[];
  color: string;
  fill?: boolean;
  dashed?: boolean;
  /** Échelle : les séries `bar` sont dessinées en barres depuis la base. */
  kind?: 'line' | 'bar';
}

export interface ChartMarker {
  index: number;
  label: string;
  color?: string;
}

interface LineChartProps {
  labels: string[];
  series: ChartSeries[];
  height?: number;
  yFormat: (value: number) => string;
  xFormat?: (label: string, index: number) => string;
  markers?: ChartMarker[];
  highlightIndex?: number | null;
  ariaLabel: string;
  zeroBased?: boolean;
  yTicks?: number;
  showLegend?: boolean;
}

const PAD = { top: 14, right: 12, bottom: 22, left: 44 };

export function LineChart({
  labels,
  series,
  height = 180,
  yFormat,
  xFormat,
  markers = [],
  highlightIndex = null,
  ariaLabel,
  zeroBased = false,
  yTicks = 4,
  showLegend = true,
}: LineChartProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const gradientId = useId().replace(/[:]/g, '');

  const innerW = Math.max(60, width - PAD.left - PAD.right);
  const innerH = Math.max(40, height - PAD.top - PAD.bottom);

  const { min, max } = useMemo(() => {
    const all = series.flatMap((s) => s.values.filter((v): v is number => v !== null && Number.isFinite(v)));
    if (all.length === 0) return { min: 0, max: 1 };
    let lo = Math.min(...all);
    let hi = Math.max(...all);
    if (zeroBased) lo = Math.min(0, lo);
    if (hi === lo) {
      hi += 1;
      lo -= zeroBased ? 0 : 1;
    }
    const span = hi - lo;
    return { min: lo - span * 0.08, max: hi + span * 0.08 };
  }, [series, zeroBased]);

  const count = labels.length;
  const xAt = (index: number) => (count <= 1 ? PAD.left + innerW / 2 : PAD.left + (index / (count - 1)) * innerW);
  const yAt = (value: number) => PAD.top + innerH - ((value - min) / (max - min)) * innerH;

  const ticks = useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i <= yTicks - 1; i++) out.push(min + ((max - min) * i) / (yTicks - 1));
    return out;
  }, [min, max, yTicks]);

  const labelEvery = Math.max(1, Math.ceil(count / (width < 420 ? 4 : 6)));

  const buildPaths = (values: (number | null)[]) => {
    const line: string[] = [];
    const area: string[] = [];
    let points: { x: number; y: number }[] = [];

    const flush = () => {
      if (points.length > 1) {
        line.push(points.map((p, idx) => `${idx === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' '));
        const base = yAt(zeroBased ? Math.max(min, 0) : min);
        area.push(
          `M${points[0].x},${base} ` +
            points.map((p) => `L${p.x},${p.y}`).join(' ') +
            ` L${points[points.length - 1].x},${base} Z`,
        );
      }
      points = [];
    };

    values.forEach((value, index) => {
      if (value === null || value === undefined || !Number.isFinite(value)) {
        flush();
        return;
      }
      points.push({ x: xAt(index), y: yAt(value) });
    });
    flush();
    return { line, area };
  };

  const hoverIndex = hover ?? highlightIndex;
  const tooltipX = hoverIndex !== null ? Math.max(56, Math.min(width - 56, xAt(hoverIndex))) : 0;

  const handlePointer = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const ratio = (x - PAD.left) / innerW;
    const index = Math.round(ratio * (count - 1));
    setHover(Math.max(0, Math.min(count - 1, index)));
  };

  return (
    <div className="chart" ref={ref}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={ariaLabel}
          onPointerMove={handlePointer}
          onPointerDown={handlePointer}
          onPointerLeave={() => setHover(null)}
          style={{ touchAction: 'pan-y' }}
        >
          <defs>
            {series.map((s, index) =>
              s.fill ? (
                <linearGradient key={index} id={`${gradientId}-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
                </linearGradient>
              ) : null,
            )}
          </defs>

          {ticks.map((tick, index) => (
            <g key={index}>
              <line
                x1={PAD.left}
                x2={PAD.left + innerW}
                y1={yAt(tick)}
                y2={yAt(tick)}
                stroke="var(--line)"
                strokeWidth={1}
                strokeDasharray={index === 0 ? undefined : '3 5'}
              />
              <text
                x={PAD.left - 8}
                y={yAt(tick) + 3.5}
                textAnchor="end"
                fontSize={10}
                fill="var(--ink-3)"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {yFormat(tick)}
              </text>
            </g>
          ))}

          {series.map((s, index) => {
            if (s.kind === 'bar') {
              const base = yAt(zeroBased ? Math.max(min, 0) : min);
              const barWidth = Math.max(2, Math.min(12, innerW / Math.max(1, count) - 3));
              return (
                <g key={`bar-${index}`}>
                  {s.values.map((value, i) =>
                    value === null || !Number.isFinite(value) ? null : (
                      <rect
                        key={i}
                        x={xAt(i) - barWidth / 2}
                        y={Math.min(yAt(value), base)}
                        width={barWidth}
                        height={Math.max(1, Math.abs(base - yAt(value)))}
                        rx={Math.min(3, barWidth / 2)}
                        fill={s.color}
                        opacity={0.75}
                      />
                    ),
                  )}
                </g>
              );
            }
            const { line, area } = buildPaths(s.values);
            return (
              <g key={`line-${index}`}>
                {s.fill &&
                  area.map((d, i) => <path key={`a-${i}`} d={d} fill={`url(#${gradientId}-${index})`} stroke="none" />)}
                {line.map((d, i) => (
                  <path
                    key={`l-${i}`}
                    d={d}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={s.dashed ? '4 4' : undefined}
                  />
                ))}
              </g>
            );
          })}

          {markers.map((marker, index) => {
            const value = series[0]?.values[marker.index];
            if (value === null || value === undefined || !Number.isFinite(value)) return null;
            return (
              <g key={`marker-${index}`}>
                <circle cx={xAt(marker.index)} cy={yAt(value)} r={3.5} fill="var(--surface)" stroke={marker.color ?? 'var(--accent)'} strokeWidth={2} />
              </g>
            );
          })}

          {labels.map((label, index) =>
            index % labelEvery === 0 || index === count - 1 ? (
              <text
                key={index}
                x={xAt(index)}
                y={height - 6}
                textAnchor={index === 0 ? 'start' : index === count - 1 ? 'end' : 'middle'}
                fontSize={10}
                fill="var(--ink-3)"
              >
                {xFormat ? xFormat(label, index) : label}
              </text>
            ) : null,
          )}

          {hoverIndex !== null && (
            <g pointerEvents="none">
              <line
                x1={xAt(hoverIndex)}
                x2={xAt(hoverIndex)}
                y1={PAD.top}
                y2={PAD.top + innerH}
                stroke="var(--ink-3)"
                strokeWidth={1}
                strokeDasharray="2 3"
                opacity={0.6}
              />
              {series.map((s, index) => {
                const value = s.values[hoverIndex];
                if (value === null || value === undefined || !Number.isFinite(value)) return null;
                return (
                  <circle
                    key={index}
                    cx={xAt(hoverIndex)}
                    cy={yAt(value)}
                    r={4}
                    fill="var(--surface)"
                    stroke={s.color}
                    strokeWidth={2.4}
                  />
                );
              })}
            </g>
          )}
        </svg>
      )}

      {hover !== null && (
        <div className="chart-tooltip" style={{ left: tooltipX, top: 6 }}>
          <strong>{xFormat ? xFormat(labels[hover] ?? '', hover) : labels[hover]}</strong>
          {series.map((s) => {
            const value = s.values[hover];
            return (
              <div className="chart-tooltip__row" key={s.label}>
                <span style={{ opacity: 0.75 }}>{s.label}</span>
                <span>{value === null || value === undefined ? '—' : yFormat(value)}</span>
              </div>
            );
          })}
        </div>
      )}

      {showLegend && series.length > 0 && (
        <div className="chart__legend">
          {series.map((s) => (
            <span key={s.label}>
              <span className="chart__swatch" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
