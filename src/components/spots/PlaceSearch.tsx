import { useRef, useState } from 'react';
import type { SearchResult } from '../../core/types';
import { searchPlaces } from '../../api/geocoding';
import { parseCoordinates } from '../../api/geocoding';
import { Icon } from '../ui/Icon';

interface Props {
  onSelect: (place: SearchResult) => void;
  placeholder?: string;
  autoFocus?: boolean;
  actionLabel?: string;
}

/** Recherche de lieu (BAN → Nominatim → Open-Meteo) + coordonnées GPS. */
export function PlaceSearch({ onSelect, placeholder = 'Adresse, commune, code postal, lieu…', autoFocus, actionLabel }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [state, setState] = useState<'idle' | 'loading' | 'error' | 'empty'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  const run = async (value?: string) => {
    const term = (value ?? query).trim();
    if (term.length < 2) {
      setState('error');
      setMessage('Saisissez au moins deux caractères.');
      return;
    }

    const coords = parseCoordinates(term);
    if (coords && !/[a-zA-ZÀ-ÿ]{2,}/.test(term.replace(/[NSEOW]/gi, ''))) {
      onSelect({
        lat: coords.lat,
        lon: coords.lon,
        label: `${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`,
        name: 'Coordonnées saisies',
        type: 'coordonnées',
        source: 'BAN',
      });
      return;
    }

    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setState('loading');
    setMessage(null);
    try {
      const outcome = await searchPlaces(term, controller.signal);
      setResults(outcome.results);
      setSource(outcome.source);
      setState(outcome.results.length ? 'idle' : 'empty');
      if (outcome.warning) setMessage(outcome.warning);
    } catch (error) {
      setResults([]);
      setSource(null);
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Recherche impossible.');
    }
  };

  return (
    <div className="stack" style={{ gap: 10 }}>
      <form
        className="input-group"
        onSubmit={(event) => {
          event.preventDefault();
          void run();
        }}
        role="search"
      >
        <div style={{ position: 'relative', flex: 1 }}>
          <span style={{ position: 'absolute', left: 12, top: 12, color: 'var(--ink-3)' }}>
            <Icon name="search" size={16} />
          </span>
          <input
            className="input"
            style={{ paddingLeft: 38 }}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
            autoFocus={autoFocus}
            aria-label="Rechercher un lieu"
            enterKeyHint="search"
          />
        </div>
        <button type="submit" className="btn btn--primary" aria-label={actionLabel ?? 'Rechercher'}>
          <Icon name="search" size={15} />
          <span className="btn__text">{state === 'loading' ? 'Recherche…' : (actionLabel ?? 'Rechercher')}</span>
        </button>
      </form>

      <p className="note" style={{ marginTop: -4 }}>
        France : Base Adresse Nationale · international : Nominatim. Vous pouvez aussi saisir des coordonnées
        (44.8378, -0.5792).
      </p>

      {state === 'loading' && <div className="skeleton skeleton--line" style={{ width: '60%' }} />}
      {message && (
        <p className="note" style={{ color: state === 'error' ? 'var(--err)' : 'var(--ink-3)' }}>
          {message}
        </p>
      )}

      {results.length > 0 && (
        <div className="list" role="listbox" aria-label="Résultats de recherche">
          {results.map((result, index) => (
            <button
              type="button"
              key={`${result.lat}-${result.lon}-${index}`}
              className="list__item"
              onClick={() => {
                onSelect(result);
                setQuery(result.label);
                setResults([]);
                setMessage(null);
              }}
              role="option"
              aria-selected={false}
            >
              <Icon name={result.type === 'street' || result.type === 'housenumber' ? 'pin' : 'compass'} size={16} />
              <span className="grow">
                <span style={{ display: 'block', fontSize: 13.5, fontWeight: 550 }}>{result.name || result.label}</span>
                <span className="tiny dim">
                  {result.label}
                  {result.commune ? ` · ${result.commune}` : ''}
                </span>
              </span>
              <span className="chip chip--outline" style={{ height: 22, fontSize: 10.5 }}>
                {source ?? result.source}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
