import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BellOff, CircleCheck, MapPin, Users, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/DialogContext';
import { listenIncidents, claimIncident, updateIncidentStatus } from '../firebase/firestore';
import { getType, NEXT_STATUS } from '../config/society';
import BottomNav from '../components/BottomNav';
import { PageHeader, Card, Button, TypeIcon, StatusBadge, Badge, EmptyState } from '../components/ui';
import { toMillis, timeAgo } from '../utils/time';

function urgencyTone(score) {
  if (score >= 75) return 'var(--red)';
  if (score >= 50) return 'var(--orange)';
  return 'var(--gray)';
}

function isClaimConflict(err) {
  const text = typeof err === 'string' ? err : err?.message || '';
  return text.toLowerCase().includes('already claimed');
}

export default function ResponderAlerts() {
  const { user, userProfile } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [searchParams] = useSearchParams();
  const view = searchParams.get('view') === 'active' ? 'active' : 'alerts';
  const [incidents, setIncidents] = useState([]);
  const [busy, setBusy] = useState({});
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => listenIncidents(setIncidents), []);

  // Keep "x min ago" labels fresh
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const openAlerts = incidents
    .filter(i => i.status === 'pending')
    .sort((a, b) => {
      const byScore = (b.urgencyScore ?? 0) - (a.urgencyScore ?? 0);
      if (byScore !== 0) return byScore;
      return (toMillis(a.createdAt) ?? Infinity) - (toMillis(b.createdAt) ?? Infinity);
    });

  const activeAlerts = incidents.filter(
    i => i.assignedResponder === user?.uid && i.status !== 'resolved' && i.status !== 'cancelled'
  );

  const setCardBusy = (id, value) => setBusy(prev => ({ ...prev, [id]: value }));

  const handleClaim = async (inc) => {
    const t = getType(inc.type);
    const where = inc.locationZone || 'unknown location';
    const ok = await confirm(
      'Claim this alert?',
      `${t.label} at ${where}. You will be responsible for responding.`,
      { confirmLabel: 'Claim' }
    );
    if (!ok) return;
    setCardBusy(inc.id, true);
    try {
      await claimIncident(inc.id, user.uid, userProfile?.name);
      showToast('Claimed — it\'s in Active now', 'success');
    } catch (err) {
      showToast(
        isClaimConflict(err) ? 'Someone else already claimed this alert' : 'Couldn\'t claim. Check your connection.',
        'error'
      );
    } finally {
      setCardBusy(inc.id, false);
    }
  };

  const handleNext = async (inc) => {
    const next = NEXT_STATUS[inc.status];
    if (!next) return;
    if (next.status === 'resolved') {
      const ok = await confirm(
        'Mark as resolved?',
        `${getType(inc.type).label} at ${inc.locationZone || 'unknown location'} will be closed.`,
        { confirmLabel: 'Resolve' }
      );
      if (!ok) return;
    }
    setCardBusy(inc.id, true);
    try {
      await updateIncidentStatus(inc.id, next.status);
    } catch {
      showToast('Couldn\'t update status. Check your connection.', 'error');
    } finally {
      setCardBusy(inc.id, false);
    }
  };

  const list = view === 'alerts' ? openAlerts : activeAlerts;

  return (
    <div className="page">
      <PageHeader eyebrow="Responder" title={view === 'alerts' ? 'Alerts' : 'Active'} />

      {list.length === 0 ? (
        view === 'alerts' ? (
          <EmptyState icon={BellOff} title="No open alerts" text="New emergencies will appear here." />
        ) : (
          <EmptyState icon={CircleCheck} title="Nothing in progress" text="Alerts you claim will show up here." />
        )
      ) : (
        <div className="list">
          {list.map(inc => {
            const t = getType(inc.type);
            const next = NEXT_STATUS[inc.status];
            const description = inc.description?.trim();
            const score = inc.urgencyScore ?? 0;
            return (
              <Card key={inc.id} accent tone={t.tone} as="article" className="stack-sm">
                <div className="list-row">
                  <TypeIcon type={inc.type} />
                  <div className="list-row__body">
                    <p className="list-row__title">{t.label}</p>
                    <p className="list-row__meta row">
                      <MapPin size={14} aria-hidden="true" />
                      <span className="truncate">{inc.locationZone || 'Location not given'}</span>
                    </p>
                  </div>
                  <StatusBadge status={inc.status} staff />
                </div>

                <div className="row wrap text-sm muted">
                  <span className="row" style={{ gap: 'var(--s-1)' }}>
                    <Users size={14} aria-hidden="true" />
                    {inc.peopleAffected ?? 1} {(inc.peopleAffected ?? 1) === 1 ? 'person' : 'people'}
                  </span>
                  <span className="row" style={{ gap: 'var(--s-1)' }}>
                    <Clock size={14} aria-hidden="true" />
                    {timeAgo(inc.createdAt, now)}
                  </span>
                  <Badge tone={urgencyTone(score)}>Urgency {score}</Badge>
                </div>

                {description && <p className="text-sm">{description}</p>}

                {view === 'alerts' ? (
                  <Button block loading={busy[inc.id]} onClick={() => handleClaim(inc)}>
                    Claim
                  </Button>
                ) : next ? (
                  <Button
                    block
                    variant={next.status === 'resolved' ? 'success' : 'primary'}
                    loading={busy[inc.id]}
                    onClick={() => handleNext(inc)}
                  >
                    {next.label}
                  </Button>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}

      <BottomNav role="responder" active={view} />
    </div>
  );
}
