import {
  Anchor,
  ArrowUpRight,
  Cloud,
  Database,
  ExternalLink,
  Info,
  Map,
  Radio,
  Waves,
  Wind,
} from 'lucide-react';
import type { Spot } from '../../types';
import { Badge, Card, CardHead, DataTable } from '../ui/kit';
import type { Column } from '../ui/kit';

export interface SourceItem {
  id: string;
  name: string;
  tag: 'météo' | 'marée' | 'houle' | 'rivière' | 'carte' | 'officiel';
  role: string;
  description: string;
  url: string;
  live: boolean;
}

export function buildSources(spot: Spot): SourceItem[] {
  const { lat, lon } = spot;
  const meteoFrance = spot.postcode
    ? `https://meteofrance.com/recherche?search_api_fulltext=${encodeURIComponent(spot.name)}`
    : 'https://meteofrance.com/';

  return [
    {
      id: 'open-meteo',
      name: 'Open-Meteo',
      tag: 'météo',
      role: 'Météo temps réel & 5 jours',
      description:
        'Température, ressenti, nuages, UV, humidité, pression, vent moyen et rafales, prévisions horaires.',
      url: 'https://open-meteo.com/',
      live: true,
    },
    {
      id: 'open-meteo-archive',
      name: 'Open-Meteo Archive',
      tag: 'météo',
      role: 'Climatologie mensuelle',
      description:
        'Réanalyse ERA5 sur 12 mois : températures minimales, maximales, moyennes et précipitations mensuelles.',
      url: 'https://open-meteo.com/en/docs/historical-weather-api',
      live: true,
    },
    {
      id: 'meteo-france',
      name: 'Météo-France',
      tag: 'officiel',
      role: 'Prévisions officielles & vigilance',
      description: 'Bulletins nationaux et départementaux, vigilance météo et météo marine officielle.',
      url: meteoFrance,
      live: false,
    },
    {
      id: 'meteo-marine',
      name: 'Météo-France Marine',
      tag: 'météo',
      role: 'Bulletins côtiers',
      description: 'Bulletins marins côtiers, avis de grand frais et conditions au large.',
      url: 'https://meteofrance.com/meteo-marine',
      live: false,
    },
    {
      id: 'vigilance',
      name: 'Vigilance Météo-France',
      tag: 'officiel',
      role: 'Alertes en cours',
      description: 'Cartes de vigilance météo par département, à consulter avant tout départ.',
      url: 'https://vigilance.meteofrance.fr/fr',
      live: false,
    },
    {
      id: 'windy',
      name: 'Windy',
      tag: 'houle',
      role: 'Vent, houle & vagues',
      description: 'Visualisation des modèles de vent, houle et vagues centrée sur votre spot.',
      url: `https://www.windy.com/${lat.toFixed(3)}/${lon.toFixed(3)}?${lat.toFixed(3)},${lon.toFixed(3)},9`,
      live: false,
    },
    {
      id: 'windguru',
      name: 'Windguru',
      tag: 'houle',
      role: 'Prévisions surf & vent',
      description: 'Prévisions de vent, houle et périodes pour les sports nautiques.',
      url: 'https://www.windguru.cz/',
      live: false,
    },
    {
      id: 'surf-report',
      name: 'Surf-Report',
      tag: 'houle',
      role: 'Houle & vagues côtières',
      description: 'Conditions de vagues et hauteur de houle sur les spots français.',
      url: 'https://www.surf-report.com/',
      live: false,
    },
    {
      id: 'windfinder',
      name: 'Windfinder',
      tag: 'houle',
      role: 'Vent, vagues & spots',
      description:
        'Prévisions de vent et de vagues spot par spot, stations météo en direct et webcams du littoral.',
      url: 'https://www.windfinder.com/',
      live: false,
    },
    {
      id: 'maree-info',
      name: 'Marée info',
      tag: 'marée',
      role: 'Horaires officiels des marées',
      description: 'Horaires de marée et coefficients par port, d’après les données du SHOM.',
      url: 'https://www.maree.info/',
      live: false,
    },
    {
      id: 'shom',
      name: 'SHOM',
      tag: 'officiel',
      role: 'Référence maritime',
      description: 'Service hydrographique et océanographique de la Marine : données et prédictions officielles.',
      url: 'https://data.shom.fr/',
      live: false,
    },
    {
      id: 'vigicrues',
      name: 'Vigicrues',
      tag: 'rivière',
      role: 'Vigilance crues & stations',
      description: 'Hauteurs et débits en temps réel des stations surveillées, vigilance crues.',
      url: 'https://www.vigicrues.gouv.fr/',
      live: false,
    },
    {
      id: 'hubeau',
      name: 'Hub’Eau',
      tag: 'rivière',
      role: 'API hydrométrie (utilisée)',
      description: 'Référentiel et observations temps réel des stations hydrométriques françaises.',
      url: 'https://hubeau.eaufrance.fr/page/api-hydrometrie',
      live: true,
    },
    {
      id: 'hydroportail',
      name: 'HydroPortail',
      tag: 'rivière',
      role: 'Données hydrométriques',
      description: 'Séries de mesures, fiches de station et historique des débits.',
      url: 'https://hydro.eaufrance.fr/',
      live: false,
    },
    {
      id: 'osm',
      name: 'OpenStreetMap',
      tag: 'carte',
      role: 'Carte & géocodage',
      description: 'Fond de carte, recherche de lieux et itinéraires libres.',
      url: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=13/${lat}/${lon}`,
      live: true,
    },
    {
      id: 'geoportail',
      name: 'Géoportail',
      tag: 'carte',
      role: 'Cartes IGN',
      description: 'Cartes topographiques officielles françaises, relief et photographies aériennes.',
      url: `https://www.geoportail.gouv.fr/carte?c=${lon},${lat}&z=13`,
      live: false,
    },
    {
      id: 'natural-earth',
      name: 'Natural Earth',
      tag: 'carte',
      role: 'Trait de côte (distance mer)',
      description: 'Fond de données libre utilisé pour estimer la distance au littoral et le contexte du spot.',
      url: 'https://www.naturalearthdata.com/',
      live: true,
    },
    {
      id: 'meteo-agricole',
      name: 'Météo agricole',
      tag: 'météo',
      role: 'Météo de proximité',
      description: 'Alternative pour les données agro-météo et les prévisions locales.',
      url: 'https://www.meteoagricole.net/',
      live: false,
    },
    {
      id: 'meteo-consult',
      name: 'Météo Consult',
      tag: 'météo',
      role: 'Prévisions & tendances',
      description:
        'Prévisions détaillées commune par commune, tendances à 15 jours et bulletins marine.',
      url: 'https://www.meteoconsult.fr/',
      live: false,
    },
  ];
}

