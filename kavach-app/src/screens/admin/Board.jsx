// Command board (/board) — full-screen live view for the security cabin TV. No tab bar.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleCheck, LogOut, Maximize, Minimize, Siren, Users, Wrench, Zap } from 'lucide-react';
import { Badge, Logo, TypeIcon } from '../../components/ui';
import { ASSET_STATES, getType, roleHome } from '../../config/society';
import {
  listenActiveSafetyCheck, listenAssets, listenQueue, listenSociety, listenTeam,
} from '../../data/db';
import { listenRollCall } from '../../data/admin';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../i18n';
import { clock } from '../../utils/time';
import { useLive, useNow } from './parts/hooks';
import { byUrgency, elapsed, isEscalated, placeLabel } from './parts/format';
import { IconTile, LoadError, SpecialtyChips, StaffStatus } from './parts/ui';
import { assetKind } from './parts/assetKinds';
import '../../styles/admin.css';

function Panel({ title, count, tone, children, className = '' }) {
  return (
    <section className={`admin-board__panel ${className}`} aria-label={title}>
      <h2 className="admin-board__panel-title">
        <span>{title}</span>
        {count != null && <Badge tone={count ? tone : undefined}>{count}</Badge>}
      </h2>
      {children}
    </section>
  );
}

function Quiet({ icon: Icon, children }) {
  return (
    <p className="admin-board__quiet">
      <Icon size={22} aria-hidden="true" />
      {children}
    </p>
  );
}

