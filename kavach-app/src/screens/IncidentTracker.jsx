import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { listenIncidents } from '../firebase/firestore';

const typeIcons = { lift: 'elevator', power: 'bolt', medical: 'medical_services', fire: 'local_fire_department' };

export default function IncidentTracker() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [incident, setIncident] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [escalation, setEscalation] = useState(1);

  // Fetch the incident from Firestore
  useEffect(() => {
    const unsub = listenIncidents((incidents) => {
      const found = incidents.find(i => i.id === id);
      if (found) {
        setIncident(found);
        setEscalation(found.escalationLevel || 1);
      } else if (incidents.length > 0) {
        // If ID not found, show the latest incident
        setIncident(incidents[0]);
        setEscalation(incidents[0].escalationLevel || 1);
      }
    });
    return unsub;
  }, [id]);

  // Timer based on real created at
  useEffect(() => {
    if (!incident?.createdAt) return;
    let startTime = Date.now();
    const ts = incident.createdAt;
    if (ts) {
      if (ts.toMillis && typeof ts.toMillis === 'function') startTime = ts.toMillis();
      else if (ts instanceof Date) startTime = ts.getTime();
      else if (ts.seconds) startTime = ts.seconds * 1000;
      else if (typeof ts === 'number') startTime = ts;
      else startTime = new Date(ts).getTime();
    }
    
    const updateTime = () => {
      setElapsed(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [incident]);

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const currentEscalation = Math.max(
    escalation,
    elapsed >= 180 ? 4 : elapsed >= 120 ? 3 : elapsed >= 60 ? 2 : 1
  );

  // Use real incident data or defaults
  const incType = incident?.type || 'lift';
  const incLocation = incident?.locationZone || 'Loading...';
  const incUrgency = incident?.urgencyScore || 0;
  const incPeople = incident?.peopleAffected || 0;
  const incStatus = incident?.status || 'pending';

  const steps = [
    { label: 'Submitted', status: 'completed' },
    { label: 'Acknowledged', status: incStatus === 'acknowledged' || incStatus === 'in_progress' || incStatus === 'resolved' || currentEscalation >= 2 ? 'completed' : 'active' },
    { label: 'En Route', status: incStatus === 'in_progress' || incStatus === 'resolved' || currentEscalation >= 3 ? 'active' : 'pending' },
    { label: 'On Scene', status: incStatus === 'resolved' ? 'completed' : 'pending' },
    { label: 'Resolved', status: incStatus === 'resolved' ? 'completed' : 'pending' },
  ];

  const escalationText = ['', 'Technician notified', '⚠️ Supervisor Notified', '⚠️ Admin Alerted', '🚨 CRITICAL — All Admins'];

  return (
    <div className="page fade-up">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={() => navigate('/student')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
          <span className="material-symbols-outlined notranslate notranslate">arrow_back</span>
        </button>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Incident Tracker</h1>
        {incStatus !== 'resolved' && (
          <span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: 'var(--sos-red)', marginLeft: 'auto', animation: 'pulse 2s infinite' }} />
        )}
      </div>

      <div className="stepper">
        {steps.map((s, i) => (
          <div key={s.label} style={{ display: 'contents' }}>
            <div className="step">
              <div className={`step-dot ${s.status}`}>
                {s.status === 'completed' ? '✓' : i + 1}
              </div>
              <span className="step-label">{s.label}</span>
            </div>
            {i < steps.length - 1 && <div className={`step-line ${s.status === 'completed' ? 'completed' : ''}`} />}
          </div>
        ))}
      </div>

      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <div className="badge badge-red" style={{ marginBottom: '0.5rem' }}>
              <span className="material-symbols-outlined notranslate notranslate" style={{ fontSize: '0.875rem' }}>{typeIcons[incType] || 'warning'}</span>
              {incType.charAt(0).toUpperCase() + incType.slice(1)}
            </div>
            <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>{incLocation}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'monospace' }}>{formatTime(elapsed)}</p>
            <p style={{ fontSize: '0.625rem', color: 'var(--text-muted)', fontWeight: 600 }}>ELAPSED</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div className="badge badge-amber">Urgency: {incUrgency}/100</div>
          <div className="badge badge-blue">{incPeople} people</div>
          {incStatus === 'resolved' && <div className="badge badge-green">Resolved</div>}
        </div>
      </div>

      {currentEscalation >= 2 && (
        <div className="glass-card fade-up" style={{ padding: '1rem', marginBottom: '1rem', borderLeft: `4px solid ${currentEscalation >= 4 ? 'var(--sos-red)' : 'var(--sos-amber)'}` }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 700, color: currentEscalation >= 4 ? 'var(--sos-red)' : 'var(--sos-amber)' }}>
            Level {currentEscalation} — {escalationText[currentEscalation]}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Auto-escalated at {formatTime(currentEscalation === 2 ? 60 : currentEscalation === 3 ? 120 : 180)}
          </p>
        </div>
      )}

      {incident?.assignedResponderName && (
        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="avatar" style={{ width: '2.5rem', height: '2.5rem', fontSize: '0.875rem' }}>
            {incident.assignedResponderName.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: '0.875rem' }}>{incident.assignedResponderName}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Assigned Responder</p>
          </div>
          <span className="badge badge-blue" style={{ marginLeft: 'auto' }}>Assigned</span>
        </div>
      )}

      {!incident?.assignedResponderName && (
        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined notranslate notranslate" style={{ color: 'var(--text-muted)', fontSize: '1.25rem' }}>person_search</span>
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: '0.875rem' }}>Awaiting Responder</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>A responder will be assigned shortly</p>
          </div>
          <span className="badge badge-amber" style={{ marginLeft: 'auto' }}>Pending</span>
        </div>
      )}
    </div>
  );
}