const TAG_TONE = {
  météo: 'amber',
  marée: 'ocean',
  houle: 'indigo',
  rivière: 'sage',
  carte: 'clay',
  officiel: 'terracotta',
} as const;

const TAG_ICON = {
  météo: Cloud,
  marée: Anchor,
  houle: Waves,
  rivière: Radio,
  carte: Map,
  officiel: Database,
} as const;

interface CoverageRow {
  id: string;
  need: string;
  answer: string;
  source: string;
  status: string;
  tone: 'success' | 'ocean' | 'amber';
}

const COVERAGE: CoverageRow[] = [
  {
    id: 'geo',
    need: 'Position géolocalisée ou saisie manuelle',
    answer: 'GPS du navigateur, recherche OSM, coordonnées décimales, position de départ mémorisée',
    source: 'Navigateur · OpenStreetMap',
    status: 'Actif',
    tone: 'success',
  },
  {
    id: 'spot',
    need: 'Spot nommé, enregistré, modifiable, supprimable',
    answer: 'Dialogue de recherche, fiche du spot, bibliothèque locale persistante',
    source: 'Application · localStorage',
    status: 'Actif',
    tone: 'success',
  },
  {
    id: 'context',
    need: 'Contexte mer / eau douce à ±5 km',
    answer: 'Détection automatique du littoral, sélecteur manuel Auto / Mer / Eau douce',
    source: 'Natural Earth 1:10m',
    status: 'Automatique',
    tone: 'ocean',
  },
  {
    id: 'weather',
    need: 'Météo 24 h et 5 jours',
    answer: 'Nuages, UV, température, pression, humidité, vent moyen, rafales, direction, pluie',
    source: 'Open-Meteo · Météo-France',
    status: 'Temps réel',
    tone: 'success',
  },
  {
    id: 'astro',
    need: 'Lever, coucher, phases de lune',
    answer: 'Graphique solaire, disque lunaire, prochaines phases calculées pour le spot',
    source: 'SunCalc · calcul local',
    status: 'Local',
    tone: 'success',
  },
  {
    id: 'tides',
    need: 'Marées, coefficients, houle et vagues',
    answer: 'Courbe de niveau, horaires de pleine/basse mer, coefficient estimé, houle et vagues sur 5 jours',
    source: 'Open-Meteo Marine · SHOM',
    status: 'Indicatif',
    tone: 'amber',
  },
  {
    id: 'river',
    need: '5 stations les plus proches (hauteur, débit)',
    answer: 'Tableau des stations avec hauteur, débit, tendance et liens Vigicrues',
    source: 'Hub’Eau · Vigicrues',
    status: 'Temps réel',
    tone: 'success',
  },
  {
    id: 'budget',
    need: 'Frais de trajet et d’hébergement',
    answer: 'Distances, carburant, péages, usure, nuits et repas paramétrables',
    source: 'Application',
    status: 'Local',
    tone: 'success',
  },
];

