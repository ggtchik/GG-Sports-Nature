/** Représentation de la Lune : terminologie et fraction éclairée réelles. */
export function MoonGlyph({
  phase,
  illumination,
  size = 64,
}: {
  phase: number;
  /** Fraction éclairée (0–1). */
  illumination: number;
  size?: number;
}) {
  const r = size / 2 - 3;
  const c = size / 2;
  // k = 1 à la nouvelle lune, -1 à la pleine lune.
  const k = Math.cos(2 * Math.PI * phase);
  const rx = Math.abs(k) * r;
  const waxing = phase < 0.5;
  const lit = illumination > 0.5 ? 'gibbous' : 'crescent';

  const litHalf = waxing
    ? `M${c},${c - r} A${r},${r} 0 0 1 ${c},${c + r} Z`
    : `M${c},${c - r} A${r},${r} 0 0 0 ${c},${c + r} Z`;

  // Croissant : on creuse la moitié éclairée avec la couleur de fond.
  const carve = waxing
    ? `M${c},${c - r} A${rx},${r} 0 0 1 ${c},${c + r} Z`
    : `M${c},${c - r} A${rx},${r} 0 0 0 ${c},${c + r} Z`;

  // Gibbeuse : on ajoute une ellipse éclairée du côté opposé.
  const bulge = waxing
    ? `M${c},${c - r} A${rx},${r} 0 0 0 ${c},${c + r} Z`
    : `M${c},${c - r} A${rx},${r} 0 0 1 ${c},${c + r} Z`;

  return (
    <svg
      className="moon__glyph"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Lune éclairée à ${Math.round(illumination * 100)} %`}
    >
      <defs>
        <radialGradient id="moon-lit" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#fdf7e6" />
          <stop offset="100%" stopColor="#e8dcc0" />
        </radialGradient>
        <radialGradient id="moon-shade" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#3a4a44" />
          <stop offset="100%" stopColor="#1a2622" />
        </radialGradient>
      </defs>
      <circle cx={c} cy={c} r={r} fill="url(#moon-shade)" />
      <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth={1} />
      <path d={litHalf} fill="url(#moon-lit)" />
      {lit === 'crescent' && <path d={carve} fill="url(#moon-shade)" />}
      {lit === 'gibbous' && <path d={bulge} fill="url(#moon-lit)" opacity={0.97} />}
      <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={1} />
    </svg>
  );
}
