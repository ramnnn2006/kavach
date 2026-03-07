import { useState, useEffect } from 'react';
import { listenIncidents, listenZones, seedZones } from '../firebase/firestore';
import BottomNav from '../components/BottomNav';

const typeIcons = { lift: 'elevator', power: 'bolt', medical: 'medical_services', fire: 'local_fire_department' };
const typeColors = { lift: '#EF4444', power: '#F59E0B', medical: '#3B82F6', fire: '#F97316' };

const tierConfig = {
  P1: { label: 'NEVER CUT', color: '#EF4444', bg: '#FEF2F2' },
  P2: { label: 'CUT LAST', color: '#F59E0B', bg: '#FFFBEB' },
  P3: { label: 'ROTATE', color: '#EAB308', bg: '#FEFCE8' },
  P4: { label: 'CUT FIRST', color: '#22C55E', bg: '#F0FDF4' },
};

const statusColor = { on: '#22C55E', off: '#EF4444', rotating: '#EAB308' };

export default function AdminDashboard() {
  const [tab, setTab] = useState('incidents');
  const [incidents, setIncidents] = useState([]);
  const [zones, setZones] = useState([]);
  const [outageMode, setOutageMode] = useState(false);

  useEffect(() => {
    // Seed zones if the Firestore 'zones' collection is empty
    seedZones();
    const u1 = listenIncidents(setIncidents);
    const u2 = listenZones(setZones);
    return () => { u1(); u2(); };
  }, []);

  const activeCount = incidents.filter(i => i.status !== 'resolved').length;
  const resolvedCount = incidents.filter(i => i.status === 'resolved').length;

  const activateOutage = () => {
    setOutageMode(true);
  };

  return (
    <div className="page fade-up">
      <h1 style={{ fontSize: '0.875rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>KAVACH COMMAND CENTER</h1>

      <div className="stat-row">
        <div className="stat-card">
          <p className="stat-value" style={{ color: 'var(--sos-red)' }}>{activeCount}</p>
          <p className="stat-label">Active</p>
        </div>
        <div className="stat-card">
          <p className="stat-value" style={{ color: 'var(--success)' }}>{resolvedCount}</p>
          <p className="stat-label">Resolved</p>
        </div>
        <div className="stat-card">
          <p className="stat-value" style={{ color: 'var(--sos-amber)' }}>{zones.length > 0 ? `${Math.round(zones.filter(z => z.powerStatus === 'on').length / zones.length * 100)}%` : '—'}</p>
          <p className="stat-label">Power Up</p>
        </div>
      </div>

      <div className="tab-bar">
        {['incidents', 'map', 'power'].map(t => (
          <button key={t} className={`tab-item ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'incidents' && (
        <div>
          {incidents.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <span className="material-symbols-outlined notranslate notranslate" style={{ fontSize: '3rem', color: 'var(--success)', marginBottom: '1rem', display: 'block' }}>verified</span>
              <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem' }}>No Incidents</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>The campus is safe. No active incidents reported.</p>
            </div>
          )}
          {incidents.map((inc, i) => (
            <div key={inc.id} className={`incident-card fade-up ${inc.urgencyScore >= 70 ? 'critical' : inc.urgencyScore >= 50 ? 'high' : 'medium'}`} style={{ animationDelay: `${i * 0.1}s` }}>
              <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.75rem', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined notranslate notranslate" style={{ color: typeColors[inc.type], fontSize: '1.25rem' }}>{typeIcons[inc.type]}</span>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, fontSize: '0.8125rem', textTransform: 'capitalize' }}>{inc.type} — {inc.locationZone}</p>
                <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{inc.peopleAffected} affected {inc.assignedResponderName ? `· ${inc.assignedResponderName}` : ''}</p>
                <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                  <span className="badge" style={{ background: inc.urgencyScore >= 70 ? '#FEF2F2' : '#FFFBEB', color: inc.urgencyScore >= 70 ? '#DC2626' : '#D97706', fontSize: '0.5625rem' }}>Score: {inc.urgencyScore}</span>
                  <span className={`badge ${inc.status === 'resolved' ? 'badge-green' : inc.status === 'pending' ? 'badge-amber' : 'badge-blue'}`} style={{ fontSize: '0.5625rem' }}>{inc.status}</span>
                  {inc.escalationLevel >= 3 && <span className="badge badge-red" style={{ fontSize: '0.5625rem', animation: 'pulse 2s infinite' }}>🚨 CRITICAL</span>}
                  {inc.escalationLevel === 2 && <span className="badge badge-amber" style={{ fontSize: '0.5625rem' }}>⚠️ ESCALATING</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'map' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
          {zones.map(z => (
            <div key={z.name || z.id} style={{
              padding: '0.75rem 0.5rem', borderRadius: '0.75rem', textAlign: 'center',
              background: z.powerStatus === 'on' ? '#F0FDF4' : z.powerStatus === 'off' ? '#FEF2F2' : '#FEFCE8',
              border: `1px solid ${z.powerStatus === 'on' ? '#BBF7D0' : z.powerStatus === 'off' ? '#FECACA' : '#FDE68A'}`,
              fontSize: '0.5625rem', fontWeight: 600,
            }}>
              <div style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: statusColor[z.powerStatus], margin: '0 auto 0.375rem' }} />
              {z.name}
            </div>
          ))}
        </div>
      )}

      {tab === 'power' && (
        <div>
          <button className="btn btn-amber" onClick={activateOutage} style={{ marginBottom: '1.5rem' }}>
            <span className="material-symbols-outlined notranslate notranslate" style={{ fontSize: '1.125rem' }}>bolt</span>
            {outageMode ? '⚡ Outage Mode Active' : '⚡ Activate Outage Mode'}
          </button>

          {['P1', 'P2', 'P3', 'P4'].map(tier => {
            const cfg = tierConfig[tier];
            const tierZones = zones.filter(z => z.priorityTier === tier);
            if (tierZones.length === 0) return null;
            return (
              <div key={tier} className="tier-section">
                <div className="tier-header">
                  <span className="tier-dot" style={{ background: cfg.color }} />
                  <span style={{ color: cfg.color }}>{tier} — {cfg.label}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                  {tierZones.map(z => (
                    <span key={z.name || z.id} className="zone-chip">
                      <span className="zone-status" style={{ background: statusColor[outageMode ? (tier === 'P1' || tier === 'P2' ? 'on' : tier === 'P3' ? 'rotating' : 'off') : z.powerStatus] }} />
                      {z.name}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <BottomNav role="admin" active="dashboard" />
    </div>
  );
}
