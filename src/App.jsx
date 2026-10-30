import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Activity,
  ArrowDownRight,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Cloud,
  CloudDrizzle,
  Compass,
  Crosshair,
  Droplets,
  ExternalLink,
  Fish,
  Gauge,
  MapPin,
  Menu,
  Moon,
  MoreHorizontal,
  Mountain,
  Navigation,
  Plus,
  RefreshCw,
  Route,
  Search,
  Settings2,
  ShieldCheck,
  Sun,
  Sunrise,
  Sunset,
  TentTree,
  Trash2,
  Waves,
  Wind,
  X,
  Zap,
  Footprints,
  Sailboat,
  PersonStanding,
  Pencil,
  CalendarDays,
  Clock3,
  Thermometer,
  LocateFixed,
  CloudRain,
  Umbrella,
  CircleDot,
  Map,
  BookmarkCheck,
  CircleAlert,
} from 'lucide-react';
import {
  detectCoastContext,
  fetchMarine,
  fetchNearbyHydrology,
  fetchWeather,
  searchPlaces,
} from './lib/api';
import {
  formatDate,
  formatDateTime,
  formatDirection,
  formatDistance,
  formatDuration,
  formatHeight,
  formatNumber,
  formatPercent,
  formatPrecipitation,
  formatPressure,
  formatTemperature,
  formatTime,
  formatWind,
  getMoonInfo,
  haversineKm,
  localDayLabel,
  parseCoordinates,
  weatherDescription,
  weatherSymbol,
} from './lib/format';

const DEMO_SPOT = {
  id: 'demo-lac-bordeaux',
  name: 'Lac de Bordeaux',
  commune: 'Bordeaux',
  latitude: 44.8872,
  longitude: -0.5576,
  contextMode: 'AUTO',
  isExample: true,
};

const ACTIVITIES = [
  { id: 'balade', label: 'Balade', icon: Footprints, group: 'terre' },
  { id: 'randonnee', label: 'Randonnée', icon: Mountain, group: 'terre' },
  { id: 'jogging', label: 'Jogging', icon: Activity, group: 'terre' },
  { id: 'natation', label: 'Natation', icon: Waves, group: 'eau' },
  { id: 'nautisme', label: 'Nautisme', icon: Sailboat, group: 'eau' },
  { id: 'peche', label: 'Pêche', icon: Fish, group: 'eau' },
  { id: 'chasse', label: 'Chasse', icon: TentTree, group: 'terre' },
];

const UNIT_OPTIONS = [
  { id: 'standard', label: 'Standard' },
  { id: 'nautical', label: 'Nautique' },
  { id: 'double', label: 'Double' },
];

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Tableau de bord', icon: Activity },
  { id: 'spots', label: 'Mes spots', icon: Bookmark },
  { id: 'sources', label: 'Sources & fiabilité', icon: ShieldCheck },
  { id: 'settings', label: 'Paramètres', icon: Settings2 },
];

const DEFAULT_COSTS = {
  fuelConsumption: '',
  fuelPrice: '',
  tolls: '',
  lodging: '',
  other: '',
  roundTrip: false,
};

function readStorage(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The app remains usable if browser storage is disabled or full.
  }
}

function validCoordinatePair(latitude, longitude) {
  if (latitude === null || latitude === undefined || latitude === '' || longitude === null || longitude === undefined || longitude === '') return false;
  return Number.isFinite(Number(latitude))
    && Number.isFinite(Number(longitude))
    && Math.abs(Number(latitude)) <= 90
    && Math.abs(Number(longitude)) <= 180;
}

function hasNumericValue(value) {
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
}

function distanceUnitsForContext(units, context) {
  return units === 'nautical' && context !== 'sea' ? 'standard' : units;
}

function windUnitsForContext(units, context) {
  return units === 'nautical' && context !== 'sea' ? 'standard' : units;
}

function formatTemperatureC(value) {
  const formatted = formatTemperature(value);
  return formatted === '—' ? formatted : `${formatted}C`;
}

function getTodayIndex(weather) {
  const dates = weather?.daily?.time || [];
  const currentDate = weather?.current?.time?.slice(0, 10);
  const match = dates.findIndex((date) => date === currentDate);
  return match >= 0 ? match : 0;
}

function getNextHours(weather, count = 8) {
  const hourly = weather?.hourly;
  if (!hourly?.time?.length) return [];
  const currentTime = weather.current?.time;
  let start = currentTime ? hourly.time.findIndex((time) => time >= currentTime) : 0;
  if (start < 0) start = 0;
  return hourly.time.slice(start, start + count).map((time, offset) => ({
    time,
    index: start + offset,
    temperature: hourly.temperature_2m?.[start + offset],
    precipitation: hourly.precipitation_probability?.[start + offset],
    precipitationAmount: hourly.precipitation?.[start + offset],
    wind: hourly.wind_speed_10m?.[start + offset],
    code: hourly.weather_code?.[start + offset],
  }));
}

function get24HourBuckets(weather) {
  const hours = getNextHours(weather, 24);
  const buckets = [];
  for (let index = 0; index < hours.length; index += 4) {
    const period = hours.slice(index, index + 4);
    const temperatures = period.filter((hour) => hasNumericValue(hour.temperature)).map((hour) => Number(hour.temperature));
    const rainChances = period.filter((hour) => hasNumericValue(hour.precipitation)).map((hour) => Number(hour.precipitation));
    buckets.push({
      time: period[0]?.time,
      code: period[0]?.code,
      minTemperature: temperatures.length ? Math.min(...temperatures) : null,
      maxTemperature: temperatures.length ? Math.max(...temperatures) : null,
      maxRainChance: rainChances.length ? Math.max(...rainChances) : null,
    });
  }
  return buckets;
}

function getNextMarineHours(marine, count = 5) {
  const hourly = marine?.hourly;
  if (!hourly?.time?.length) return [];
  const currentTime = marine.current?.time;
  let start = currentTime ? hourly.time.findIndex((time) => time >= currentTime) : 0;
  if (start < 0) start = 0;
  return hourly.time.slice(start, start + count).map((time, offset) => ({
    time,
    index: start + offset,
    wave: hourly.wave_height?.[start + offset],
    period: hourly.wave_period?.[start + offset],
    direction: hourly.wave_direction?.[start + offset],
    swell: hourly.swell_wave_height?.[start + offset],
    swellPeriod: hourly.swell_wave_period?.[start + offset],
    swellDirection: hourly.swell_wave_direction?.[start + offset],
    seaLevel: hourly.sea_level_height_msl?.[start + offset],
  }));
}

function getTideEvents(marine) {
  const hourly = marine?.hourly;
  const levels = hourly?.sea_level_height_msl;
  const times = hourly?.time;
  if (!levels || !times || levels.length < 3) return [];
  const events = [];
  for (let index = 1; index < levels.length - 1; index += 1) {
    if (![levels[index - 1], levels[index], levels[index + 1]].every(hasNumericValue)) continue;
    const before = Number(levels[index - 1]);
    const value = Number(levels[index]);
    const after = Number(levels[index + 1]);
    if (value > before && value > after) events.push({ type: 'Pleine mer estimée', time: times[index], height: value });
    if (value < before && value < after) events.push({ type: 'Basse mer estimée', time: times[index], height: value });
  }
  const now = marine.current?.time;
  return events.filter((event) => !now || event.time >= now).slice(0, 4);
}

function getObservationTrend(series, divisor, unit) {
  const observations = (series || [])
    .filter((item) => hasNumericValue(item?.resultat_obs) && item?.date_obs)
    .slice()
    .sort((first, second) => new Date(first.date_obs) - new Date(second.date_obs));
  if (observations.length < 2) return null;
  const change = (Number(observations.at(-1).resultat_obs) - Number(observations[0].resultat_obs)) / divisor;
  if (Math.abs(change) < 0.0005) return { direction: 'steady', label: `Stable · ${observations.length} mesures` };
  const label = `${change > 0 ? '+' : ''}${formatNumber(change, 3)} ${unit} · ${observations.length} mesures`;
  return { direction: change > 0 ? 'up' : 'down', label };
}

function ObservationTrend({ series, divisor, unit }) {
  const trend = getObservationTrend(series, divisor, unit);
  if (!trend) return <small className="station-trend station-trend-muted">Évolution indisponible</small>;
  const Icon = trend.direction === 'up' ? ArrowUpRight : trend.direction === 'down' ? ArrowDownRight : CircleDot;
  return <small className={`station-trend station-trend-${trend.direction}`}><Icon size={11} />{trend.label}</small>;
}

function LogoMark() {
  return (
    <div className="brand-lockup" aria-label="GG Sports-Nature">
      <div className="brand-mark"><span>gg</span><span className="brand-mark-dot" /></div>
      <div className="brand-type">
        <strong>GG <span>SPORTS-NATURE</span></strong>
        <small>OUTDOOR, EN CONFIANCE</small>
      </div>
    </div>
  );
}

