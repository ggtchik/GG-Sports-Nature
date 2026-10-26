import { Crosshair, Fish, Footprints, Mountain, Sailboat, Waves } from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import type { ActivityId } from '../../types';

function Runner({ size = 24, strokeWidth = 1.7, className }: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="15.4" cy="4.4" r="2.1" />
      <path d="M14.2 7.1 12 12.3" />
      <path d="M12.6 9.1 9.2 10.4 7.1 9" />
      <path d="M13.4 9.3 17 11.2 18.5 13.7" />
      <path d="M12 12.3 14.7 15 15.1 19.4" />
      <path d="M12 12.3 8.9 15.3 9.6 19.5" />
    </svg>
  );
}

export function ActivityIcon({ id, ...props }: { id: ActivityId } & LucideProps) {
  switch (id) {
    case 'randonnee':
      return <Mountain {...props} />;
    case 'jogging':
      return <Runner {...props} />;
    case 'natation':
      return <Waves {...props} />;
    case 'voile':
      return <Sailboat {...props} />;
    case 'peche':
      return <Fish {...props} />;
    case 'chasse':
      return <Crosshair {...props} />;
    case 'balade':
    default:
      return <Footprints {...props} />;
  }
}
