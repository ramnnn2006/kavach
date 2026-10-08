// Admin Safety Check — start a roll call for a tower or the whole society and watch answers live.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleCheck, History, ShieldCheck, Siren } from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import { Badge, Button, EmptyState, Field, PageHeader, Segmented, Stat } from '../../components/ui';
import { TYPE_ORDER } from '../../config/society';
import {
  endSafetyCheck, errorMessage, listenActiveSafetyCheck, listenMembers, listenZones, startSafetyCheck,
} from '../../data/db';
import { listenRollCall, listenSafetyChecks } from '../../data/admin';
import { useConfirm } from '../../context/DialogContext';
import { useToast } from '../../context/ToastContext';
import { useT } from '../../i18n';
import { clock, dateTime, minutesBetween, timeAgo, toMillis } from '../../utils/time';
import { useLive, useNow } from './parts/hooks';
import { hasVulnerability, memberFlat, vulnerabilityLabels } from './parts/format';
import { CallLink, IconTile, LoadError, Loading } from './parts/ui';
import '../../styles/admin.css';

const MESSAGE_MAX = 300;

function scopeLabel(check, t) {
  return check.scope === 'zone' ? (check.zone?.name || t('admin.oneTower')) : t('admin.wholeSociety');
}

function PersonRow({ m, children, trailing }) {
  const { t } = useT();
  return (
    <div className="settings-row admin-person">
      <div className="grow admin-person__body">
        <p className="semibold">{m?.full_name || t('admin.unknownPerson')}</p>
        <p className="text-sm muted">{memberFlat(m) || t('admin.noFlat')}</p>
        {children}
      </div>
      {trailing}
    </div>
  );
}

