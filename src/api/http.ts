/**
 * Client HTTP : délai maximal, messages d'erreur explicites et repli via le
 * relais local `/__proxy` lorsque le navigateur bloque la requête (CORS/réseau).
 * Aucune clé d'API n'est nécessaire pour les sources utilisées.
 */

export type HttpErrorKind = 'network' | 'http' | 'timeout' | 'parse';

export class HttpError extends Error {
  kind: HttpErrorKind;
  status?: number;
  url: string;

  constructor(message: string, kind: HttpErrorKind, url: string, status?: number) {
    super(message);
    this.name = 'HttpError';
    this.kind = kind;
    this.status = status;
    this.url = url;
  }
}

let proxyBase: string | null = null;

/** Active (ou désactive) le relais CORS local. */
export function setProxyBase(base: string | null): void {
  const trimmed = base?.trim();
  proxyBase = trimmed ? trimmed.replace(/\/$/, '') : null;
}

export function getProxyBase(): string | null {
  return proxyBase;
}

function canUseProxy(): boolean {
  if (!proxyBase) return false;
  return typeof window !== 'undefined' && /^https?:$/.test(window.location.protocol);
}

const DEFAULT_TIMEOUT = 18_000;

async function rawFetch(
  url: string,
  timeoutMs: number,
  signal?: AbortSignal,
  headers: Record<string, string> = { accept: 'application/json' },
): Promise<Response> {
  if (signal?.aborted) throw new HttpError('Requête annulée', 'network', url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort, { once: true });
  try {
    return await fetch(url, { signal: controller.signal, headers });
  } catch (error) {
    if (signal?.aborted) throw new HttpError('Requête annulée', 'network', url);
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new HttpError(`Délai dépassé (${Math.round(timeoutMs / 1000)} s)`, 'timeout', url);
    }
    throw new HttpError('Requête bloquée (réseau ou CORS)', 'network', url);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

export interface GetOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  /** Force le passage par le relais local (rare). */
  forceProxy?: boolean;
  accept?: 'json' | 'text';
}

export async function getText(url: string, options: GetOptions = {}): Promise<string> {
  const timeout = options.timeoutMs ?? DEFAULT_TIMEOUT;

  const headers = { accept: 'application/json', ...(options.headers ?? {}) };
  const attempt = async (target: string) => {
    const response = await rawFetch(target, timeout, options.signal, headers);
    if (!response.ok) {
      throw new HttpError(
        `Réponse ${response.status} ${response.statusText}`.trim(),
        'http',
        url,
        response.status,
      );
    }
    return response.text();
  };

  try {
    if (options.forceProxy) throw new HttpError('Relais demandé', 'network', url);
    return await attempt(url);
  } catch (error) {
    if (!canUseProxy() || (error instanceof HttpError && error.kind === 'http' && error.status === 404)) {
      throw error;
    }
    if (error instanceof HttpError && error.kind === 'http' && error.status && error.status !== 429 && error.status < 500) {
      throw error;
    }
    const proxied = `${proxyBase}?url=${encodeURIComponent(url)}`;
    try {
      return await attempt(proxied);
    } catch (proxyError) {
      throw proxyError instanceof HttpError ? proxyError : error;
    }
  }
}

export async function getJson<T>(url: string, options: GetOptions = {}): Promise<T> {
  const text = await getText(url, { ...options, accept: 'json' });
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new HttpError('Réponse illisible (JSON invalide)', 'parse', url);
  }
}

/** Message court et actionnable à afficher dans une carte en erreur. */
export function describeError(error: unknown): string {
  if (error instanceof HttpError) {
    switch (error.kind) {
      case 'network':
        return 'Source injoignable depuis ce navigateur (CORS ou réseau).';
      case 'timeout':
        return 'La source n’a pas répondu dans le délai imparti.';
      case 'http':
        return `La source a répondu ${error.status ?? ''}`.trim() + ' : donnée indisponible.';
      case 'parse':
        return 'Réponse illisible reçue de la source.';
    }
  }
  return 'Erreur inattendue lors de la récupération de la donnée.';
}
