import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ActivityId, BasePosition, BudgetSettings, ClimateData, Environment, HydroData, MarineData, Spot, WaterMode, WeatherData } from './types';
import { ACTIVITIES, activityNeedsWater, getActivity } from './data/activities';
import { DEFAULT_ACTIVITY, DEFAULT_POSITION, SEED_SPOTS } from './data/seed';
import { usePersistentState } from './hooks/usePersistentState';
import { useResource } from './hooks/useResource';
import { useTheme } from './hooks/useTheme';
import { useToast, ToastProvider } from './components/ui/Toast';
import { Topbar } from './components/layout/Topbar';
import { Footer } from './components/layout/Footer';
import { ActivityRail } from './components/control/ActivityRail';
import { ContextBar } from './components/control/ContextBar';
import { PositionBanner } from './components/control/PositionBanner';
import { Hero } from './components/hero/Hero';
import { WeatherNow } from './components/weather/WeatherNow';
import { HourlyPanel } from './components/weather/HourlyPanel';
import { ForecastTable } from './components/weather/ForecastTable';
import { MapCard } from './components/map/MapCard';
import { AstronomyCard } from './components/astro/AstronomyCard';
import { MarineForecast, TideCard, WavesCard } from './components/marine/MarinePanels';
import { RiverPanel } from './components/hydro/RiverPanel';
import { ClimateCard } from './components/climate/ClimateCard';
import { BudgetCard } from './components/budget/BudgetCard';
import { SpotsPanel } from './components/spots/SpotsPanel';
import { SourcesPanel } from './components/sources/SourcesPanel';
import { SpotDialog } from './components/spots/SpotDialog';
import { PositionDialog } from './components/spots/PositionDialog';
import { computeSky } from './lib/astro';
import { computeTides } from './lib/tides';
import { computeBudget, DEFAULT_BUDGET_SETTINGS } from './lib/budget';
import { coastDistanceKm } from './lib/coastline';
import { getCurrentPosition } from './lib/geolocation';
import { reverseGeocode } from './lib/api/geocode';
import { fetchWeather } from './lib/api/weather';
import { fetchMarine } from './lib/api/marine';
import { fetchHydro } from './lib/api/hydro';
import { fetchClimate } from './lib/api/climate';
import { demoClimate, demoHydro, demoMarine, demoWeather } from './lib/demo';
import { haversineKm } from './lib/geo';
import { Badge } from './components/ui/kit';

const DEMO_FROM_QUERY =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === '1';

