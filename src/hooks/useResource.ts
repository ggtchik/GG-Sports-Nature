import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '../lib/api/http';

export interface ResourceState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  updatedAt: number | null;
}

export interface Resource<T> extends ResourceState<T> {
  reload: () => void;
}

interface Options<T> {
  enabled?: boolean;
  /** When demo mode is on, this is used instead of hitting the network. */
  demo?: (() => T) | null;
  demoMode?: boolean;
}

/**
 * Small async data hook with abort handling, manual reload and an optional
 * deterministic demo source.
 */
export function useResource<T>(
  key: string,
  loader: (signal: AbortSignal) => Promise<T>,
  options: Options<T> = {},
): Resource<T> {
  const { enabled = true, demo = null, demoMode = false } = options;
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const demoRef = useRef(demo);
  demoRef.current = demo;

  const [state, setState] = useState<ResourceState<T>>({
    data: null,
    loading: enabled,
    error: null,
    updatedAt: null,
  });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setState({ data: null, loading: false, error: null, updatedAt: null });
      return;
    }

    if (demoMode && demoRef.current) {
      try {
        const data = demoRef.current();
        setState({ data, loading: false, error: null, updatedAt: Date.now() });
      } catch {
        setState({ data: null, loading: false, error: 'Données de démonstration indisponibles', updatedAt: null });
      }
      return;
    }

    const controller = new AbortController();
    let alive = true;
    setState((previous) => ({ ...previous, loading: true, error: null }));

    loaderRef
      .current(controller.signal)
      .then((data) => {
        if (!alive) return;
        setState({ data, loading: false, error: null, updatedAt: Date.now() });
      })
      .catch((error: unknown) => {
        if (!alive || controller.signal.aborted) return;
        setState({ data: null, loading: false, error: errorMessage(error), updatedAt: null });
      });

    return () => {
      alive = false;
      controller.abort();
    };
  }, [key, enabled, demoMode, nonce]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  return { ...state, reload };
}
