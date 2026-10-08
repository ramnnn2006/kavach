import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellOff, CircleCheck, Inbox, Volume2, VolumeX } from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import { AlertBanner, Button, Card, EmptyState, IconButton, PageHeader, Spinner, Switch } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { advanceIncident, claimIncident, errorMessage, listenQueue, setOnDuty } from '../../data/db';
import { useAlertSound } from '../../hooks/useAlertSound';
import { useT } from '../../i18n';
import IncidentCard from './parts/IncidentCard';
import LoadError from './parts/LoadError';
import NoteDialog from './parts/NoteDialog';
import { specialtySummary } from './parts/format';
import { useNow } from './parts/useNow';
import '../../styles/responder.css';

const byUrgency = (a, b) =>
  (b.urgency_score - a.urgency_score) || (new Date(a.created_at) - new Date(b.created_at));

export default function Alerts() {
  const { t } = useT();
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const now = useNow(30000);

  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState({});
  const [resolving, setResolving] = useState(null);
  const [dutyPending, setDutyPending] = useState(null);

  useEffect(() => listenQueue(
    (data) => { setRows(data || []); setError(null); },
    (err) => setError(err),
  ), [attempt]);

  const me = user?.id;
  const { mine, open } = useMemo(() => {
    const list = rows || [];
    return {
      mine: list.filter(i => i.assigned_to === me && i.status !== 'pending').sort(byUrgency),
      open: list.filter(i => i.status === 'pending' && i.assigned_to !== me).sort(byUrgency),
    };
  }, [rows, me]);

  const onDuty = dutyPending ?? Boolean(profile?.on_duty);
  const alertIds = rows ? [...open, ...mine].map(i => i.id) : null;
  const { muted, toggleMute } = useAlertSound(alertIds, { enabled: onDuty });

  // Apply the RPC's returned row right away; realtime refetch follows.
  const merge = (updated) => {
    if (!updated?.id) return;
    setRows(list => (list || []).map(r => (r.id === updated.id ? { ...r, ...updated } : r)));
  };
  const setCardBusy = (id, on) => setBusy(b => {
    const next = { ...b };
    if (on) next[id] = true; else delete next[id];
    return next;
  });

  const toggleDuty = async (next) => {
    setDutyPending(next);
    try {
      await setOnDuty(next);
      await refreshProfile();
      showToast(t(next ? 'responder.dutyOnToast' : 'responder.dutyOffToast'), 'success');
    } catch (err) {
      showToast(errorMessage(err, t), 'error');
    } finally {
      setDutyPending(null);
    }
  };

  const claim = async (inc) => {
    setCardBusy(inc.id, true);
    try {
      merge(await claimIncident(inc.id));
      showToast(t('responder.claimedToast'), 'success');
    } catch (err) {
      showToast(errorMessage(err, t), 'error');
    } finally {
      setCardBusy(inc.id, false);
    }
  };

  const advance = async (inc, next) => {
    setCardBusy(inc.id, true);
    try {
      merge(await advanceIncident(inc.id, next));
      showToast(t('responder.statusUpdatedToast'), 'success');
    } catch (err) {
      showToast(errorMessage(err, t), 'error');
    } finally {
      setCardBusy(inc.id, false);
    }
  };

  const resolve = async (note) => {
    const inc = resolving;
    try {
      const updated = await advanceIncident(inc.id, 'resolved', note);
      setRows(list => (list || []).filter(r => r.id !== (updated?.id || inc.id)));
      showToast(t('responder.resolvedToast'), 'success');
      return true;
    } catch (err) {
      showToast(errorMessage(err, t), 'error');
      return false;
    }
  };

  const onMute = () => {
    const nowMuted = toggleMute();
    showToast(t(nowMuted ? 'responder.soundOffToast' : 'responder.soundOnToast'));
  };

  const headerAction = (
    <div className="rsp-header-actions">
      <div className="rsp-duty">
        <span className="rsp-duty__label" aria-hidden="true">{onDuty ? t('responder.onDuty') : t('responder.offDuty')}</span>
        <Switch checked={onDuty} onChange={toggleDuty} label={t('responder.onDuty')} disabled={dutyPending !== null} />
      </div>
      <IconButton label={t('responder.muteSound')} aria-pressed={muted} onClick={onMute}>
        {muted ? <VolumeX size={22} aria-hidden="true" /> : <Volume2 size={22} aria-hidden="true" />}
      </IconButton>
    </div>
  );

  const loading = rows === null && !error;

  return (
    <main className="page">
      <PageHeader eyebrow={specialtySummary(profile, t)} title={t('responder.alertsTitle')} action={headerAction} />

      <div className="stack">
        {!onDuty && (
          <AlertBanner tone="var(--orange)" icon={BellOff}>
            <p>{t('responder.offDutyBanner')}</p>
            <Button size="sm" variant="secondary" className="rsp-banner-btn" onClick={() => toggleDuty(true)} disabled={dutyPending !== null}>
              {t('responder.goOnDuty')}
            </Button>
          </AlertBanner>
        )}

        {error && (
          <LoadError title={t('responder.alertsLoadError')} error={error} onRetry={() => { setError(null); setAttempt(a => a + 1); }} />
        )}

        {loading && <div className="rsp-center"><Spinner large label={t('common.loading')} /></div>}

        {rows !== null && (
          <>
            <section aria-labelledby="rsp-sec-mine">
              <h2 id="rsp-sec-mine" className="section-title">
                {t('responder.sectionMine')}{mine.length > 0 && ` · ${mine.length}`}
              </h2>
              {mine.length ? (
                <div className="rsp-cards">
                  {mine.map(inc => (
                    <IncidentCard
                      key={inc.id}
                      inc={inc}
                      now={now}
                      variant="mine"
                      busy={Boolean(busy[inc.id])}
                      onAdvance={advance}
                      onResolve={setResolving}
                    />
                  ))}
                </div>
              ) : (
                <Card>
                  <EmptyState icon={CircleCheck} title={t('responder.emptyMineTitle')} text={t('responder.emptyMineText')} />
                </Card>
              )}
            </section>

            <section aria-labelledby="rsp-sec-open">
              <h2 id="rsp-sec-open" className="section-title">
                {t('responder.sectionOpen')}{open.length > 0 && ` · ${open.length}`}
              </h2>
              {open.length ? (
                <div className="rsp-cards">
                  {open.map(inc => (
                    <IncidentCard
                      key={inc.id}
                      inc={inc}
                      now={now}
                      variant="open"
                      busy={Boolean(busy[inc.id])}
                      onClaim={claim}
                    />
                  ))}
                </div>
              ) : (
                <Card>
                  <EmptyState
                    icon={Inbox}
                    title={t('responder.emptyOpenTitle')}
                    text={onDuty ? t('responder.emptyOpenText') : t('responder.emptyOpenOffText')}
                    action={onDuty
                      ? <Button variant="secondary" onClick={() => navigate('/responder/checks')}>{t('responder.seeChecks')}</Button>
                      : <Button onClick={() => toggleDuty(true)} disabled={dutyPending !== null}>{t('responder.goOnDuty')}</Button>}
                  />
                </Card>
              )}
            </section>
          </>
        )}
      </div>

      {resolving && (
        <NoteDialog
          title={t('responder.resolveTitle')}
          text={t('responder.resolveText')}
          label={t('responder.resolveNoteLabel')}
          placeholder={t('responder.resolveNotePlaceholder')}
          confirmLabel={t('responder.actionResolve')}
          variant="success"
          onConfirm={resolve}
          onClose={() => setResolving(null)}
        />
      )}

      <BottomNav />
    </main>
  );
}
