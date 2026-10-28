interface SparklineProps {
  values: (number | null)[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
  ariaLabel?: string;
}

export function Sparkline({
  values,
  width = 120,
  height = 26,
  color = 'currentColor',
  fill = true,
  ariaLabel,
}: SparklineProps) {
  const points = values.filter((v): v is number => v !== null && Number.isFinite(v));
  if (points.length < 2) {
    return <span className="note">Historique insuffisant</span>;
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = width / (values.length - 1);
  const coords = values.map((value, index) => {
    if (value === null || !Number.isFinite(value)) return null;
    const x = index * step;
    const y = height - 2 - ((value - min) / span) * (height - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const valid = coords.filter(Boolean) as string[];
  const d = valid.map((c, i) => `${i === 0 ? 'M' : 'L'}${c}`).join(' ');
  const last = valid[valid.length - 1]?.split(',') ?? ['0', '0'];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel ?? 'Évolution récente'}
      style={{ overflow: 'visible' }}
    >
      {fill && (
        <path d={`${d} L${last[0]},${height} L0,${height} Z`} fill={color} opacity={0.12} stroke="none" />
      )}
      <path d={d} fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={Number(last[0])} cy={Number(last[1])} r={2.2} fill={color} />
    </svg>
  );
}
