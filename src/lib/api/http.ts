export class ApiError extends Error {
  readonly url: string;
  readonly status?: number;

  constructor(message: string, url: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.url = url;
    this.status = status;
  }
}

interface GetOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

export async function getJSON<T>(url: string, options: GetOptions = {}): Promise<T> {
  const { signal, timeoutMs = 18_000, headers } = options;
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timer = window.setTimeout(abort, timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json', ...headers },
    });
    if (!response.ok) {
      throw new ApiError(
        `Le service a répondu ${response.status}`,
        url,
        response.status,
      );
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (controller.signal.aborted && !signal?.aborted) {
      throw new ApiError('Le service met trop de temps à répondre', url);
    }
    if (signal?.aborted) throw error;
    throw new ApiError(
      navigator.onLine
        ? 'Service injoignable (réseau ou CORS)'
        : 'Vous semblez hors ligne',
      url,
    );
  } finally {
    window.clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Erreur inattendue';
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export const API = {
  weather: 'https://api.open-meteo.com/v1/forecast',
  marine: 'https://marine-api.open-meteo.com/v1/marine',
  geocode: 'https://geocoding-api.open-meteo.com/v1/search',
  nominatim: 'https://nominatim.openstreetmap.org',
  hydro: 'https://hubeau.eaufrance.fr/api/v2/hydrometrie',
} as const;

export const SOURCE_URLS = {
  openMeteo: 'https://open-meteo.com/',
  meteoFrance: 'https://meteofrance.com/',
  meteoFranceMarine: 'https://meteofrance.com/meteo-marine',
  vigilance: 'https://vigilance.meteofrance.fr/fr',
  windy: 'https://www.windy.com/',
  windguru: 'https://www.windguru.cz/',
  surfReport: 'https://www.surf-report.com/',
  mareeInfo: 'https://www.maree.info/',
  shom: 'https://www.shom.fr/',
  dataShom: 'https://data.shom.fr/',
  vigicrues: 'https://www.vigicrues.gouv.fr/',
  hydroPortail: 'https://hydro.eaufrance.fr/',
  hubeau: 'https://hubeau.eaufrance.fr/page/api-hydrometrie',
  osm: 'https://www.openstreetmap.org/',
  geoportail: 'https://www.geoportail.gouv.fr/',
  meteoAgricole: 'https://www.meteoagricole.net/',
  meteoConsult: 'https://www.meteoconsult.fr/',
  naturalEarth: 'https://www.naturalearthdata.com/',
} as const;
