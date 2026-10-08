import { Zap } from 'lucide-react';
import { AlertBanner } from '../../../components/ui';
import { listenZones } from '../../../data/db';
import { useT } from '../../../i18n';
import { useLive } from './hooks';

const TONE = { on: 'var(--orange)', rotating: 'var(--orange)', off: 'var(--red)' };

// Shown while the society runs on the generator: what power my tower has and what to do.
export default function PowerNotice({ powerSource, zoneId }) {
  const { t } = useT();
  const isDg = powerSource === 'dg';
  const zones = useLive(isDg ? listenZones : null).data;
  if (!isDg) return null;
  const zone = zones?.find(z => z.id === zoneId);
  const state = zone?.power_state;
  return (
    <AlertBanner tone={TONE[state] || 'var(--orange)'} icon={Zap} role="status">
      <p className="semibold">{t('resident.dgTitle')}</p>
      {state && (
        <>
          <p>{t(`resident.power_${state}`, { zone: zone.name })}</p>
          <p className="muted">{t(`resident.powerAdvice_${state}`)}</p>
        </>
      )}
    </AlertBanner>
  );
}
