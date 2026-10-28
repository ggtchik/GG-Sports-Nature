import { useEffect, useState } from 'react';
import type { Spot } from './core/types';
import { useApp } from './state/AppContext';
import { SetupWizard } from './components/setup/SetupWizard';
import { Dashboard } from './components/dashboard/Dashboard';
import { SettingsModal } from './components/settings/SettingsModal';
import { SourcesModal } from './components/settings/SourcesModal';
import { SpotForm } from './components/spots/SpotForm';
import type { SpotDraft } from './components/spots/SpotForm';
import { Segmented } from './components/ui/Segmented';
import { Icon } from './components/ui/Icon';
import { Toasts } from './components/ui/Toasts';

type View = 'setup' | 'dashboard';

export default function App() {
  const { settings, activeSpot, updateSettings, updateSpot, addSpot, notify } = useApp();
  const [view, setView] = useState<View>(activeSpot ? 'dashboard' : 'setup');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [methodOpen, setMethodOpen] = useState(false);
  const [spotFormOpen, setSpotFormOpen] = useState(false);
  const [editingSpot, setEditingSpot] = useState<Spot | null>(null);

  useEffect(() => {
    if (!activeSpot) setView('setup');
  }, [activeSpot]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [view]);

  const submitSpot = (draft: SpotDraft) => {
    if (editingSpot) {
      updateSpot(editingSpot.id, draft);
      notify('Spot mis à jour.', 'success');
    } else {
      addSpot(draft);
      notify('Spot enregistré.', 'success');
    }
    setSpotFormOpen(false);
    setEditingSpot(null);
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__inner">
          <a
            className="brand"
            href="#"
            onClick={(event) => {
              event.preventDefault();
              setView(activeSpot ? 'dashboard' : 'setup');
            }}
            aria-label="GG Sports-Nature — accueil"
          >
            <span className="brand__mark">
              <Icon name="mountain" size={20} />
            </span>
            <span className="brand__text">
              <span className="brand__name">GG Sports-Nature</span>
              <span className="brand__tag">Plein air & nautisme</span>
            </span>
          </a>

          <div className="topbar__spacer" />

          <div className="inline topbar__unit-hint" style={{ gap: 8 }}>
            <span className="eyebrow" style={{ display: 'none' }}>
              Unités
            </span>
            <Segmented
              label="Unités de mesure"
              size="sm"
              value={settings.units}
              onChange={(value) => updateSettings({ units: value })}
              options={[
                { value: 'standard', label: 'km' },
                { value: 'nautical', label: 'NM' },
                { value: 'dual', label: 'km / NM' },
              ]}
            />
          </div>

          <div className="topbar__actions">
            <button
              type="button"
              className="icon-btn"
              aria-label={settings.theme === 'dark' ? 'Passer en thème clair' : 'Passer en thème sombre'}
              onClick={() => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
              title="Thème"
            >
              <Icon name={settings.theme === 'dark' ? 'sun' : 'moon'} size={17} />
            </button>
            <button
              type="button"
              className="icon-btn icon-btn--bordered"
              aria-label="Réglages"
              onClick={() => setSettingsOpen(true)}
              title="Réglages"
            >
              <Icon name="settings" size={17} />
            </button>
          </div>
        </div>
      </header>

      <main className="main">
        {view === 'dashboard' && activeSpot ? (
          <Dashboard
            spot={activeSpot}
            onEditSpot={() => {
              setEditingSpot(activeSpot);
              setSpotFormOpen(true);
            }}
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenMethod={() => setMethodOpen(true)}
            onChangeSetup={() => setView('setup')}
          />
        ) : (
          <SetupWizard onOpenDashboard={() => setView('dashboard')} />
        )}
      </main>

      <footer className="footer">
        <span>
          GG Sports-Nature — application locale d’aide à la décision. Les données appartiennent à leurs producteurs
          (Open-Meteo, OpenStreetMap, Hub’Eau, IGN/BAN, Natural Earth).
        </span>
        <span className="inline" style={{ gap: 12 }}>
          <button type="button" className="btn btn--quiet btn--sm" onClick={() => setMethodOpen(true)}>
            Sources & méthode
          </button>
          <span>v1.0</span>
        </span>
      </footer>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onOpenMethod={() => setMethodOpen(true)}
        onCreateSpot={() => {
          setSettingsOpen(false);
          setEditingSpot(null);
          setSpotFormOpen(true);
        }}
        onEditSpot={(spot) => {
          setSettingsOpen(false);
          setEditingSpot(spot);
          setSpotFormOpen(true);
        }}
      />
      <SourcesModal open={methodOpen} onClose={() => setMethodOpen(false)} />
      <SpotForm
        open={spotFormOpen}
        initial={editingSpot}
        onClose={() => {
          setSpotFormOpen(false);
          setEditingSpot(null);
        }}
        onSubmit={submitSpot}
      />
      <Toasts />
    </div>
  );
}