export default function Board() {
  const { t, lang } = useT();
  const { profile, role } = useAuth();
  const now = useNow(1000);
  const [fullscreen, setFullscreen] = useState(false);

  const society = useLive((ok, err) => listenSociety(ok, err), 'society');
  const queue = useLive((ok, err) => listenQueue(ok, err), 'queue');
  const team = useLive((ok, err) => listenTeam(ok, err), 'team');
  const assets = useLive((ok, err) => listenAssets(ok, err), 'assets');
  const check = useLive((ok, err) => listenActiveSafetyCheck(ok, err), 'check');
  const checkId = check.data?.id;
  const roll = useLive((ok, err) => listenRollCall(checkId, ok, err), `roll:${checkId}`, { enabled: !!checkId });

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const soc = society.data || profile?.society;
  const onDG = soc?.power_source === 'dg';
  const active = queue.data || [];
  const open = active.filter(i => i.status === 'pending').sort(byUrgency);
  const inProgress = active.filter(i => i.status !== 'pending').sort(byUrgency);
  const onDuty = (team.data || []).filter(m => m.on_duty);
  const faulty = (assets.data || []).filter(a => a.state !== 'ok');
  const summary = roll.data?.summary;
  const error = queue.error || team.error || assets.error || check.error || society.error;
  const retryAll = () => [queue, team, assets, check, society].forEach(f => f.error && f.retry());

  return (
    <main className="page admin-board">
      <header className="admin-board__header">
        <div className="admin-board__brand">
          <Logo size={36} />
          <div>
            <p className="admin-board__eyebrow">{t('admin.navBoard')}</p>
            <h1 className="admin-board__society">{soc?.name || ''}</h1>
          </div>
        </div>
        <div className="admin-board__status">
          <span className={`admin-board__pill${onDG ? ' admin-board__pill--dg' : ''}`}>
            <Zap size={18} aria-hidden="true" />
            {onDG ? t('admin.sourceDG') : t('admin.sourceGrid')}
          </span>
          <time className="admin-board__clock" dateTime={new Date(now).toISOString()}>
            {new Date(now).toLocaleTimeString(lang === 'ta' ? 'ta-IN' : 'en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </time>
          <button
            type="button"
            className="icon-btn"
            onClick={toggleFullscreen}
            aria-label={fullscreen ? t('admin.exitFullscreen') : t('admin.fullscreen')}
            title={fullscreen ? t('admin.exitFullscreen') : t('admin.fullscreen')}
          >
            {fullscreen ? <Minimize size={22} aria-hidden="true" /> : <Maximize size={22} aria-hidden="true" />}
          </button>
          <Link to={roleHome(role)} className="btn btn--secondary btn--sm admin-btn-44">
            <LogOut size={18} aria-hidden="true" />
            {t('admin.exit')}
          </Link>
        </div>
      </header>

      {error && <LoadError error={error} onRetry={retryAll} />}

      <div className="admin-board__grid">
        <Panel title={t('admin.openAlerts')} count={open.length} tone="var(--red)" className="admin-board__panel--open">
          {queue.data && open.length === 0 && <Quiet icon={CircleCheck}>{t('admin.noOpenAlerts')}</Quiet>}
          <ol className="admin-board__list">
            {open.map(inc => {
              const type = getType(inc.type);
              const Icon = type.icon;
              const esc = isEscalated(inc);
              return (
                <li key={inc.id}>
                  <Link
                    to={`/incident/${inc.id}`}
                    className={`admin-board__alert${esc ? ' admin-board__alert--esc' : ''}`}
                    style={{ '--tone': type.tone }}
                  >
                    <span className="type-icon admin-board__icon" aria-hidden="true"><Icon size={40} /></span>
                    <span className="admin-board__alert-body">
                      <span className="admin-board__alert-type">{t(`common.type_${inc.type}`)}</span>
                      <span className="admin-board__alert-place">{placeLabel(inc, t)}</span>
                      <span className="admin-board__alert-tags">
                        {esc && <Badge tone="var(--red)">{t('admin.escalatedLevel', { n: inc.escalation_level })}</Badge>}
                        {inc.vulnerable && <Badge tone="var(--purple)">{t('admin.vulnerable')}</Badge>}
                        {inc.people_affected > 1 && <Badge>{t('common.peopleCount', { n: inc.people_affected })}</Badge>}
                      </span>
                    </span>
                    <span className="admin-board__age" aria-label={t('admin.waitingFor', { time: elapsed(inc.created_at, now) })}>
                      {elapsed(inc.created_at, now)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </Panel>

        <Panel title={t('admin.inProgress')} count={inProgress.length} tone="var(--blue)">
          {queue.data && inProgress.length === 0 && <Quiet icon={CircleCheck}>{t('admin.nothingInProgress')}</Quiet>}
          <ul className="admin-board__rows">
            {inProgress.map(inc => (
              <li key={inc.id}>
                <Link to={`/incident/${inc.id}`} className="admin-board__row">
                  <TypeIcon type={inc.type} size="sm" />
                  <span className="grow">
                    <span className="admin-board__row-title">{t(`common.typeShort_${inc.type}`)} · {placeLabel(inc, t)}</span>
                    <span className="admin-board__row-meta">{inc.assigned_name || t('admin.unassigned')} · {elapsed(inc.created_at, now)}</span>
                  </span>
                  <StaffStatus status={inc.status} />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title={t('admin.onDutyTitle')} count={onDuty.length} tone="var(--green)">
          {team.data && onDuty.length === 0 && <Quiet icon={Users}>{t('admin.nobodyOnDuty')}</Quiet>}
          <ul className="admin-board__rows">
            {onDuty.map(m => (
              <li key={m.id} className="admin-board__row admin-board__row--static">
                <span className="admin-duty__dot admin-duty__dot--on" aria-hidden="true" />
                <span className="grow">
                  <span className="admin-board__row-title">{m.full_name}</span>
                  <span className="admin-board__row-meta">
                    {m.specialties?.length ? <SpecialtyChips specialties={m.specialties} /> : t(`common.role_${m.role}`)}
                  </span>
                </span>
                {m.active_load > 0 && <Badge tone="var(--blue)">{t('admin.activeLoad', { n: m.active_load })}</Badge>}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title={t('admin.liftsEquipment')} count={faulty.length} tone="var(--orange)">
          {assets.data && faulty.length === 0 && <Quiet icon={Wrench}>{t('admin.allEquipmentOk')}</Quiet>}
          <ul className="admin-board__rows">
            {faulty.map(a => {
              const kind = assetKind(a.kind);
              return (
                <li key={a.id} className="admin-board__row admin-board__row--static">
                  <IconTile icon={kind.icon} tone={kind.tone} />
                  <span className="grow">
                    <span className="admin-board__row-title">{a.name}</span>
                    {a.notes && <span className="admin-board__row-meta">{a.notes}</span>}
                  </span>
                  <Badge tone={ASSET_STATES[a.state]?.tone}>{t(`admin.asset_${a.state}`)}</Badge>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel title={t('admin.navSafetyCheck')}>
          {!checkId && check.data !== undefined && <Quiet icon={Siren}>{t('admin.noCheckRunning')}</Quiet>}
          {checkId && (
            <div className="stack-sm">
              <p className="admin-board__row-title">{check.data.message}</p>
              <p className="admin-board__row-meta">
                {(check.data.zone?.name || t('admin.wholeSociety'))} · {t('admin.startedAt', { time: clock(check.data.started_at, lang) })}
              </p>
              {summary && (
                <div className="admin-board__counts">
                  <div><span className="admin-board__count admin-text-green">{summary.safe}</span><span>{t('admin.safe')}</span></div>
                  <div><span className="admin-board__count admin-text-red">{summary.need_help}</span><span>{t('admin.needHelp')}</span></div>
                  <div><span className="admin-board__count admin-warn-text">{summary.unanswered}</span><span>{t('admin.notAnswered')}</span></div>
                </div>
              )}
            </div>
          )}
        </Panel>
      </div>
    </main>
  );
}
