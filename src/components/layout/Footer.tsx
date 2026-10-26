import { ArrowUpRight, Download, Code2, MapPin, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { APP_VERSION } from '../../data/seed';
import type { BasePosition } from '../../types';
import { BrandMark } from './Topbar';

interface FooterProps {
  position: BasePosition;
  demoMode: boolean;
  onToggleDemo: () => void;
  onOpenPosition: () => void;
}

const NAV_LINKS = [
  { href: '#previsions', label: 'Prévisions 5 jours' },
  { href: '#astronomie', label: 'Soleil & lune' },
  { href: '#marees', label: 'Marées' },
  { href: '#houle', label: 'Houle & vagues' },
  { href: '#rivieres', label: 'Rivières' },
  { href: '#budget', label: 'Budget trajet' },
  { href: '#spots', label: 'Mes spots' },
  { href: '#sources', label: 'Sources' },
];

const DATA_LINKS = [
  { href: 'https://open-meteo.com/', label: 'Open-Meteo' },
  { href: 'https://meteofrance.com/', label: 'Météo-France' },
  { href: 'https://www.maree.info/', label: 'Marée info' },
  { href: 'https://data.shom.fr/', label: 'SHOM' },
  { href: 'https://www.vigicrues.gouv.fr/', label: 'Vigicrues' },
  { href: 'https://www.windguru.cz/', label: 'Windguru' },
];

export function Footer({ position, demoMode, onToggleDemo, onOpenPosition }: FooterProps) {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__brand">
          <div className="footer__brand-top">
            <BrandMark size={44} />
            <div>
              <p className="footer__name">GG Sports Nature</p>
              <p className="footer__tag">Tableau de bord nature, météo et marées</p>
            </div>
          </div>
          <p className="footer__desc">
            Un cockpit unique pour préparer balades, randonnées, sorties en mer, pêche en rivière et journées au grand
            air. Données temps réel, sources ouvertes, stockage local.
          </p>
          <div className="footer__meta">
            <button type="button" className="footer__position" onClick={onOpenPosition}>
              <MapPin size={13} /> Départ : {position.label}
            </button>
            <span className="footer__version">v{APP_VERSION}</span>
          </div>
        </div>

        <nav className="footer__col" aria-label="Sections du tableau de bord">
          <p className="card-kicker">Le tableau de bord</p>
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>

        <nav className="footer__col" aria-label="Sources de données">
          <p className="card-kicker">Sources</p>
          {DATA_LINKS.map((link) => (
            <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">
              {link.label} <ArrowUpRight size={11} />
            </a>
          ))}
        </nav>

        <div className="footer__col footer__col--actions">
          <p className="card-kicker">Préférences</p>
          <button type="button" className="switch" role="switch" aria-checked={demoMode} onClick={onToggleDemo}>
            <span className="switch__track">
              <span className="switch__thumb" />
            </span>
            <span>
              Mode démonstration
              <em>Données simulées, sans réseau</em>
            </span>
          </button>
          <button type="button" className="footer__action" onClick={onOpenPosition}>
            <SlidersHorizontal size={13} /> Modifier ma position
          </button>
          <a className="footer__action" href="../archive.zip" download>
            <Download size={13} /> Télécharger l’application (.zip)
          </a>
          <a
            className="footer__action"
            href="https://github.com/ggtchik/GG-Sports-Nature"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Code2 size={13} /> Code source <ArrowUpRight size={11} />
          </a>
        </div>
      </div>

      <div className="footer__bottom">
        <span>© {new Date().getFullYear()} GG Sports Nature · {APP_VERSION}</span>
        <span className="footer__disclaimer">
          <ShieldCheck size={12} /> Données indicatives : ne remplace pas les bulletins officiels pour la sécurité en mer
          et en rivière.
        </span>
        <span>Fait pour le plein air · France</span>
      </div>
    </footer>
  );
}
