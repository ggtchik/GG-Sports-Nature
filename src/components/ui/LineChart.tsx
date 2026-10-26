import { useId, useMemo, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useElementWidth } from '../../hooks/useElementWidth';

export interface ChartSeries {
  label: string;
  color: string;
  values: (number | null)[];
  kind?: 'line' | 'area' | 'bars';
  dashed?: boolean;
  unit?: string;
}

export interface ChartMarker {
  index: number;
  label: string;
  tone?: 'high' | 'low' | 'neutral';
}

interface LineChartProps {
  labels: string[];
  series: ChartSeries[];
  height?: number;
  format?: (value: number) => string;
  xFormat?: (label: string, index: number) => string;
  yDomain?: [number, number];
  markers?: ChartMarker[];
  nowIndex?: number;
  zeroBasedBars?: boolean;
  className?: string;
  ariaLabel: string;
}

function niceStep(range: number, count: number): number {
  const raw = range / Math.max(1, count);
  const magnitude = 10 ** Math.floor(Math.log10(raw || 1));
  const normalized = raw / magnitude;
  const factor = normalized < 1.5 ? 1 : normalized < 3 ? 2 : normalized < 7 ? 5 : 10;
  return factor * magnitude;
}

function buildPath(
  values: (number | null)[],
  x: (index: number) => number,
  y: (value: number) => number,
  baseline: number,
): { line: string; area: string } {
  let line = '';
  let area = '';
  let open = false;
  let firstX = 0;
  let lastX = 0;
  values.forEach((value, index) => {
    if (value === null || !Number.isFinite(value)) {
      open = false;
      return;
    }
    const px = x(index);
    const py = y(value);
    if (!open) {
      line += `M ${px.toFixed(2)} ${py.toFixed(2)} `;
      if (!area) firstX = px;
      else area += `L ${lastX.toFixed(2)} ${py.toFixed(2)} `;
      area += `${area ? 'L' : 'M'} ${px.toFixed(2)} ${py.toFixed(2)} `;
      open = true;
    } else {
      line += `L ${px.toFixed(2)} ${py.toFixed(2)} `;
      area += `L ${px.toFixed(2)} ${py.toFixed(2)} `;
    }
    lastX = px;
  });
  if (area) {
    area += `L ${lastX.toFixed(2)} ${baseline.toFixed(2)} L ${firstX.toFixed(2)} ${baseline.toFixed(2)} Z`;
  }
  return { line: line.trim(), area: area.trim() };
}

