// Live tracker for one of my reports: status in plain words, who is coming, what to do now.
import { useCallback, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { CircleAlert, Clock, HeartPulse, Minus, Plus, SearchX, TriangleAlert } from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import {
  AlertBanner, Avatar, Button, Card, EmptyState, Field, IconButton, PageHeader, Spinner, Stepper, TypeIcon,
} from '../../components/ui';
import {
  cancelIncident, errorMessage, listenIncident, listenIncidentEvents, updateIncidentDetails,
} from '../../data/db';
import { listenFirstResponderAcks } from '../../data/resident';
import { getStatus, isActive } from '../../config/society';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/DialogContext';
import { useToast } from '../../context/ToastContext';
import { useT } from '../../i18n';
import { clock, minutesBetween, timeAgo } from '../../utils/time';
import { incidentPlace, teamFor } from './parts/format';
import { useLive, useNow } from './parts/hooks';
import CallLink from './parts/CallLink';
import SafetyTips from './parts/SafetyTips';
import Timeline from './parts/Timeline';
import '../../styles/resident.css';

const MAX_PEOPLE = 50;
const NOTE_MAX = 500;
const STEPS = [
  ['stepSent', 'created_at'],
  ['stepAccepted', 'acknowledged_at'],
  ['stepOnTheWay', 'en_route_at'],
  ['stepArrived', 'on_scene_at'],
  ['stepResolved', 'resolved_at'],
];

function statusSentence(inc, t) {
  const name = inc.assigned_name || t('resident.someone');
  switch (inc.status) {
    case 'pending': return t(`resident.sentencePending_${teamFor(inc.type)}`);
    case 'acknowledged': return t('resident.sentenceAccepted', { name });
    case 'en_route': return t('resident.sentenceEnRoute', { name });
    case 'on_scene': return t('resident.sentenceOnScene');
    case 'resolved': return t('resident.sentenceResolved', { n: Math.max(1, minutesBetween(inc.created_at, inc.resolved_at) ?? 1) });
    case 'cancelled': return t('resident.sentenceCancelled');
    default: return '';
  }
}

export default function Tracker() {
  const { id } = useParams();
  return <TrackerView key={id} id={id} />;
}

function TrackerView({ id }) {
  const { t, lang } = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const now = useNow(30000);

  const inc = useLive(useCallback((ok, err) => listenIncident(id, ok, err), [id]));
  const events = useLive(useCallback((ok, err) => listenIncidentEvents(id, ok, err), [id]));
  const acks = useLive(useCallback((ok, err) => listenFirstResponderAcks(id, ok, err), [id]));

  const [cancelling, setCancelling] = useState(false);
  const [draft, setDraft] = useState(null); // { people, note } while editing details
  const [saving, setSaving] = useState(false);

  const back = location.state?.justSent ? '/resident' : true;
  const securityPhone = profile?.society?.security_phone;

  if (inc.loading) {
    return (
      <main className="page res-page">
        <PageHeader back={back} title={t('resident.trackerTitle')} />
        <div className="res-center res-center--tall"><Spinner large label={t('common.loading')} /></div>
        <BottomNav />
      </main>
    );
  }

  if (inc.error && !inc.data) {
    return (
      <main className="page res-page">
        <PageHeader back={back} title={t('resident.trackerTitle')} />
        <div className="stack">
          <AlertBanner tone="var(--red)" icon={CircleAlert} role="alert">
            <p>{errorMessage(inc.error, t)}</p>
            <Button variant="ghost" size="sm" className="res-btn-44" onClick={inc.retry}>{t('common.retry')}</Button>
          </AlertBanner>
          <CallLink phone={securityPhone} label={t('resident.callSecurity')} variant="danger" size="lg" block />
        </div>
        <BottomNav />
      </main>
    );
  }

  const incident = inc.data;
  if (!incident) {
    return (
      <main className="page res-page">
        <PageHeader back="/resident" title={t('resident.trackerTitle')} />
        <EmptyState
          icon={SearchX}
          title={t('resident.notFoundTitle')}
          text={t('resident.notFoundText')}
          action={<Button onClick={() => navigate('/resident/reports')}>{t('resident.seeMyReports')}</Button>}
        />
        <BottomNav />
      </main>
    );
  }

  const status = getStatus(incident.status);
  const active = isActive(incident.status);
  const cancelled = incident.status === 'cancelled';
  const isMine = incident.reporter_id === user?.id;
  const team = teamFor(incident.type);
  const canCancel = isMine && ['pending', 'acknowledged'].includes(incident.status);
  const escalated = incident.status === 'pending' && incident.escalation_level > 1;
  const ackCount = acks.data?.length || 0;
  const place = incidentPlace(incident, t, isMine ? profile : null);

  const steps = STEPS.map(([key, col], i) => ({
    label: t(`resident.${key}`),
    state: i <= status.step ? 'done' : i === status.step + 1 ? 'current' : 'todo',
    time: i <= status.step && incident[col] ? clock(incident[col], lang) : undefined,
  }));

  const doCancel = async () => {
    const ok = await confirm(t('resident.cancelConfirmTitle'), t('resident.cancelConfirmText'), {
      confirmLabel: t('resident.cancelConfirmBtn'),
      destructive: true,
    });
    if (!ok) return;
    setCancelling(true);
    try {
      await cancelIncident(incident.id);
      showToast(t('resident.cancelledToast'), 'success');
    } catch (err) {
      showToast(errorMessage(err, t), 'error');
    } finally {
      setCancelling(false);
    }
  };

  const saveDetails = async () => {
    if (!draft || saving) return;
    setSaving(true);
    try {
      const noteChanged = draft.note.trim() !== (incident.description || '');
      await updateIncidentDetails(incident.id, {
        peopleAffected: draft.people !== incident.people_affected ? draft.people : undefined,
        description: noteChanged ? draft.note.trim() : undefined,
      });
      setDraft(null);
      showToast(t('resident.detailsSaved'), 'success');
    } catch (err) {
      showToast(errorMessage(err, t), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="page res-page">
      <PageHeader back={back} title={t('resident.trackerTitle')} />

      <div className="stack">
        {escalated && (
          <AlertBanner tone="var(--orange)" icon={TriangleAlert} role="status">
            <p>{t('resident.escalated')}</p>
          </AlertBanner>
        )}

        {/* Status */}
        <section className="card res-status" style={{ '--tone': status.tone }} aria-live="polite">
          <div className="res-status__top">
            <TypeIcon type={incident.type} size="lg" />
            <div className="grow">
              <p className="res-status__type">{t(`common.type_${incident.type}`)}</p>
              <h2 className="res-status__label">{t(`common.status_${incident.status}`)}</h2>
            </div>
          </div>
          <p className="res-status__sentence">{statusSentence(incident, t)}</p>
          <p className="res-status__meta">
            {incident.status === 'pending' && <span className="res-dot pulse" aria-hidden="true" />}
            {t('resident.sentAt', { time: clock(incident.created_at, lang), ago: timeAgo(incident.created_at, now, t) })}
          </p>
        </section>

        {/* Who is helping */}
        {incident.assigned_name ? (
          <Card className="res-person">
            <Avatar name={incident.assigned_name} />
            <div className="grow">
              <p className="semibold">{incident.assigned_name}</p>
              <p className="text-sm muted">
                {t(`resident.team_${team}`)}
                {incident.assigned_at ? ` · ${t('resident.acceptedAt', { time: clock(incident.assigned_at, lang) })}` : ''}
              </p>
            </div>
            {active && (
              <CallLink
                phone={incident.assigned_phone}
                label={t('common.call')}
                ariaLabel={t('resident.callNamed', { name: incident.assigned_name })}
                variant="success"
              />
            )}
          </Card>
        ) : active && (
          <Card className="stack-sm">
            <div className="res-person">
              <span className="type-icon" style={{ '--tone': 'var(--orange)' }} aria-hidden="true"><Clock size={22} /></span>
              <div className="grow">
                <p className="semibold">{t('resident.waitingTitle')}</p>
                <p className="text-sm muted">{t('resident.waitingText')}</p>
              </div>
            </div>
            <CallLink phone={securityPhone} label={t('resident.callSecurity')} variant="secondary" block />
          </Card>
        )}

        {active && ackCount > 0 && (
          <AlertBanner tone="var(--pink)" icon={HeartPulse} role="status">
            <p>{ackCount === 1 ? t('resident.frOne') : t('resident.frMany', { n: ackCount })}</p>
          </AlertBanner>
        )}

        {active && <SafetyTips type={incident.type} />}

        {/* Progress */}
        {!cancelled && (
          <section aria-labelledby="res-progress-title">
            <h2 id="res-progress-title" className="section-title">{t('resident.progressTitle')}</h2>
            <div className="card"><Stepper steps={steps} /></div>
          </section>
        )}

        {/* What I reported */}
        <section aria-labelledby="res-details-title">
          <h2 id="res-details-title" className="section-title">{t('resident.yourReport')}</h2>
          {draft ? (
            <div className="card stack">
              <div className="res-people res-people--flat">
                <p id="res-edit-people" className="grow semibold">{t('resident.peopleLabel')}</p>
                <div className="counter" role="group" aria-labelledby="res-edit-people">
                  <IconButton
                    label={t('resident.fewer')}
                    disabled={draft.people <= 1}
                    onClick={() => setDraft(d => ({ ...d, people: Math.max(1, d.people - 1) }))}
                  >
                    <Minus size={20} aria-hidden="true" />
                  </IconButton>
                  <span className="counter__value" aria-live="polite">{draft.people}</span>
                  <IconButton
                    label={t('resident.more')}
                    disabled={draft.people >= MAX_PEOPLE}
                    onClick={() => setDraft(d => ({ ...d, people: Math.min(MAX_PEOPLE, d.people + 1) }))}
                  >
                    <Plus size={20} aria-hidden="true" />
                  </IconButton>
                </div>
              </div>
              <Field label={t('resident.noteLabel')} htmlFor="res-edit-note" hint={t('resident.charsLeft', { n: NOTE_MAX - draft.note.length })}>
                <textarea
                  id="res-edit-note"
                  className="textarea res-textarea--filled"
                  rows={3}
                  maxLength={NOTE_MAX}
                  value={draft.note}
                  onChange={(e) => setDraft(d => ({ ...d, note: e.target.value }))}
                />
              </Field>
              <div className="grid-2">
                <Button variant="secondary" onClick={() => setDraft(null)} disabled={saving}>{t('common.cancel')}</Button>
                <Button onClick={saveDetails} loading={saving}>{t('common.save')}</Button>
              </div>
            </div>
          ) : (
            <div className="card settings-group">
              {place && (
                <div className="settings-row res-kv">
                  <span className="res-kv__key">{t('resident.kvWhere')}</span>
                  <span className="res-kv__val">{place}</span>
                </div>
              )}
              <div className="settings-row res-kv">
                <span className="res-kv__key">{t('resident.kvPeople')}</span>
                <span className="res-kv__val">{incident.people_affected}</span>
              </div>
              {incident.description && (
                <div className="settings-row res-kv">
                  <span className="res-kv__key">{t('resident.kvNote')}</span>
                  <span className="res-kv__val res-prewrap">{incident.description}</span>
                </div>
              )}
              {active && isMine && (
                <button
                  type="button"
                  className="settings-row res-link-row"
                  onClick={() => setDraft({ people: incident.people_affected, note: incident.description || '' })}
                >
                  {t('resident.addDetails')}
                </button>
              )}
            </div>
          )}
        </section>

        {/* Timeline */}
        <section aria-labelledby="res-updates-title">
          <h2 id="res-updates-title" className="section-title">{t('resident.updatesTitle')}</h2>
          {events.loading ? (
            <div className="card res-center"><Spinner label={t('common.loading')} /></div>
          ) : events.error && !events.data ? (
            <AlertBanner tone="var(--red)" icon={CircleAlert} role="alert">
              <p>{errorMessage(events.error, t)}</p>
              <Button variant="ghost" size="sm" className="res-btn-44" onClick={events.retry}>{t('common.retry')}</Button>
            </AlertBanner>
          ) : (
            <Timeline events={events.data} />
          )}
        </section>

        {canCancel && (
          <Button variant="ghost" block className="res-destructive" loading={cancelling} onClick={doCancel}>
            {t('resident.cancelFalseAlarm')}
          </Button>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
