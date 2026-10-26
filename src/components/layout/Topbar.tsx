import { useId } from 'react';
import { LocateFixed, Moon, Plus, Sun } from 'lucide-react';
import type { BasePosition } from '../../types';
import type { Theme } from '../../hooks/useTheme';
import { Badge, IconButton, Spinner } from '../ui/kit';

export function BrandMark({ size = 40 }: { size?: number }) {
  const gradientId = useId().replace(/[:]/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="brand-mark">
      <defs>
        <linearGradient id={`brand-bg-${gradientId}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3c4c3c" />
          <stop offset="100%" stopColor="#22302a" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill={`url(#brand-bg-${gradientId})`} />
      <circle cx="44" cy="20" r="7.5" fill="#e9b76a" />
      <path d="M8 48 22 27l8.5 12.5L37 32l19 22H8Z" fill="#f5efe4" opacity="0.95" />
      <path d="M8 48 22 27l5 7.4L20 48H8Z" fill="#cfd9c2" opacity="0.75" />
    </svg>
  );
}

interface TopbarProps {
  position: BasePosition;
  locating: boolean;
  theme: Theme;
  demoMode: boolean;
  onToggleTheme: () => void;
  onLocate: () => void;
  onOpenPosition: () => void;
  onNewSpot: () => void;
}

export function Topbar({
  position,
  locating,
  theme,
  demoMode,
  onToggleTheme,
  onLocate,
  onOpenPosition,
  onNewSpot,
}: TopbarProps) {
  return (
    <header className="topbar">
      <div className="topbar__inner">
        <a className="brand" href="#top" aria-label="GG Sports Nature, retour en haut">
          <BrandMark />
          <span className="brand__text">
            <span className="brand__name">GG Sports Nature</span>
            <span className="brand__tag">Nature &amp; plein air, en temps réel</span>
          </span>
        </a>

        <div className="topbar__actions">
          {demoMode ? (
            <Badge tone="demo" className="topbar__demo">
              Mode démo
            </Badge>
          ) : null}

          <button type="button" className="position-chip" onClick={onOpenPosition} title="Modifier ma position de départ">
            <span className="position-chip__icon">
              <LocateFixed size={15} />
            </span>
            <span className="position-chip__text">
              <span className="position-chip__label">Départ</span>
              <span className="position-chip__value">{position.label}</span>
            </span>
          </button>

          <IconButton label={locating ? 'Localisation en cours…' : 'Me géolocaliser'} onClick={onLocate} disabled={locating}>
            {locating ? <Spinner size={17} /> : <LocateFixed size={17} />}
          </IconButton>

          <IconButton
            label={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
            onClick={onToggleTheme}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </IconButton>

          <button type="button" className="btn btn--primary topbar__new" onClick={onNewSpot}>
            <Plus size={16} />
            <span>Nouveau spot</span>
          </button>
        </div>
      </div>
    </header>
  );
}
