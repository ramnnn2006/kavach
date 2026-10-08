// Admin Overview — the commander's dashboard: live numbers, what needs attention, and society status.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChartColumn, ChevronRight, CircleCheck, ClipboardCheck, Megaphone, Monitor, ShieldCheck, Siren, Users, Zap,
} from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import { Avatar, Button, EmptyState, PageHeader, Stat } from '../../components/ui';
import {
  listenActiveSafetyCheck, listenCompliance, listenIncidents, listenQueue, listenSociety, listenTeam, listenZones,
} from '../../data/db';
import { listenRollCall } from '../../data/admin';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../i18n';
import { useLive, useNow } from './parts/hooks';
import {
  avgResponseMinutes, byUrgency, intervalMinutes, isUnclaimedFor, needsAttention, startOfToday,
} from './parts/format';
import { IconTile, IncidentRow, LoadError, Loading } from './parts/ui';
import AssignSheet from './parts/AssignSheet';
import '../../styles/admin.css';

const ATTENTION_LIMIT = 8;

// One row of the society status list: icon, label + detail, current value, chevron.
function StatusRow({ icon, tone, title, detail, value, valueTone, to }) {
  return (
    <Link to={to} className="settings-row admin-row-link admin-status">
      <IconTile icon={icon} tone={tone} />
      <span className="grow admin-status__text">
        <span className="admin-status__title">{title}</span>
        {detail && <span className="admin-status__detail">{detail}</span>}
      </span>
      {value && <span className="admin-status__value" style={valueTone ? { color: valueTone } : undefined}>{value}</span>}
      <ChevronRight size={18} className="admin-chevron" aria-hidden="true" />
    </Link>
  );
}

