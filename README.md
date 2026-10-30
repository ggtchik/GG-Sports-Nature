# GG Sports-Nature

Station web responsive de préparation pour les activités de plein air et nautiques. L’interface est en français et privilégie la fiabilité : les données indisponibles sont signalées, les sources sont liées et les unités sont converties uniquement à l’affichage.

## Démarrer

```bash
npm install
npm run dev
```

Construire la version de production :

```bash
npm run build
npm run preview
```

## Fonctions du socle

- Activités : balade, randonnée, jogging, natation, nautisme, pêche et chasse.
- Choix d’un lieu par recherche explicite ou coordonnées GPS ; géolocalisation du départ uniquement après autorisation de l’utilisateur.
- Contexte AUTO / MER / EAU DOUCE, avec forçage manuel prioritaire. AUTO recherche les côtes OSM dans un rayon de 5 km ; si la source est indisponible, le contexte reste à confirmer.
- Spots enregistrables, modifiables et supprimables dans le stockage local du navigateur.
- Tableau de bord météo : conditions, évolution horaire, prévisions jusqu’à 5 jours, lever/coucher du soleil et phase lunaire calculée localement.
- Module marin à la demande (vagues, température de surface, niveau marin et extrêmes estimés lorsque la source les fournit). Aucun coefficient officiel n’est inventé.
- Module pêche en eau douce : stations Hub’Eau à proximité, dernières hauteurs et débits lorsqu’ils sont disponibles.
- Unités globales Standard / Nautique / Double et paramètres personnels de frais de trajet. La distance de trajet affichée est à vol d’oiseau ; il n’y a pas encore de calcul d’itinéraire ou de péages.
- Carte OpenStreetMap avec attribution, spot, départ et stations hydrométriques.
- Pages « Mes spots », « Sources & fiabilité » et « Paramètres ».

## Sources et limites

- **Météo et recherche de lieux :** Open-Meteo, sans clé API, appels navigateur. L’accès gratuit aux API Open-Meteo est réservé à l’usage non commercial ; attribution CC BY 4.0 requise. La fréquence de mise à jour dépend des modèles et les prévisions ne sont pas des mesures de station.
- **Données marines :** Open-Meteo Marine. La précision près des côtes est limitée ; le niveau marin modélisé ne remplace pas les horaires/coefficient officiels ni un annuaire nautique.
- **Hydrométrie :** API publique Hub’Eau, issue de la plateforme PHyC (Vigicrues). La fraîcheur dépend de la station et les mesures proches ne décrivent pas forcément le plan d’eau choisi.
- **Cartographie et littoral :** OpenStreetMap. Les tuiles publiques sont best-effort ; attribution visible et usage interactif normal uniquement.
- **Marées officielles :** lien de vérification vers le SHOM. Aucun coefficient officiel n’est fourni par ce socle.
- Météo-France, Windguru, Windy et Surf-Report ne sont pas interrogés ni scrapés par l’application.

Les spots, unités et paramètres de frais sont conservés localement. Les appels de données partent directement du navigateur vers les API publiques sélectionnées ; aucun secret n’est embarqué dans le client. Une utilisation commerciale ou à grande échelle nécessite de revalider les licences, quotas et conditions des fournisseurs et, si nécessaire, de mettre en place un backend.
