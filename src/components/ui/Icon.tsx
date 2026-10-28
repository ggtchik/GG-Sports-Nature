/** Jeu d'icônes unique (trait 1,6 px, grille 24, currentColor). */
import type { SVGProps } from 'react';

export type IconName =
  | 'sun'
  | 'moon'
  | 'cloud'
  | 'cloudSun'
  | 'rain'
  | 'drizzle'
  | 'snow'
  | 'fog'
  | 'storm'
  | 'wind'
  | 'thermometer'
  | 'gauge'
  | 'compass'
  | 'pin'
  | 'navigation'
  | 'car'
  | 'fuel'
  | 'euro'
  | 'clock'
  | 'calendar'
  | 'search'
  | 'locate'
  | 'settings'
  | 'refresh'
  | 'close'
  | 'chevronDown'
  | 'chevronRight'
  | 'external'
  | 'info'
  | 'alert'
  | 'check'
  | 'trash'
  | 'edit'
  | 'plus'
  | 'waves'
  | 'anchor'
  | 'sunrise'
  | 'sunset'
  | 'eye'
  | 'users'
  | 'layers'
  | 'link'
  | 'database'
  | 'droplet'
  | 'mountain'
  | 'arrowUp'
  | 'arrowDown'
  | 'arrowRight'
  | 'minus'
  | 'sparkles'
  | 'clipboard';

