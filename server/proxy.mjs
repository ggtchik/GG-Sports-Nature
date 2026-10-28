/**
 * Secours CORS local.
 *
 * Certaines API publiques (Hub'Eau, Overpass, …) sont parfois bloquées par la
 * politique CORS d'un navigateur, d'une extension ou d'un réseau d'entreprise.
 * GG Sports-Nature interroge TOUJOURS les API en direct ; si la requête échoue
 * au niveau réseau, elle est rejouée via ce proxy local (même origine), qui
 * relaie uniquement une liste blanche d'hôtes.
 */
import { Readable } from 'node:stream';

export const ALLOWED_HOSTS = new Set([
  'api.open-meteo.com',
  'marine-api.open-meteo.com',
  'flood-api.open-meteo.com',
  'geocoding-api.open-meteo.com',
  'api-adresse.data.gouv.fr',
  'nominatim.openstreetmap.org',
  'router.project-osrm.org',
  'routing.openstreetmap.de',
  'hubeau.eaufrance.fr',
  'www.vigicrues.gouv.fr',
  'overpass-api.de',
  'overpass.kumi.systems',
  'overpass.private.coffee',
  'api-maree.fr',
]);

const TIMEOUT_MS = 20_000;

/** @param {Request} request @param {Response} response */
function cors(response) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

/**
 * Relaie une requête `/__proxy?url=…` vers un hôte autorisé.
 * Compatible middleware Vite/Connect et serveur Node natif.
 */
export async function handleProxyRequest(req, res) {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const target = url.searchParams.get('url');

  if (!target) {
    res.writeHead(400, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'Paramètre "url" manquant.' }));
    return;
  }

  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    res.writeHead(400, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'URL invalide.' }));
    return;
  }

  if (parsed.protocol !== 'https:' || !ALLOWED_HOSTS.has(parsed.hostname)) {
    res.writeHead(403, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: `Hôte non autorisé : ${parsed.hostname}` }));
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const upstream = await fetch(parsed, {
      signal: controller.signal,
      headers: {
        accept: 'application/json',
        'user-agent': 'GG-Sports-Nature/1.0 (application locale)',
      },
    });
    const body = Buffer.from(await upstream.arrayBuffer());
    res.writeHead(upstream.status, {
      'content-type': upstream.headers.get('content-type') ?? 'application/json',
      'access-control-allow-origin': '*',
      'cache-control': 'no-store',
    });
    res.end(body);
  } catch (error) {
    res.writeHead(502, { 'content-type': 'application/json' });
    res.end(
      JSON.stringify({
        error: 'Relais indisponible',
        detail: error instanceof Error ? error.message : String(error),
      }),
    );
  } finally {
    clearTimeout(timer);
  }
}

/** Variante Web-standard (Fetch API), utilisée par le middleware Vite. */
export async function proxyFetch(request) {
  const url = new URL(request.url);
  const target = url.searchParams.get('url');
  if (!target) return new Response(JSON.stringify({ error: 'url manquant' }), { status: 400 });

  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    return new Response(JSON.stringify({ error: 'URL invalide' }), { status: 400 });
  }
  if (parsed.protocol !== 'https:' || !ALLOWED_HOSTS.has(parsed.hostname)) {
    return new Response(JSON.stringify({ error: 'Hôte non autorisé' }), { status: 403 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const upstream = await fetch(parsed, {
      signal: controller.signal,
      headers: { accept: 'application/json', 'user-agent': 'GG-Sports-Nature/1.0' },
    });
    return cors(
      new Response(Readable.toWeb(Readable.fromWeb(upstream.body)) ?? upstream.body, {
        status: upstream.status,
        headers: {
          'content-type': upstream.headers.get('content-type') ?? 'application/json',
        },
      }),
    );
  } finally {
    clearTimeout(timer);
  }
}
