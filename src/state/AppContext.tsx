import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { CostParams, Settings, Spot, StartPosition } from '../core/types';
import {
  DEFAULT_SETTINGS,
  loadState,
  newId,
  saveState,
  sortSpots,
} from '../core/storage';
import { setProxyBase } from '../api/http';
import { createUnits } from '../core/units';
import type { Units } from '../core/units';

export interface Toast {
  id: number;
  message: string;
  tone: 'info' | 'success' | 'error';
}

interface AppContextValue {
  settings: Settings;
  units: Units;
  spots: Spot[];
  activeSpot: Spot | null;
  toasts: Toast[];
  updateSettings: (patch: Partial<Settings>) => void;
  updateCosts: (patch: Partial<CostParams>) => void;
  setStart: (start: StartPosition | null) => void;
  addSpot: (input: Omit<Spot, 'id' | 'createdAt' | 'updatedAt'>) => Spot;
  updateSpot: (id: string, patch: Partial<Omit<Spot, 'id'>>) => void;
  removeSpot: (id: string) => void;
  selectSpot: (id: string | null) => void;
  notify: (message: string, tone?: Toast['tone']) => void;
  dismissToast: (id: number) => void;
  resetAll: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(() => {
    const state = loadState();
    // Première ouverture : on suit la préférence du système.
    const stored = typeof localStorage !== 'undefined' && localStorage.getItem('ggsn:state:v1');
    if (!stored && typeof window !== 'undefined' && window.matchMedia) {
      state.settings.theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return state;
  }, []);
  const [settings, setSettings] = useState<Settings>(initial.settings);
  const [spots, setSpots] = useState<Spot[]>(initial.spots);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    saveState({ settings, spots });
  }, [settings, spots]);

  useEffect(() => {
    setProxyBase(settings.proxy || null);
  }, [settings.proxy]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = settings.theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', settings.theme === 'dark' ? '#0b1a17' : '#0f3d33');
  }, [settings.theme]);

  const notify = useCallback((message: string, tone: Toast['tone'] = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-2), { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 4200);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const updateCosts = useCallback((patch: Partial<CostParams>) => {
    setSettings((prev) => ({ ...prev, costs: { ...prev.costs, ...patch } }));
  }, []);

  const setStart = useCallback((start: StartPosition | null) => {
    setSettings((prev) => ({ ...prev, start }));
  }, []);

  const addSpot = useCallback((input: Omit<Spot, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const spot: Spot = { ...input, id: newId(), createdAt: now, updatedAt: now };
    setSpots((prev) => sortSpots([...prev, spot]));
    setSettings((prev) => ({ ...prev, activeSpotId: spot.id }));
    return spot;
  }, []);

  const updateSpot = useCallback((id: string, patch: Partial<Omit<Spot, 'id'>>) => {
    setSpots((prev) =>
      sortSpots(
        prev.map((spot) =>
          spot.id === id ? { ...spot, ...patch, updatedAt: new Date().toISOString() } : spot,
        ),
      ),
    );
  }, []);

  const removeSpot = useCallback((id: string) => {
    setSpots((prev) => prev.filter((spot) => spot.id !== id));
    setSettings((prev) =>
      prev.activeSpotId === id ? { ...prev, activeSpotId: null } : prev,
    );
  }, []);

  const selectSpot = useCallback((id: string | null) => {
    setSettings((prev) => ({ ...prev, activeSpotId: id }));
  }, []);

  const resetAll = useCallback(() => {
    setSpots([]);
    setSettings({ ...DEFAULT_SETTINGS });
  }, []);

  const units = useMemo(() => createUnits(settings.units), [settings.units]);

  const activeSpot = useMemo(
    () => spots.find((spot) => spot.id === settings.activeSpotId) ?? null,
    [spots, settings.activeSpotId],
  );

  const value: AppContextValue = {
    settings,
    units,
    spots,
    activeSpot,
    toasts,
    updateSettings,
    updateCosts,
    setStart,
    addSpot,
    updateSpot,
    removeSpot,
    selectSpot,
    notify,
    dismissToast,
    resetAll,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp doit être utilisé dans AppProvider');
  return context;
}