function Dashboard() {
  const { theme, toggle } = useTheme();
  const { notify } = useToast();

  const [activity, setActivity] = usePersistentState<ActivityId>('activity.v1', DEFAULT_ACTIVITY);
  const [spots, setSpots] = usePersistentState<Spot[]>('spots.v1', SEED_SPOTS);
  const [activeSpot, setActiveSpot] = usePersistentState<Spot>('activeSpot.v1', SEED_SPOTS[0]);
  const [position, setPosition] = usePersistentState<BasePosition>('position.v1', DEFAULT_POSITION);
  const [budgetSettings, setBudgetSettings] = usePersistentState<BudgetSettings>('budget.v1', DEFAULT_BUDGET_SETTINGS);
  const [demoMode, setDemoMode] = usePersistentState<boolean>('demo.v1', DEMO_FROM_QUERY);

  const [dialog, setDialog] = useState<{ open: boolean; spot: Spot | null; editing: boolean }>({
    open: false,
    spot: null,
    editing: false,
  });
  const [positionOpen, setPositionOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setRefreshKey((value) => value + 1), 10 * 60_000);
    return () => window.clearInterval(id);
  }, []);

  const activityDef = getActivity(activity);
  const waterActivity = activityNeedsWater(activity);
  const spotKey = `${activeSpot.lat.toFixed(4)},${activeSpot.lon.toFixed(4)}`;

  const coast = useMemo(() => {
    const distance = coastDistanceKm(activeSpot.lat, activeSpot.lon);
    return { distanceKm: distance, covered: distance !== null };
  }, [activeSpot.lat, activeSpot.lon]);

  const environment: Environment =
    activeSpot.mode === 'mer'
      ? 'mer'
      : activeSpot.mode === 'douce'
        ? 'douce'
        : coast.distanceKm !== null && coast.distanceKm <= 5
          ? 'mer'
          : 'douce';

  const weather = useResource<WeatherData>(
    `weather:${spotKey}:${refreshKey}`,
    (signal) => fetchWeather(activeSpot.lat, activeSpot.lon, signal),
    { demo: () => demoWeather(activeSpot.lat, activeSpot.lon), demoMode },
  );

  const showMarine = waterActivity && environment === 'mer';
  const marine = useResource<MarineData>(
    `marine:${spotKey}:${refreshKey}`,
    (signal) => fetchMarine(activeSpot.lat, activeSpot.lon, signal),
    {
      enabled: showMarine,
      demo: () => demoMarine(activeSpot.lat, activeSpot.lon),
      demoMode,
    },
  );

  const showRiver = activity === 'peche' && environment === 'douce';
  const hydro = useResource<HydroData>(
    `hydro:${spotKey}:${refreshKey}`,
    (signal) => fetchHydro(activeSpot.lat, activeSpot.lon, signal),
    {
      enabled: showRiver,
      demo: () => demoHydro(activeSpot.lat, activeSpot.lon, activeSpot.name),
      demoMode,
    },
  );

  const climate = useResource<ClimateData>(
    `climate:${spotKey}:${refreshKey}`,
    (signal) => fetchClimate(activeSpot.lat, activeSpot.lon, signal),
    { demo: () => demoClimate(activeSpot.lat, activeSpot.lon), demoMode },
  );

  const tides = useMemo(
    () => (showMarine ? computeTides(marine.data, activeSpot.lat, activeSpot.lon) : null),
    [showMarine, marine.data, activeSpot.lat, activeSpot.lon],
  );

  const sky = useMemo(() => computeSky(activeSpot.lat, activeSpot.lon, now), [activeSpot.lat, activeSpot.lon, now]);
  const distanceKm = haversineKm(position, activeSpot);
  const budget = useMemo(
    () => computeBudget(position, activeSpot, budgetSettings),
    [position, activeSpot, budgetSettings],
  );

  const lastUpdated = Math.max(
    weather.updatedAt ?? 0,
    showMarine ? marine.updatedAt ?? 0 : 0,
    showRiver ? hydro.updatedAt ?? 0 : 0,
  ) || null;
  const refreshing = weather.loading || (showMarine && marine.loading) || (showRiver && hydro.loading);

  const refresh = useCallback(() => {
    setRefreshKey((value) => value + 1);
    setNow(new Date());
  }, []);

  const enableDemo = useCallback(() => {
    setDemoMode(true);
    notify('Mode démonstration activé : les données sont simulées.', 'info');
  }, [notify, setDemoMode]);

  const locate = useCallback(async () => {
    setLocating(true);
    try {
      const fix = await getCurrentPosition();
      const place = await reverseGeocode(fix.lat, fix.lon);
      const next: BasePosition = {
        lat: fix.lat,
        lon: fix.lon,
        label: place?.name ?? 'Ma position',
        source: 'gps',
        accuracy: fix.accuracy,
        updatedAt: Date.now(),
      };
      setPosition(next);
      setPositionOpen(false);
      notify(`Position mise à jour : ${next.label}`, 'success');
      return next;
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Localisation impossible', 'error');
      return null;
    } finally {
      setLocating(false);
    }
  }, [notify, setPosition]);

  // Géolocalisation automatique et silencieuse si l'autorisation est déjà accordée
  // (jamais de demande intempestive : le bandeau propose la première activation).
  useEffect(() => {
    if (position.source !== 'defaut') return;
    const permissions = navigator.permissions;
    if (!permissions?.query) return;
    let cancelled = false;
    permissions
      .query({ name: 'geolocation' })
      .then((status) => {
        if (!cancelled && status.state === 'granted') void locate();
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyPosition = (next: BasePosition) => {
    setPosition(next);
    setPositionOpen(false);
    notify(`Position de départ : ${next.label}`, 'success');
  };

  const openNewSpot = () => setDialog({ open: true, spot: null, editing: false });
  const openEditSpot = (spot: Spot) => setDialog({ open: true, spot, editing: true });

  const applySpot = (spot: Spot, save: boolean) => {
    if (save) {
      setSpots((current) => {
        const exists = current.some((item) => item.id === spot.id);
        return exists ? current.map((item) => (item.id === spot.id ? spot : item)) : [...current, spot];
      });
    } else {
      setSpots((current) => current.filter((item) => item.id !== spot.id));
    }
    setActiveSpot({ ...spot, saved: save });
    setDialog({ open: false, spot: null, editing: false });
    notify(save ? `Spot « ${spot.name} » enregistré` : `Spot « ${spot.name} » affiché`, 'success');
  };

  const deleteSpot = (id: string) => {
    setSpots((current) => current.filter((item) => item.id !== id));
    if (activeSpot.id === id) setActiveSpot({ ...activeSpot, saved: false });
    notify('Spot supprimé de la bibliothèque', 'success');
  };

  const selectSpot = (spot: Spot) => {
    setActiveSpot(spot);
    setDialog({ open: false, spot: null, editing: false });
    notify(`Spot « ${spot.name} » affiché`, 'success');
  };

  const changeMode = (mode: WaterMode) => {
    const updated = { ...activeSpot, mode, updatedAt: Date.now() };
    setActiveSpot(updated);
    if (updated.saved) {
      setSpots((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    }
  };

  const toggleDemo = () => {
    const next = !demoMode;
    setDemoMode(next);
    notify(next ? 'Mode démonstration activé' : 'Données réelles réactivées', 'info');
  };

  const openMeteoFrance = () => {
    // La recherche Météo-France accepte aussi bien une commune qu'un lieu-dit :
    // elle reste valide même lorsque le spot n'est pas une commune.
    const url = `https://meteofrance.com/recherche?search_api_fulltext=${encodeURIComponent(activeSpot.name)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const showBanner = position.source === 'defaut' && !bannerDismissed;

  return (
    <div className="app" id="top">
      <Topbar
        position={position}
        locating={locating}
        theme={theme}
        demoMode={demoMode}
        onToggleTheme={toggle}
        onLocate={locate}
        onOpenPosition={() => setPositionOpen(true)}
        onNewSpot={openNewSpot}
      />

      <main className="shell">
        {showBanner ? (
          <PositionBanner
            position={position}
            locating={locating}
            onLocate={locate}
            onOpenPosition={() => setPositionOpen(true)}
            onDismiss={() => setBannerDismissed(true)}
          />
        ) : null}

        <ActivityRail activity={activity} onChange={setActivity} />

        <ContextBar
          spot={activeSpot}
          activity={activityDef}
          environment={environment}
          coast={coast}
          distanceKm={distanceKm}
          position={position}
          locating={locating}
          onOpenSpot={openNewSpot}
          onOpenPosition={() => setPositionOpen(true)}
          onModeChange={changeMode}
        />

        <Hero
          spot={activeSpot}
          activity={activityDef}
          environment={environment}
          coast={coast}
          distanceKm={distanceKm}
          position={position}
          weather={weather.data}
          weatherLoading={weather.loading}
          weatherError={weather.error}
          tides={tides}
          sky={sky}
          demoMode={demoMode}
          refreshing={refreshing}
          onOpenSpot={openNewSpot}
          onRefresh={refresh}
          lastUpdated={lastUpdated}
        />

        {demoMode ? (
          <div className="demo-banner">
            <Badge tone="demo">Mode démonstration</Badge>
            <p>
              Les données affichées sont générées localement pour illustrer l’interface. Désactivez le mode dans le
              pied de page pour interroger les sources réelles (Open-Meteo, Hub’Eau, etc.).
            </p>
            <button type="button" className="btn btn--sm btn--ghost" onClick={toggleDemo}>
              Repasser en temps réel
            </button>
          </div>
        ) : null}

        <div className="grid">
          <div className="col-4">
            <WeatherNow
              weather={weather.data}
              loading={weather.loading}
              error={weather.error}
              updatedAt={weather.updatedAt}
              onRetry={weather.reload}
              onDemo={enableDemo}
              demoMode={demoMode}
              delay={0}
            />
          </div>
          <div className="col-8">
            <HourlyPanel
              weather={weather.data}
              loading={weather.loading}
              error={weather.error}
              onRetry={weather.reload}
              onDemo={enableDemo}
              demoMode={demoMode}
              delay={60}
            />
          </div>

          <div className="col-5">
            <MapCard
              spot={activeSpot}
              environment={environment}
              waterActivity={waterActivity}
              stations={hydro.data?.stations ?? []}
              delay={90}
            />
          </div>
          <div className="col-7">
            <AstronomyCard sky={sky} delay={120} />
          </div>

          <div className="col-12">
            <ForecastTable
              weather={weather.data}
              loading={weather.loading}
              error={weather.error}
              onRetry={weather.reload}
              onDemo={enableDemo}
              demoMode={demoMode}
              onOpenMeteo={openMeteoFrance}
              delay={150}
            />
          </div>

          {showMarine ? (
            <>
              <div className="col-7">
                <TideCard
                  tides={tides}
                  loading={marine.loading}
                  error={marine.error}
                  onRetry={marine.reload}
                  onDemo={enableDemo}
                  demoMode={demoMode}
                  spotName={activeSpot.name}
                  delay={180}
                />
              </div>
              <div className="col-5">
                <WavesCard
                  marine={marine.data}
                  loading={marine.loading}
                  error={marine.error}
                  onRetry={marine.reload}
                  onDemo={enableDemo}
                  demoMode={demoMode}
                  spotName={activeSpot.name}
                  delay={210}
                />
              </div>
              <div className="col-12">
                <MarineForecast marine={marine.data} loading={marine.loading} demoMode={demoMode} delay={240} />
              </div>
            </>
          ) : null}

          {showRiver ? (
            <div className="col-12">
              <RiverPanel
                hydro={hydro.data}
                loading={hydro.loading}
                error={hydro.error}
                onRetry={hydro.reload}
                onDemo={enableDemo}
                demoMode={demoMode}
                spotName={activeSpot.name}
                lastUpdated={hydro.updatedAt}
                delay={180}
              />
            </div>
          ) : null}

          <div className="col-12">
            <ClimateCard
              climate={climate.data}
              loading={climate.loading}
              error={climate.error}
              onRetry={climate.reload}
              onDemo={enableDemo}
              demoMode={demoMode}
              spotName={activeSpot.name}
              delay={255}
            />
          </div>

          <div className="col-5">
            <BudgetCard
              base={position}
              spot={activeSpot}
              result={budget}
              settings={budgetSettings}
              onChange={setBudgetSettings}
              delay={270}
            />
          </div>
          <div className="col-7">
            <SpotsPanel
              spots={spots}
              activeSpot={activeSpot}
              position={position}
              onSelect={selectSpot}
              onEdit={openEditSpot}
              onDelete={deleteSpot}
              onCreate={openNewSpot}
              delay={300}
            />
          </div>

          <div className="col-12">
            <SourcesPanel spot={activeSpot} delay={330} />
          </div>
        </div>

        <section className="activity-notes">
          <p className="card-kicker">Toutes les activités</p>
          <div className="activity-notes__grid">
            {ACTIVITIES.map((item) => (
              <article key={item.id} className={`activity-note accent--${item.accent}`}>
                <h3>{item.label}</h3>
                <p>{item.description}</p>
                <ul>
                  {item.highlights.map((highlight) => (
                    <li key={highlight}>{highlight}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      </main>

      <Footer
        position={position}
        demoMode={demoMode}
        onToggleDemo={toggleDemo}
        onOpenPosition={() => setPositionOpen(true)}
      />

      <SpotDialog
        open={dialog.open}
        initialSpot={dialog.spot}
        editing={dialog.editing}
        spots={spots}
        position={position}
        onClose={() => setDialog({ open: false, spot: null, editing: false })}
        onApply={applySpot}
        onDelete={deleteSpot}
        onSelect={selectSpot}
        onCreateNew={() => setDialog({ open: false, spot: null, editing: false })}
      />

      <PositionDialog
        open={positionOpen}
        position={position}
        locating={locating}
        onClose={() => setPositionOpen(false)}
        onLocate={locate}
        onApply={applyPosition}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <Dashboard />
    </ToastProvider>
  );
}
