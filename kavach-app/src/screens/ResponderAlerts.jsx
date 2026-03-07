import { useState, useEffect } from 'react';
import { listenPendingIncidents, updateIncident } from '../firebase/firestore';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';
import { Timestamp } from 'firebase/firestore';

const typeIcons = { lift: 'elevator', power: 'bolt', medical: 'medical_services', fire: 'local_fire_department' };
const typeColors = { lift: '#EF4444', power: '#F59E0B', medical: '#3B82F6', fire: '#F97316' };
const typeBgs = { lift: '#FEF2F2', power: '#FFFBEB', medical: '#EFF6FF', fire: '#FFF7ED' };

export default function ResponderAlerts() {
  const { user, userProfile } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    const unsub = listenPendingIncidents(setIncidents);
    return unsub;
  }, []);

  const handleAccept = async (inc) => {
    try {
      await updateIncident(inc.id, {
        status: 'acknowledged',
        assignedResponder: user?.uid || 'demo-responder',
        assignedResponderName: userProfile?.name || 'Rajesh Kumar',
        acknowledgedAt: Timestamp.fromDate(new Date()),
      });
    } catch (err) {
      console.error('Error accepting incident:', err);
    }
    setActiveId(inc.id);
  };

  function timeAgo(ts) {
    if (!ts) return '';
    let date;
    if (ts.toDate && typeof ts.toDate === 'function') date = ts.toDate();
    else if (ts instanceof Date) date = ts;
    else if (ts.seconds) date = new Date(ts.seconds * 1000);
    else date = new Date(ts);
    const mins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (mins < 1) return 'just now';
    return `${mins}m ago`;
  }

  if (activeId) {
    const inc = incidents.find(i => i.id === activeId) || incidents[0];
    if (inc) return <ResponderActive incident={inc} onBack={() => setActiveId(null)} />;
  }

  return (
    <div className="page fade-up">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="material-symbols-outlined notranslate notranslate" style={{ fontSize: '1.5rem' }}>shield</span>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Kavach Responder</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.125rem' }}>
              <span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: '#22C55E' }} />
              <span style={{ fontSize: '0.75rem', color: '#22C55E', fontWeight: 600 }}>Online</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <span className="section-label" style={{ margin: 0 }}>Active Alerts</span>
        <span className="badge badge-red">{incidents.length}</span>
      </div>

      {incidents.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <span className="material-symbols-outlined notranslate notranslate" style={{ fontSize: '3rem', color: 'var(--success)', marginBottom: '1rem', display: 'block' }}>verified</span>
          <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem' }}>All Clear</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No active alerts. Stand by for incoming incidents.</p>
        </div>
      )}

      {incidents.map((inc, i) => (
        <div key={inc.id} className={`incident-card fade-up ${inc.urgencyScore >= 70 ? 'critical' : inc.urgencyScore >= 50 ? 'high' : 'medium'}`} style={{ animationDelay: `${i * 0.1}s` }}>
          <div className="incident-icon" style={{ background: typeBgs[inc.type] }}>
            <span className="material-symbols-outlined notranslate notranslate" style={{ color: typeColors[inc.type] }}>{typeIcons[inc.type]}</span>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, fontSize: '0.875rem', textTransform: 'capitalize' }}>{inc.type} — {inc.locationZone}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{inc.peopleAffected} affected · {timeAgo(inc.createdAt)}</p>
            {inc.escalationLevel >= 2 && (
              <span className="badge badge-amber" style={{ marginTop: '0.5rem' }}>⚠️ ESCALATING</span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
            <span className="badge" style={{ background: inc.urgencyScore >= 70 ? '#FEF2F2' : '#FFFBEB', color: inc.urgencyScore >= 70 ? '#DC2626' : '#D97706' }}>{inc.urgencyScore}</span>
            <button className="btn btn-primary" style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.6875rem', textTransform: 'uppercase' }} onClick={() => handleAccept(inc)}>
              Accept
            </button>
          </div>
        </div>
      ))}

      <BottomNav role="responder" active="alerts" />
    </div>
  );
}

function ResponderActive({ incident, onBack }) {
  const [status, setStatus] = useState(incident?.status === 'acknowledged' ? 'acknowledged' : 'acknowledged');

  const statusFlow = [
    { key: 'en_route', label: '🚶 Mark En Route', cls: 'btn-amber' },
    { key: 'on_scene', label: '📍 On Scene', cls: 'btn-primary' },
    { key: 'resolved', label: '✅ Mark Resolved', cls: 'btn-success' },
  ];

  const currentIdx = status === 'acknowledged' ? 0 : status === 'en_route' ? 1 : status === 'on_scene' ? 2 : 3;

  const handleStatus = async (key) => {
    setStatus(key);
    try {
      await updateIncident(incident.id, {
        status: key === 'resolved' ? 'resolved' : 'in_progress',
        ...(key === 'resolved' && { resolvedAt: Timestamp.fromDate(new Date()) }),
      });
    } catch (err) {
      console.error('Error updating incident status:', err);
    }
  };

  return (
    <div className="page fade-up">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
          <span className="material-symbols-outlined notranslate notranslate">arrow_back</span>
        </button>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Active Incident</h1>
        <span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: 'var(--sos-red)', marginLeft: 'auto', animation: 'pulse 2s infinite' }} />
      </div>

      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
        <div className="badge badge-red" style={{ marginBottom: '0.75rem' }}>
          <span className="material-symbols-outlined notranslate notranslate" style={{ fontSize: '0.875rem' }}>{typeIcons[incident.type]}</span>
          {incident.type} Emergency
        </div>
        <p style={{ fontWeight: 700, marginBottom: '0.5rem' }}>{incident.locationZone}</p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span className="badge badge-blue">{incident.peopleAffected} affected</span>
          <span className="badge badge-amber">Urgency: {incident.urgencyScore}</span>
        </div>
        {incident.description && (
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.75rem', fontStyle: 'italic' }}>"{incident.description}"</p>
        )}
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>Reporter: {incident.reporterName || 'Unknown'}</p>
      </div>

      <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <span className="section-label">Timeline</span>
        <p style={{ fontSize: '0.8125rem', marginBottom: '0.375rem' }}>📤 Reported — just now</p>
        <p style={{ fontSize: '0.8125rem' }}>✅ You accepted — just now</p>
        {status === 'en_route' && <p style={{ fontSize: '0.8125rem', marginTop: '0.375rem' }}>🚶 En route — now</p>}
        {status === 'on_scene' && <p style={{ fontSize: '0.8125rem', marginTop: '0.375rem' }}>📍 On scene — now</p>}
        {status === 'resolved' && <p style={{ fontSize: '0.8125rem', marginTop: '0.375rem' }}>✅ Resolved — now</p>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {statusFlow.map((s, i) => (
          <button
            key={s.key}
            className={`btn ${i === currentIdx ? s.cls : 'btn-outline'}`}
            disabled={i !== currentIdx || status === 'resolved'}
            onClick={() => handleStatus(s.key)}
            style={{ opacity: i === currentIdx ? 1 : 0.4 }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {status === 'resolved' && (
        <div className="glass-card fade-up" style={{ padding: '1.5rem', marginTop: '1.5rem', textAlign: 'center', borderLeft: '4px solid var(--success)' }}>
          <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>✅</p>
          <p style={{ fontWeight: 700 }}>Incident Resolved</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Great work! Timeline has been logged.</p>
        </div>
      )}

      <BottomNav role="responder" active="active" />
    </div>
  );
}
