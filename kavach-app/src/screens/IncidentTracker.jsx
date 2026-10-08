import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CircleSlash, TriangleAlert, SearchX, UserRoundSearch, MapPin, Users } from 'lucide-react';
import { listenIncident } from '../firebase/firestore';
import { getType, getStatus } from '../config/society';
import {
  PageHeader, Card, TypeIcon, StatusBadge, Stepper, Spinner, EmptyState, Button, AlertBanner, Avatar,
} from '../components/ui';
import { toMillis } from '../utils/time';

function clock(ms) {
  if (ms == null) return undefined;
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatElapsed(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

const STEP_LABELS = ['Sent', 'Accepted', 'On the way', 'Help arrived', 'Resolved'];

export default function IncidentTracker() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [incident, setIncident] = useState(null);
  const [loadedId, setLoadedId] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  // Subscribe to just this incident (reporters can't read the whole collection)
  useEffect(() => {
    return listenIncident(id, (found) => {
      setIncident(found);
      setLoadedId(id);
    });
  }, [id]);

  const loaded = loadedId === id;
  const status = incident?.status || 'pending';
  const finished = status === 'resolved' || status === 'cancelled';

  // Tick the elapsed clock only while the report is still open
  useEffect(() => {
    if (!loaded || !incident || finished) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [loaded, incident, finished]);

  if (!loaded) {
    return (
      <div className="page page--center" style={{ alignItems: 'center' }}>
        <Spinner large label="Loading report" />
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="page fade-in">
        <PageHeader compact back="/student/reports" title="Your report" />
        <EmptyState
          icon={SearchX}
          title="Report not found"
          text="It may have been removed, or the link is wrong."
          action={<Button onClick={() => navigate('/student/reports')}>View my reports</Button>}
        />
      </div>
    );
  }

  const type = getType(incident.type);
  const step = getStatus(status).step;
  const createdMs = toMillis(incident.createdAt);
  const ackMs = toMillis(incident.acknowledgedAt);
  const resolvedMs = toMillis(incident.resolvedAt);

  const endMs = status === 'resolved' ? (resolvedMs ?? now) : now;
  const elapsed = createdMs == null ? 0 : Math.max(0, Math.floor((endMs - createdMs) / 1000));

  const stepTimes = [clock(createdMs), clock(ackMs), undefined, undefined, clock(resolvedMs)];
  const steps = STEP_LABELS.map((label, i) => ({
    label,
    state: i <= step ? 'done' : i === step + 1 ? 'current' : 'todo',
    time: i <= step ? stepTimes[i] : undefined,
  }));

  const people = incident.peopleAffected;
  const escalationLevel = Number(incident.escalationLevel) || 1;

  return (
    <div className="page fade-in">
      <PageHeader compact back title="Your report" action={<StatusBadge status={status} />} />

      <div className="stack">
        <Card className="stack-sm">
          <div className="list-row">
            <TypeIcon type={incident.type} />
            <div className="list-row__body">
              <p className="list-row__title">{type.label}</p>
              {incident.locationZone && (
                <p className="list-row__meta row">
                  <MapPin size={14} aria-hidden="true" />
                  <span className="truncate">{incident.locationZone}</span>
                </p>
              )}
              {people != null && (
                <p className="list-row__meta row">
                  <Users size={14} aria-hidden="true" />
                  <span>{people >= 50 ? '50+' : people} {people === 1 ? 'person' : 'people'} affected</span>
                </p>
              )}
            </div>
            {status !== 'cancelled' && (
              <div style={{ textAlign: 'right' }}>
                <p className="mono text-lg bold">{formatElapsed(elapsed)}</p>
                <p className="text-xs muted">{status === 'resolved' ? 'Total time' : 'Elapsed'}</p>
              </div>
            )}
          </div>
        </Card>

        {escalationLevel > 1 && (
          <AlertBanner tone="var(--orange)" icon={TriangleAlert}>
            Escalated (level {escalationLevel})
          </AlertBanner>
        )}

        {status === 'cancelled' ? (
          <AlertBanner tone="var(--gray)" icon={CircleSlash}>
            This report was cancelled.
          </AlertBanner>
        ) : (
          <section aria-labelledby="progress-heading">
            <h2 id="progress-heading" className="section-title">Progress</h2>
            <Card>
              <Stepper steps={steps} />
            </Card>
          </section>
        )}

        {status !== 'cancelled' && (
          <Card className="list-row">
            {incident.assignedResponderName ? (
              <>
                <Avatar name={incident.assignedResponderName} />
                <div className="list-row__body">
                  <p className="list-row__title">{incident.assignedResponderName}</p>
                  <p className="list-row__meta">Assigned responder</p>
                </div>
              </>
            ) : (
              <>
                <UserRoundSearch size={22} className="muted" aria-hidden="true" />
                <div className="list-row__body">
                  <p className="list-row__title">Waiting for a responder to accept</p>
                  <p className="list-row__meta">You'll see their name here once they do.</p>
                </div>
              </>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
