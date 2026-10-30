const WEATHER_BASE = 'https://api.open-meteo.com/v1/forecast';
const MARINE_BASE = 'https://marine-api.open-meteo.com/v1/marine';
const GEOCODING_BASE = 'https://geocoding-api.open-meteo.com/v1/search';
const HYDRO_BASE = 'https://hubeau.eaufrance.fr/api/v2/hydrometrie';

async function fetchJson(url, signal) {
  const requestController = new AbortController();
  let timedOut = false;
  const timeout = window.setTimeout(() => {
    timedOut = true;
    requestController.abort();
  }, 15000);
  const abortRequest = () => requestController.abort();
  if (signal?.aborted) requestController.abort();
  else signal?.addEventListener('abort', abortRequest, { once: true });

  try {
    const response = await fetch(url, { signal: requestController.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Service indisponible (${response.status})`);
    return await response.json();
  } catch (error) {
    if (timedOut && !signal?.aborted) throw new Error('Délai de réponse dépassé. Réessayez dans un instant.');
    throw error;
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener('abort', abortRequest);
  }
}

export async function fetchWeather({ latitude, longitude }, signal) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'is_day',
      'precipitation',
      'rain',
      'weather_code',
      'cloud_cover',
      'pressure_msl',
      'wind_speed_10m',
      'wind_direction_10m',
      'wind_gusts_10m',
    ].join(','),
    hourly: [
      'temperature_2m',
      'apparent_temperature',
      'precipitation_probability',
      'precipitation',
      'cloud_cover',
      'uv_index',
      'wind_speed_10m',
      'wind_gusts_10m',
      'wind_direction_10m',
      'weather_code',
    ].join(','),
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'sunrise',
      'sunset',
      'uv_index_max',
      'precipitation_probability_max',
      'precipitation_sum',
      'wind_speed_10m_max',
      'wind_gusts_10m_max',
      'wind_direction_10m_dominant',
    ].join(','),
    timezone: 'auto',
    forecast_days: '5',
    wind_speed_unit: 'kmh',
    temperature_unit: 'celsius',
    precipitation_unit: 'mm',
  });

  return fetchJson(`${WEATHER_BASE}?${params.toString()}`, signal);
}

export async function fetchMarine({ latitude, longitude }, signal) {
  const currentFields = [
    'wave_height',
    'wave_direction',
    'wave_period',
    'swell_wave_height',
    'swell_wave_direction',
    'swell_wave_period',
    'sea_surface_temperature',
    'sea_level_height_msl',
  ].join(',');
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: currentFields,
    hourly: currentFields,
    daily: 'wave_height_max,wave_direction_dominant,wave_period_max,swell_wave_height_max,swell_wave_direction_dominant,swell_wave_period_max',
    timezone: 'auto',
    forecast_days: '5',
  });

  return fetchJson(`${MARINE_BASE}?${params.toString()}`, signal);
}

export async function searchPlaces(query, signal) {
  const params = new URLSearchParams({
    name: query.trim(),
    count: '6',
    language: 'fr',
    format: 'json',
  });
  const data = await fetchJson(`${GEOCODING_BASE}?${params.toString()}`, signal);
  return (data.results || []).map((place) => ({
    id: `${place.id ?? place.name}-${place.latitude}-${place.longitude}`,
    name: place.name,
    latitude: Number(place.latitude),
    longitude: Number(place.longitude),
    city: [place.admin3, place.admin2, place.admin1, place.country]
      .filter((value, index, values) => value && values.indexOf(value) === index)
      .slice(0, 3)
      .join(', '),
    country: place.country,
    countryCode: place.country_code,
    featureCode: place.feature_code,
    elevation: place.elevation,
  }));
}

function toXY(point, originLat, originLon) {
  const x = (Number(point.lon) - originLon) * 111.32 * Math.cos((originLat * Math.PI) / 180);
  const y = (Number(point.lat) - originLat) * 111.32;
  return { x, y };
}

function pointToSegmentKm(point, first, second) {
  const originLat = point.latitude;
  const originLon = point.longitude;
  const a = toXY(first, originLat, originLon);
  const b = toXY(second, originLat, originLon);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0
    ? 0
    : Math.max(0, Math.min(1, (-(a.x * dx + a.y * dy)) / lengthSquared));
  return Math.hypot(a.x + t * dx, a.y + t * dy);
}

export async function detectCoastContext({ latitude, longitude }, signal) {
  const query = `[out:json][timeout:15];way(around:5000,${latitude},${longitude})["natural"="coastline"];out geom;`;
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
  const data = await fetchJson(url, signal);
  const ways = (data.elements || []).filter((element) => element.type === 'way' && element.geometry?.length);

  if (ways.length === 0) {
    return { status: 'ok', context: 'freshwater', distanceKm: null, source: 'OpenStreetMap' };
  }

  let minimumDistance = Number.POSITIVE_INFINITY;
  for (const way of ways) {
    const geometry = way.geometry;
    if (geometry.length === 1) {
      minimumDistance = Math.min(
        minimumDistance,
        pointToSegmentKm({ latitude, longitude }, geometry[0], geometry[0]),
      );
      continue;
    }
    for (let index = 1; index < geometry.length; index += 1) {
      minimumDistance = Math.min(
        minimumDistance,
        pointToSegmentKm({ latitude, longitude }, geometry[index - 1], geometry[index]),
      );
    }
  }

  return {
    status: 'ok',
    context: minimumDistance < 5 ? 'sea' : 'freshwater',
    distanceKm: Number.isFinite(minimumDistance) ? minimumDistance : null,
    source: 'OpenStreetMap',
  };
}

function stationCoordinates(station) {
  const rawLatitude = station.latitude_station ?? station.latitude;
  const rawLongitude = station.longitude_station ?? station.longitude;
  if (rawLatitude === null || rawLatitude === undefined || rawLatitude === '' || rawLongitude === null || rawLongitude === undefined || rawLongitude === '') return null;
  const latitude = Number(rawLatitude);
  const longitude = Number(rawLongitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

function haversineKm(first, second) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(second.latitude - first.latitude);
  const longitudeDelta = toRadians(second.longitude - first.longitude);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(toRadians(first.latitude))
      * Math.cos(toRadians(second.latitude))
      * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchRecentObservations(code, grandeur, signal) {
  const params = new URLSearchParams({
    code_entite: code,
    grandeur_hydro: grandeur,
    size: '12',
    format: 'json',
  });
  const data = await fetchJson(`${HYDRO_BASE}/observations_tr?${params.toString()}`, signal);
  return (data.data || []).slice().sort((first, second) => new Date(second.date_obs) - new Date(first.date_obs));
}

export async function fetchNearbyHydrology({ latitude, longitude }, signal) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    distance: '20',
    size: '100',
    format: 'json',
  });
  const response = await fetchJson(`${HYDRO_BASE}/referentiel/stations?${params.toString()}`, signal);
  const nearby = (response.data || [])
    .filter((station) => station.en_service !== false && station.en_service !== 'Non')
    .map((station) => {
      const coordinates = stationCoordinates(station);
      return coordinates
        ? { station, coordinates, distanceKm: haversineKm({ latitude, longitude }, coordinates) }
        : null;
    })
    .filter(Boolean)
    .sort((first, second) => first.distanceKm - second.distanceKm)
    .slice(0, 5);

  return Promise.all(nearby.map(async ({ station, coordinates, distanceKm }) => {
    const code = station.code_station;
    if (!code) return null;
    const [heightResult, flowResult] = await Promise.allSettled([
      fetchRecentObservations(code, 'H', signal),
      fetchRecentObservations(code, 'Q', signal),
    ]);
    const rawHeightSeries = heightResult.status === 'fulfilled' ? heightResult.value : [];
    const rawFlowSeries = flowResult.status === 'fulfilled' ? flowResult.value : [];
    return {
      code,
      name: station.libelle_station || station.libelle_site || station.libelle_cours_eau || 'Station hydrométrique',
      watercourse: station.libelle_cours_eau || station.libelle_site || null,
      coordinates,
      distanceKm,
      rawHeightSeries,
      rawFlowSeries,
      rawHeight: rawHeightSeries[0] || null,
      rawFlow: rawFlowSeries[0] || null,
    };
  })).then((stations) => stations.filter(Boolean));
}