export function LineChart({
  labels,
  series,
  height = 220,
  format = (value) => `${Math.round(value)}`,
  xFormat = (label) => label,
  yDomain,
  markers = [],
  nowIndex,
  zeroBasedBars = false,
  className = '',
  ariaLabel,
}: LineChartProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const uid = useId().replace(/[:]/g, '');
  const [hover, setHover] = useState<number | null>(null);

  const padding = { top: 18, right: 16, bottom: 26, left: 46 };
  const plotW = Math.max(10, width - padding.left - padding.right);
  const plotH = Math.max(10, height - padding.top - padding.bottom);
  const n = labels.length;

  const { min, max, ticks } = useMemo(() => {
    const values = series.flatMap((item) => item.values).filter((v): v is number => v !== null && Number.isFinite(v));
    let low = yDomain ? yDomain[0] : Math.min(...values);
    let high = yDomain ? yDomain[1] : Math.max(...values);
    if (!Number.isFinite(low) || !Number.isFinite(high)) {
      low = 0;
      high = 1;
    }
    if (low === high) {
      low -= 1;
      high += 1;
    }
    if (!yDomain) {
      const paddingValue = (high - low) * 0.12;
      low -= paddingValue;
      high += paddingValue;
    }
    if (zeroBasedBars) low = Math.min(0, low);
    const step = niceStep(high - low, 4);
    const start = Math.ceil(low / step) * step;
    const tickValues: number[] = [];
    for (let value = start; value <= high + step * 0.01; value += step) {
      tickValues.push(Number(value.toFixed(4)));
    }
    return { min: low, max: high, ticks: tickValues };
  }, [series, yDomain, zeroBasedBars]);

  const x = (index: number) => padding.left + (n <= 1 ? plotW / 2 : (index / (n - 1)) * plotW);
  const y = (value: number) => padding.top + (1 - (value - min) / (max - min)) * plotH;

  const xTickIndexes = useMemo(() => {
    if (n <= 1) return [0];
    const desired = Math.max(2, Math.min(7, Math.floor(plotW / 92)));
    const step = Math.max(1, Math.floor((n - 1) / (desired - 1)));
    const result: number[] = [];
    for (let i = 0; i < n; i += step) result.push(i);
    if (result[result.length - 1] !== n - 1) result.push(n - 1);
    return result;
  }, [n, plotW]);

  const handleMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const relative = event.clientX - rect.left - padding.left;
    const index = Math.max(0, Math.min(n - 1, Math.round((relative / plotW) * (n - 1))));
    setHover(index);
  };

  const tooltipX = hover !== null ? Math.max(70, Math.min(width - 70, x(hover))) : 0;

  return (
    <div className={`chart ${className}`.trim()} ref={ref}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${Math.max(1, width)} ${height}`}
        role="img"
        aria-label={ariaLabel}
        onPointerMove={handleMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          {series.map((item, index) => (
            <linearGradient key={index} id={`${uid}-fill-${index}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={item.color} stopOpacity={item.kind === 'bars' ? 0.55 : 0.34} />
              <stop offset="100%" stopColor={item.color} stopOpacity="0.02" />
            </linearGradient>
          ))}
        </defs>

        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={padding.left}
              x2={padding.left + plotW}
              y1={y(tick)}
              y2={y(tick)}
              stroke="var(--chart-grid)"
              strokeWidth="1"
              strokeDasharray="2 6"
            />
            <text x={padding.left - 10} y={y(tick) + 4} textAnchor="end" className="chart-axis">
              {format(tick)}
            </text>
          </g>
        ))}

        {series.map((item, index) => {
          if (item.kind === 'bars') {
            const barWidth = Math.max(2, (plotW / Math.max(1, n)) * 0.52);
            const baseline = y(zeroBasedBars ? Math.max(0, min) : min);
            return (
              <g key={index}>
                {item.values.map((value, i) => {
                  if (value === null || !Number.isFinite(value)) return null;
                  const top = y(Math.max(value, zeroBasedBars ? 0 : min));
                  const barHeight = Math.max(1.5, baseline - top);
                  return (
                    <rect
                      key={i}
                      x={x(i) - barWidth / 2}
                      y={top}
                      width={barWidth}
                      height={barHeight}
                      rx={Math.min(5, barWidth / 2)}
                      fill={item.color}
                      opacity={hover === null || hover === i ? 0.85 : 0.45}
                    />
                  );
                })}
              </g>
            );
          }
          const { line, area } = buildPath(item.values, x, y, padding.top + plotH);
          return (
            <g key={index}>
              {item.kind === 'area' && area ? (
                <path d={area} fill={`url(#${uid}-fill-${index})`} />
              ) : null}
              <path
                d={line}
                fill="none"
                stroke={item.color}
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={item.dashed ? '5 5' : undefined}
                pathLength={item.dashed ? undefined : 1}
                className={item.dashed ? '' : 'chart-line'}
              />
            </g>
          );
        })}

        {markers.map((marker) => (
          <g key={`${marker.index}-${marker.label}`}>
            <line
              x1={x(marker.index)}
              x2={x(marker.index)}
              y1={padding.top}
              y2={padding.top + plotH}
              stroke={marker.tone === 'low' ? 'var(--ocean)' : 'var(--terracotta)'}
              strokeWidth="1.2"
              strokeDasharray="3 5"
              opacity="0.55"
            />
            <circle
              cx={x(marker.index)}
              cy={padding.top + plotH}
              r="3.4"
              fill={marker.tone === 'low' ? 'var(--ocean)' : 'var(--terracotta)'}
            />
            <text
              x={x(marker.index)}
              y={padding.top + plotH + 16}
              textAnchor="middle"
              className="chart-marker-label"
            >
              {marker.label}
            </text>
          </g>
        ))}

        {nowIndex !== undefined && nowIndex >= 0 && nowIndex < n ? (
          <g>
            <line
              x1={x(nowIndex)}
              x2={x(nowIndex)}
              y1={padding.top - 4}
              y2={padding.top + plotH}
              stroke="var(--ink-3)"
              strokeWidth="1"
              strokeDasharray="2 4"
            />
            <text x={x(nowIndex)} y={padding.top - 7} textAnchor="middle" className="chart-now-label">
              maintenant
            </text>
          </g>
        ) : null}

        {xTickIndexes.map((index) => (
          <text
            key={index}
            x={x(index)}
            y={height - 6}
            textAnchor={index === 0 ? 'start' : index === n - 1 ? 'end' : 'middle'}
            className="chart-axis"
          >
            {xFormat(labels[index] ?? '', index)}
          </text>
        ))}

        {hover !== null ? (
          <g pointerEvents="none">
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={padding.top}
              y2={padding.top + plotH}
              stroke="var(--ink-2)"
              strokeWidth="1"
              opacity="0.45"
            />
            {series.map((item, index) => {
              const value = item.values[hover];
              if (value === null || value === undefined || !Number.isFinite(value)) return null;
              return (
                <circle
                  key={index}
                  cx={x(hover)}
                  cy={y(value)}
                  r="4"
                  fill="var(--surface)"
                  stroke={item.color}
                  strokeWidth="2.4"
                />
              );
            })}
          </g>
        ) : null}
      </svg>

      {hover !== null ? (
        <div className="chart-tip" style={{ left: tooltipX }}>
          <p className="chart-tip__label">{xFormat(labels[hover] ?? '', hover)}</p>
          {series.map((item, index) => {
            const value = item.values[hover];
            return (
              <p key={index} className="chart-tip__row">
                <span className="chart-tip__swatch" style={{ background: item.color }} />
                <span>{item.label}</span>
                <strong>
                  {value === null || value === undefined || !Number.isFinite(value)
                    ? '—'
                    : `${format(value)}${item.unit ?? ''}`}
                </strong>
              </p>
            );
          })}
        </div>
      ) : null}

      <ul className="chart-legend">
        {series.map((item, index) => (
          <li key={index}>
            <span className="chart-legend__swatch" style={{ background: item.color }} />
            {item.label}
            {item.unit ? <span className="chart-legend__unit"> {item.unit}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
