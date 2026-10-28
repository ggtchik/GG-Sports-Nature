# GG Sports-Nature

**Station de préparation et d'aide à la décision pour les activités de plein air et nautiques.**

Application web autonome (React + TypeScript + Vite) qui réunit, pour un spot et une activité donnés :
météo, évolution horaire, prévisions à 5 jours, astronomie, marées, houle, vagues, hydrologie,
cartographie, distance depuis le départ et estimation des frais de déplacement.

> Principe directeur : **Fiabilité → Pertinence → Lisibilité → Simplicité → Esthétique**.
> Aucune donnée n'est inventée ; une donnée absente est explicitement signalée comme indisponible.

---

## 1. Démarrage rapide

### Avec Node.js (recommandé)

```bash
npm install
npm run dev          # → http://localhost:5173
```

Build de production + serveur local (sert `dist/` et le relais CORS) :

```bash
npm run build
npm run serve        # → http://localhost:4173
```

### Sans build

L'archive contient un dossier `dist/` déjà compilé (application autonome, sans dépendance). N'importe quel serveur statique suffit
(les modules ES ne fonctionnent pas en `file://`) :

```bash
python3 -m http.server 4173 --directory dist
```

Les navigateurs récents exigent HTTPS ou `localhost` pour la géolocalisation.

### Configuration

Aucune variable d'environnement, aucune clé d'API, aucun backend. Tout l'état (spots, réglages,
position, clé api-maree.fr facultative) reste dans le `localStorage` du navigateur.

---

## 2. Contenu de l'archive

```
gg-sports-nature/
├── index.html            entrée Vite
├── src/                  application (React + TypeScript)
├── server/               serveur local + relais CORS (Node natif, sans dépendance)
├── scripts/              génération du référentiel côtier
├── dist/                 application déjà compilée (utilisable telle quelle)
├── package.json  package-lock.json  tsconfig.json  vite.config.ts
└── README.md
```

`node_modules/` n'est pas inclus (non nécessaire pour `dist/`) : `npm install` ne sert qu'à relancer
le développement ou un nouveau build.

## 3. Parcours utilisateur

1. **Position** — géolocalisation du terminal ou saisie (adresse, commune, code postal, lieu, coordonnées ;
   la BAN accepte aussi les codes postaux seuls).
2. **Activité** — 🥾 Balade · 🏔️ Randonnée · 🏃 Jogging · 🏊 Natation · ⛵ Nautisme · 🎣 Pêche · 🦌 Chasse.
3. **Spot** — recherche (BAN → Nominatim → Open-Meteo), spots enregistrés ou création manuelle.
   Spots persistants : ajout, modification, suppression.
4. **Milieu** — `AUTO | MER | EAU DOUCE`. En AUTO, un spot à moins de **5 km du trait de côte** est
   considéré comme maritime. Le choix manuel est toujours prioritaire.
5. **Unités** — `STANDARD | NAUTIQUE | DOUBLE`, sélecteur global (barre supérieure, tableau de bord et réglages).
6. **Dashboard** — seuls les modules pertinents sont affichés.

---

## 4. Modules affichés selon l'activité et le milieu

| Module | Contenu | Quand |
| --- | --- | --- |
| Spot & accès | nom, commune, coordonnées, milieu, distance au littoral, distance/durée depuis le départ, liens | toujours |
| Carte | spot, départ, trajet, rayon 5 km, cours d'eau OSM, stations hydro, fonds Plan/Relief | toujours (cours d'eau en eau douce) |
| Conditions actuelles | température, ressenti, vent, rafales, force Beaufort, pression, nuages, pluie, risque, UV, humidité, visibilité | toujours |
| Évolution | aujourd'hui et 24 h : température, vent/rafales, précipitations + détail horaire | toujours |
| Astronomie | course du soleil, lever/coucher, durée du jour, midi solaire, crépuscule, heure dorée, phase et illumination de la Lune | toujours |
| Marées | prochaine PM/BM, événements du jour, courbe, marnage, jours suivants | mer + natation/nautisme/pêche |
| Houle & vagues | hauteur, période, direction (vagues et houle), courbe du jour | mer + natation/nautisme/pêche |
| Prévisions marines | vagues/houle max à 5 jours | idem |
| Température de l'eau | SST modèle (mer) / indisponibilité motivée (eau douce) | natation, nautisme |
| Hydrologie | 5 stations les plus proches : hauteur, débit, distance, horodatage, tendance, mini-courbe | pêche en eau douce |
| Prévisions 5 jours | min/max, pluie, vent, rafales, UV | toujours |
| Frais de déplacement | distance, carburant, péages, hébergement, autres, total — paramètres modifiables | toujours |
| Sources & fraîcheur | source, nature, licence, horodatage, état de chaque module | toujours |