export function SourcesPanel({ spot, delay = 0 }: { spot: Spot; delay?: number }) {
  const sources = buildSources(spot);

  const columns: Column<CoverageRow>[] = [
    {
      key: 'need',
      label: 'Besoin',
      render: (row) => <strong className="coverage-need">{row.need}</strong>,
    },
    {
      key: 'answer',
      label: 'Réponse dans l’application',
      render: (row) => <span>{row.answer}</span>,
    },
    {
      key: 'source',
      label: 'Source',
      render: (row) => <span className="mono coverage-source">{row.source}</span>,
    },
    {
      key: 'status',
      label: 'État',
      align: 'right',
      render: (row) => <Badge tone={row.tone}>{row.status}</Badge>,
    },
  ];

  return (
    <Card className="sources" delay={delay} id="sources">
      <CardHead
        kicker="Transparence · sources ouvertes"
        title="Les données et leurs sources"
        icon={<Database size={18} />}
        aside={
          <span className="updated">
            <Info size={12} /> Liens directs, sans compte
          </span>
        }
      />

      <div className="source-grid">
        {sources.map((source) => {
          const Icon = TAG_ICON[source.tag];
          return (
            <a
              key={source.id}
              className={`source-card ${source.live ? 'source-card--live' : ''}`}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="source-card__top">
                <span className="source-card__icon">
                  <Icon size={16} />
                </span>
                <span className="source-card__name">{source.name}</span>
                {source.live ? <Badge tone="success">utilisé</Badge> : null}
                <ArrowUpRight size={14} className="source-card__arrow" />
              </div>
              <p className="source-card__role">{source.role}</p>
              <p className="source-card__desc">{source.description}</p>
              <span className="source-card__tag">
                <Badge tone={TAG_TONE[source.tag]}>{source.tag}</Badge>
              </span>
            </a>
          );
        })}
      </div>

      <div className="coverage">
        <div className="coverage__head">
          <h3>Couverture fonctionnelle</h3>
          <p>Chaque fonctionnalité attendue, son implémentation et sa source.</p>
        </div>
        <DataTable
          columns={columns}
          rows={COVERAGE}
          rowKey={(row) => row.id}
          minWidth={760}
          caption="Couverture fonctionnelle et sources"
        />
      </div>

      <div className="sources__note">
        <Wind size={15} />
        <p>
          Les données météo, marines et hydrométriques sont indicatives et peuvent différer des bulletins officiels.
          Pour toute décision de sécurité en mer ou en rivière, consultez Météo-France, le SHOM et Vigicrues.{' '}
          <a href="https://www.vigicrues.gouv.fr/" target="_blank" rel="noopener noreferrer">
            Vigicrues <ExternalLink size={11} />
          </a>
        </p>
      </div>
    </Card>
  );
}
