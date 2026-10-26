import { useEffect, useMemo, useRef, useState } from 'react';
import * as L from 'leaflet';
import type { LayerGroup, Map as LeafletMap, TileLayer } from 'leaflet';
import { ArrowUpRight, Layers, MapPin, Navigation, Waves } from 'lucide-react';
import type { Environment, HydroStation, Spot } from '../../types';
import { Card, CardHead, Segmented } from '../ui/kit';

type BasemapId = 'plan' | 'relief' | 'satellite';

const BASEMAPS: Record<
  BasemapId,
  { label: string; url: string; attribution: string; maxZoom: number; subdomains?: string }
> = {
  plan: {
    label: 'Carte',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>',
    maxZoom: 20,
    subdomains: 'abcd',
  },
  relief: {
    label: 'Relief',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> &copy; <a href="https://opentopomap.org" target="_blank" rel="noopener">OpenTopoMap</a> (CC-BY-SA)',
    maxZoom: 17,
    subdomains: 'abc',
  },
  satellite: {
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Imagerie &copy; Esri, Maxar, Earthstar Geographics',
    maxZoom: 19,
  },
};

interface MapCardProps {
  spot: Spot;
  environment: Environment;
  waterActivity: boolean;
  stations: HydroStation[];
  delay?: number;
}

export function MapCard({ spot, environment, waterActivity, stations, delay = 0 }: MapCardProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const tileRef = useRef<TileLayer | null>(null);
  const overlayRef = useRef<LayerGroup | null>(null);
  const lastSpotRef = useRef<string>('');
  const [basemap, setBasemap] = useState<BasemapId>('plan');
  const [ready, setReady] = useState(false);

  const stationsKey = useMemo(
    () => stations.map((station) => `${station.code}:${station.lat.toFixed(3)}:${station.lon.toFixed(3)}`).join('|'),
    [stations],
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: true,
      scrollWheelZoom: false,
      attributionControl: true,
      center: [spot.lat, spot.lon],
      zoom: 12,
    });
    overlayRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setReady(true);
    const timer = window.setTimeout(() => map.invalidateSize(), 180);
    return () => {
      window.clearTimeout(timer);
      map.remove();
      mapRef.current = null;
      overlayRef.current = null;
      tileRef.current = null;
      setReady(false);
    };
    // The map is created once; coordinates are updated in the marker effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (tileRef.current) map.removeLayer(tileRef.current);
    const config = BASEMAPS[basemap];
    const layer = L.tileLayer(config.url, {
      attribution: config.attribution,
      maxZoom: config.maxZoom,
      subdomains: config.subdomains ?? 'abc',
      detectRetina: true,
    });
    layer.addTo(map);
    layer.bringToBack();
    tileRef.current = layer;
  }, [basemap, ready]);

  useEffect(() => {
    const map = mapRef.current;
    const group = overlayRef.current;
    if (!map || !group || !ready) return;
    group.clearLayers();

    const spotIcon = L.divIcon({
      className: 'spot-pin',
      html: '<span class="spot-pin__halo"></span><span class="spot-pin__dot"></span>',
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });
    L.marker([spot.lat, spot.lon], { icon: spotIcon, zIndexOffset: 1200 })
      .addTo(group)
      .bindTooltip(spot.name, { direction: 'top', offset: [0, -10], className: 'map-tooltip' });

    if (waterActivity && environment === 'mer') {
      L.circle([spot.lat, spot.lon], {
        radius: 5000,
        color: '#bd5f3d',
        weight: 1.2,
        dashArray: '4 6',
        fillColor: '#bd5f3d',
        fillOpacity: 0.05,
        interactive: false,
      }).addTo(group);
    }

    stations.forEach((station, index) => {
      const icon = L.divIcon({
        className: 'station-pin',
        html: `<span>${index + 1}</span>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      L.marker([station.lat, station.lon], { icon })
        .addTo(group)
        .bindTooltip(`Station ${index + 1} · ${station.name}`, {
          direction: 'top',
          offset: [0, -8],
          className: 'map-tooltip',
        });
    });

    const spotKey = `${spot.lat.toFixed(4)},${spot.lon.toFixed(4)}`;
    if (lastSpotRef.current !== spotKey) {
      const points: [number, number][] = [[spot.lat, spot.lon]];
      stations.forEach((station) => points.push([station.lat, station.lon]));
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds.pad(0.35), { maxZoom: 13, animate: false });
      lastSpotRef.current = spotKey;
    }
  }, [spot, stations, stationsKey, environment, waterActivity, ready]);

  const links = {
    osm: `https://www.openstreetmap.org/?mlat=${spot.lat}&mlon=${spot.lon}#map=13/${spot.lat}/${spot.lon}`,
    google: `https://www.google.com/maps/@${spot.lat},${spot.lon},13z`,
    geoportail: `https://www.geoportail.gouv.fr/carte?c=${spot.lon},${spot.lat}&z=13`,
  };

  return (
    <Card className="map-card" delay={delay} flush id="carte">
      <div className="map-card__head">
        <CardHead
          kicker="Carte · OpenStreetMap"
          title="Le spot en un regard"
          icon={<MapPin size={18} />}
          aside={
            <Segmented
              value={basemap}
              options={[
                { value: 'plan', label: 'Carte' },
                { value: 'relief', label: 'Relief' },
                { value: 'satellite', label: 'Satellite' },
              ]}
              onChange={setBasemap}
              label="Fond de carte"
              size="sm"
            />
          }
        />
      </div>

      <div className="map-card__canvas">
        <div className="map-canvas" ref={containerRef} />
        <div className="map-card__overlay">
          <span className="map-chip">
            <MapPin size={12} /> {spot.lat.toFixed(4)}, {spot.lon.toFixed(4)}
          </span>
          {waterActivity && environment === 'mer' ? (
            <span className="map-chip map-chip--sea">
              <Waves size={12} /> rayon 5 km
            </span>
          ) : null}
          <span className="map-chip map-chip--zoom">
            <Layers size={12} /> {BASEMAPS[basemap].label}
          </span>
        </div>
      </div>

      <div className="map-card__foot">
        <a href={links.osm} target="_blank" rel="noopener noreferrer" className="link-btn">
          <MapPin size={13} /> OpenStreetMap <ArrowUpRight size={12} />
        </a>
        <a href={links.google} target="_blank" rel="noopener noreferrer" className="link-btn">
          <Navigation size={13} /> Google Maps <ArrowUpRight size={12} />
        </a>
        <a href={links.geoportail} target="_blank" rel="noopener noreferrer" className="link-btn">
          <Layers size={13} /> Géoportail <ArrowUpRight size={12} />
        </a>
      </div>
    </Card>
  );
}
