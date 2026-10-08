// Society → Power: grid / DG switch, per-zone power by tier, recent switches.
import { useState } from 'react';
import { ChevronsUpDown, History, Zap } from 'lucide-react';
import { Badge, EmptyState, Field, Segmented } from '../../../components/ui';
import { POWER_STATES, TIERS } from '../../../config/society';
import { errorMessage, listenSociety, listenZones, setPowerSource, setZonePower } from '../../../data/db';
import { listenPowerEvents } from '../../../data/admin';
import { useConfirm } from '../../../context/DialogContext';
import { useToast } from '../../../context/ToastContext';
import { useT } from '../../../i18n';
import { dateTime } from '../../../utils/time';
import { useLive } from './hooks';
import { IconTile, LoadError, Loading } from './ui';

const ZONE_STATES = ['on', 'rotating', 'off'];

export default function PowerPanel() {
  const { t, lang } = useT();
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const society = useLive((ok, err) => listenSociety(ok, err), 'society');
  const zones = useLive((ok, err) => listenZones(ok, err), 'zones');
  const events = useLive((ok, err) => listenPowerEvents(ok, err, 8), 'power-events');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [zoneBusy, setZoneBusy] = useState(null);

  const source = society.data?.power_source || 'grid';
  const onDG = source === 'dg';

  const switchSource = async (next) => {
    if (busy || next === source) return;
    const toDG = next === 'dg';
    const ok = await confirm(
      toDG ? t('admin.confirmDGTitle') : t('admin.confirmGridTitle'),
      toDG ? t('admin.confirmDGText') : t('admin.confirmGridText'),
      { confirmLabel: toDG ? t('admin.switchToDG') : t('admin.switchToGrid'), destructive: toDG },
    );
    if (!ok) return;
    setBusy(true);
    try {
      await setPowerSource(next, note.trim());
      setNote('');
      showToast(toDG ? t('admin.nowOnDG') : t('admin.nowOnGrid'), 'success');
    } catch (err) {
      showToast(errorMessage(err, t), 'error');
    } finally {
      setBusy(false);
    }
  };

  const changeZone = async (zone, state) => {
    if (zoneBusy || state === zone.power_state) return;
    if (state === 'off') {
      const ok = await confirm(
        t('admin.confirmZoneOffTitle', { zone: zone.name }),
        t('admin.confirmZoneOffText'),
        { confirmLabel: t('admin.turnOff'), destructive: true },
      );
      if (!ok) return;
    }
    setZoneBusy(zone.id);
    try {
      await setZonePower(zone.id, state);
      showToast(t('admin.zonePowerSet', { zone: zone.name, state: t(`admin.power_${state}`) }), 'success');
    } catch (err) {
      showToast(errorMessage(err, t), 'error');
    } finally {
      setZoneBusy(null);
    }
  };

  return (
    <div className="stack-lg">
      <section className="card stack" aria-labelledby="power-source-title">
        <div className="row">
          <IconTile icon={Zap} tone={onDG ? 'var(--orange)' : 'var(--green)'} size="md" />
          <div className="grow">
            <h2 id="power-source-title" className="text-sm muted semibold">{t('admin.powerSource')}</h2>
            {society.data && (
              <p className="admin-power-now">{onDG ? t('admin.sourceDG') : t('admin.sourceGrid')}</p>
            )}
          </div>
        </div>
        {society.error && <LoadError error={society.error} onRetry={society.retry} />}
        {society.loading && <Loading />}
        {society.data && (
          <>
            <div className="admin-seg-lg">
              <Segmented
                label={t('admin.powerSource')}
                value={source}
                onChange={switchSource}
                options={[
                  { value: 'grid', label: t('admin.grid') },
                  { value: 'dg', label: t('admin.backupDG') },
                ]}
              />
            </div>
            <Field label={t('admin.switchNote')} htmlFor="power-note" hint={t('admin.switchNoteHint')}>
              <input
                id="power-note"
                className="input admin-input"
                value={note}
                maxLength={200}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t('admin.switchNotePlaceholder')}
              />
            </Field>
            <p className="text-sm muted">{t('admin.tierRule')}</p>
          </>
        )}
      </section>

      <section aria-labelledby="zones-title">
        <h2 id="zones-title" className="section-title">{t('admin.zonesByTier')}</h2>
        {zones.error && <LoadError error={zones.error} onRetry={zones.retry} />}
        {zones.loading && <Loading />}
        <div className="stack">
          {Object.keys(TIERS).map(tier => {
            const list = (zones.data || []).filter(z => z.tier === tier);
            if (!list.length) return null;
            return (
              <div key={tier}>
                <h3 className="admin-tier-title">
                  <Badge tone={TIERS[tier].tone}>{tier}</Badge>
                  <span>{t(`admin.tier_${tier}`)}</span>
                </h3>
                <div className="card settings-group">
                  {list.map(z => (
                    <label key={z.id} className="settings-row admin-zone">
                      <span className="grow">{z.name}</span>
                      <span className="admin-zone__pick" style={{ '--tone': POWER_STATES[z.power_state]?.tone }} aria-busy={zoneBusy === z.id || undefined}>
                        <select
                          className="admin-zone__select"
                          aria-label={t('admin.zonePowerFor', { zone: z.name })}
                          value={z.power_state}
                          disabled={zoneBusy === z.id}
                          onChange={(e) => changeZone(z, e.target.value)}
                        >
                          {ZONE_STATES.map(st => <option key={st} value={st}>{t(`admin.power_${st}`)}</option>)}
                        </select>
                        <ChevronsUpDown size={16} aria-hidden="true" />
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="switches-title">
        <h2 id="switches-title" className="section-title">{t('admin.recentSwitches')}</h2>
        {events.error && <LoadError error={events.error} onRetry={events.retry} />}
        {events.loading && <Loading />}
        {events.data && events.data.length === 0 && (
          <div className="card">
            <EmptyState icon={History} title={t('admin.noSwitches')} text={t('admin.noSwitchesText')} />
          </div>
        )}
        {events.data?.length > 0 && (
          <div className="card settings-group">
            {events.data.map(e => (
              <div key={e.id} className="settings-row">
                <IconTile icon={Zap} tone={e.source === 'dg' ? 'var(--orange)' : 'var(--green)'} />
                <div className="grow">
                  <p className="semibold">{e.source === 'dg' ? t('admin.switchedToDG') : t('admin.switchedToGrid')}</p>
                  <p className="text-sm muted">
                    {[e.by?.full_name, dateTime(e.switched_at, lang)].filter(Boolean).join(' · ')}
                  </p>
                  {e.note && <p className="text-sm">{e.note}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
