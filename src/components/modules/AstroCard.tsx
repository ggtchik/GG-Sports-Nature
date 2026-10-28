import type { AstroInfo } from '../../core/astro';
import type { WeatherBundle } from '../../core/types';
import { num, timeOf } from '../../core/format';
import { MoonGlyph } from '../charts/MoonGlyph';
import { SunArc } from '../charts/SunArc';
import { Card, SourceFooter } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { Stat } from '../ui/Stat';

interface Props {
  astro: AstroInfo | null;
  weather: WeatherBundle | null;
  wallNow: string;
}

export function AstroCard({ astro, weather, wallNow }: Props) {
  if (!astro) {
    return (
      <Card title="Astronomie" icon="sun">
        <p className="note">Sélectionnez un spot pour calculer le soleil et la lune.</p>
      </Card>
    );
  }

  const apiDay = weather?.daily[0];
  const sunrise = apiDay?.sunrise ?? astro.sunrise;
  const sunset = apiDay?.sunset ?? astro.sunset;
  const daylight = apiDay?.daylightDurationS
    ? apiDay.daylightDurationS / 60
    : astro.daylightMinutes ?? null;

  return (
    <Card
      title="Astronomie"
      icon="sun"
      subtitle="Soleil et lune au spot, calculés localement"
      footer={<SourceFooter sources={['suncalc']} note={weather?.daily[0]?.sunrise ? 'Lever/coucher confirmés par Open-Meteo' : undefined} />}
    >
      <SunArc astro={{ ...astro, sunrise, sunset }} wallNow={wallNow} />

      <div className="stats">
        <Stat label="Lever" icon="sunrise" value={timeOf(sunrise)} />
        <Stat label="Coucher" icon="sunset" value={timeOf(sunset)} />
        <Stat
          label="Durée du jour"
          icon="clock"
          value={daylight === null ? '—' : `${Math.floor(daylight / 60)} h ${String(Math.round(daylight % 60)).padStart(2, '0')}`}
        />
        <Stat label="Midi solaire" icon="sun" value={timeOf(astro.solarNoon)} />
        <Stat label="Crépuscule" icon="moon" value={timeOf(astro.civilDusk)} hint="civil" />
        <Stat label="Heure dorée" icon="sparkles" value={timeOf(astro.goldenHourEvening)} hint="fin de journée" />
      </div>

      <div className="astro">
        <div className="moon">
          <MoonGlyph phase={astro.moon.phase} illumination={astro.moon.illumination} size={64} />
          <div>
            <div className="moon__value">{astro.moon.phaseName}</div>
            <div className="tiny dim">
              {num(astro.moon.illumination * 100, 0)} % éclairée · {num(astro.moon.ageDays, 1)} jours
            </div>
            <div className="tiny dim" style={{ marginTop: 4 }}>
              <Icon name="arrowUp" size={11} /> {astro.moon.rise ? timeOf(astro.moon.rise) : astro.moon.alwaysUp ? 'toujours levée' : 'pas de lever'}
              {'  ·  '}
              <Icon name="arrowDown" size={11} /> {astro.moon.set ? timeOf(astro.moon.set) : astro.moon.alwaysDown ? 'toujours couchée' : 'pas de coucher'}
            </div>
          </div>
        </div>
        <p className="note">
          Phase et illumination calculées dans le navigateur (SunCalc, algorithmes de Meeus) : précision de l’ordre de
          la minute.
        </p>
      </div>
    </Card>
  );
}