function UnitToggle({ value, onChange, compact = false }) {
  return (
    <div className={`unit-toggle ${compact ? 'unit-toggle-compact' : ''}`} role="group" aria-label="Unités d’affichage">
      {UNIT_OPTIONS.map((option) => (
        <button
          type="button"
          key={option.id}
          className={value === option.id ? 'unit-active' : ''}
          onClick={() => onChange(option.id)}
          aria-pressed={value === option.id}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Sidebar({ activeView, onNavigate, savedCount }) {
  return (
    <>
      <aside className="sidebar">
        <LogoMark />
        <div className="sidebar-section-label">ESPACE PERSONNEL</div>
        <nav className="side-nav" aria-label="Navigation principale">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              type="button"
              key={id}
              className={`side-nav-item ${activeView === id ? 'side-nav-active' : ''}`}
              onClick={() => onNavigate(id)}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
              {id === 'spots' && savedCount > 0 && <span className="nav-count">{savedCount}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <div className="sidebar-note-icon"><Compass size={17} /></div>
            <div>
              <strong>Décider, pas deviner.</strong>
              <span>Les données manquantes restent visibles.</span>
            </div>
          </div>
          <a className="sidebar-help" href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noreferrer">
            <CircleHelp size={15} /> Aide & carte <ExternalLink size={12} />
          </a>
        </div>
      </aside>
      <nav className="mobile-nav" aria-label="Navigation mobile">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button type="button" key={id} onClick={() => onNavigate(id)} className={activeView === id ? 'mobile-nav-active' : ''} aria-label={label}>
            <Icon size={19} />
            <span>{id === 'dashboard' ? 'Accueil' : id === 'settings' ? 'Réglages' : id === 'sources' ? 'Sources' : 'Spots'}</span>
          </button>
        ))}
      </nav>
    </>
  );
}

function Topbar({ units, onUnitsChange, updatedAt, onRefresh, isLoading, onMenuClick }) {
  return (
    <header className="topbar">
      <button className="mobile-menu-button" type="button" onClick={onMenuClick} aria-label="Ouvrir le menu">
        <Menu size={20} />
      </button>
      <div className="topbar-crumb"><span>ESPACE PLEIN AIR</span><ChevronRight size={14} /><strong>Préparer une sortie</strong></div>
      <div className="topbar-tools">
        <span className="topbar-updated"><span className="live-dot" />{updatedAt ? `Météo reçue ${formatTime(updatedAt)}` : 'Données à jour selon la source'}</span>
        <UnitToggle value={units} onChange={onUnitsChange} compact />
        <button className={`icon-button refresh-button ${isLoading ? 'is-spinning' : ''}`} type="button" onClick={onRefresh} disabled={isLoading} title="Actualiser les données" aria-label="Actualiser les données">
          <RefreshCw size={16} />
        </button>
      </div>
    </header>
  );
}

function SectionEyebrow({ children, icon: Icon }) {
  return <div className="section-eyebrow">{Icon && <Icon size={14} strokeWidth={2} />}<span>{children}</span></div>;
}

function SectionTitle({ eyebrow, title, description, right }) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <SectionEyebrow>{eyebrow}</SectionEyebrow>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {right}
    </div>
  );
}

function SearchResults({ results, onSelect, label }) {
  if (!results?.length) return null;
  return (
    <div className="search-results" role="listbox" aria-label={`Résultats de recherche ${label}`}>
      {results.map((place) => (
        <button type="button" role="option" key={place.id} onClick={() => onSelect(place)}>
          <span className="result-pin"><MapPin size={15} /></span>
          <span className="result-copy"><strong>{place.name}</strong><small>{place.city || place.country || 'Lieu géographique'}</small></span>
          <ChevronRight size={16} />
        </button>
      ))}
    </div>
  );
}

function Planner({
  spot,
  departure,
  activity,
  contextMode,
  contextState,
  units,
  savedSpots,
  searchText,
  onSearchTextChange,
  searchResults,
  searchTarget,
  searchLoading,
  onSearch,
  onPlaceSelect,
  departureText,
  onDepartureTextChange,
  departureResults,
  onDepartureSearch,
  onDeparturePlaceSelect,
  onLocate,
  locating,
  onActivityChange,
  onContextChange,
  onSaveSpot,
  onSelectSavedSpot,
  onCreateSpot,
  toast,
}) {
  const distance = departure && spot ? haversineKm(departure, spot) : null;
  const activeActivity = ACTIVITIES.find((item) => item.id === activity);

  return (
    <section className="planner-panel card">
      <div className="planner-topline">
        <div>
          <SectionEyebrow>VOTRE SORTIE</SectionEyebrow>
          <h2>Tout commence par un lieu.</h2>
        </div>
        <button type="button" className="text-button save-current" onClick={onSaveSpot}>
          {spot?.id && !spot?.isExample && savedSpots.some((saved) => saved.id === spot.id)
            ? <BookmarkCheck size={16} />
            : <Bookmark size={16} />}
          <span>{spot?.id && !spot?.isExample && savedSpots.some((saved) => saved.id === spot.id) ? 'Spot enregistré' : 'Enregistrer ce spot'}</span>
        </button>
      </div>

      <div className="planner-location-grid">
        <div className="location-step">
          <div className="step-label"><span>01</span><div><b>POSITION DE DÉPART</b><small>Pour calculer votre distance</small></div></div>
          <div className="input-with-action">
            <MapPin size={16} className="field-icon" />
            <input
              value={departureText}
              onChange={(event) => onDepartureTextChange(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); onDepartureSearch(); } }}
              placeholder={departure?.name || 'Adresse, commune ou GPS'}
              aria-label="Position de départ"
            />
            <button type="button" className="input-icon-action" onClick={onDepartureSearch} disabled={searchLoading === 'departure'} title="Rechercher le départ" aria-label="Rechercher le départ">
              {searchLoading === 'departure' ? <RefreshCw size={16} className="spin" /> : <Search size={16} />}
            </button>
          </div>
          <SearchResults results={searchTarget === 'departure' ? departureResults : []} label="du départ" onSelect={onDeparturePlaceSelect} />
          <div className="field-footer">
            <button type="button" className="subtle-action" onClick={onLocate} disabled={locating}>
              {locating ? <RefreshCw size={14} className="spin" /> : <LocateFixed size={14} />}
              {locating ? 'Localisation…' : 'Utiliser ma position'}
            </button>
            {departure && <span className="field-confirmed"><Check size={12} /> Position définie</span>}
          </div>
        </div>

        <div className="location-step spot-step">
          <div className="step-label"><span>02</span><div><b>SPOT / DESTINATION</b><small>Un nom, une commune ou des coordonnées</small></div></div>
          <form className="input-with-action" onSubmit={(event) => { event.preventDefault(); onSearch(); }}>
            <Search size={16} className="field-icon" />
            <input
              value={searchText}
              onChange={(event) => onSearchTextChange(event.target.value)}
              placeholder={spot?.name || 'Ex. lac, plage, commune…'}
              aria-label="Rechercher un spot"
            />
            <button type="submit" className="search-submit" disabled={searchLoading === 'spot'}>
              {searchLoading === 'spot' ? <RefreshCw size={15} className="spin" /> : 'Chercher'}
            </button>
          </form>
          <SearchResults results={searchTarget === 'spot' ? searchResults : []} label="du spot" onSelect={onPlaceSelect} />
          <div className="field-footer spot-footer">
            <label className="saved-select-wrap">
              <Bookmark size={13} />
              <select value="" onChange={(event) => { if (event.target.value) onSelectSavedSpot(event.target.value); }} aria-label="Choisir un spot enregistré">
                <option value="">Spots enregistrés{savedSpots.length ? ` · ${savedSpots.length}` : ''}</option>
                {savedSpots.map((saved) => <option key={saved.id} value={saved.id}>{saved.name} · {saved.commune || 'Lieu enregistré'}</option>)}
              </select>
              <ChevronDown size={12} />
            </label>
            {spot?.isExample && <span className="example-tag">EXEMPLE</span>}
            <button type="button" className="tiny-add-button" onClick={onCreateSpot}><Plus size={14} /> Nouveau</button>
          </div>
        </div>
      </div>

      <div className="planner-divider" />
      <div className="planner-controls">
        <div className="activity-control">
          <div className="step-label compact-step"><span>03</span><div><b>ACTIVITÉ</b><small>Choisissez votre pratique</small></div></div>
          <div className="activity-picker" role="group" aria-label="Sélection de l’activité">
            {ACTIVITIES.map(({ id, label, icon: Icon }) => (
              <button type="button" key={id} onClick={() => onActivityChange(id)} className={`activity-option ${activity === id ? 'activity-option-active' : ''}`} aria-pressed={activity === id}>
                <Icon size={16} strokeWidth={1.9} /><span>{label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="context-control">
          <div className="step-label compact-step"><span>04</span><div><b>MILIEU</b><small>Auto ou votre choix</small></div></div>
          <div className="context-switch" role="group" aria-label="Milieu géographique">
            {['AUTO', 'MER', 'EAU DOUCE'].map((option) => (
              <button type="button" key={option} onClick={() => onContextChange(option)} className={contextMode === option ? 'context-active' : ''} aria-pressed={contextMode === option}>{option}</button>
            ))}
          </div>
          <div className={`context-status ${contextState.status === 'error' ? 'context-warning' : ''}`}>
            <span className={contextState.status === 'ok' ? 'context-status-dot' : 'context-status-dot muted'} />
            {contextMode === 'AUTO'
              ? contextState.status === 'loading' ? 'Analyse du littoral…'
                : contextState.status === 'error' ? 'Auto indisponible · à confirmer'
                  : contextState.status === 'ok' ? `${contextState.context === 'sea' ? 'Potentiellement maritime' : 'Continental / eau douce'}${contextState.distanceKm !== null ? ` · côte à ${formatDistance(contextState.distanceKm, units)}` : ''}`
                    : 'Contexte à confirmer'
              : `${contextMode === 'MER' ? 'Forçage manuel · mer' : 'Forçage manuel · eau douce'}`}
          </div>
        </div>
      </div>
      {activeActivity && <div className="planner-footnote"><ShieldCheck size={14} /> Les modules affichés s’adaptent à <strong>{activeActivity.label.toLowerCase()}</strong>, au milieu sélectionné et aux données réellement disponibles.</div>}
      {toast && <div className="inline-toast"><Check size={14} />{toast}</div>}
    </section>
  );
}

function MapPanel({ spot, departure, stations }) {
  const mapElement = useRef(null);
  const mapInstance = useRef(null);
  const markerLayer = useRef(null);

  useEffect(() => {
    if (!mapElement.current || mapInstance.current) return undefined;
    const map = L.map(mapElement.current, {
      zoomControl: false,
      scrollWheelZoom: false,
      attributionControl: true,
      preferCanvas: true,
    }).setView([spot?.latitude ?? 46.6, spot?.longitude ?? 2.4], spot ? 11 : 6);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    markerLayer.current = L.layerGroup().addTo(map);
    mapInstance.current = map;
    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    const layer = markerLayer.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const points = [];
    if (spot && validCoordinatePair(spot.latitude, spot.longitude)) {
      const spotIcon = L.divIcon({
        className: 'leaflet-gg-marker-wrap',
        html: '<span class="leaflet-gg-marker spot-map-marker"><span></span></span>',
        iconSize: [32, 40],
        iconAnchor: [16, 38],
      });
      L.marker([spot.latitude, spot.longitude], { icon: spotIcon, title: spot.name }).addTo(layer).bindPopup(`<strong>${escapeHtml(spot.name)}</strong><br>${escapeHtml(spot.commune || 'Spot sélectionné')}`);
      points.push([spot.latitude, spot.longitude]);
    }
    if (departure && validCoordinatePair(departure.latitude, departure.longitude)) {
      const startIcon = L.divIcon({
        className: 'leaflet-gg-marker-wrap',
        html: '<span class="leaflet-gg-marker start-map-marker"><span></span></span>',
        iconSize: [26, 34],
        iconAnchor: [13, 32],
      });
      L.marker([departure.latitude, departure.longitude], { icon: startIcon, title: departure.name || 'Départ' }).addTo(layer).bindPopup(`<strong>${escapeHtml(departure.name || 'Départ')}</strong>`);
      points.push([departure.latitude, departure.longitude]);
    }
    (stations || []).forEach((station) => {
      if (!validCoordinatePair(station.coordinates?.latitude, station.coordinates?.longitude)) return;
      const stationIcon = L.divIcon({
        className: 'leaflet-gg-marker-wrap',
        html: '<span class="leaflet-gg-marker station-map-marker"><span></span></span>',
        iconSize: [20, 28],
        iconAnchor: [10, 26],
      });
      L.marker([station.coordinates.latitude, station.coordinates.longitude], { icon: stationIcon, title: station.name }).addTo(layer).bindPopup(`<strong>${escapeHtml(station.name)}</strong><br>Station hydrométrique`);
    });
    if (points.length > 1) map.fitBounds(points, { padding: [35, 35], maxZoom: 13 });
    else if (points.length === 1) map.setView(points[0], 12);
    else map.setView([46.6, 2.4], 6);
    window.setTimeout(() => map.invalidateSize(), 120);
  }, [spot, departure, stations]);

  return <div ref={mapElement} className="map-canvas" aria-label="Carte du spot et du départ" />;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[character]));
}

function MapCard({ spot, departure, stations, distance, units, contextMode, effectiveContext }) {
  const contextLabel = contextMode === 'AUTO'
    ? effectiveContext === 'sea' ? 'Maritime · auto' : effectiveContext === 'freshwater' ? 'Continental · auto' : 'Milieu à confirmer'
    : contextMode === 'MER' ? 'Mer · manuel' : 'Eau douce · manuel';
  return (
    <section className="map-card card">
      <div className="map-card-heading">
        <div>
          <SectionEyebrow icon={MapPin}>SPOT & DISTANCE</SectionEyebrow>
          <h2>{spot?.name || 'Choisissez un spot'}</h2>
          <p>{spot?.commune || 'La localisation apparaîtra ici'}{spot?.isExample && <span className="map-example-label"> · aperçu</span>}</p>
        </div>
        <button className="map-expand-button" type="button" title="Carte OpenStreetMap" aria-label="Carte OpenStreetMap"><MoreHorizontal size={18} /></button>
      </div>
      <div className="map-wrap"><MapPanel spot={spot} departure={departure} stations={stations} /><div className="map-compass"><Navigation size={15} /></div></div>
      <div className="map-meta-row">
        <div className="map-distance-icon"><Route size={16} /></div>
        <div className="map-distance-copy"><strong>{distance === null ? 'Départ à définir' : formatDistance(distance, units)}</strong><span>{departure ? `Depuis ${departure.name || 'votre position'}` : 'Ajoutez un point de départ pour calculer la distance'}</span></div>
        <div className="map-context-tag"><span className="context-status-dot" />{contextLabel}</div>
      </div>
      <div className="map-footer"><span><i className="legend-dot spot-legend" />Spot</span>{departure && <span><i className="legend-dot start-legend" />Départ</span>}{stations?.length > 0 && <span><i className="legend-dot station-legend" />Stations</span>}<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a></div>
    </section>
  );
}

function WeatherHero({ weatherState, units, spot }) {
  if (weatherState.status === 'loading' || weatherState.status === 'idle') {
    return <div className="weather-hero weather-hero-loading"><div className="weather-loader"><span className="loader-orbit" /><span className="loader-center"><Sun size={22} /></span></div><div><span className="weather-kicker">CONDITIONS ACTUELLES</span><h3>Lecture du ciel en cours…</h3><p>Récupération des prévisions pour {spot?.name || 'votre spot'}.</p></div></div>;
  }
  if (weatherState.status === 'error' || !weatherState.data?.current) {
    return <div className="weather-hero weather-hero-error"><div className="weather-error-icon"><Cloud size={26} /></div><div><span className="weather-kicker">CONDITIONS ACTUELLES</span><h3>Données météo indisponibles</h3><p>{weatherState.error || 'La source n’a pas fourni de données pour ce point. Réessayez ou consultez directement la source.'}</p></div></div>;
  }
  const current = weatherState.data.current;
  const isDay = Boolean(Number(current.is_day));
  return (
    <div className="weather-hero">
      <div className="weather-hero-top"><span className="weather-kicker">CONDITIONS ACTUELLES</span><span className="current-badge"><span />Modèle · {formatTime(current.time)}</span></div>
      <div className="weather-current-main">
        <div className="weather-icon-large" aria-hidden="true">{weatherSymbol(current.weather_code, isDay)}</div>
        <div className="weather-temp-wrap"><div className="weather-temperature">{formatTemperature(current.temperature_2m)}{hasNumericValue(current.temperature_2m) && <span>C</span>}</div><div className="weather-condition-label">{weatherDescription(current.weather_code)}</div></div>
      </div>
      <div className="weather-hero-bottom"><span>Ressenti <b>{formatTemperatureC(current.apparent_temperature)}</b></span><span className="hero-separator" /><span>Humidité <b>{formatPercent(current.relative_humidity_2m)}</b></span><span className="weather-source-label">Open-Meteo</span></div>
    </div>
  );
}

function MetricTile({ icon: Icon, label, value, detail, accent = false }) {
  return (
    <div className={`metric-tile ${accent ? 'metric-tile-accent' : ''}`}>
      <span className="metric-icon"><Icon size={17} strokeWidth={1.8} /></span>
      <div className="metric-text"><small>{label}</small><strong>{value}</strong>{detail && <span>{detail}</span>}</div>
    </div>
  );
}

function ConditionsSection({ weatherState, units, spot, updatedAt, onRefresh, isLoading }) {
  const current = weatherState.data?.current;
  return (
    <section className="conditions-section">
      <SectionTitle eyebrow="LE CIEL, SANS SURPRISE" title="Conditions actuelles" description={spot ? `Les dernières conditions disponibles à ${spot.name}.` : 'Choisissez un lieu pour lire les conditions.'} right={<button type="button" className="section-refresh" onClick={onRefresh} disabled={isLoading}><RefreshCw size={14} className={isLoading ? 'spin' : ''} />Actualiser</button>} />
      <div className="conditions-grid">
        <WeatherHero weatherState={weatherState} units={units} spot={spot} />
        <div className="metrics-grid">
          <MetricTile icon={Wind} label="VENT MOYEN" value={formatWind(current?.wind_speed_10m, units)} detail={formatDirection(current?.wind_direction_10m)} />
          <MetricTile icon={Zap} label="RAFALES" value={formatWind(current?.wind_gusts_10m, units)} detail="Vent maximal instantané" />
          <MetricTile icon={CloudRain} label="PLUIE · POINT COURANT" value={formatPrecipitation(current?.precipitation)} detail="Quantité actuelle modélisée" />
          <MetricTile icon={Cloud} label="COUVERTURE NUAGEUSE" value={formatPercent(current?.cloud_cover)} detail="Nébulosité totale" />
          <MetricTile icon={Umbrella} label="PRESSION" value={formatPressure(current?.pressure_msl)} detail="Au niveau de la mer" />
          <MetricTile icon={Sun} label="INDICE UV · MAX. JOUR" value={hasNumericValue(getTodayUv(weatherState.data)) ? formatNumber(getTodayUv(weatherState.data), 1) : '—'} detail="Indice UV prévu" accent />
        </div>
      </div>
      <div className="data-footnote"><span className="live-dot" />{updatedAt ? `Reçu le ${formatDateTime(updatedAt)} ·` : ''} Prévision de modèle, pas une mesure de station. <a href="https://open-meteo.com/en/docs" target="_blank" rel="noreferrer">Source Open-Meteo <ExternalLink size={12} /></a></div>
    </section>
  );
}

function getTodayUv(weather) {
  const index = getTodayIndex(weather);
  return weather?.daily?.uv_index_max?.[index] ?? null;
}

function TemperatureChart({ hours }) {
  const chartHours = hours.filter((hour) => hasNumericValue(hour.temperature));
  const values = chartHours.map((hour) => Number(hour.temperature));
  if (!chartHours.length || !values.length) {
    return <div className="chart-empty">Les valeurs horaires ne sont pas disponibles pour ce spot.</div>;
  }
  const min = Math.min(...values) - 2;
  const max = Math.max(...values) + 2;
  const range = Math.max(max - min, 1);
  const width = 660;
  const height = 130;
  const points = chartHours.map((hour, index) => {
    const x = hours.length === 1 ? width / 2 : 18 + (index / (hours.length - 1)) * (width - 36);
    const value = Number(hour.temperature);
    const y = height - 24 - ((value - min) / range) * (height - 48);
    return { x, y, hour };
  });
  const line = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
  const area = `${line} L ${points.at(-1).x} ${height - 16} L ${points[0].x} ${height - 16} Z`;
  return (
    <div className="temperature-chart">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="Évolution horaire de la température et de la probabilité de pluie">
        <defs><linearGradient id="temperature-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#88a97a" stopOpacity=".24" /><stop offset="100%" stopColor="#88a97a" stopOpacity=".015" /></linearGradient></defs>
        {[0, 1, 2].map((lineIndex) => <line key={lineIndex} x1="0" x2={width} y1={30 + lineIndex * 33} y2={30 + lineIndex * 33} stroke="#edf0e9" strokeDasharray="3 5" />)}
        {chartHours.map((hour, index) => {
          if (!hasNumericValue(hour.precipitation)) return null;
          const slot = points[index];
          const rain = Math.max(0, Math.min(100, Number(hour.precipitation)));
          const barHeight = rain * 0.29;
          return <rect key={`${hour.time}-rain`} x={slot.x - 7} y={height - 17 - barHeight} width="14" height={barHeight} rx="5" fill="#bed4d7" opacity=".75" />;
        })}
        <path d={area} fill="url(#temperature-area)" />
        <path d={line} fill="none" stroke="#496f50" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point) => <circle key={`${point.hour.time}-point`} cx={point.x} cy={point.y} r="4" fill="#fffdf8" stroke="#496f50" strokeWidth="2.5" />)}
      </svg>
      <div className="chart-labels">{points.map((point) => <div key={point.hour.time}><span>{formatTime(point.hour.time)}</span><b>{formatTemperatureC(point.hour.temperature)}</b></div>)}</div>
    </div>
  );
}