function ActiveCheck({ check, members, now }) {
  const { t, lang } = useT();
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const roll = useLive((ok, err) => listenRollCall(check.id, ok, err), `roll:${check.id}`);
  const [ending, setEnding] = useState(false);

  const summary = roll.data?.summary || { in_scope: 0, safe: 0, need_help: 0, unanswered: 0 };
  const responses = roll.data?.responses || [];
  const byId = new Map((members || []).map(m => [m.id, m]));
  const answered = new Set(responses.map(r => r.profile_id));
  const inScope = (members || []).filter(m => m.role === 'resident'
    && (check.scope === 'society' || m.flat?.zone?.name === check.zone?.name));
  const notAnswered = inScope.filter(m => !answered.has(m.id))
    .sort((a, b) => Number(hasVulnerability(b.vulnerability)) - Number(hasVulnerability(a.vulnerability))
      || (a.full_name || '').localeCompare(b.full_name || ''));
  const needHelp = responses.filter(r => r.status === 'need_help');
  const safe = responses.filter(r => r.status === 'safe')
    .sort((a, b) => (toMillis(b.responded_at) || 0) - (toMillis(a.responded_at) || 0));

  const total = Number(summary.in_scope) || 0;
  const pct = (n) => (total ? Math.min(100, (Number(n) / total) * 100) : 0);
  const answeredCount = Number(summary.safe) + Number(summary.need_help);

  const end = async () => {
    const ok = await confirm(t('admin.endCheckTitle'), t('admin.endCheckText', { n: summary.unanswered }), {
      confirmLabel: t('admin.endCheck'), destructive: true,
    });
    if (!ok) return;
    setEnding(true);
    try {
      await endSafetyCheck(check.id);
      showToast(t('admin.checkEnded'), 'success');
    } catch (err) {
      showToast(errorMessage(err, t), 'error');
      setEnding(false);
    }
  };

  return (
    <div className="stack-lg">
      <section className="card admin-check-live stack" aria-labelledby="check-live-title">
        <div className="row">
          <IconTile icon={Siren} tone="var(--red)" size="md" />
          <div className="grow">
            <h2 id="check-live-title" className="admin-card-title">{t('admin.checkRunning')}</h2>
            <p className="text-sm muted">
              {[scopeLabel(check, t), t('admin.startedAt', { time: clock(check.started_at, lang) }), timeAgo(check.started_at, now, t)].join(' · ')}
            </p>
          </div>
        </div>
        <blockquote className="admin-quote">{check.message}</blockquote>
        <Button variant="danger" onClick={end} loading={ending}>{t('admin.endCheck')}</Button>
      </section>

      {roll.error && <LoadError error={roll.error} onRetry={roll.retry} />}
      {roll.loading ? <Loading /> : (
        <>
          <section className="grid-2 admin-stats" aria-label={t('admin.rollCallCounts')}>
            <Stat value={summary.in_scope} label={t('admin.inScope')} />
            <Stat value={summary.safe} label={t('admin.safe')} tone="var(--green)" />
            <Stat value={summary.need_help} label={t('admin.needHelp')} tone={Number(summary.need_help) ? 'var(--red)' : undefined} />
            <Stat value={summary.unanswered} label={t('admin.notAnswered')} tone={Number(summary.unanswered) ? 'var(--orange)' : undefined} />
          </section>

          <div className="card stack-sm">
            <p className="semibold">{t('admin.answeredOf', { n: answeredCount, total })}</p>
            <div
              className="admin-progress"
              role="img"
              aria-label={t('admin.progressLabel', { safe: summary.safe, help: summary.need_help, waiting: summary.unanswered })}
            >
              <span className="admin-progress__seg" style={{ width: `${pct(summary.safe)}%`, '--tone': 'var(--green)' }} />
              <span className="admin-progress__seg" style={{ width: `${pct(summary.need_help)}%`, '--tone': 'var(--red)' }} />
            </div>
            <div className="admin-legend">
              <span><span className="admin-legend__sw" style={{ '--tone': 'var(--green)' }} />{t('admin.safe')}</span>
              <span><span className="admin-legend__sw" style={{ '--tone': 'var(--red)' }} />{t('admin.needHelp')}</span>
              <span><span className="admin-legend__sw admin-legend__sw--empty" />{t('admin.notAnswered')}</span>
            </div>
          </div>

          <section aria-labelledby="help-title">
            <h2 id="help-title" className="section-title admin-count-title">
              <span>{t('admin.needHelp')}</span>
              <Badge tone={needHelp.length ? 'var(--red)' : undefined}>{needHelp.length}</Badge>
            </h2>
            {needHelp.length === 0 ? <p className="card text-sm muted">{t('admin.noneNeedHelp')}</p> : (
              <div className="card settings-group">
                {needHelp.map(r => {
                  const m = byId.get(r.profile_id);
                  return (
                    <PersonRow key={r.id} m={m} trailing={<CallLink phone={m?.phone} name={m?.full_name} compact />}>
                      {r.note && <p className="text-sm">{r.note}</p>}
                      {r.incident_id && (
                        <Link to={`/incident/${r.incident_id}`} className="admin-link text-sm">{t('admin.openAlert')}</Link>
                      )}
                    </PersonRow>
                  );
                })}
              </div>
            )}
          </section>

          <section aria-labelledby="waiting-title">
            <h2 id="waiting-title" className="section-title admin-count-title">
              <span>{t('admin.notAnswered')}</span>
              <Badge tone={notAnswered.length ? 'var(--orange)' : undefined}>{notAnswered.length}</Badge>
            </h2>
            {notAnswered.length === 0 ? <p className="card text-sm muted">{t('admin.everyoneAnswered')}</p> : (
              <div className="card settings-group">
                {notAnswered.map(m => {
                  const flags = vulnerabilityLabels(m.vulnerability, t);
                  return (
                    <PersonRow key={m.id} m={m} trailing={<CallLink phone={m.phone} name={m.full_name} compact />}>
                      {flags.length > 0 && (
                        <span className="admin-chips">{flags.map(f => <Badge key={f} tone="var(--purple)">{f}</Badge>)}</span>
                      )}
                    </PersonRow>
                  );
                })}
              </div>
            )}
          </section>

          <section aria-labelledby="safe-title">
            <h2 id="safe-title" className="section-title admin-count-title">
              <span>{t('admin.safe')}</span>
              <Badge tone={safe.length ? 'var(--green)' : undefined}>{safe.length}</Badge>
            </h2>
            {safe.length === 0 ? <p className="card text-sm muted">{t('admin.noneSafeYet')}</p> : (
              <div className="card settings-group">
                {safe.map(r => (
                  <PersonRow
                    key={r.id}
                    m={byId.get(r.profile_id)}
                    trailing={<span className="text-sm muted">{clock(r.responded_at, lang)}</span>}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function StartForm({ zones }) {
  const { t } = useT();
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const towers = (zones || []).filter(z => z.kind === 'tower');
  const [scope, setScope] = useState('society');
  const [zoneId, setZoneId] = useState('');
  const [type, setType] = useState('fire');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const tower = towers.find(z => z.id === zoneId);
  const presets = [
    tower ? t('admin.presetFireTower', { tower: tower.name }) : t('admin.presetFire'),
    t('admin.presetGas'),
    t('admin.presetDrill'),
  ];

  const start = async (e) => {
    e.preventDefault();
    if (scope === 'zone' && !tower) { setError(t('admin.errPickTower')); return; }
    if (!message.trim()) { setError(t('admin.errMessageRequired')); return; }
    setError('');
    const ok = await confirm(
      t('admin.startCheckTitle'),
      scope === 'zone' ? t('admin.startCheckTextTower', { tower: tower.name }) : t('admin.startCheckText'),
      { confirmLabel: t('admin.startNow'), destructive: true },
    );
    if (!ok) return;
    setBusy(true);
    try {
      await startSafetyCheck({ scope, zoneId: scope === 'zone' ? zoneId : null, message: message.trim(), type });
      showToast(t('admin.checkStarted'), 'success');
    } catch (err) {
      const msg = errorMessage(err, t);
      setError(msg);
      showToast(msg, 'error');
      setBusy(false);
    }
  };

  return (
    <form className="card stack admin-form" onSubmit={start} noValidate aria-labelledby="start-title">
      <div className="row">
        <IconTile icon={ShieldCheck} tone="var(--gray)" size="md" />
        <div className="grow">
          <h2 id="start-title" className="admin-card-title">{t('admin.startSafetyCheck')}</h2>
          <p className="text-sm muted">{t('admin.startIntro')}</p>
        </div>
      </div>
      <Field label={t('admin.who')}>
        <Segmented
          label={t('admin.who')}
          value={scope}
          onChange={(v) => { setScope(v); setError(''); }}
          options={[
            { value: 'society', label: t('admin.wholeSociety') },
            { value: 'zone', label: t('admin.oneTower') },
          ]}
        />
      </Field>
      {scope === 'zone' && (
        <Field label={t('common.tower')} htmlFor="check-tower">
          <select id="check-tower" className="select admin-input" value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
            <option value="">{t('admin.chooseTower')}</option>
            {towers.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
        </Field>
      )}
      <Field label={t('admin.helpBecomes')} htmlFor="check-type" hint={t('admin.helpBecomesHint')}>
        <select id="check-type" className="select admin-input" value={type} onChange={(e) => setType(e.target.value)}>
          {TYPE_ORDER.map(ty => <option key={ty} value={ty}>{t(`common.type_${ty}`)}</option>)}
        </select>
      </Field>
      <Field label={t('admin.messageToResidents')} htmlFor="check-message" hint={t('admin.charsLeft', { n: MESSAGE_MAX - message.length })}>
        <textarea
          id="check-message"
          className="textarea admin-input"
          rows={3}
          value={message}
          maxLength={MESSAGE_MAX}
          onChange={(e) => setMessage(e.target.value)}
        />
      </Field>
      <div className="admin-filters" role="group" aria-label={t('admin.presets')}>
        {presets.map(p => (
          <button key={p} type="button" className="admin-chip admin-chip--text" onClick={() => setMessage(p)}>{p}</button>
        ))}
      </div>
      {error && <p className="field__error" role="alert">{error}</p>}
      <Button type="submit" variant="danger" size="lg" loading={busy}>
        <Siren size={20} aria-hidden="true" />
        {t('admin.startSafetyCheck')}
      </Button>
    </form>
  );
}

export default function SafetyCheck() {
  const { t, lang } = useT();
  const now = useNow(30000);
  const active = useLive((ok, err) => listenActiveSafetyCheck(ok, err), 'active-check');
  const members = useLive((ok, err) => listenMembers(ok, err), 'members');
  const zones = useLive((ok, err) => listenZones(ok, err), 'zones');
  const past = useLive((ok, err) => listenSafetyChecks(ok, err, 20), 'past-checks');

  const check = active.data;
  const ended = (past.data || []).filter(c => c.ended_at);

  return (
    <main className="page admin-page">
      <PageHeader title={t('admin.navSafetyCheck')} subtitle={t('admin.safetySubtitle')} />

      {active.error && <LoadError error={active.error} onRetry={active.retry} />}
      {members.error && <LoadError error={members.error} onRetry={members.retry} />}
      {active.loading && <Loading />}
      {!active.loading && !active.error && (
        check
          ? <ActiveCheck key={check.id} check={check} members={members.data} now={now} />
          : <StartForm zones={zones.data} />
      )}

      <section aria-labelledby="past-title">
        <h2 id="past-title" className="section-title">{t('admin.pastChecks')}</h2>
        {past.error && <LoadError error={past.error} onRetry={past.retry} />}
        {past.data && ended.length === 0 && (
          <div className="card"><EmptyState icon={History} title={t('admin.noPastChecks')} text={t('admin.noPastChecksText')} /></div>
        )}
        {ended.length > 0 && (
          <div className="card settings-group">
            {ended.map(c => (
              <div key={c.id} className="settings-row">
                <IconTile icon={Siren} tone="var(--gray)" />
                <div className="grow">
                  <p className="semibold">{c.message}</p>
                  <p className="text-sm muted">
                    {[scopeLabel(c, t), dateTime(c.started_at, lang), t('admin.lastedMin', { n: minutesBetween(c.started_at, c.ended_at) ?? 0 })].join(' · ')}
                  </p>
                </div>
                <CircleCheck size={18} className="admin-chevron" aria-hidden="true" />
              </div>
            ))}
          </div>
        )}
      </section>

      <BottomNav />
    </main>
  );
}
