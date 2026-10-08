import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Phone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { listenMyIncidents } from '../firebase/firestore';
import { TYPE_ORDER, ACTIVE_STATUSES, getType, getStatus } from '../config/society';
import { PageHeader, Card, TypeIcon } from '../components/ui';
import BottomNav from '../components/BottomNav';

export default function StudentHome() {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const firstName = userProfile?.name?.split(' ')[0] || 'there';
  const [incidents, setIncidents] = useState([]);

  useEffect(() => {
    if (!user?.uid) return;
    return listenMyIncidents(user.uid, list => setIncidents(list || []));
  }, [user?.uid]);

  const active = user?.uid ? incidents.find(i => ACTIVE_STATUSES.includes(i.status)) : null;

  const handleSOS = (type) => {
    if (navigator.vibrate) navigator.vibrate(50);
    navigate(`/student/report/${type}`);
  };

  return (
    <div className="page fade-in">
      <PageHeader eyebrow="Campus safety" title={`Hi, ${firstName}`} />

      <div className="stack-lg">
        {active && (
          <Card
            as="button"
            type="button"
            interactive
            accent
            tone={getType(active.type).tone}
            className="list-row"
            onClick={() => navigate(`/student/tracker/${active.id}`)}
          >
            <TypeIcon type={active.type} />
            <div className="list-row__body">
              <p className="list-row__title">Active report</p>
              <p className="list-row__meta">
                {getType(active.type).label} · {getStatus(active.status).label}
              </p>
            </div>
            <ChevronRight size={20} className="muted" aria-hidden="true" />
          </Card>
        )}

        <section aria-labelledby="sos-heading">
          <h2 id="sos-heading" className="section-title">What's happening?</h2>
          <div className="grid-2">
            {TYPE_ORDER.map(type => {
              const t = getType(type);
              if (type === 'lift') {
                return (
                  <button
                    key={type}
                    type="button"
                    className="sos-tile sos-tile--hero"
                    style={{ '--tone': t.tone }}
                    aria-label={`Report ${t.label}`}
                    onClick={() => handleSOS(type)}
                  >
                    <TypeIcon type={type} size="lg" />
                    <span>
                      <span className="sos-tile__label" style={{ display: 'block' }}>I'm stuck in a lift</span>
                      <span className="text-sm">Tap to report</span>
                    </span>
                  </button>
                );
              }
              return (
                <button
                  key={type}
                  type="button"
                  className="sos-tile"
                  aria-label={`Report ${t.label}`}
                  onClick={() => handleSOS(type)}
                >
                  <TypeIcon type={type} />
                  <span className="sos-tile__label">{t.short}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="help-heading">
          <h2 id="help-heading" className="section-title">Other help</h2>
          <Card className="row-between">
            <div className="list-row">
              <Phone size={20} className="muted" aria-hidden="true" />
              <div className="list-row__body">
                <p className="list-row__title">Emergency services</p>
                <p className="list-row__meta mono">112</p>
              </div>
            </div>
            <a className="btn btn--secondary btn--sm" href="tel:112" aria-label="Call emergency 112" style={{ minHeight: 44 }}>Call</a>
          </Card>
        </section>
      </div>

      <BottomNav role="student" active="home" />
    </div>
  );
}
