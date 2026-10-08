import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, Phone, Printer, SearchX, UserPlus, XCircle } from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import { Button, Card, EmptyState, PageHeader, Spinner, TypeIcon } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { NEXT_STATUS, isActive, roleHome } from '../../config/society';
import {
  advanceIncident, cancelIncident, claimIncident, errorMessage,
  listFirstResponderAcks, listenIncident, listenIncidentEvents,
} from '../../data/db';
import { covers } from '../../data/responder';
import { useT } from '../../i18n';
import { dateTime, minutesBetween, timeAgo } from '../../utils/time';
import AssignDialog from '../responder/parts/AssignDialog';
import { IncidentBadges, StaffStatusBadge } from '../responder/parts/IncidentBadges';
import LoadError from '../responder/parts/LoadError';
import NoteDialog from '../responder/parts/NoteDialog';
import Timeline from '../responder/parts/Timeline';
import {
  formatDuration, peopleLabel, placeLine, telHref, vulnerabilityFull,
} from '../responder/parts/format';
import { useNow } from '../responder/parts/useNow';
import '../../styles/responder.css';

function InfoRow({ label, children, action }) {
  return (
    <div className="settings-row rsp-info">
      <div className="grow">
        <p className="rsp-info__label">{label}</p>
        <div className="rsp-info__value">{children}</div>
      </div>
      {action}
    </div>
  );
}

function CallLink({ phone, name, t }) {
  if (!phone) return null;
  return (
    <a className="btn btn--secondary btn--sm rsp-tap rsp-no-print" href={telHref(phone)} aria-label={t('responder.callName', { name })}>
      <Phone size={18} aria-hidden="true" />
      {t('common.call')}
    </a>
  );
}