function TodaySection({ weatherState, units }) {
  const weather = weatherState.data;
  const hours = getNextHours(weather, 8);
  const next24Buckets = get24HourBuckets(weather);
  const todayIndex = getTodayIndex(weather);
  const probability = weather?.daily?.precipitation_probability_max?.[todayIndex];
  return (
    <section className="today-section card">
      <div className="today-head">
        <div><SectionEyebrow icon={CalendarDays}>AUJOURD’HUI</SectionEyebrow><h2>La journée, heure par heure.</h2><p>Une lecture simple des prochaines heures.</p></div>
        <div className="today-summary"><span className="today-summary-icon"><CloudRain size={16} /></span><span>Risque de pluie max.<b>{formatPercent(probability)}</b></span></div>
      </div>
      {weatherState.status === 'loading' || weatherState.status === 'idle'
        ? <div className="skeleton-chart"><span /><span /><span /></div>
        : weatherState.status === 'error'
          ? <div className="chart-empty">Évolution indisponible pour le moment.</div>
          : <TemperatureChart hours={hours} />}
      <div className="hourly-details">
        {hours.slice(0, 6).map((hour) => (
          <div className="hour-chip" key={hour.time}>
            <span>{formatTime(hour.time)}</span>
            <i aria-hidden="true">{weatherSymbol(hour.code, true)}</i>
            <strong>{formatTemperatureC(hour.temperature)}</strong>
            <small><Droplets size={11} />{formatPercent(hour.precipitation)}</small>
          </div>
        ))}
        {hours.length === 0 && <span className="muted-inline">Aucune donnée horaire disponible.</span>}
      </div>
      <div className="next24-section"><div className="next24-heading"><strong>24 PROCHAINES HEURES</strong><span>Synthèse par tranches de 4 h</span></div><div className="next24-grid">{next24Buckets.map((bucket) => <div className="next24-item" key={bucket.time}><span>{formatTime(bucket.time)}</span><i aria-hidden="true">{weatherSymbol(bucket.code, true)}</i><b>{bucket.minTemperature === null ? '—' : `${formatTemperatureC(bucket.minTemperature)}–${formatTemperatureC(bucket.maxTemperature)}`}</b><small><Droplets size={10} />max. {formatPercent(bucket.maxRainChance)}</small></div>)}{next24Buckets.length === 0 && <span className="next24-empty">Prévision sur 24 h indisponible pour le moment.</span>}</div></div>
      <div className="chart-legend"><span><i className="legend-line" />Température</span><span><i className="legend-rain" />Probabilité de pluie</span><span className="wind-legend"><Wind size={13} /> Vitesse du vent : {formatWind(hours[0]?.wind, units)}</span></div>
    </section>
  );
}

