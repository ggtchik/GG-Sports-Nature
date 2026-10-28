/**
 * Registre des sources : conditions d'utilisation vérifiées, licence, fraîcheur
 * réelle et lien public. Sert à l'affichage « Source des données » de chaque
 * module ainsi qu'à la page « Sources & méthode ».
 *
 * Aucune clé secrète n'est utilisée par l'application : toutes les sources
 * actives sont accessibles directement depuis le navigateur.
 */

export type SourceNature = 'temps réel' | 'quasi temps réel' | 'prévision' | 'calcul local' | 'référentiel';

export interface DataSource {
  id: string;
  name: string;
  org: string;
  url: string;
  licence: string;
  licenceUrl?: string;
  nature: SourceNature;
  update: string;
  notes: string;
  used: boolean;
  reason?: string;
  keyRequired?: boolean;
}

export const SOURCES: Record<string, DataSource> = {
  'open-meteo': {
    id: 'open-meteo',
    name: 'Open-Meteo — prévisions météo',
    org: 'Open-Meteo (données des modèles nationaux : Météo-France AROME, DWD ICON, ECMWF IFS)',
    url: 'https://open-meteo.com/en/docs',
    licence: 'CC BY 4.0 (usage non commercial, < 10 000 appels/jour)',
    licenceUrl: 'https://open-meteo.com/en/terms',
    nature: 'prévision',
    update:
      'Modèles réactualisés toutes les 1 à 6 h selon le modèle ; la condition « actuelle » est une interpolation 15 min de la dernière passe.',
    notes:
      'Aucune clé requise, CORS ouvert. Les horodatages renvoyés par l’API sont affichés tels quels : une prévision n’est jamais présentée comme une mesure.',
    used: true,
  },
  'open-meteo-marine': {
    id: 'open-meteo-marine',
    name: 'Open-Meteo Marine — houle, vagues, SST, niveau de la mer',
    org: 'Open-Meteo (MFWAM Météo-France, SMOC Copernicus, GFS Wave)',
    url: 'https://open-meteo.com/en/docs/marine-weather-api',
    licence: 'CC BY 4.0 (usage non commercial)',
    licenceUrl: 'https://open-meteo.com/en/terms',
    nature: 'prévision',
    update:
      'Houle MFWAM : pas de 3 h, nouvelle passe toutes les 12 h. Niveau de la mer et courants SMOC : pas horaire, mise à jour quotidienne. Résolution ≈ 8 km.',
    notes:
      'Le niveau de la mer est calculé par un modèle numérique : il ne remplace ni l’annuaire des marées ni les prédictions SHOM, et n’est pas destiné à la navigation.',
    used: true,
  },
  'api-maree': {
    id: 'api-maree',
    name: 'api-maree.fr — pleines/basses mers et coefficients (facultatif)',
    org: 'api-maree.fr, à partir des composantes harmoniques Ifremer / PREVIMER',
    url: 'https://api-maree.fr/documentation',
    licence: 'CC BY 4.0 — attribution Ifremer/PREVIMER obligatoire',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0/deed.fr',
    nature: 'prévision',
    update: 'Calcul harmonique à la demande (fenêtre J-30 → J+30), 360 requêtes/h maximum.',
    notes:
      'Actif uniquement si vous enregistrez votre propre clé dans les réglages (stockée dans ce navigateur, jamais dans une URL). Coefficients non officiels, impropres à la navigation.',
    used: false,
    keyRequired: true,
    reason:
      'Source facultative : sans clé personnelle, l’application affiche la courbe de marée du modèle et indique explicitement que le coefficient n’est pas disponible.',
  },
  ban: {
    id: 'ban',
    name: 'Base Adresse Nationale',
    org: 'DINUM / IGN / La Poste — api-adresse.data.gouv.fr',
    url: 'https://adresse.data.gouv.fr/api-doc/adresse',
    licence: 'Licence Ouverte / Open Licence 2.0',
    licenceUrl: 'https://www.etalab.gouv.fr/licence-ouverte-open-licence/',
    nature: 'référentiel',
    update: 'Mise à jour en continu (base nationale d’adresses).',
    notes: 'Recherche d’adresse, de commune et de code postal en France. Aucune clé requise.',
    used: true,
  },
  nominatim: {
    id: 'nominatim',
    name: 'Nominatim / OpenStreetMap',
    org: 'OpenStreetMap Foundation',
    url: 'https://nominatim.org/',
    licence: 'ODbL 1.0',
    licenceUrl: 'https://www.openstreetmap.org/copyright',
    nature: 'référentiel',
    update: 'Base OSM mise à jour en continu ; service public à usage modéré (1 requête/s).',
    notes:
      'Utilisé en secours de la BAN pour les lieux hors de France. Une requête par recherche, sans géocodage automatique à la frappe.',
    used: true,
  },
  overpass: {
    id: 'overpass',
    name: 'Overpass API — trait de côte OSM',
    org: 'OpenStreetMap (natural=coastline)',
    url: 'https://overpass-api.de/',
    licence: 'ODbL 1.0',
    licenceUrl: 'https://www.openstreetmap.org/copyright',
    nature: 'référentiel',
    update: 'Suivant les données OSM (mises à jour en continu).',
    notes:
      'Distance réelle au littoral, arrondie au segment le plus proche. Serveurs publics sans garantie de disponibilité ; trois instances essayées puis repli local.',
    used: true,
  },
  'natural-earth': {
    id: 'natural-earth',
    name: 'Natural Earth 1:10m — trait de côte embarqué',
    org: 'Natural Earth (domaine public)',
    url: 'https://www.naturalearthdata.com/',
    licence: 'Domaine public',
    nature: 'référentiel',
    update: 'Jeu de données statique embarqué (aucune requête réseau).',
    notes: 'Repli hors ligne pour la détection du milieu, précision ≈ 1,3 km. Signalé comme tel dans l’interface.',
    used: true,
  },
  hubeau: {
    id: 'hubeau',
    name: 'Hub’Eau — Hydrométrie (hauteurs, débits)',
    org: 'Office français de la biodiversité / Service central Vigicrues (PHyC)',
    url: 'https://hubeau.eaufrance.fr/page/api-hydrometrie',
    licence: 'Licence Ouverte / Open Licence 2.0',
    licenceUrl: 'https://www.etalab.gouv.fr/licence-ouverte-open-licence/',
    nature: 'quasi temps réel',
    update:
      'Mesures bancarisées toutes les 5 à 60 min selon la station, reprises par Hub’Eau environ toutes les 5 min. Historique : 1 mois.',
    notes:
      'Hauteurs en millimètres et débits en litres/seconde à la source, converties en mètres et m³/s. Données brutes, non validées.',
    used: true,
  },
  vigicrues: {
    id: 'vigicrues',
    name: 'Vigicrues — information officielle sur les crues',
    org: 'Ministère de la Transition écologique / SCHAPI',
    url: 'https://www.vigicrues.gouv.fr/',
    licence: 'Licence Ouverte / Open Licence 2.0',
    nature: 'quasi temps réel',
    update: 'Vigilance et prévisions de crues publiées plusieurs fois par jour.',
    notes:
      'Lien direct vers la carte de vigilance. Les mesures affichées proviennent de la même plateforme (PHyC) via Hub’Eau.',
    used: false,
    reason: 'Le site Vigicrues ne propose pas d’API CORS documentée pour l’hydrométrie : ses données sont lues via Hub’Eau.',
  },
  osrm: {
    id: 'osrm',
    name: 'OSRM — itinéraire routier',
    org: 'OpenStreetMap / routeurs de démonstration (project-osrm.org, openstreetmap.de)',
    url: 'https://project-osrm.org/',
    licence: 'ODbL 1.0 (données OSM)',
    licenceUrl: 'https://www.openstreetmap.org/copyright',
    nature: 'référentiel',
    update: 'Calcul à la demande sur le réseau routier OSM.',
    notes:
      'Serveur de démonstration public : pas de garantie de disponibilité ni de trafic. Repli : distance à vol d’oiseau majorée de 25 %, sans durée.',
    used: true,
  },
  suncalc: {
    id: 'suncalc',
    name: 'SunCalc — calculs astronomiques',
    org: 'Bibliothèque libre (algorithmes de Jean Meeus)',
    url: 'https://github.com/mourner/suncalc',
    licence: 'BSD 2-Clause',
    nature: 'calcul local',
    update: 'Calcul dans le navigateur, à la seconde.',
    notes:
      'Lever/coucher, crépuscules, heure dorée, position du soleil, phase et illumination de la Lune. Précision de l’ordre de la minute.',
    used: true,
  },
  'open-meteo-geocoding': {
    id: 'open-meteo-geocoding',
    name: 'Open-Meteo Geocoding',
    org: 'Open-Meteo (GeoNames)',
    url: 'https://open-meteo.com/en/docs/geocoding-api',
    licence: 'CC BY 4.0 (GeoNames : CC BY 4.0)',
    nature: 'référentiel',
    update: 'Base GeoNames, mises à jour périodiques.',
    notes: 'Dernier recours pour trouver une localité hors de France.',
    used: true,
  },
  // Sources étudiées, volontairement non intégrées : affichées dans « Sources & méthode ».
  'meteo-france': {
    id: 'meteo-france',
    name: 'Météo-France — portail API',
    org: 'Météo-France',
    url: 'https://portail-api.meteofrance.fr/',
    licence: 'Conditions propres au portail (compte et quotas)',
    nature: 'prévision',
    update: 'Selon les modèles AROME/ARPEGE.',
    notes: 'Nécessite un compte et une clé d’API : non exposable dans une application purement navigateur.',
    used: false,
    keyRequired: true,
    reason:
      'Clé secrète obligatoire : l’intégrer dans le navigateur exposerait la clé. Les mêmes modèles sont disponibles sans clé via Open-Meteo (attribution affichée).',
  },
  shom: {
    id: 'shom',
    name: 'SHOM — prédictions de marée (SPM / SAPM)',
    org: 'Service hydrographique et océanographique de la Marine',
    url: 'https://diffusion.shom.fr/services-numeriques/api-shom.html',
    licence: 'Accès payant (clé d’abonnement)',
    nature: 'prévision',
    update: 'Prédictions officielles, calcul à la demande.',
    notes:
      'Source de référence pour les hauteurs au zéro hydrographique, mais son API exige une clé d’abonnement payante.',
    used: false,
    keyRequired: true,
    reason:
      'API payante : impossible à interroger depuis une application gratuite. Le coefficient de marée est donc affiché comme indisponible, sauf si vous fournissez une clé api-maree.fr (composantes harmoniques Ifremer).',
  },
  'maree-info': {
    id: 'maree-info',
    name: 'maree.info — annuaire des marées',
    org: 'maree.info',
    url: 'https://maree.info/',
    licence: 'Consultation ; réutilisation automatisée interdite (CGU)',
    nature: 'prévision',
    update: 'Consultation humaine uniquement.',
    notes: 'Ses conditions d’utilisation interdisent l’extraction automatique des données.',
    used: false,
    reason: 'Aucune API publique et CGU interdisant la récupération automatisée : seul un lien de consultation est proposé.',
  },
  windy: {
    id: 'windy',
    name: 'Windy / Windguru / Surf-Report',
    org: 'Windy.com, Windguru, Surf-Report',
    url: 'https://www.windy.com/',
    licence: 'Services propriétaires (API sur abonnement ou non publique)',
    nature: 'prévision',
    update: 'Modèles propriétaires.',
    notes:
      'Pas d’API gratuite et open data pour un usage navigateur ; Windguru et Surf-Report n’exposent pas d’API publique.',
    used: false,
    keyRequired: true,
    reason: 'Pas d’accès gratuit et autorisé depuis le navigateur : liens de consultation fournis en complément.',
  },
};

export function sourceById(id: keyof typeof SOURCES | string): DataSource {
  return SOURCES[id] ?? SOURCES['open-meteo'];
}

export const ACTIVE_SOURCES = Object.values(SOURCES).filter((source) => source.used);
export const STUDIED_SOURCES = Object.values(SOURCES).filter((source) => !source.used);