export default function IncidentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, lang } = useT();
  const { user, profile, role } = useAuth();
  const { showToast } = useToast();
  const now = useNow(30000);

  // Keyed by id so a stale incident never shows after navigating to another one
  const [state, setState] = useState({ id: null, inc: undefined, events: [], acks: [] });
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(null);
  const [dialog, setDialog] = useState(null); // 'resolve' | 'cancel' | 'assign'

  useEffect(() => {
    const unInc = listenIncident(
      id,
      (inc) => { setState(s => (s.id === id ? { ...s, inc } : { id, inc, events: [], acks: [] })); setError(null); },
      (err) => setError(err),
    );
    const unEvents = listenIncidentEvents(
      id,
      (events) => setState(s => (s.id === id ? { ...s, events: events || [] } : { id, inc: undefined, events: events || [], acks: [] })),
      () => {},
    );
    return () => { unInc(); unEvents(); };
  }, [id, attempt]);

  const current = state.id === id ? state : { inc: undefined, events: [], acks: [] };
  const { inc, events, acks } = current;
  const ackEvents = events.filter(e => e.action === 'first_responder_ack').length;

  useEffect(() => {
    let alive = true;
    listFirstResponderAcks(id)
      .then((rows) => { if (alive) setState(s => (s.id === id ? { ...s, acks: rows || [] } : s)); })
      .catch(() => {});
    return () => { alive = false; };
  }, [id, ackEvents]);

  const isAdmin = role === 'admin';
  const isMine = Boolean(inc && user && inc.assigned_to === user.id);
  const active = Boolean(inc && isActive(inc.status));
  const next = inc ? NEXT_STATUS[inc.status] : null;
  const canClaim = Boolean(inc && inc.status === 'pending' && covers(profile, inc.type));
  const canAdvance = Boolean(active && next && (isMine || isAdmin));
  const canResolveEarly = canAdvance && next.status !== 'resolved';

  const run = async (key, fn, okMsg) => {
    setBusy(key);
    try {
      await fn();
      if (okMsg) showToast(okMsg, 'success');
      return true;
    } catch (err) {
      showToast(errorMessage(err, t), 'error');
      return false;
    } finally {
      setBusy(null);
    }
  };

  const claim = () => run('claim', () => claimIncident(inc.id), t('responder.claimedToast'));
  const advance = () => {
    if (next.status === 'resolved') { setDialog('resolve'); return; }
    run('advance', () => advanceIncident(inc.id, next.status), t('responder.statusUpdatedToast'));
  };
  const resolve = (note) => run('resolve', () => advanceIncident(inc.id, 'resolved', note), t('responder.resolvedToast'));
  const cancel = (reason) => run('cancel', () => cancelIncident(inc.id, reason), t('responder.cancelledToast'));

  const back = typeof window !== 'undefined' && window.history.length > 1 ? true : roleHome(role);
  const typeLabel = inc ? t(`common.type_${inc.type}`) : '';
  const place = inc ? placeLine(inc, t) : '';
  const vuln = inc ? vulnerabilityFull(inc.reporter_vulnerability, t) : '';
  const ageLine = !inc ? '' : inc.status === 'resolved' && inc.resolved_at
    ? t('responder.resolvedIn', { d: formatDuration(minutesBetween(inc.created_at, inc.resolved_at), t) })
    : active ? t('responder.openFor', { d: formatDuration(minutesBetween(inc.created_at, now), t) }) : '';
  const showAcks = inc && (inc.type === 'medical' || acks.length > 0);

  return (
    <main className="page rsp-detail">
      <PageHeader
        compact
        back={back}
        title={t('responder.detailTitle')}
        action={inc ? <StaffStatusBadge status={inc.status} /> : null}
      />

      {error && (
        <div className="stack" style={{ marginBottom: 'var(--s-3)' }}>
          <LoadError title={t('responder.detailLoadError')} error={error} onRetry={() => { setError(null); setAttempt(a => a + 1); }} />
        </div>
      )}

      {inc === undefined && !error && <div className="rsp-center"><Spinner large label={t('common.loading')} /></div>}

      {inc === null && (
        <Card>
          <EmptyState
            icon={SearchX}
            title={t('responder.notFoundTitle')}
            text={t('responder.notFoundText')}
            action={<Button variant="secondary" onClick={() => navigate(roleHome(role))}>{t('responder.backToAlerts')}</Button>}
          />
        </Card>
      )}

      {inc && (
        <div className="stack">
          <div className="rsp-print-only">
            <p className="rsp-print-only__society">{profile?.society?.name}</p>
            <h2 className="rsp-print-only__title">{t('responder.printHeading')}</h2>
            <p className="muted">{t('responder.printedAt', { time: dateTime(now, lang) })}</p>
          </div>

          <Card className="rsp-hero">
            <TypeIcon type={inc.type} size="lg" />
            <div className="grow">
              <h2 className="rsp-hero__title">{typeLabel}</h2>
              {place && <p className="rsp-hero__place">{place}</p>}
              <IncidentBadges inc={inc} />
              {ageLine && <p className="rsp-hero__age">{ageLine}</p>}
            </div>
          </Card>

          {(canClaim || canAdvance) && (
            <div className="rsp-actions rsp-no-print">
              {canClaim && (
                <Button block size="lg" onClick={claim} loading={busy === 'claim'}>{t('responder.claim')}</Button>
              )}
              {canAdvance && (
                <Button
                  block
                  size="lg"
                  variant={next.status === 'resolved' ? 'success' : 'primary'}
                  onClick={advance}
                  loading={busy === 'advance'}
                >
                  {t(next.labelKey)}
                </Button>
              )}
              {canResolveEarly && (
                <Button block variant="secondary" onClick={() => setDialog('resolve')} disabled={busy !== null}>
                  {t('responder.actionResolve')}
                </Button>
              )}
            </div>
          )}

          <section aria-labelledby="rsp-detail-info">
            <h2 id="rsp-detail-info" className="section-title">{t('responder.details')}</h2>
            <Card className="settings-group">
              <InfoRow
                label={t('responder.reportedBy')}
                action={<CallLink phone={inc.reporter_phone} name={inc.reporter_name || t('responder.callReporter')} t={t} />}
              >
                {inc.reporter_name || t('responder.someone')}
                {inc.reporter_phone && <span className="muted rsp-print-inline"> · {inc.reporter_phone}</span>}
              </InfoRow>
              {vuln && <InfoRow label={t('responder.needs')}>{vuln}</InfoRow>}
              <InfoRow label={t('responder.peopleAffected')}>{peopleLabel(inc.people_affected, t)}</InfoRow>
              {inc.description && <InfoRow label={t('responder.description')}><span className="rsp-pre">{inc.description}</span></InfoRow>}
              {inc.location_note && <InfoRow label={t('responder.locationNote')}>{inc.location_note}</InfoRow>}
              {inc.asset_name && <InfoRow label={t('responder.equipment')}>{inc.asset_name}</InfoRow>}
              <InfoRow label={t('responder.urgencyLabel')}>{t('responder.urgencyValue', { n: inc.urgency_score })}</InfoRow>
              <InfoRow label={t('responder.escalationLabel')}>{t('responder.escalationValue', { n: inc.escalation_level })}</InfoRow>
              <InfoRow label={t('responder.reportedAt')}>
                {dateTime(inc.created_at, lang)} · {timeAgo(inc.created_at, now, t)}
              </InfoRow>
              <InfoRow
                label={t('responder.assignedTo')}
                action={!isMine && <CallLink phone={inc.assigned_phone} name={inc.assigned_name} t={t} />}
              >
                {inc.assigned_name || <span className="muted">{t('responder.unassigned')}</span>}
              </InfoRow>
              {inc.resolution_note && <InfoRow label={t('responder.resolutionNote')}>{inc.resolution_note}</InfoRow>}
              {showAcks && (
                <InfoRow label={t('responder.firstResponders')}>
                  {acks.length ? acks.length : <span className="muted">{t('responder.firstRespondersNone')}</span>}
                </InfoRow>
              )}
            </Card>
          </section>

          {isAdmin && (
            <section aria-labelledby="rsp-detail-admin" className="rsp-no-print">
              <h2 id="rsp-detail-admin" className="section-title">{t('responder.adminSection')}</h2>
              <Card className="settings-group">
                {active && (
                  <button type="button" className="settings-row" onClick={() => setDialog('assign')}>
                    <span className="type-icon type-icon--sm" style={{ '--tone': 'var(--blue)' }} aria-hidden="true"><UserPlus size={18} /></span>
                    <span className="grow">{inc.assigned_to ? t('responder.reassignTo') : t('responder.assignTo')}</span>
                    <ChevronRight size={18} className="rsp-chevron" aria-hidden="true" />
                  </button>
                )}
                <button type="button" className="settings-row" onClick={() => window.print()}>
                  <span className="type-icon type-icon--sm" style={{ '--tone': 'var(--gray)' }} aria-hidden="true"><Printer size={18} /></span>
                  <span className="grow">{t('responder.printReport')}</span>
                  <ChevronRight size={18} className="rsp-chevron" aria-hidden="true" />
                </button>
                {active && (
                  <button type="button" className="settings-row rsp-danger-row" onClick={() => setDialog('cancel')}>
                    <span className="type-icon type-icon--sm" style={{ '--tone': 'var(--red)' }} aria-hidden="true"><XCircle size={18} /></span>
                    <span className="grow">{t('responder.cancelIncident')}</span>
                  </button>
                )}
              </Card>
            </section>
          )}

          <section aria-labelledby="rsp-detail-timeline">
            <h2 id="rsp-detail-timeline" className="section-title">{t('responder.timeline')}</h2>
            <Card>
              <Timeline events={events} />
            </Card>
          </section>
        </div>
      )}

      {inc && dialog === 'resolve' && (
        <NoteDialog
          title={t('responder.resolveTitle')}
          text={t('responder.resolveText')}
          label={t('responder.resolveNoteLabel')}
          placeholder={t('responder.resolveNotePlaceholder')}
          confirmLabel={t('responder.actionResolve')}
          variant="success"
          onConfirm={resolve}
          onClose={() => setDialog(null)}
        />
      )}
      {inc && dialog === 'cancel' && (
        <NoteDialog
          title={t('responder.cancelTitle')}
          text={t('responder.cancelText')}
          label={t('responder.cancelReasonLabel')}
          placeholder={t('responder.cancelReasonPlaceholder')}
          confirmLabel={t('responder.cancelIncident')}
          cancelLabel={t('responder.keepIt')}
          destructive
          onConfirm={cancel}
          onClose={() => setDialog(null)}
        />
      )}
      {inc && dialog === 'assign' && <AssignDialog inc={inc} onClose={() => setDialog(null)} />}

      <BottomNav />
    </main>
  );
}