**Règle stricte** : une activité terrestre (Balade, Randonnée, Jogging, Chasse) n'affiche **jamais** de données
maritimes, même sur un spot en bord de mer.

---

## 5. Unités et conversions

| Grandeur | STANDARD | NAUTIQUE | DOUBLE |
| --- | --- | --- | --- |
| distance terrestre | km | km | km / NM |
| distance maritime | km | NM | km / NM |
| vitesse (vent, déplacement) | km/h | kn (contexte maritime) | km/h / kn |
| hauteur, houle, vague, marée | m | m | m |
| température / pression | °C / hPa | °C / hPa | °C / hPa |

- `1 NM = 1,852 km` · `1 kn = 1,852 km/h`
- Les valeurs des API sont **conservées dans leur unité source** ; la conversion n'a lieu qu'au rendu
  (`src/core/units.ts`). Un changement d'unité ne déclenche aucun appel réseau et ne recharge pas la page.
- Arrondis homogènes : distance 0,1 km (entière ≥ 100 km) ou 0,1 NM, vitesse entière, température 0,1 °C,
  pression entière, marée 0,01 m, hauteur d'eau 0,01 m, débit adaptatif.
- L'échelle de Beaufort est dérivée de la vitesse en nœuds (indication dérivée, jamais une donnée brute).

---

## 6. Sources de données (vérifiées)

