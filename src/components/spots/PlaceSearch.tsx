import { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin, Search } from 'lucide-react';
import type { GeoResult } from '../../lib/api/geocode';
import { searchPlaces } from '../../lib/api/geocode';

const SUGGESTIONS = ['Dune du Pilat', 'Lac d’Annecy', '33120', 'Étang de Thau', 'Cap Fréhel'];

export function PlaceSearch({
  onPick,
  autoFocus = false,
  compact = false,
  initialQuery = '',
}: {
  onPick: (result: GeoResult) => void;
  autoFocus?: boolean;
  compact?: boolean;
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<GeoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (autoFocus) {
      const timer = window.setTimeout(() => inputRef.current?.focus(), 120);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [autoFocus]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const found = await searchPlaces(trimmed, controller.signal);
        if (controller.signal.aborted) return;
        setResults(found);
      } catch (searchError) {
        if (controller.signal.aborted) return;
        setError(searchError instanceof Error ? searchError.message : 'Recherche indisponible');
        setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 650);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <div className={`place-search ${compact ? 'place-search--compact' : ''}`.trim()}>
      <div className="search-field">
        <Search size={16} className="search-field__icon" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          placeholder="Nom de lieu, adresse ou code postal…"
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Rechercher un lieu"
          autoComplete="off"
          spellCheck={false}
          data-autofocus={autoFocus ? 'true' : undefined}
        />
        {loading ? <Loader2 size={15} className="spin" /> : null}
      </div>

      {query.trim().length < 2 ? (
        <div className="search-suggestions">
          <p className="mini-label">Suggestions</p>
          <div className="search-suggestions__list">
            {SUGGESTIONS.map((suggestion) => (
              <button key={suggestion} type="button" onClick={() => setQuery(suggestion)}>
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {error ? <p className="search-error">{error}</p> : null}

      {results.length > 0 ? (
        <ul className="search-results">
          {results.map((result) => (
            <li key={result.id}>
              <button type="button" onClick={() => onPick(result)}>
                <span className="search-results__icon">
                  <MapPin size={15} />
                </span>
                <span className="search-results__text">
                  <strong>{result.name}</strong>
                  <span>{result.detail}</span>
                </span>
                {result.postcode ? <span className="search-results__postcode">{result.postcode}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {!loading && !error && query.trim().length >= 2 && results.length === 0 ? (
        <p className="search-empty">Aucun lieu trouvé. Essayez un code postal ou des coordonnées.</p>
      ) : null}
    </div>
  );
}
