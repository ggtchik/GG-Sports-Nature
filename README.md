# GG Sports Nature

**Le tableau de bord des sorties nature.** Un cockpit premium, pensé comme un produit SaaS moderne, pour préparer et vivre ses activités outdoor : météo temps réel, astronomie, marées, houle, rivières, spots enregistrés et budget de déplacement.

Application 100 % front-end, **sans serveur ni compte** : toutes les données sont récupérées depuis des API publiques gratuites, et vos spots, votre position et vos préférences restent dans le `localStorage` de votre navigateur.

![Activités](https://img.shields.io/badge/activités-7-E8B464) ![Sans backend](https://img.shields.io/badge/backend-aucun-5D7754) ![API gratuites](https://img.shields.io/badge/API-gratuites-2B6F81)

---

## Activités couvertes

| Activité | Milieu | Panneaux affichés |
| --- | --- | --- |
| **Balade** | Terre | Météo complète, prévisions, carte, astronomie |
| **Randonnée** | Terre | Météo complète, prévisions, carte, astronomie |
| **Jogging** | Terre | Météo complète, prévisions, carte, astronomie |
| **Natation** | Eau douce / Mer | Météo ou marées + houle + vagues, carte |
| **Voile** | Eau douce / Mer | Météo ou marées + houle + vagues, carte |
| **Pêche** | Eau douce / Mer | Niveaux et débits des 5 stations les plus proches, ou marées |
| **Chasse** | Terre | Météo complète, prévisions, carte, astronomie |

Le mode « mer » ou « eaux douces » est **détecté automatiquement** à partir de la distance du spot à la côte (< 5 km), et peut être forcé manuellement (Auto / En mer / Eaux douces).

---

## Fonctionnalités

- **Position** : géolocalisation automatique (avec repli propre si refusée) ou saisie manuelle, recherche d'adresse, coordonnées.
- **Spots** : création, édition, suppression, bibliothèque locale, sélection rapide en un clic. Distance à vol d'oiseau depuis la position courante.
- **Astronomie** : lever/coucher du soleil, heure dorée, arc solaire animé, disque lunaire dessiné (terminateur réel), âge et phases de la lune, prochaines phases.
- **Météo** : température, ressenti, couverture nuageuse, indice UV, pression, vent moyen et rafales, direction (boussole), humidité, risque de pluie — plus une **évolution sur 24 h** (5 indicateurs au choix) et des **prévisions à 5 jours**.
- **Climatologie** : courbe d'évolution mensuelle sur 12 mois (moyennes, minimales, maximales, précipitations) et tableau compact des 12 mois.
- **Marées** : hauteurs, horaires, coefficient estimé, courbe de marée, port de référence, avertissement d'usage.
- **Houle & vagues** : hauteur, période, direction, houle primaire/secondaire, température de l'eau, prévisions marines.
- **Rivières** : 5 stations de jaugeage les plus proches (Hub'Eau / Vigicrues), hauteur d'eau, débit, tendance, graphique 48 h, fraîcheur de la donnée et liens officiels.
- **Budget** : distance routière estimée, carburant, péages, usure, hébergement, repas — réglages persistants (consommation, prix du carburant, nombre de nuits, voyageurs).
- **Carte** : Leaflet, fonds OSM / Humanitarian / Relief, marqueur du spot, stations hydrométriques, accès direct à OpenStreetMap, Google Maps et Géoportail.
- **Sources** : 19 fiches cliquables regroupant toutes les sources officielles ou utiles (Météo-France, marine, SHOM, marée.info, Windguru, Windfinder, Surf-Report, Météo Consult, Vigicrues, Hub'Eau, HydroPortail, OSM, Géoportail, Météo agricole…).
- **Confort** : thème clair/sombre mémorisé, animations douces, mode démonstration hors ligne, interface responsive PC / tablette / smartphone.

---

## Démarrage

```bash
npm install          # installe les dépendances
npm run dev          # http://localhost:5173
npm run build        # compile et génère dist/index.html (fichier unique)
npm run preview      # sert le build de production
npm run package      # crée archive.zip (code source + application compilée)
```

`npm run build` produit **un seul fichier** `dist/index.html` : CSS, JavaScript, icônes et fonds de carte vectoriels y sont intégrés. Il peut être ouvert directement (double-clic) ; la carte et les données en direct nécessitent simplement une connexion Internet.

### Archive livrable

`npm run package` génère **`archive.zip`** à la racine, qui contient :

- `dist/index.html` — l'application complète prête à l'emploi ;
- `src/` — le code source TypeScript/React complet ;
- `scripts/`, `index.html`, `package.json`, `vite.config.ts`, `tsconfig.json`, `README.md`.

Le lien « Télécharger l'application (.zip) » du pied de page pointe vers cette archive.

---

## Sources de données (toutes gratuites)

| Donnée | Source | Clé API |
| --- | --- | --- |
| Météo, prévisions, archives | [Open-Meteo](https://open-meteo.com/) | aucune |
| Houle, vagues, température de l'eau | [Open-Meteo Marine](https://open-meteo.com/en/docs/marine-weather-api) | aucune |
| Géocodage / recherche de lieu | [Nominatim](https://nominatim.org/) + [Open-Meteo Geocoding](https://open-meteo.com/en/docs/geocoding-api) | aucune |
| Niveaux et débits | [Hub'Eau Hydrométrie](https://hubeau.eaufrance.fr/page/api-hydrometrie) | aucune |
| Climatologie (12 mois) | [Open-Meteo Archive](https://open-meteo.com/en/docs/historical-weather-api) (ERA5) | aucune |
| Carte | [OpenStreetMap](https://www.openstreetmap.org/), [Leaflet](https://leafletjs.com/) | aucune |
| Marées | calcul astronomique local + [Open-Meteo Marine](https://open-meteo.com/en/docs/marine-weather-api) (niveau de la mer) | aucune |

Liens de contrôle : Météo-France, Vigilance, Windy, Windguru, WindSurf, Surf-Report, Marée info, SHOM, Vigicrues, HydroPortail, Géoportail, Météo agricole.

**Marées** : les hauteurs sont calculées à partir du niveau de la mer Open-Meteo (modélisation globale) et le coefficient est **estimé** par un modèle astronomique simplifié. Ils ne remplacent pas les prédictions officielles du SHOM et ne doivent jamais servir à la navigation.

---

## Données personnelles

- Aucun compte, aucun serveur applicatif, aucun traceur publicitaire.
- Position, spots, activité, budget, thème et mode démonstration sont stockés **uniquement** dans le `localStorage` du navigateur.
- Vous pouvez effacer ces données à tout moment en vidant le stockage du site.
- Les appels réseau vont directement aux API publiques listées ci-dessus ; aucune donnée n'est envoyée à un tiers applicatif.

---

## Architecture

```
src/
  App.tsx                 # orchestration : état, ressources, panneaux
  main.tsx                # montage React
  types.ts                # modèle de domaine
  data/                   # activités, spot et position par défaut
  lib/
    api/                  # http, weather, marine, geocode, hydro
    astro.ts              # soleil, lune, phases
    tides.ts              # extrema, courbe, coefficient estimé
    coastline.ts          # distance à la mer (Natural Earth 10m, embarquée)
    budget.ts             # modèle de coût de déplacement
    demo.ts               # jeu de données simulé hors ligne
    storage.ts, geo.ts, weatherCodes.ts, format.ts, geolocation.ts
  hooks/                  # état persistant, ressources, thème, largeur
  components/
    ui/                   # kit (Card, Badge, DataTable, LineChart, Donut…)
    layout/, control/, hero/, astro/, weather/, map/, marine/
    hydro/, budget/, spots/, sources/
  styles/app.css          # design system complet (thème clair/sombre)
```

**Stack** : React 19, TypeScript strict, Vite 8, Leaflet, SunCalc, Lucide. Aucun framework CSS : le design system est écrit à la main (tokens, thèmes, composants, responsive).

### Robustesse

- Chaque ressource réseau a ses états `chargement / erreur / démo`, avec bouton « réessayer ».
- En cas d'absence de réseau, le **mode démonstration** génère des séries cohérentes (le bandeau et les badges signalent clairement les données simulées).
- Requêtes regroupées par clé `latitude,longitude` et rafraîchies toutes les 10 minutes.
- `prefers-reduced-motion` respecté ; navigation clavier et libellés ARIA sur les contrôles.

---

## Licence

Projet personnel — code fourni tel quel, données soumises aux licences de leurs producteurs respectifs.