export default function Overview() {
  const { t } = useT();
  const { profile } = useAuth();
  const now = useNow(30000);
  const [assigning, setAssigning] = useState(null);

  const today = startOfToday(now);
  const society = useLive((ok, err) => listenSociety(ok, err), 'society');
  const queue = useLive((ok, err) => listenQueue(ok, err), 'queue');
  const todays = useLive((ok, err) => listenIncidents({ from: today }, ok, err), `today:${today}`, { keepStale: true });
  const compliance = useLive((ok, err) => listenCompliance(ok, err), 'compliance');
  const team = useLive((ok, err) => listenTeam(ok, err), 'team');
  const zones = useLive((ok, err) => listenZones(ok, err), 'zones');
  const check = useLive((ok, err) => listenActiveSafetyCheck(ok, err), 'check');
  const checkId = check.data?.id;
  const rollCall = useLive((ok, err) => listenRollCall(checkId, ok, err), `roll:${checkId}`, { enabled: !!checkId });

  const soc = society.data || profile?.society;
  const escMin = Math.round(intervalMinutes(society.data?.escalate_l2_after));
  const active = queue.data || [];
  const pending = active.filter(i => i.status === 'pending');
  const unclaimed = pending.filter(i => isUnclaimedFor(i, escMin, now));
  const inProgress = active.filter(i => i.status !== 'pending');
  const avg = todays.data ? avgResponseMinutes(todays.data) : null;
  const attention = active.filter(needsAttention).sort(byUrgency);
  const dash = (v) => (queue.loading ? '–' : v);

  const overdue = (compliance.data || []).filter(c => c.compliance_status === 'overdue');
  const dueSoon = (compliance.data || []).filter(c => c.compliance_status === 'due_soon');
  const onDuty = (team.data || []).filter(m => m.on_duty);
  const zoneList = zones.data || [];
  const zonesOff = zoneList.filter(z => z.power_state === 'off').length;
  const zonesRotating = zoneList.filter(z => z.power_state === 'rotating').length;
  const onDG = soc?.power_source === 'dg';
  const summary = rollCall.data?.summary;

  return (
    <main className="page admin-page">
      <PageHeader
        eyebrow={soc?.name}
        title={t('admin.overviewTitle')}
        action={(
          <Link to="/profile" className="admin-avatar-link" aria-label={t('common.nav_profile')}>
            <Avatar name={profile?.full_name} />
          </Link>
        )}
      />

      {queue.error && <LoadError error={queue.error} onRetry={queue.retry} />}

      <section className="grid-2 admin-stats" aria-label={t('admin.statsLabel')}>
        <Stat value={dash(pending.length)} label={t('admin.statOpen')} tone={pending.length ? 'var(--orange)' : undefined} />
        <Stat value={dash(unclaimed.length)} label={t('admin.statUnclaimed', { n: escMin })} tone={unclaimed.length ? 'var(--red)' : undefined} />
        <Stat value={dash(inProgress.length)} label={t('admin.statInProgress')} tone={inProgress.length ? 'var(--blue)' : undefined} />
        <Stat value={avg == null ? '—' : t('admin.minutesShort', { n: avg })} label={t('admin.statAvgResponse')} />
      </section>

      <div className="admin-dash">
        <section className="admin-dash__main" aria-labelledby="attention-title">
          <div className="admin-section-head">
            <h2 id="attention-title" className="section-title">{t('admin.needsAttention')}</h2>
            <Link to="/admin/incidents" className="admin-link">{t('admin.seeAllIncidents')}</Link>
          </div>
          {queue.loading && <Loading />}
          {!queue.loading && !queue.error && attention.length === 0 && (
            <div className="card">
              <EmptyState
                icon={CircleCheck}
                title={t('admin.allClear')}
                text={active.length ? t('admin.allClearActive', { n: active.length }) : t('admin.allClearText')}
              />
            </div>
          )}
          {attention.length > 0 && (
            <div className="card settings-group">
              {attention.slice(0, ATTENTION_LIMIT).map(inc => (
                <IncidentRow
                  key={inc.id}
                  inc={inc}
                  now={now}
                  action={(
                    <Button
                      variant={inc.assigned_to ? 'secondary' : 'primary'}
                      size="sm"
                      className="admin-btn-44"
                      onClick={() => setAssigning(inc)}
                      aria-label={t('admin.assignIncident', { type: t(`common.typeShort_${inc.type}`) })}
                    >
                      {inc.assigned_to ? t('admin.reassign') : t('admin.assign')}
                    </Button>
                  )}
                />
              ))}
            </div>
          )}
          {attention.length > ATTENTION_LIMIT && (
            <Link to="/admin/incidents" className="admin-link admin-more-link">
              {t('admin.moreNeedAttention', { n: attention.length - ATTENTION_LIMIT })}
            </Link>
          )}
        </section>

        <section className="admin-dash__side" aria-labelledby="society-status-title">
          <h2 id="society-status-title" className="section-title">{t('common.nav_society')}</h2>
          {[society, compliance, check, team].filter(x => x.error).slice(0, 1).map(x => (
            <LoadError key="err" error={x.error} onRetry={x.retry} />
          ))}
          <div className="card settings-group">
            <StatusRow
              icon={Zap}
              tone={onDG ? 'var(--orange)' : 'var(--green)'}
              title={t('admin.powerTitle')}
              value={onDG ? t('admin.sourceDG') : t('admin.sourceGrid')}
              valueTone={onDG ? 'var(--orange)' : undefined}
              detail={onDG
                ? t('admin.dgSummary', { off: zonesOff, rotating: zonesRotating })
                : zonesOff ? t('admin.zonesManualOff', { n: zonesOff }) : t('admin.allZonesOn')}
              to="/admin/society"
            />
            <StatusRow
              icon={ClipboardCheck}
              tone={overdue.length ? 'var(--red)' : 'var(--green)'}
              title={t('admin.complianceTitle')}
              value={compliance.loading ? '–' : overdue.length ? t('admin.overdueCount', { n: overdue.length }) : t('admin.allUpToDate')}
              valueTone={overdue.length ? 'var(--red)' : undefined}
              detail={compliance.loading ? null : t('admin.dueSoonCount', { n: dueSoon.length })}
              to="/admin/society#compliance"
            />
            <StatusRow
              icon={checkId ? Siren : ShieldCheck}
              tone={checkId ? 'var(--red)' : 'var(--gray)'}
              title={t('admin.navSafetyCheck')}
              value={checkId ? t('admin.checkRunning') : null}
              valueTone="var(--red)"
              detail={checkId
                ? (summary ? t('admin.rollCallLine', { safe: summary.safe, help: summary.need_help, waiting: summary.unanswered }) : t('common.loading'))
                : t('admin.noCheckRunning')}
              to="/admin/safety-check"
            />
            <StatusRow
              icon={Users}
              tone="var(--blue)"
              title={t('admin.teamOnDuty')}
              value={team.loading ? '–' : onDuty.length ? String(onDuty.length) : t('admin.nobodyOnDuty')}
              valueTone={!team.loading && !onDuty.length ? 'var(--red)' : undefined}
              detail={onDuty.map(m => m.full_name).join(', ') || null}
              to="/admin/team"
            />
          </div>
        </section>
      </div>

      <h2 className="section-title">{t('admin.quickActions')}</h2>
      <nav className="card settings-group admin-actions" aria-label={t('admin.quickActions')}>
        {[
          { to: '/admin/notices', icon: Megaphone, tone: 'var(--orange)', label: t('admin.postNotice') },
          { to: '/board', icon: Monitor, tone: 'var(--indigo)', label: t('admin.navBoard') },
          { to: '/admin/insights', icon: ChartColumn, tone: 'var(--blue)', label: t('common.nav_insights') },
        ].map(a => (
          <Link key={a.to} to={a.to} className="settings-row admin-row-link">
            <IconTile icon={a.icon} tone={a.tone} />
            <span className="grow">{a.label}</span>
            <ChevronRight size={18} className="admin-chevron" aria-hidden="true" />
          </Link>
        ))}
      </nav>

      {assigning && <AssignSheet incident={assigning} onClose={() => setAssigning(null)} />}
      <BottomNav />
    </main>
  );
}
