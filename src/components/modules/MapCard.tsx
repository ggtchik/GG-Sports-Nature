import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { HydroStation, Milieu, Spot, StartPosition } from '../../core/types';
import { MARITIME_THRESHOLD_KM } from '../../core/coast';
import { Card, SourceFooter } from '../ui/Card';
import { Segmented } from '../ui/Segmented';
import { fetchWaterways, type WaterwayBundle } from '../../api/waterways';

interface Props {
  spot: Spot;
  start: StartPosition | null;
  stations: HydroStation[];
  milieu: Milieu;
  showMarine: boolean;
  showHydro: boolean;
  /** Calque « cours d'eau » (OSM) : pertinent en eau douce uniquement. */
  showWaterways: boolean;
}

const WATERWAY_STYLE: Record<string, { color: string; weight: number }> = {
  river: { color: '#2f6f8f', weight: 2.6 },
  canal: { color: '#3f7f5f', weight: 2.2 },
  stream: { color: '#5c93a8', weight: 1.4 },
  drain: { color: '#8a9a6a', weight: 1 },
  ditch: { color: '#a2ad86', weight: 1 },
};

type Basemap = 'plan' | 'relief';

const BASEMAPS: Record<Basemap, { url: string; attribution: string; maxZoom: number }> = {
  plan: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
  relief: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, SRTM — style <a href="https://opentopomap.org">OpenTopoMap</a> (CC BY-SA)',
    maxZoom: 17,
  },
};