function AstronomyCard({ weatherState }) {
  const weather = weatherState.data;
  const todayIndex = getTodayIndex(weather);
  const sunrise = weather?.daily?.sunrise?.[todayIndex];
  const sunset = weather?.daily?.sunset?.[todayIndex];
  const duration = sunrise && sunset ? formatDuration(sunrise, sunset) : '—';
  const moon = useMemo(() => getMoonInfo(new Date()), []);
  return (
    <section className="astronomy-card card">
      <SectionEyebrow icon={Sun}>ASTRONOMIE</SectionEyebrow>
      <div className="astronomy-title-row"><h2>Le rythme du jour.</h2><span className="astro-badge">Calcul local</span></div>
      <div className="sun-track">
        <div className="sun-track-times"><div><span className="astro-icon sunrise"><Sunrise size={18} /></span><small>LEVER DU SOLEIL</small><strong>{formatTime(sunrise)}</strong></div><div className="daylight-duration"><span>{duration}</span><small>DE LUMIÈRE</small></div><div><span className="astro-icon sunset"><Sunset size={18} /></span><small>COUCHER DU SOLEIL</small><strong>{formatTime(sunset)}</strong></div></div>
        <div className="sun-arc"><span className="sun-arc-dot" /><span className="sun-horizon" /></div>
      </div>
      <div className="moon-panel"><div className="moon-art"><span>{moon.emoji}</span></div><div className="moon-copy"><small>PHASE DE LA LUNE</small><strong>{moon.phase}</strong><span>Éclairement estimé</span></div><div className="moon-percent"><b>{moon.illumination}%</b><span>illuminée</span></div></div>
      <div className="astro-source-note"><CircleDot size={12} /> Soleil : prévision Open-Meteo · Lune : calcul astronomique local approximatif.</div>
    </section>
  );
}

function ForecastCard({ weatherState, units }) {
  const daily = weatherState.data?.daily;
  if (weatherState.status === 'error') {
    return <section className="forecast-card card"><SectionEyebrow icon={CalendarDays}>TENDANCE 5 JOURS</SectionEyebrow><h2>Les prochains jours.</h2><div className="forecast-empty">Les prévisions ne sont pas disponibles. Aucune valeur n’est estimée.</div></section>;
  }
  return (
    <section className="forecast-card card">
      <div className="forecast-header"><div><SectionEyebrow icon={CalendarDays}>TENDANCE 5 JOURS</SectionEyebrow><h2>Les prochains jours.</h2></div><span className="forecast-window">Jusqu’à 5 jours</span></div>
      <div className="forecast-list">
        {(daily?.time || []).map((day, index) => (
          <div className="forecast-row" key={day}>
            <div className="forecast-day"><b>{index === 0 ? 'Aujourd’hui' : localDayLabel(day)}</b><span>{formatDate(`${day}T12:00:00`)}</span></div>
            <span className="forecast-symbol" aria-hidden="true">{weatherSymbol(daily.weather_code?.[index], true)}</span>
            <div className="forecast-rain"><Droplets size={13} /><span><b>{formatPercent(daily.precipitation_probability_max?.[index])}</b><small>{formatPrecipitation(daily.precipitation_sum?.[index])}</small></span></div>
            <div className="forecast-temperatures"><strong>{formatTemperatureC(daily.temperature_2m_max?.[index])}</strong><span>{formatTemperatureC(daily.temperature_2m_min?.[index])}</span></div>
            <div className="forecast-wind"><Wind size={13} /><span>{formatWind(daily.wind_speed_10m_max?.[index], units)}</span></div>
          </div>
        ))}
        {!daily?.time?.length && <div className="forecast-empty">Prévisions en chargement ou indisponibles.</div>}
      </div>
      <div className="forecast-attribution">Prévisions issues de modèles météo · <a href="https://open-meteo.com/en/docs" target="_blank" rel="noreferrer">détails de la source <ExternalLink size={11} /></a></div>
    </section>
  );
}

function MarineSection({ marineState, units, activity }) {
  const marine = marineState.data;
  const current = marine?.current;
  const hourly = getNextMarineHours(marine, 5);
  const tides = getTideEvents(marine);
  const daily = marine?.daily;
  const hasCurrentWave = hasNumericValue(current?.wave_height);
  const hasCurrentWaveDirection = hasNumericValue(current?.wave_direction);
  const hasCurrentSwell = hasNumericValue(current?.swell_wave_height);
  const hasCurrentSwellPeriod = hasNumericValue(current?.swell_wave_period);
  const hasCurrentSwellDirection = hasNumericValue(current?.swell_wave_direction);
  const hasCurrentWaterTemperature = hasNumericValue(current?.sea_surface_temperature);
  const hasCurrentSeaLevel = hasNumericValue(current?.sea_level_height_msl);
  const dataError = marineState.status === 'error';
  return (
    <section className="marine-section card">
      <div className="marine-heading">
        <div><SectionEyebrow icon={Waves}>MODULE MER · {activity === 'nautisme' ? 'NAUTISME' : activity === 'peche' ? 'PÊCHE EN MER' : 'NATATION'}</SectionEyebrow><h2>La mer, avec mesure.</h2><p>État marin et prévisions modélisées pour ce point.</p></div>
        <div className="marine-source-badge"><span />{marineState.receivedAt ? `Reçu ${formatTime(marineState.receivedAt)}` : 'Modèle marin'}</div>
      </div>
      {marineState.status === 'loading'
        ? <div className="marine-loading"><span className="loader-orbit" /><span>Chargement des conditions marines…</span></div>
        : dataError
          ? <div className="data-unavailable"><CircleAlert size={18} /><div><strong>Données marines indisponibles pour ce point.</strong><span>{marineState.error || 'La source ne renvoie pas de prévision exploitable ici. Aucun chiffre n’est extrapolé.'}</span></div></div>
          : <>
            <div className="marine-metrics">
              <MetricTile icon={Waves} label="VAGUES · HAUTEUR" value={hasCurrentWave ? formatHeight(current.wave_height) : '—'} detail="Hauteur significative" accent />
              <MetricTile icon={Compass} label="VAGUES · DIRECTION" value={hasCurrentWaveDirection ? formatDirection(current.wave_direction) : '—'} detail="Direction dominante" />
              <MetricTile icon={Waves} label="HOULE · HAUTEUR" value={hasCurrentSwell ? formatHeight(current.swell_wave_height) : '—'} detail="Composante de houle" />
              <MetricTile icon={Activity} label="HOULE · PÉRIODE" value={hasCurrentSwellPeriod ? `${formatNumber(current.swell_wave_period, 1)} s` : '—'} detail="Période modélisée" />
              <MetricTile icon={Compass} label="HOULE · DIRECTION" value={hasCurrentSwellDirection ? formatDirection(current.swell_wave_direction) : '—'} detail="Direction de la houle" />
              <MetricTile icon={Thermometer} label="TEMPÉRATURE DE L’EAU" value={hasCurrentWaterTemperature ? formatTemperatureC(current.sea_surface_temperature) : '—'} detail="Surface · modèle marin" />
            </div>
            <div className="marine-lower-grid">
              <div className="tide-panel">
                <div className="tide-panel-heading"><div><span className="mini-round-icon"><Waves size={15} /></span><div><strong>Marée modélisée</strong><small>Niveau marin incluant les marées</small></div></div><span className="model-tag">ESTIMATION</span></div>
                {hasCurrentSeaLevel && <div className="sea-level-now"><span>Niveau maintenant</span><b>{formatHeight(current.sea_level_height_msl)} <small>au-dessus du niveau moyen</small></b></div>}
                {tides.length > 0 ? <div className="tide-events">{tides.slice(0, 3).map((event) => <div key={`${event.time}-${event.type}`}><span className={event.type.startsWith('Pleine') ? 'tide-high-icon' : 'tide-low-icon'}>{event.type.startsWith('Pleine') ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}</span><span><b>{event.type}</b><small>{formatDate(event.time)} · {formatTime(event.time)}</small></span><strong>{formatHeight(event.height)}</strong></div>)}</div> : <div className="tide-unavailable">{hasCurrentSeaLevel ? 'Aucun horaire de pleine/basse mer déduit des pas horaires disponibles.' : 'Niveau marin non fourni par le modèle à ce point.'}</div>}
                <div className="coefficient-note"><span>Coefficient officiel</span><b>Non fourni</b><a href="https://maree.shom.fr/" target="_blank" rel="noreferrer">Vérifier au SHOM <ExternalLink size={11} /></a></div>
              </div>
              <div className="marine-forecast-panel"><div className="marine-forecast-title"><strong>Prochaines heures</strong><span>Prévisions · modèle</span></div><div className="marine-hour-head"><span>HEURE</span><span>VAGUE</span><span>HOULE</span><span>PÉRIODE</span><span>DIR.</span></div>{hourly.map((hour) => <div className="marine-hour-row" key={hour.time}><span>{formatTime(hour.time)}</span><span>{hasNumericValue(hour.wave) ? formatHeight(hour.wave) : '—'}</span><span>{hasNumericValue(hour.swell) ? formatHeight(hour.swell) : '—'}</span><span>{hasNumericValue(hour.swellPeriod) ? `${formatNumber(hour.swellPeriod, 1)} s` : '—'}</span><span>{hasNumericValue(hour.swellDirection) ? formatDirection(hour.swellDirection).split(' · ')[0] : '—'}</span></div>)}{!hourly.length && <div className="tide-unavailable">Prévisions horaires non disponibles.</div>}</div>
            </div>
            <div className="marine-caution"><ShieldCheck size={14} /><span>Prévision indicative (résolution côtière limitée). Ne remplace pas un annuaire de marées ni les consignes de sécurité/navigation.{marineState.receivedAt && ` Données reçues ${formatDateTime(marineState.receivedAt)}.`}</span><a href="https://open-meteo.com/en/docs/marine-weather-api" target="_blank" rel="noreferrer">Source Open-Meteo Marine <ExternalLink size={11} /></a></div>
            {daily?.time?.length > 0 && <div className="marine-daily-strip">{daily.time.slice(0, 5).map((date, index) => <div key={date}><span>{index === 0 ? 'Aujourd’hui' : localDayLabel(date)}</span><div className="marine-daily-values"><b>{hasNumericValue(daily.wave_height_max?.[index]) ? formatHeight(daily.wave_height_max[index]) : '—'}</b><b>{hasNumericValue(daily.swell_wave_height_max?.[index]) ? formatHeight(daily.swell_wave_height_max[index]) : '—'}</b></div><small>vague · houle max.</small></div>)}</div>}
          </>}
    </section>
  );
}