const PATHS: Record<IconName, string> = {
  sun: 'M12 4.5v-2M12 21.5v-2M4.5 12h-2M21.5 12h-2M6.3 6.3 4.9 4.9M19.1 19.1l-1.4-1.4M17.7 6.3l1.4-1.4M4.9 19.1l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  moon: 'M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z',
  cloud: 'M6.5 18a4 4 0 0 1-.4-8A5.5 5.5 0 0 1 17 9.6a3.7 3.7 0 0 1 .4 8.4H6.5Z',
  cloudSun: 'M12 5.5V4M5.5 12H4M7.3 7.3 6.2 6.2M6.2 17.8l1.1-1.1M15.5 5.8l.8-1M19 10h1.5M7.5 19a3.5 3.5 0 0 1-.3-7 4.6 4.6 0 0 1 8.8 1.2A3.2 3.2 0 0 1 15.5 19H7.5Z',
  rain: 'M6.5 15a4 4 0 0 1-.4-8A5.5 5.5 0 0 1 17 6.6a3.7 3.7 0 0 1 .4 8.4M8 18l-1 2.5M12 18l-1 2.5M16 18l-1 2.5',
  drizzle: 'M6.5 15a4 4 0 0 1-.4-8A5.5 5.5 0 0 1 17 6.6a3.7 3.7 0 0 1 .4 8.4M9 19h.01M12.5 19h.01M16 19h.01',
  snow: 'M6.5 14a4 4 0 0 1-.4-8A5.5 5.5 0 0 1 17 5.6a3.7 3.7 0 0 1 .4 8.4M9 18.5v.01M13 18.5v.01M17 18.5v.01M11 21v.01M15 21v.01',
  fog: 'M4 9.5a4 4 0 0 1 4-4 5.5 5.5 0 0 1 10 2.2 3.3 3.3 0 0 1-.5 6.6H6M4 16.5h9M14 19h6',
  storm: 'M6.5 14a4 4 0 0 1-.4-8A5.5 5.5 0 0 1 17 5.6a3.7 3.7 0 0 1 .4 8.4M13 12l-3 4h4l-2 4.5',
  wind: 'M3 8.5h11a2.5 2.5 0 1 0-2.5-2.5M3 12h15a2.5 2.5 0 1 1-2.5 2.5M3 15.5h7a2 2 0 1 1-2 2',
  thermometer: 'M10 13.7V5a2 2 0 1 1 4 0v8.7a4 4 0 1 1-4 0Z',
  gauge: 'M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18Zm3.5-12.5L12 12',
  compass: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm2.8-11.8-1.7 4.3-4.3 1.7 1.7-4.3 4.3-1.7Z',
  pin: 'M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  navigation: 'M3.5 20.5 20.5 12 3.5 3.5l2.2 8.5 8.3.5-8.3.6-2.2 7.4Z',
  car: 'M5 16.5h14M6.5 16.5V19M17.5 16.5V19M4.5 16.5v-3.2l1.7-4.6a2 2 0 0 1 1.9-1.3h7.8a2 2 0 0 1 1.9 1.3l1.7 4.6v3.2H4.5Zm0-3.5h15M7.5 14.5h.01M16.5 14.5h.01',
  fuel: 'M5 21V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v16M4 21h10M8 8h2M13 9h3a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0V9l-2.5-2.5',
  euro: 'M17.5 6.5a7 7 0 1 0 0 11M4.5 10.5h8M4.5 13.5h7',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v5l3.2 2',
  calendar: 'M4.5 7.5h15v12h-15v-12Zm3-3v3M16.5 4.5v3M4.5 11.5h15',
  search: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Zm5-1.5 4.5 4.5',
  locate: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7.5 7.5 0 0 0-2-1.2L14.6 3H9.4l-.4 2.5a7.5 7.5 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5a7.4 7.4 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a7.5 7.5 0 0 0 2 1.2l.4 2.5h5.2l.4-2.5a7.5 7.5 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z',
  refresh: 'M20 12a8 8 0 1 1-2.6-5.9M20 4v4.5h-4.5',
  close: 'M6 6l12 12M18 6 6 18',
  chevronDown: 'M6 9l6 6 6-6',
  chevronRight: 'M9 6l6 6-6 6',
  external: 'M14 4h6v6M20 4 11 13M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13h.01M11 12h1v5h1',
  alert: 'M12 3 2.5 20h19L12 3Zm0 6v5.5M12 17.5h.01',
  check: 'M4.5 12.5 9 17l10.5-10.5',
  trash: 'M4.5 7h15M9.5 7V4.5h5V7M6.5 7l.8 13h9.4l.8-13M10.5 10.5v6M13.5 10.5v6',
  edit: 'M4.5 19.5h4L20 8l-4-4L4.5 15.5v4Zm9.5-14 4 4',
  plus: 'M12 5v14M5 12h14',
  waves: 'M2.5 8.5c2-2 4-2 6 0s4 2 6 0 4-2 6 0M2.5 13c2-2 4-2 6 0s4 2 6 0 4-2 6 0M2.5 17.5c2-2 4-2 6 0s4 2 6 0 4-2 6 0',
  anchor: 'M12 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm0 0v13m-4-2.5a4 4 0 0 1-4-4M16 14.5a4 4 0 0 0 4-4M4 14.5h3M17 14.5h3',
  sunrise: 'M12 3v5M5.5 12a6.5 6.5 0 0 1 13 0M2.5 12h2M19.5 12h2M6 9l-1.5-1.5M18 9l1.5-1.5M3 18h18M8 21h8',
  sunset: 'M12 8V3M5.5 15a6.5 6.5 0 0 1 13 0M2.5 15h2M19.5 15h2M6 12l-1.5-1.5M18 12l1.5-1.5M3 19h18',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Zm9.5 2.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7.5.5a3 3 0 1 0 0-6M2.5 20v-1.5A4.5 4.5 0 0 1 7 14h4a4.5 4.5 0 0 1 4.5 4.5V20M17 14a4 4 0 0 1 4.5 4v2',
  layers: 'm12 3 9 5-9 5-9-5 9-5Zm9 9-9 5-9-5m18 4.5-9 5-9-5',
  link: 'M10 13.5a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 0 0-5.7-5.7l-1 1M14 10.5a4 4 0 0 0-5.7 0l-2.8 2.8a4 4 0 0 0 5.7 5.7l1-1',
  database: 'M12 8c4.4 0 8-1.3 8-3s-3.6-3-8-3-8 1.3-8 3 3.6 3 8 3Zm8-3v14c0 1.7-3.6 3-8 3s-8-1.3-8-3V5m16 7c0 1.7-3.6 3-8 3s-8-1.3-8-3',
  droplet: 'M12 3.5s6 6.2 6 10.2a6 6 0 0 1-12 0C6 9.7 12 3.5 12 3.5Z',
  mountain: 'M2.5 19h19L14 5l-3.5 6.5L8 8l-5.5 11Z',
  arrowUp: 'M12 19V5M6 11l6-6 6 6',
  arrowDown: 'M12 5v14M6 13l6 6 6-6',
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  minus: 'M5 12h14',
  sparkles: 'M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3Zm7 10 .9 2.3 2.3.9-2.3.9L19 19.4l-.9-2.3-2.3-.9 2.3-.9L19 13ZM5 14l.7 1.8 1.8.7-1.8.7L5 19l-.7-1.8-1.8-.7 1.8-.7L5 14Z',
  clipboard: 'M9 4.5H7a1.5 1.5 0 0 0-1.5 1.5v13A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V6A1.5 1.5 0 0 0 17 4.5h-2M9 4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5v1h-6v-1ZM8 10h8M8 13.5h8M8 17h5',
};

export function Icon({
  name,
  size = 18,
  ...props
}: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