export function MapCard({ spot, start, stations, milieu, showMarine, showHydro, showWaterways }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.TileLayer | null>(null);
  const overlayRef = useRef<L.LayerGroup | null>(null);
  const [basemap, setBasemap] = useState<Basemap>('plan');
  const [failed, setFailed] = useState(false);
  const [waterways, setWaterways] = useState<WaterwayBundle | null>(null);

  // Cours d'eau : chargés à la demande, uniquement pour les activités en eau douce.
  useEffect(() => {
    if (!showWaterways) return;
    const controller = new AbortController();
    fetchWaterways({ lat: spot.lat, lon: spot.lon }, controller.signal)
      .then((bundle) => {
        if (!controller.signal.aborted) setWaterways(bundle);
      })
      .catch(() => {
        /* la carte reste utilisable sans ce calque */
      });
    return () => controller.abort();
  }, [showWaterways, spot.lat, spot.lon]);

  const stationsKey = useMemo(() => stations.map((s) => s.code).join(','), [stations]);

  useEffect(() => {
    if (!container.current || mapRef.current) return;
    try {
      const map = L.map(container.current, {
      center: [spot.lat, spot.lon],
      zoom: 11,
      scrollWheelZoom: false,
      attributionControl: true,
      zoomControl: true,
    });
      mapRef.current = map;
      const tiles = L.tileLayer(BASEMAPS.plan.url, {
        maxZoom: BASEMAPS.plan.maxZoom,
        attribution: BASEMAPS.plan.attribution,
      }).addTo(map);
      layerRef.current = tiles;
      overlayRef.current = L.layerGroup().addTo(map);

      tiles.on('tileerror', () => setFailed(true));
      return () => {
        try {
          map.remove();
        } catch {
          /* le conteneur a déjà été démonté */
        }
        mapRef.current = null;
        layerRef.current = null;
        overlayRef.current = null;
      };
    } catch (error) {
      console.warn('Initialisation de la carte impossible', error);
      setFailed(true);
      return undefined;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fond de carte
  useEffect(() => {
    const map = mapRef.current;
    const current = layerRef.current;
    if (!map || !current) return;
    try {
      current.setUrl(BASEMAPS[basemap].url);
      map.eachLayer((layer) => {
        if (layer instanceof L.TileLayer) layer.setUrl(BASEMAPS[basemap].url);
      });
    } catch (error) {
      console.warn('Changement de fond de carte impossible', error);
    }
  }, [basemap]);

  // Marqueurs et tracés
  useEffect(() => {
    const map = mapRef.current;
    const group = overlayRef.current;
    if (!map || !group) return;
    try {
      group.clearLayers();
    } catch {
      return;
    }

    try {
    const bounds = L.latLngBounds(L.latLng(spot.lat, spot.lon), L.latLng(spot.lat, spot.lon));

    const spotIcon = L.divIcon({
      className: '',
      html: '<div class="map-pin map-pin--spot"><span>⚑</span></div>',
      iconSize: [30, 30],
      iconAnchor: [15, 28],
    });
    L.marker([spot.lat, spot.lon], { icon: spotIcon, title: spot.name, alt: spot.name })
      .addTo(group)
      .bindPopup(
        `<strong>${escapeHtml(spot.name)}</strong><br/>${spot.lat.toFixed(4)}, ${spot.lon.toFixed(4)}`,
      );

    if (start) {
      const startIcon = L.divIcon({
        className: '',
        html: '<div class="map-pin map-pin--start"><span style="font-size:10px">●</span></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      L.marker([start.lat, start.lon], { icon: startIcon, title: 'Départ' })
        .addTo(group)
        .bindPopup(`<strong>Départ</strong><br/>${escapeHtml(start.label)}`);
      bounds.extend([start.lat, start.lon]);

      if (milieu !== 'mer' || showMarine) {
        L.polyline(
          [
            [start.lat, start.lon],
            [spot.lat, spot.lon],
          ],
          { color: '#bd6437', weight: 2, dashArray: '5 6', opacity: 0.8 },
        ).addTo(group);
      }
    }

    if (showMarine) {
      L.circle([spot.lat, spot.lon], {
        radius: MARITIME_THRESHOLD_KM * 1000,
        color: '#1b5c72',
        weight: 1.2,
        fillColor: '#3d8ba3',
        fillOpacity: 0.07,
        dashArray: '3 5',
      }).addTo(group);
    }

    if (showWaterways) {
      for (const line of waterways?.lines ?? []) {
        const style = WATERWAY_STYLE[line.kind] ?? WATERWAY_STYLE.stream;
        const path: L.LatLngExpression[] = line.points.map(([lat, lon]) => [lat, lon]);
        const polyline = L.polyline(path, { color: style.color, weight: style.weight, opacity: 0.85 }).addTo(group);
        if (line.name) polyline.bindPopup(`<strong>${escapeHtml(line.name)}</strong>`);
        for (const point of line.points) bounds.extend(point);
      }
    }

    if (showHydro) {
      const stationIcon = L.divIcon({
        className: '',
        html: '<div class="map-pin map-pin--station"><span style="font-size:9px">≈</span></div>',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      stations.slice(0, 5).forEach((station) => {
        L.marker([station.lat, station.lon], { icon: stationIcon, title: station.name })
          .addTo(group)
          .bindPopup(
            `<strong>${escapeHtml(station.name)}</strong><br/>${station.river ? escapeHtml(station.river) + '<br/>' : ''}${station.distanceKm.toFixed(1)} km du spot`,
          );
        bounds.extend([station.lat, station.lon]);
      });
    }

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 14 });
    } else {
      map.setView([spot.lat, spot.lon], 11);
    }
    } catch (error) {
      console.warn('Mise à jour des calques impossible', error);
    }
  }, [spot, start, stations, stationsKey, showMarine, showHydro, showWaterways, waterways, milieu]);

  return (
    <Card
      title="Carte du spot"
      icon="layers"
      subtitle="Spot, départ, cours d’eau, environnement et stations de mesure"
      actions={
        <Segmented
          label="Fond de carte"
          size="sm"
          value={basemap}
          onChange={setBasemap}
          options={[
            { value: 'plan', label: 'Plan' },
            { value: 'relief', label: 'Relief' },
          ]}
        />
      }
      footer={
        <SourceFooter
          sources={['overpass']}
          note={
            showWaterways
              ? 'Cours d’eau et trait de côte OpenStreetMap (ODbL) · fonds de carte OSM / OpenTopoMap (CC BY-SA)'
              : 'Fonds de carte OpenStreetMap / OpenTopoMap (ODbL, CC BY-SA)'
          }
        />
      }
    >
      <div className="map">
        <div ref={container} className="map__canvas" style={{ position: 'absolute', inset: 0 }} />
        <div className="map__overlay map__overlay--bl">
          {showMarine && <span className="map__note">◯ Rayon {MARITIME_THRESHOLD_KM} km (seuil maritime)</span>}
          {showHydro && stations.length > 0 && <span className="map__note">≈ Stations hydrologiques</span>}
          {showWaterways && (waterways?.lines.length ?? 0) > 0 && (
            <span className="map__note">〰 Cours d’eau (survolez pour le nom)</span>
          )}
        </div>
      </div>
      {showWaterways && waterways?.error && <p className="note">{waterways.error}</p>}
      {failed && (
        <p className="note">
          Les tuiles cartographiques n’ont pas pu être chargées (réseau ou pare-feu). Le spot reste positionné et
          cliquable via le lien OpenStreetMap.
        </p>
      )}
    </Card>
  );
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}