function HydroSection({ hydroState, units }) {
  const stations = hydroState.data || [];
  return (
    <section className="hydro-section card">
      <div className="hydro-heading"><div><SectionEyebrow icon={Droplets}>MODULE EAU DOUCE · PÊCHE</SectionEyebrow><h2>Les rivières à proximité.</h2><p>Stations hydrométriques les plus proches du spot, dans un rayon de 20 km.</p></div><a className="outline-source-link" href="https://hubeau.eaufrance.fr/page/api-hydrometrie" target="_blank" rel="noreferrer">Hub’Eau <ExternalLink size={13} /></a></div>
      <div className="hydro-notice"><CircleHelp size={15} /><span>Une station proche n’est pas nécessairement représentative d’un lac ou du cours d’eau visé. Vérifiez le nom et la localisation avant toute décision.</span></div>
      {hydroState.status === 'loading'
        ? <div className="hydro-loading"><span className="loader-orbit" /><span>Recherche des stations publiques…</span></div>
        : hydroState.status === 'error'
          ? <div className="data-unavailable hydro-error"><CircleAlert size={18} /><div><strong>Hydrométrie indisponible.</strong><span>{hydroState.error || 'La source Hub’Eau n’a pas répondu. Réessayez plus tard.'}</span></div></div>
          : stations.length === 0
            ? <div className="hydro-empty"><Droplets size={20} /><strong>Aucune station dans le rayon de 20 km.</strong><span>Pas de donnée hydrométrique disponible à proximité de ce spot.</span></div>
            : <div className="station-list">
              <div className="station-table-head"><span>STATION / COURS D’EAU</span><span>DISTANCE</span><span>HAUTEUR</span><span>DÉBIT</span><span>DERNIER RELEVÉ</span></div>
              {stations.map((station) => {
                const height = station.rawHeight?.resultat_obs;
                const flow = station.rawFlow?.resultat_obs;
                const heightValue = hasNumericValue(height) ? `${formatNumber(Number(height) / 1000, 3)} m` : '—';
                const flowValue = hasNumericValue(flow) ? `${formatNumber(Number(flow) / 1000, 3)} m³/s` : '—';
                const date = station.rawHeight?.date_obs || station.rawFlow?.date_obs;
                return <div className="station-row" key={station.code}><div className="station-name"><span className="station-number">{station.code.slice(-2)}</span><div><strong>{station.name}</strong><small>{station.watercourse || 'Cours d’eau non renseigné'}</small></div></div><span className="station-distance">{formatDistance(station.distanceKm, distanceUnitsForContext(units, 'freshwater'))}</span><div className="station-measure"><strong className="station-data-value">{heightValue}</strong><ObservationTrend series={station.rawHeightSeries} divisor={1000} unit="m" /></div><div className="station-measure"><strong className="station-data-value">{flowValue}</strong><ObservationTrend series={station.rawFlowSeries} divisor={1000} unit="m³/s" /></div><span className="station-update">{formatDateTime(date)}</span></div>;
              })}
              <div className="hydro-unit-note">Hauteur convertie depuis les mm source en m · débit converti depuis les l/s source en m³/s. Les valeurs originales ne sont pas modifiées.</div>
            </div>}
      <div className="hydro-attribution"><span className="live-dot" />Mesures publiées via Hub’Eau / plateforme PHyC · fréquence dépendante de la station (5 à 60 min). <a href="https://hubeau.eaufrance.fr/page/api-hydrometrie" target="_blank" rel="noreferrer">Documentation <ExternalLink size={11} /></a></div>
    </section>
  );
}

function FreshwaterSwimCard() {
  return (
    <section className="water-temp-card card">
      <div className="water-temp-symbol"><Waves size={22} /></div><div><SectionEyebrow>TEMPÉRATURE DE L’EAU · EAU DOUCE</SectionEyebrow><h3>Mesure non disponible</h3><p>Aucune température d’eau vérifiée n’est fournie par les sources actuellement connectées pour ce point. Vérifiez localement les conditions de baignade.</p></div><a href="https://baignades.sante.gouv.fr/baignades/homeMap.do" target="_blank" rel="noreferrer">Qualité des eaux de baignade <ExternalLink size={12} /></a>
    </section>
  );
}

function CostsCard({ distanceKm, units, costs, onOpenSettings }) {
  const tripMultiplier = costs.roundTrip ? 2 : 1;
  const consumption = Number(costs.fuelConsumption);
  const fuelPrice = Number(costs.fuelPrice);
  const fuelLiters = distanceKm !== null && Number.isFinite(consumption) && consumption > 0 ? distanceKm * tripMultiplier * consumption / 100 : null;
  const fuelCost = fuelLiters !== null && Number.isFinite(fuelPrice) && fuelPrice > 0 ? fuelLiters * fuelPrice : null;
  const expenses = ['tolls', 'lodging', 'other'].map((key) => Number(costs[key])).filter(Number.isFinite);
  const isComplete = fuelCost !== null && ['tolls', 'lodging', 'other'].every((key) => costs[key] !== '');
  const total = isComplete ? fuelCost + expenses.reduce((sum, value) => sum + value, 0) : null;
  return (
    <section className="costs-card card">
      <div className="costs-heading"><div><SectionEyebrow icon={Route}>TRAJET & BUDGET</SectionEyebrow><h2>Le trajet, en clair.</h2></div><button type="button" className="small-settings-button" onClick={onOpenSettings}><Settings2 size={14} /> Modifier</button></div>
      <div className="cost-distance-row"><div className="cost-distance-icon"><ArrowLeftRight size={17} /></div><div><span>Distance totale {costs.roundTrip ? '· aller-retour' : '· aller simple'}</span><strong>{formatDistance(distanceKm === null ? null : distanceKm * tripMultiplier, units)}</strong></div><small>À vol d’oiseau</small></div>
      <div className="cost-lines">
        <div><span>Carburant</span><strong>{fuelCost === null ? 'À renseigner' : `${formatNumber(fuelCost, 2)} €`}</strong></div>
        <div><span>Péages</span><strong>{costs.tolls === '' ? 'À renseigner' : `${formatNumber(costs.tolls, 2)} €`}</strong></div>
        <div><span>Hébergement</span><strong>{costs.lodging === '' ? 'À renseigner' : `${formatNumber(costs.lodging, 2)} €`}</strong></div>
        <div><span>Autres frais</span><strong>{costs.other === '' ? 'À renseigner' : `${formatNumber(costs.other, 2)} €`}</strong></div>
      </div>
      <div className="cost-total"><span>Total estimé</span><strong>{total === null ? '—' : `${formatNumber(total, 2)} €`}</strong></div>
      <div className="cost-disclaimer">Estimation calculée à partir de vos propres paramètres. Aucun itinéraire routier ni péage n’est calculé automatiquement.</div>
    </section>
  );
}

function SourceStrip({ onOpenSources, updatedAt }) {
  return (
    <section className="source-strip card">
      <div className="source-strip-icon"><ShieldCheck size={19} /></div><div className="source-strip-copy"><strong>La donnée, avec sa provenance.</strong><span>{updatedAt ? `Dernier appel réussi : ${formatDateTime(updatedAt)}.` : 'Chaque information reste reliée à sa source et à son niveau de fraîcheur.'} Pas de valeur reconstituée lorsqu’elle manque.</span></div><button type="button" onClick={onOpenSources}>Voir les sources <ArrowRight size={15} /></button>
    </section>
  );
}

