import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { listenMyIncidents } from '../firebase/firestore';
import { getType } from '../config/society';
import { PageHeader, Card, TypeIcon, StatusBadge, EmptyState, Button, Spinner } from '../components/ui';
import BottomNav from '../components/BottomNav';
import { toMillis, timeAgo } from '../utils/time';

export default function MyReports() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState([]);
  const [loadedUid, setLoadedUid] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!user?.uid) return;
    const uid = user.uid;
    return listenMyIncidents(uid, (list) => {
      setIncidents(list || []);
      setLoadedUid(uid);
    });
  }, [user?.uid]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const loaded = !!user?.uid && loadedUid === user.uid;

  // Newest first; pending server timestamps (null) count as newest
  const sorted = incidents
    .map(inc => ({ inc, ms: toMillis(inc.createdAt) }))
    .sort((a, b) => (b.ms ?? Infinity) - (a.ms ?? Infinity));

  return (
    <div className="page fade-in">
      <PageHeader title="Reports" />

      {!loaded ? (
        <div className="row" style={{ justifyContent: 'center', padding: 'var(--s-5) 0' }}>
          <Spinner large label="Loading reports" />
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No reports yet"
          text="Alerts you send will appear here so you can follow their progress."
          action={<Button onClick={() => navigate('/student')}>Report an emergency</Button>}
        />
      ) : (
        <ul className="list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {sorted.map(({ inc, ms }) => {
            const t = getType(inc.type);
            const meta = [inc.locationZone, timeAgo(ms, now)].filter(Boolean).join(' · ');
            return (
              <li key={inc.id}>
                <Card
                  as="button"
                  type="button"
                  interactive
                  className="list-row"
                  onClick={() => navigate(`/student/tracker/${inc.id}`)}
                >
                  <TypeIcon type={inc.type} />
                  <div className="list-row__body">
                    <p className="list-row__title truncate">{t.label}</p>
                    <p className="list-row__meta truncate">{meta}</p>
                  </div>
                  <StatusBadge status={inc.status} />
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <BottomNav role="student" active="reports" />
    </div>
  );
}