| Source | Usage | Licence | Fraîcheur réelle | Clé |
| --- | --- | --- | --- | --- |
| [Open-Meteo Forecast](https://open-meteo.com/en/docs) | météo, prévisions | CC BY 4.0 (non commercial < 10 000 req/j) | modèles réactualisés toutes les 1–6 h ; « actuel » interpolé 15 min | non |
| [Open-Meteo Marine](https://open-meteo.com/en/docs/marine-weather-api) | houle, vagues, SST, niveau de la mer | CC BY 4.0 | houle 3 h / passe 12 h ; niveau de mer horaire / maj quotidienne ; ≈ 8 km | non |
| [api-maree.fr](https://api-maree.fr/documentation) *(facultatif)* | PM/BM + coefficients | CC BY 4.0 (Ifremer/PREVIMER) | calcul harmonique à la demande | **clé utilisateur** |
| [Base Adresse Nationale](https://adresse.data.gouv.fr/api-doc/adresse) | recherche d'adresses (France) | Licence Ouverte 2.0 | continu | non |
| [Nominatim](https://nominatim.org/) | recherche internationale (secours) | ODbL | continu, usage modéré 1 req/s | non |
| [Overpass API](https://overpass-api.de/) | trait de côte OSM pour le milieu | ODbL | continu, instances publiques | non |
| Natural Earth 1:10m (embarqué) | trait de côte de repli (±1,3 km) | domaine public | statique | non |
| [Hub'Eau Hydrométrie](https://hubeau.eaufrance.fr/page/api-hydrometrie) | hauteurs et débits (réseau Vigicrues/PHyC) | Licence Ouverte 2.0 | mesures toutes les 5–60 min, reprise ~5 min | non |
| [OSRM](https://project-osrm.org/) | itinéraire routier, durée | données OSM (ODbL) | à la demande | non |
| [SunCalc](https://github.com/mourner/suncalc) | soleil, lune (local) | BSD 2-Clause | calcul navigateur | non |
| Fonds de carte [OSM](https://www.openstreetmap.org/copyright) / [OpenTopoMap](https://opentopomap.org) | carte | ODbL / CC BY-SA | continu | non |

### Sources étudiées et volontairement non intégrées

| Source | Motif |
| --- | --- |
| Météo-France (portail API) | compte + clé secrète : impossible à embarquer côté navigateur. Les modèles nationaux sont disponibles sans clé via Open-Meteo (attribution affichée). |
| SHOM — prédictions de marée (SPM/SAPM) | API **payante** (clé d'abonnement). Les hauteurs SHOM ne sont pas en open data. |
| maree.info | pas d'API publique ; CGU interdisant l'extraction automatisée → lien de consultation uniquement. |
| Windy, Windguru, Surf-Report | API propriétaire / non gratuite / non publique. |
| Vigicrues (site) | pas d'API CORS documentée pour l'hydrométrie ; les mesures proviennent de la même plateforme PHyC via Hub'Eau. Lien direct fourni. |

Chaque module affiche sa source cliquable, la **nature** de la donnée (temps réel, quasi temps réel,
prévision, calcul local) et l'horodatage. La page « Sources & méthode » (réglages ou pied de page) détaille
les licences et les calculs.

---

## 7. Décisions et limites assumées

1. **Coefficient de marée.** Sans clé api-maree.fr, il est affiché comme **non disponible** : il n'existe pas de
   source ouverte (SHOM payant) et une estimation déduite du marnage local serait fausse sur une grande partie
   du littoral. Le marnage, lui, est calculé et affiché. Avec une clé personnelle api-maree.fr, horaires et
   coefficients (signalés comme non officiels) sont affichés.
2. **Hauteurs de marée.** La courbe provient du modèle SMOC : les hauteurs sont relatives au **niveau moyen de
   la mer**, pas au zéro hydrographique. Les extrema sont détectés dans la série horaire et affinés par
   interpolation parabolique (précision de quelques minutes). Ce n'est pas un annuaire de marées.
3. **Milieu automatique.** Distance au trait de côte OSM (rayon 10 km ; repli Natural Earth ±1,3 km). Le seuil de
   5 km est appliqué tel quel ; le choix manuel reste prioritaire.
4. **Température de l'eau en eau douce.** Aucune source ouverte ne la publie pour les lacs/étangs : la carte
   l'indique explicitement au lieu d'afficher une valeur inventée.
5. **Durée de trajet.** OSRM (routeur de démonstration, sans garantie de disponibilité). En repli, seule une
   distance à vol d'oiseau majorée de 25 % est affichée, sans durée.
6. **Hydrologie.** Données brutes, non validées, parfois absentes pour une station. Les stations sont triées par
   distance ; cinq sont retenues. Hauteurs converties de mm en m, débits de L/s en m³/s.
7. **Frais.** Estimation paramétrable (consommation, prix du carburant, péages, hébergement, autres). Aucun
   tarif officiel n'est utilisé ; les péages ne peuvent pas être déduits d'une distance seule.
8. **Clés / CORS.** Aucune clé n'est requise. Si un navigateur ou un réseau bloque une API (CORS), un relais
   local de même origine (`/__proxy`) rejoue la requête ; la liste blanche d'hôtes est limitée aux sources
   ci-dessus. Ce relais est fourni par `npm run dev` et `npm run serve` ; il n'est jamais indispensable.
9. **Non utilisable pour la navigation.** Les données de modèle (houle, niveau d'eau) ne remplacent ni les
   bulletins officiels, ni les cartes marines, ni les consignes de sécurité.

---

## 8. Architecture

```
index.html                  point d'entrée Vite
vite.config.ts              build + middleware /__proxy
server/
  proxy.mjs                 relais CORS (liste blanche d'hôtes)
  proxy-plugin.mjs          branchement Vite dev/preview
  serve.mjs                 serveur statique `dist/` + relais (Node natif)
scripts/
  build-coastline.mjs       génère src/data/coastline.json (Natural Earth 1:10m)
src/
  main.tsx  App.tsx
  core/                     logique métier pure, testable et sans React
    types.ts                modèle de données (valeurs brutes des API)
    units.ts                conversions + formatage (STANDARD / NAUTIQUE / DOUBLE)
    format.ts               dates, durées, arrondis français
    geo.ts                  haversine, caps, distance point/segment
    coast.ts                détection du milieu (OSM → Natural Earth) + seuil 5 km
    astro.ts                soleil et lune (SunCalc)
    tides.ts                extraction des extrema de marée + interpolation
    activities.ts           catalogue d'activités et règles d'affichage
    sources.ts              registre des sources (licence, nature, fraîcheur)
    costs.ts                estimation des frais
    storage.ts              persistance localStorage
  api/                      accès réseau isolé (fetch, erreurs, caches, repli proxy)
    http.ts                 délais, erreurs typées, bascule /__proxy
    openMeteo.ts            météo + marine
    hydrology.ts            Hub'Eau (stations + observations)
    geocoding.ts            BAN, Nominatim, coordonnées
    routing.ts              OSRM + repli
    mareeApi.ts             api-maree.fr (facultatif, clé utilisateur)
    waterways.ts            cours d'eau OSM autour du spot (calque carte)
    cache.ts                caches mémoire et persistants
  hooks/                    useDashboard (orchestration), useNow, useElementWidth…
  components/
    ui/                     cartes, chips, modales, états, toasts, icônes
    charts/                 graphiques SVG (ligne/aire/barres), lune, course du soleil
    modules/                un composant par module du dashboard
    dashboard/ setup/ spots/ settings/ position/
  styles/                   jetons de design, base, composants, mise en page
  data/coastline.json       référentiel côtier embarqué (chargé à la demande)
```

**Séparation données / présentation.** Les API renvoient des objets typés dans leur unité d'origine ; les
composants ne font que les formater. Chaque module expose un état explicite
(`loading | ok | unavailable | error`) : une source en panne n'empêche jamais l'affichage des autres.

**Performance.** Le référentiel côtier (1,05 Mo, 397 Ko gzip) est chargé dynamiquement, uniquement lorsque la
détection Overpass échoue. Le bundle applicatif principal tient en ~138 Ko gzip.

---

## 9. Qualité

- `npm run typecheck` — TypeScript strict (`strict`, `noUnusedLocals`, `noUnusedParameters`).
- `npm run build` — build de production.
- Test de fumée (hors navigateur, non livré) : rendu de l'application réelle dans jsdom avec des réponses API
  simulées — 31 vérifications passées, 0 erreur d'exécution — couvrant notamment :
  - écran de préparation et absence d'appel réseau avant sélection d'un spot ;
  - affichage des marées/houle en mer, **masquage complet** pour une activité terrestre ;
  - hydrologie en eau douce (stations nommées, hauteurs en mètres) et absence de marées ;
  - unités nautiques (`kn`, `NM`) et double affichage (`km / NM`, `km/h / kn`) ;
  - ouverture des réglages (liste des spots) et bascule de thème ;
  - absence d'erreur d'exécution.
- Responsive vérifié par media queries : 12 colonnes → 6 → 1 ; tableaux transformés en cartes sous 720 px ;
  contrôles compacts sous 560 px ; zones tactiles ≥ 32 px ; focus visible ; `prefers-reduced-motion` respecté.

---

## 10. Attributions

Données météo et marines : **Open-Meteo** (CC BY 4.0). Données de marée optionnelles : **api-maree.fr**,
composantes harmoniques **Ifremer / PREVIMER** (CC BY 4.0). Hydrométrie : **Hub'Eau / OFB**, données du
**Service central Vigicrues (PHyC)** (Licence Ouverte 2.0). Adresses : **BAN / IGN / DINUM** (Licence Ouverte 2.0).
Cartographie : **OpenStreetMap** (ODbL) et **OpenTopoMap** (CC BY-SA). Trait de côte de repli : **Natural Earth**
(domaine public). Calculs astronomiques : **SunCalc** (BSD 2-Clause).

GG Sports-Nature n'est affilié à aucun de ces producteurs. Les marques et noms cités appartiennent à leurs
propriétaires respectifs.