function Dashboard({
  spot, departure, activity, contextMode, effectiveContext, contextState, units,
  weatherState, marineState, hydroState, updatedAt, onRefresh, isLoading, stations,
  distance, costs, onOpenSettings, onOpenSources, planner,
}) {
  const currentActivity = ACTIVITIES.find((item) => item.id === activity);
  const isMarineActivity = ['natation', 'nautisme', 'peche'].includes(activity);
  const isSea = effectiveContext === 'sea';
  const isFreshwater = effectiveContext === 'freshwater';
  const showHydro = activity === 'peche' && isFreshwater;
  const showMarine = isMarineActivity && isSea;
  const showFreshwaterSwimming = activity === 'natation' && isFreshwater;
  const contextNeedsConfirmation = contextMode === 'AUTO' && effectiveContext === 'unknown' && isMarineActivity;
  const windUnits = windUnitsForContext(units, effectiveContext);
  const locationUnits = distanceUnitsForContext(units, effectiveContext);
  return (
    <div className="dashboard-view">
      <div className="page-heading dashboard-heading">
        <div><div className="greeting-line"><span className="greeting-dot" />VOTRE PROCHAINE SORTIE</div><h1>Partez l’esprit <em>tranquille.</em></h1><p>Les bonnes conditions, au bon endroit. Sans jamais inventer ce qui manque.</p></div>
        <div className="heading-date"><span><CalendarDays size={15} />{new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</span><span><Clock3 size={14} />Prévisions actualisées à la demande</span></div>
      </div>

      {planner}

      <div className="dashboard-first-grid">
        <MapCard spot={spot} departure={departure} stations={stations} distance={distance} units={locationUnits} contextMode={contextMode} effectiveContext={effectiveContext} />
        <div className="spot-info-card card">
          <div className="spot-info-head"><div><SectionEyebrow icon={Compass}>FICHE DU SPOT</SectionEyebrow><h2>{spot?.name || 'Aucun spot sélectionné'}</h2><p>{spot?.commune || 'Choisissez un lieu pour afficher les informations.'}</p></div><span className="spot-info-badge"><span className="context-status-dot" />{contextMode === 'AUTO' ? (effectiveContext === 'sea' ? 'MER · AUTO' : effectiveContext === 'freshwater' ? 'EAU DOUCE · AUTO' : 'AUTO · À CONFIRMER') : contextMode}</span></div>
          <div className="spot-data-list">
            <div><span className="spot-data-icon"><MapPin size={15} /></span><span>Coordonnées GPS</span><strong>{spot ? `${Number(spot.latitude).toFixed(4)}, ${Number(spot.longitude).toFixed(4)}` : '—'}</strong></div>
            <div><span className="spot-data-icon"><Route size={15} /></span><span>Distance depuis le départ</span><strong>{formatDistance(distance, locationUnits)}</strong></div>
            <div><span className="spot-data-icon"><Clock3 size={15} /></span><span>Durée de trajet</span><strong className="not-calculated">Non calculée</strong></div>
            <div><span className="spot-data-icon"><CircleDot size={15} /></span><span>Activité choisie</span><strong>{currentActivity?.label || '—'}</strong></div>
          </div>
          {contextMode === 'AUTO' && <div className={`auto-context-note ${contextState.status === 'error' ? 'auto-context-note-warning' : ''}`}><ShieldCheck size={14} /><span>{contextState.status === 'ok' ? `Détection côtière OSM · seuil de 5 km${contextState.distanceKm !== null ? ` · distance calculée : ${formatDistance(contextState.distanceKm, units)}` : ''}` : contextState.status === 'loading' ? 'Vérification de la proximité du littoral via OpenStreetMap…' : 'Détection automatique indisponible. Vous pouvez forcer le milieu manuellement.'}</span></div>}
        </div>
      </div>

      <ConditionsSection weatherState={weatherState} units={windUnits} spot={spot} updatedAt={updatedAt} onRefresh={onRefresh} isLoading={isLoading} />
      <TodaySection weatherState={weatherState} units={windUnits} />

      <div className="dashboard-secondary-grid"><AstronomyCard weatherState={weatherState} /><ForecastCard weatherState={weatherState} units={windUnits} /></div>

      {contextNeedsConfirmation && <div className="context-confirm-card"><CircleAlert size={19} /><div><strong>Milieu à confirmer avant d’afficher les données spécifiques.</strong><span>La détection automatique n’a pas répondu. Choisissez MER ou EAU DOUCE dans le sélecteur pour charger les modules adaptés. Aucun contexte n’est supposé.</span></div></div>}
      {showMarine && <MarineSection marineState={marineState} units={units} activity={activity} />}
      {showFreshwaterSwimming && <FreshwaterSwimCard />}
      {showHydro && <HydroSection hydroState={hydroState} units={units} />}

      <div className="dashboard-bottom-grid"><CostsCard distanceKm={distance} units={distanceUnitsForContext(units, 'freshwater')} costs={costs} onOpenSettings={onOpenSettings} /><SourceStrip onOpenSources={onOpenSources} updatedAt={updatedAt} /></div>
      <div className="safety-footer"><ShieldCheck size={14} /><span>Une prévision ne remplace pas les consignes locales, les bulletins de sécurité ni votre jugement. Les données peuvent être différées ou indisponibles.</span></div>
    </div>
  );
}

function SpotsView({ savedSpots, selectedSpot, onAdd, onEdit, onDelete, onSelect }) {
  return (
    <div className="subpage-view">
      <div className="page-heading subpage-heading"><div><div className="greeting-line"><span className="greeting-dot" />VOTRE CARNET DE TERRAIN</div><h1>Vos spots, <em>à portée de main.</em></h1><p>Enregistrés localement sur cet appareil. Vos lieux restent privés et modifiables.</p></div><button type="button" className="primary-button" onClick={onAdd}><Plus size={16} />Ajouter un spot</button></div>
      <div className="privacy-note"><ShieldCheck size={17} /><div><strong>Vos spots restent sur cet appareil.</strong><span>Ils sont conservés dans le stockage local de votre navigateur. Aucun compte ni synchronisation externe.</span></div></div>
      {savedSpots.length === 0
        ? <div className="empty-spots card"><div className="empty-spots-icon"><MapPin size={25} /></div><h2>Votre carnet est encore vide.</h2><p>Enregistrez le spot affiché dans le tableau de bord ou ajoutez votre premier lieu.</p><button type="button" className="primary-button" onClick={onAdd}><Plus size={15} />Créer mon premier spot</button></div>
        : <div className="saved-spots-grid">{savedSpots.map((saved) => <article className={`saved-spot-card card ${selectedSpot?.id === saved.id ? 'saved-spot-selected' : ''}`} key={saved.id}>
          <div className="saved-spot-visual"><div className="saved-spot-visual-icon"><MapPin size={22} /></div><span className="saved-spot-context"><span className="context-status-dot" />{saved.contextMode === 'MER' ? 'MER' : saved.contextMode === 'EAU DOUCE' ? 'EAU DOUCE' : 'AUTO'}</span><span className="saved-spot-coordinate">{Number(saved.latitude).toFixed(3)}° · {Number(saved.longitude).toFixed(3)}°</span></div>
          <div className="saved-spot-body"><div className="saved-spot-title"><div><h2>{saved.name}</h2><p>{saved.commune || 'Commune non renseignée'}</p></div><button type="button" className="more-button" onClick={() => onEdit(saved)} aria-label={`Modifier ${saved.name}`}><MoreHorizontal size={18} /></button></div><div className="saved-spot-actions"><button type="button" className="primary-button saved-select-button" onClick={() => onSelect(saved)}>{selectedSpot?.id === saved.id ? <><Check size={15} />Spot actif</> : <>Utiliser ce spot <ArrowRight size={14} /></>}</button><button type="button" className="delete-spot-button" onClick={() => onDelete(saved)} aria-label={`Supprimer ${saved.name}`}><Trash2 size={15} /></button></div></div>
        </article>)}</div>}
    </div>
  );
}

const SOURCES = [
  {
    icon: Cloud,
    name: 'Météo & prévisions',
    provider: 'Open-Meteo · agrégation de modèles publics',
    status: 'Connectée',
    tone: 'green',
    description: 'Conditions actuelles et prévisions horaires / 5 jours à partir des coordonnées du spot. L’API ne requiert pas de clé et accepte les appels navigateur. La fréquence de mise à jour dépend des modèles source ; la réponse ne garantit pas une mesure de station en temps réel.',
    meta: 'Gratuit en usage non commercial · attribution CC BY 4.0 requise · pas de clé API · CORS disponible.',
    href: 'https://open-meteo.com/en/docs',
    link: 'Documentation météo',
  },
  {
    icon: Waves,
    name: 'Mer, vagues & niveau marin',
    provider: 'Open-Meteo Marine · modèles vagues / océan',
    status: 'À la demande',
    tone: 'sage',
    description: 'Hauteur, période et direction des vagues ; température de surface et niveau marin lorsque le modèle le fournit. La résolution côtière est limitée. Les coefficients officiels ne sont pas fournis par le modèle et les estimations de marée ne conviennent pas à la navigation.',
    meta: 'Gratuit en usage non commercial · attribution Open-Meteo et producteurs concernés · pas de clé.',
    href: 'https://open-meteo.com/en/docs/marine-weather-api',
    link: 'Documentation marine',
  },
  {
    icon: Droplets,
    name: 'Hydrométrie en eau douce',
    provider: 'Hub’Eau · plateforme PHyC / Vigicrues',
    status: 'Connectée · pêche en eau douce',
    tone: 'green',
    description: 'Stations hydrométriques recherchées à proximité du spot. Les observations de hauteur et de débit sont quasi temps réel, mais dépendent de la station (pas de 5 à 60 min). La position proche ne garantit pas que la mesure représente le plan d’eau visé.',
    meta: 'API publique, sans clé, CORS · données sous Licence Ouverte / Open Licence · mises à jour de la plateforme toutes les 5 min.',
    href: 'https://hubeau.eaufrance.fr/page/api-hydrometrie',
    link: 'Documentation Hydrométrie',
  },
  {
    icon: Map,
    name: 'Carte & géocodage',
    provider: 'OpenStreetMap · Open-Meteo Geocoding',
    status: 'Connectée',
    tone: 'green',
    description: 'Fond de carte OSM avec attribution visible. La recherche de lieux est lancée uniquement à la demande (pas d’autocomplétion) ; les coordonnées GPS peuvent aussi être saisies directement. La détection du littoral s’appuie sur les données OSM et peut échouer si Overpass est indisponible.',
    meta: 'Tuiles OSM : service best-effort, sans SLA, usage humain normal uniquement · données ODbL · géocodage sans clé.',
    href: 'https://operations.osmfoundation.org/policies/tiles/',
    link: 'Politique des tuiles OSM',
    secondaryHref: 'https://open-meteo.com/en/docs/geocoding-api',
    secondaryLink: 'Documentation géocodage',
    tertiaryHref: 'https://wiki.openstreetmap.org/wiki/Overpass_API',
    tertiaryLink: 'Documentation Overpass',
  },
  {
    icon: Compass,
    name: 'Marées officielles & coefficients',
    provider: 'SHOM · référence marine',
    status: 'Lien de vérification',
    tone: 'sand',
    description: 'Le coefficient officiel de marée n’est pas calculé ni affiché sans source validée. Les horaires modélisés d’Open-Meteo, lorsqu’ils sont disponibles, restent des estimations indicatives à vérifier auprès du SHOM.',
    meta: 'Pas d’API SHOM intégrée dans ce socle · accès direct au service de marées pour vérification.',
    href: 'https://maree.shom.fr/',
    link: 'Consulter les marées SHOM',
  },
  {
    icon: ShieldCheck,
    name: 'Services non connectés',
    provider: 'Météo-France API · Windguru · Windy · Surf-Report',
    status: 'Non intégrés',
    tone: 'neutral',
    description: 'Aucun scraping de site n’est effectué. Ces fournisseurs ne sont pas utilisés par le dashboard ; leurs conditions d’accès, licences et clés nécessaires devront être validées avant toute intégration.',
    meta: 'Les liens ouvrent les sites officiels ; ils ne sont pas présentés comme sources des chiffres affichés.',
    href: 'https://meteofrance.com/',
    link: 'Météo-France',
  },
];

function SourcesView() {
  return (
    <div className="subpage-view sources-view">
      <div className="page-heading subpage-heading"><div><div className="greeting-line"><span className="greeting-dot" />TRANSPARENCE AVANT TOUT</div><h1>La confiance se <em>vérifie.</em></h1><p>Origine, fréquence et limites des informations qui alimentent votre préparation.</p></div><span className="source-priority"><ShieldCheck size={15} />Fiabilité d’abord</span></div>
      <div className="sources-summary card"><div className="sources-summary-icon"><ShieldCheck size={22} /></div><div><strong>Aucune donnée manquante n’est remplacée par une estimation inventée.</strong><span>Les unités sont converties uniquement à l’affichage. Les valeurs sources restent intactes ; chaque module précise la date de réception ou signale son indisponibilité.</span></div></div>
      <div className="sources-grid">{SOURCES.map(({ icon: Icon, ...source }) => <article className="source-card card" key={source.name}><div className="source-card-top"><span className={`source-card-icon source-${source.tone}`}><Icon size={19} /></span><span className={`source-status source-status-${source.tone}`}><i />{source.status}</span></div><div className="source-provider">{source.provider}</div><h2>{source.name}</h2><p>{source.description}</p><div className="source-meta"><CircleHelp size={14} /><span>{source.meta}</span></div><div className="source-links"><a href={source.href} target="_blank" rel="noreferrer">{source.link}<ExternalLink size={13} /></a>{source.secondaryHref && <a href={source.secondaryHref} target="_blank" rel="noreferrer">{source.secondaryLink}<ExternalLink size={13} /></a>}{source.tertiaryHref && <a href={source.tertiaryHref} target="_blank" rel="noreferrer">{source.tertiaryLink}<ExternalLink size={13} /></a>}</div></article>)}</div>
      <div className="source-disclaimer"><CircleAlert size={16} /><span>Disponibilité, conditions d’utilisation et fréquences peuvent évoluer. Pour une mise en production commerciale, les contrats, quotas et politiques des fournisseurs doivent être revalidés.</span></div>
    </div>
  );
}

function SettingsView({ units, onUnitsChange, costs, onCostsChange, onReset }) {
  const updateCost = (key, value) => onCostsChange((previous) => ({ ...previous, [key]: value }));
  return (
    <div className="subpage-view settings-view">
      <div className="page-heading subpage-heading"><div><div className="greeting-line"><span className="greeting-dot" />VOTRE ESPACE</div><h1>Vos réglages, <em>vos repères.</em></h1><p>Les préférences sont conservées dans ce navigateur et s’appliquent partout, sans rechargement.</p></div></div>
      <section className="settings-card card"><div className="settings-card-heading"><span className="settings-icon"><ArrowLeftRight size={19} /></span><div><h2>Unités de mesure</h2><p>Un réglage global pour la météo, la distance, le vent et l’hydrologie.</p></div></div><div className="settings-unit-row"><div><strong>Mode d’affichage</strong><span>Modifiable aussi directement depuis le tableau de bord.</span></div><UnitToggle value={units} onChange={onUnitsChange} /></div><div className="unit-examples"><div><span>VENT</span><b>{units === 'nautical' ? '13 kn' : units === 'double' ? '24 km/h · 13 kn' : '24 km/h'}</b></div><div><span>DISTANCE</span><b>{units === 'nautical' ? '6,7 NM' : units === 'double' ? '12,4 km / 6,7 NM' : '12,4 km'}</b></div><div><span>HAUTEUR DE VAGUE</span><b>1,2 m</b></div></div></section>
      <section className="settings-card card"><div className="settings-card-heading"><span className="settings-icon settings-icon-sand"><Route size={19} /></span><div><h2>Estimation des frais de déplacement</h2><p>Ces paramètres vous appartiennent. Aucun tarif de carburant, péage ou hébergement n’est deviné.</p></div></div><div className="cost-settings-grid"><label>Consommation moyenne <span><input type="number" min="0" step="0.1" value={costs.fuelConsumption} onChange={(event) => updateCost('fuelConsumption', event.target.value)} placeholder="—" /> <i>L / 100 km</i></span></label><label>Prix du carburant <span><input type="number" min="0" step="0.01" value={costs.fuelPrice} onChange={(event) => updateCost('fuelPrice', event.target.value)} placeholder="—" /> <i>€ / L</i></span></label><label>Péages <span><input type="number" min="0" step="0.01" value={costs.tolls} onChange={(event) => updateCost('tolls', event.target.value)} placeholder="—" /> <i>€</i></span></label><label>Hébergement <span><input type="number" min="0" step="0.01" value={costs.lodging} onChange={(event) => updateCost('lodging', event.target.value)} placeholder="—" /> <i>€</i></span></label><label>Autres frais <span><input type="number" min="0" step="0.01" value={costs.other} onChange={(event) => updateCost('other', event.target.value)} placeholder="—" /> <i>€</i></span></label><label className="round-trip-setting"><span><strong>Calculer un aller-retour</strong><small>Double la distance directe pour l’estimation de carburant.</small></span><input type="checkbox" checked={costs.roundTrip} onChange={(event) => updateCost('roundTrip', event.target.checked)} /></label></div><div className="settings-inline-note"><CircleHelp size={15} />La distance affichée est une distance géodésique à vol d’oiseau. Le calcul d’itinéraire routier et des péages n’est pas connecté.</div></section>
      <section className="settings-card privacy-settings card"><div><span className="settings-icon"><ShieldCheck size={18} /></span><div><h2>Données locales & vie privée</h2><p>Spots, unités et frais restent enregistrés uniquement dans le stockage local de votre navigateur.</p></div></div><button type="button" className="reset-button" onClick={onReset}>Effacer mes préférences <Trash2 size={14} /></button></section>
    </div>
  );
}

function SpotModal({ initialSpot, onClose, onSave }) {
  const [name, setName] = useState(initialSpot?.name || '');
  const [commune, setCommune] = useState(initialSpot?.commune || '');
  const [coordinates, setCoordinates] = useState(initialSpot ? `${initialSpot.latitude}, ${initialSpot.longitude}` : '');
  const [contextMode, setContextMode] = useState(initialSpot?.contextMode || 'AUTO');
  const [error, setError] = useState('');
  const save = (event) => {
    event.preventDefault();
    const parsed = parseCoordinates(coordinates);
    if (!name.trim()) return setError('Donnez un nom à ce spot.');
    if (!parsed) return setError('Entrez des coordonnées valides : latitude, longitude.');
    onSave({
      ...initialSpot,
      id: initialSpot?.id || `spot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      commune: commune.trim(),
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      contextMode,
      isExample: false,
    });
  };
  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="spot-modal" role="dialog" aria-modal="true" aria-labelledby="spot-modal-title">
        <div className="modal-heading"><div><span className="modal-kicker">CARNET DE TERRAIN</span><h2 id="spot-modal-title">{initialSpot ? 'Modifier le spot' : 'Ajouter un spot'}</h2><p>Un nom, une localisation et des coordonnées précises.</p></div><button type="button" className="icon-button" onClick={onClose} aria-label="Fermer"><X size={18} /></button></div>
        <form onSubmit={save}>
          <label className="form-field">Nom du spot<input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex. Plage des Dunes" /></label>
          <label className="form-field">Commune / lieu<input value={commune} onChange={(event) => setCommune(event.target.value)} placeholder="Ex. Lacanau" /></label>
          <label className="form-field">Coordonnées GPS <input value={coordinates} onChange={(event) => setCoordinates(event.target.value)} placeholder="44.8378, -0.5792" /><small>Format décimal : latitude, longitude. Vous pouvez rechercher un lieu depuis le tableau de bord.</small></label>
          <div className="form-field"><span className="form-label">Contexte préféré</span><div className="context-switch modal-context-switch">{['AUTO', 'MER', 'EAU DOUCE'].map((option) => <button key={option} type="button" className={contextMode === option ? 'context-active' : ''} onClick={() => setContextMode(option)}>{option}</button>)}</div></div>
          {error && <div className="form-error"><CircleAlert size={15} />{error}</div>}
          <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Annuler</button><button type="submit" className="primary-button"><Check size={15} />Enregistrer le spot</button></div>
        </form>
      </div>
    </div>
  );
}

function Toast({ message, onClose }) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(onClose, 3200);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);
  if (!message) return null;
  return <div className="toast-message"><span><Check size={15} /></span>{message}<button type="button" onClick={onClose} aria-label="Fermer la notification"><X size={14} /></button></div>;
}

export default function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [savedSpots, setSavedSpots] = useState(() => readStorage('ggsn-spots', []));
  const [spot, setSpot] = useState(() => readStorage('ggsn-active-spot', null) || DEMO_SPOT);
  const [departure, setDeparture] = useState(() => readStorage('ggsn-departure', null));
  const [activity, setActivity] = useState(() => readStorage('ggsn-activity', 'balade'));
  const [units, setUnits] = useState(() => readStorage('ggsn-units', 'standard'));
  const [costs, setCosts] = useState(() => ({ ...DEFAULT_COSTS, ...readStorage('ggsn-costs', {}) }));
  const [contextMode, setContextMode] = useState(() => spot?.contextMode || 'AUTO');
  const [contextState, setContextState] = useState({ status: 'loading', context: null, distanceKm: null });
  const [weatherState, setWeatherState] = useState({ status: 'idle', data: null, error: null });
  const [marineState, setMarineState] = useState({ status: 'idle', data: null, error: null });
  const [hydroState, setHydroState] = useState({ status: 'idle', data: null, error: null });
  const [dataUpdatedAt, setDataUpdatedAt] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [departureText, setDepartureText] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [departureResults, setDepartureResults] = useState([]);
  const [searchTarget, setSearchTarget] = useState(null);
  const [searchLoading, setSearchLoading] = useState(null);
  const [locating, setLocating] = useState(false);
  const [modalSpot, setModalSpot] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const searchCache = useRef(new Map());
  const lastSearchTime = useRef(0);

  const effectiveContext = useMemo(() => {
    if (contextMode === 'MER') return 'sea';
    if (contextMode === 'EAU DOUCE') return 'freshwater';
    return contextState.status === 'ok' ? contextState.context : 'unknown';
  }, [contextMode, contextState]);

  const showMarine = ['natation', 'nautisme', 'peche'].includes(activity) && effectiveContext === 'sea';
  const showHydro = activity === 'peche' && effectiveContext === 'freshwater';
  const mapStations = hydroState.status === 'success' ? hydroState.data || [] : [];
  const distance = departure && spot ? haversineKm(departure, spot) : null;
  const currentLoading = weatherState.status === 'loading' || marineState.status === 'loading' || hydroState.status === 'loading';

  useEffect(() => writeStorage('ggsn-spots', savedSpots), [savedSpots]);
  useEffect(() => writeStorage('ggsn-active-spot', spot), [spot]);
  useEffect(() => writeStorage('ggsn-departure', departure), [departure]);
  useEffect(() => writeStorage('ggsn-activity', activity), [activity]);
  useEffect(() => writeStorage('ggsn-units', units), [units]);
  useEffect(() => writeStorage('ggsn-costs', costs), [costs]);

  useEffect(() => {
    if (!spot || !validCoordinatePair(spot.latitude, spot.longitude)) {
      setContextState({ status: 'error', context: null, distanceKm: null });
      return undefined;
    }
    const controller = new AbortController();
    setContextState({ status: 'loading', context: null, distanceKm: null });
    const timer = window.setTimeout(() => controller.abort(), 18000);
    detectCoastContext(spot, controller.signal)
      .then((result) => setContextState(result))
      .catch(() => setContextState({ status: 'error', context: null, distanceKm: null, source: 'OpenStreetMap' }))
      .finally(() => window.clearTimeout(timer));
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [spot?.latitude, spot?.longitude, refreshToken]);

  useEffect(() => {
    if (!spot || !validCoordinatePair(spot.latitude, spot.longitude)) {
      setWeatherState({ status: 'idle', data: null, error: null });
      return undefined;
    }
    const controller = new AbortController();
    setDataUpdatedAt(null);
    setWeatherState({ status: 'loading', data: null, error: null });
    fetchWeather(spot, controller.signal)
      .then((data) => {
        setWeatherState({ status: 'success', data, error: null, receivedAt: new Date() });
        setDataUpdatedAt(new Date());
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setWeatherState({ status: 'error', data: null, error: error.message });
      });
    return () => controller.abort();
  }, [spot?.latitude, spot?.longitude, refreshToken]);

  useEffect(() => {
    if (!showMarine || !spot) {
      setMarineState({ status: 'idle', data: null, error: null });
      return undefined;
    }
    const controller = new AbortController();
    setMarineState({ status: 'loading', data: null, error: null });
    fetchMarine(spot, controller.signal)
      .then((data) => setMarineState({ status: 'success', data, error: null, receivedAt: new Date() }))
      .catch((error) => {
        if (error.name !== 'AbortError') setMarineState({ status: 'error', data: null, error: error.message });
      });
    return () => controller.abort();
  }, [spot?.latitude, spot?.longitude, showMarine, refreshToken]);

  useEffect(() => {
    if (!showHydro || !spot) {
      setHydroState({ status: 'idle', data: null, error: null });
      return undefined;
    }
    const controller = new AbortController();
    setHydroState({ status: 'loading', data: null, error: null });
    fetchNearbyHydrology(spot, controller.signal)
      .then((data) => setHydroState({ status: 'success', data, error: null, receivedAt: new Date() }))
      .catch((error) => {
        if (error.name !== 'AbortError') setHydroState({ status: 'error', data: null, error: error.message });
      });
    return () => controller.abort();
  }, [spot?.latitude, spot?.longitude, showHydro, refreshToken]);

  useEffect(() => {
    if (weatherState.receivedAt) setDataUpdatedAt(weatherState.receivedAt);
  }, [weatherState.receivedAt]);

  const showToast = useCallback((message) => setToastMessage(message), []);
  const closeToast = useCallback(() => setToastMessage(''), []);

  const navigate = (view) => {
    setActiveView(view);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePlaceSelect = (place) => {
    const name = place.name || 'Lieu sélectionné';
    const nextSpot = {
      id: `place-${place.id}`,
      name,
      commune: place.city || place.country || '',
      latitude: place.latitude,
      longitude: place.longitude,
      contextMode: 'AUTO',
      isExample: false,
    };
    setSpot(nextSpot);
    setContextMode('AUTO');
    setSearchText('');
    setSearchResults([]);
    setSearchTarget(null);
    showToast(`${name} sélectionné comme spot.`);
  };

  const handleDeparturePlaceSelect = (place) => {
    setDeparture({
      name: place.name || 'Lieu de départ',
      commune: place.city || place.country || '',
      latitude: place.latitude,
      longitude: place.longitude,
    });
    setDepartureText('');
    setDepartureResults([]);
    setSearchTarget(null);
    showToast('Position de départ définie.');
  };

  const runSearch = async (target) => {
    const query = target === 'departure' ? departureText.trim() : searchText.trim();
    if (!query) return;
    const coordinates = parseCoordinates(query);
    if (coordinates) {
      if (target === 'departure') {
        setDeparture({ name: 'Position GPS saisie', ...coordinates });
        setDepartureText('');
        showToast('Position de départ définie.');
      } else {
        setSpot({ id: `gps-${coordinates.latitude}-${coordinates.longitude}`, name: 'Spot GPS', commune: 'Coordonnées saisies', ...coordinates, contextMode: 'AUTO', isExample: false });
        setContextMode('AUTO');
        setSearchText('');
        showToast('Coordonnées GPS sélectionnées comme spot.');
      }
      setSearchResults([]);
      setDepartureResults([]);
      setSearchTarget(null);
      return;
    }
    const cacheKey = query.toLocaleLowerCase('fr-FR');
    const cached = searchCache.current.get(cacheKey);
    if (cached) {
      setSearchTarget(target);
      if (target === 'departure') setDepartureResults(cached);
      else setSearchResults(cached);
      return;
    }
    const sinceLastSearch = Date.now() - lastSearchTime.current;
    if (sinceLastSearch < 1100) await new Promise((resolve) => window.setTimeout(resolve, 1100 - sinceLastSearch));
    setSearchLoading(target);
    setSearchTarget(target);
    setSearchResults([]);
    setDepartureResults([]);
    const controller = new AbortController();
    try {
      lastSearchTime.current = Date.now();
      const results = await searchPlaces(query, controller.signal);
      searchCache.current.set(cacheKey, results);
      if (target === 'departure') setDepartureResults(results);
      else setSearchResults(results);
      if (results.length === 0) showToast('Aucun résultat. Essayez une commune ou des coordonnées GPS.');
    } catch {
      showToast('Recherche indisponible. Vous pouvez saisir directement des coordonnées GPS.');
    } finally {
      setSearchLoading(null);
    }
  };

  const useGeolocation = () => {
    if (!navigator.geolocation) {
      showToast('La géolocalisation n’est pas prise en charge par ce navigateur.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setDeparture({ name: 'Ma position actuelle', latitude: coords.latitude, longitude: coords.longitude });
        setLocating(false);
        showToast('Position actuelle utilisée comme départ.');
      },
      (error) => {
        setLocating(false);
        showToast(error.code === error.PERMISSION_DENIED ? 'Autorisation de géolocalisation refusée.' : 'Position indisponible. Vérifiez les réglages de localisation.');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 300000 },
    );
  };

  const selectSavedSpot = (id) => {
    const saved = savedSpots.find((item) => item.id === id);
    if (!saved) return;
    setSpot(saved);
    setContextMode(saved.contextMode || 'AUTO');
    showToast(`${saved.name} chargé depuis vos spots.`);
  };

  const handleContextChange = (mode) => {
    setContextMode(mode);
    setSpot((previous) => previous ? { ...previous, contextMode: mode } : previous);
    if (spot?.id && savedSpots.some((saved) => saved.id === spot.id)) {
      setSavedSpots((previous) => previous.map((saved) => saved.id === spot.id ? { ...saved, contextMode: mode } : saved));
    }
  };

  const saveSpot = (spotToSave) => {
    const savedSpot = { ...spotToSave, id: spotToSave.id || `spot-${Date.now()}`, contextMode: spotToSave.contextMode || contextMode, isExample: false };
    setSavedSpots((previous) => previous.some((item) => item.id === savedSpot.id)
      ? previous.map((item) => item.id === savedSpot.id ? savedSpot : item)
      : [savedSpot, ...previous]);
    setSpot(savedSpot);
    setContextMode(savedSpot.contextMode || 'AUTO');
    setShowModal(false);
    setModalSpot(null);
    showToast('Spot enregistré localement.');
  };

  const saveCurrentSpot = () => {
    if (!spot) {
      setModalSpot(null);
      setShowModal(true);
      return;
    }
    const existing = savedSpots.find((saved) => saved.id === spot.id);
    if (existing) {
      setSavedSpots((previous) => previous.map((saved) => saved.id === spot.id ? { ...spot, contextMode, isExample: false } : saved));
      setSpot((previous) => ({ ...previous, isExample: false, contextMode }));
      showToast('Contexte et informations du spot mis à jour.');
      return;
    }
    const saved = { ...spot, id: `spot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, contextMode, isExample: false };
    setSavedSpots((previous) => [saved, ...previous]);
    setSpot(saved);
    showToast('Spot ajouté à votre carnet.');
  };

  const deleteSpot = (saved) => {
    if (!window.confirm(`Supprimer « ${saved.name} » de vos spots enregistrés ?`)) return;
    setSavedSpots((previous) => previous.filter((item) => item.id !== saved.id));
    if (spot?.id === saved.id) {
      setSpot(DEMO_SPOT);
      setContextMode(DEMO_SPOT.contextMode);
    }
    showToast('Spot supprimé du stockage local.');
  };

  const resetPreferences = () => {
    if (!window.confirm('Effacer les spots et préférences stockés sur cet appareil ?')) return;
    ['ggsn-spots', 'ggsn-active-spot', 'ggsn-departure', 'ggsn-activity', 'ggsn-units', 'ggsn-costs'].forEach((key) => window.localStorage.removeItem(key));
    setSavedSpots([]);
    setSpot(DEMO_SPOT);
    setDeparture(null);
    setActivity('balade');
    setUnits('standard');
    setCosts(DEFAULT_COSTS);
    setContextMode('AUTO');
    setActiveView('dashboard');
    showToast('Préférences locales effacées.');
  };

  const plannerProps = {
    spot,
    departure,
    activity,
    contextMode,
    contextState,
    units,
    savedSpots,
    searchText,
    onSearchTextChange: (value) => { setSearchText(value); setSearchResults([]); setSearchTarget('spot'); },
    searchResults,
    searchTarget,
    searchLoading,
    onSearch: () => runSearch('spot'),
    onPlaceSelect: handlePlaceSelect,
    departureText,
    onDepartureTextChange: (value) => { setDepartureText(value); setDepartureResults([]); setSearchTarget('departure'); },
    departureResults,
    onDepartureSearch: () => runSearch('departure'),
    onDeparturePlaceSelect: handleDeparturePlaceSelect,
    onLocate: useGeolocation,
    locating,
    onActivityChange: setActivity,
    onContextChange: handleContextChange,
    onSaveSpot: saveCurrentSpot,
    onSelectSavedSpot: selectSavedSpot,
    onCreateSpot: () => { setModalSpot(null); setShowModal(true); },
    toast: '',
  };

  const renderView = () => {
    if (activeView === 'spots') return <SpotsView savedSpots={savedSpots} selectedSpot={spot} onAdd={() => { setModalSpot(null); setShowModal(true); }} onEdit={(saved) => { setModalSpot(saved); setShowModal(true); }} onDelete={deleteSpot} onSelect={(saved) => { setSpot(saved); setContextMode(saved.contextMode || 'AUTO'); navigate('dashboard'); showToast(`${saved.name} chargé.`); }} />;
    if (activeView === 'sources') return <SourcesView />;
    if (activeView === 'settings') return <SettingsView units={units} onUnitsChange={setUnits} costs={costs} onCostsChange={setCosts} onReset={resetPreferences} />;
    return <DashboardViewWrapper
      plannerProps={plannerProps}
      spot={spot}
      departure={departure}
      activity={activity}
      contextMode={contextMode}
      effectiveContext={effectiveContext}
      contextState={contextState}
      units={units}
      weatherState={weatherState}
      marineState={marineState}
      hydroState={hydroState}
      updatedAt={dataUpdatedAt}
      onRefresh={() => setRefreshToken((value) => value + 1)}
      isLoading={currentLoading}
      stations={mapStations}
      distance={distance}
      costs={costs}
      onOpenSettings={() => navigate('settings')}
      onOpenSources={() => navigate('sources')}
      onActivityChange={setActivity}
    />;
  };

  return (
    <div className={`app-shell ${mobileMenuOpen ? 'mobile-menu-open' : ''}`}>
      <Sidebar activeView={activeView} onNavigate={navigate} savedCount={savedSpots.length} />
      {mobileMenuOpen && <button type="button" className="mobile-dismiss" aria-label="Fermer le menu" onClick={() => setMobileMenuOpen(false)} />}
      <main className="main-area">
        <Topbar units={units} onUnitsChange={setUnits} updatedAt={dataUpdatedAt} onRefresh={() => setRefreshToken((value) => value + 1)} isLoading={currentLoading} onMenuClick={() => setMobileMenuOpen((value) => !value)} />
        <div className="content-wrap">{renderView()}</div>
        <footer className="app-footer"><LogoMark /><span>© {new Date().getFullYear()} GG Sports-Nature · Préparer, puis profiter.</span><a href="https://open-meteo.com/en/terms" target="_blank" rel="noreferrer">Conditions des données <ExternalLink size={11} /></a></footer>
      </main>
      <Toast message={toastMessage} onClose={closeToast} />
      {showModal && <SpotModal initialSpot={modalSpot} onClose={() => { setShowModal(false); setModalSpot(null); }} onSave={saveSpot} />}
    </div>
  );
}

function DashboardViewWrapper({ plannerProps, ...dashboardProps }) {
  return <Dashboard {...dashboardProps} planner={<Planner {...plannerProps} />} />;
}
