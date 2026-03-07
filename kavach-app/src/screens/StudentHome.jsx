import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';

export default function StudentHome() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const firstName = userProfile?.name?.split(' ')[0] || 'Student';

  const sosTypes = [
    { type: 'lift', label: 'Lift Stuck', icon: 'elevator', color: '#EF4444', bg: '#FEF2F2' },
    { type: 'power', label: 'Power Outage', icon: 'bolt', color: '#F59E0B', bg: '#FFFBEB' },
    { type: 'medical', label: 'Medical', icon: 'medical_services', color: '#3B82F6', bg: '#EFF6FF' },
    { type: 'fire', label: 'Fire', icon: 'local_fire_department', color: '#F97316', bg: '#FFF7ED' },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Hi, {firstName} 👋</h1>
          <p className="page-subtitle">Campus safety is active</p>
        </div>
        <div style={{ position: 'relative' }}>
          <div className="avatar">
            {firstName[0]}
          </div>
          <div style={{ position: 'absolute', bottom: 0, right: 0, width: '0.875rem', height: '0.875rem', background: '#22C55E', border: '2px solid var(--bg)', borderRadius: '50%' }} />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <span className="section-label" style={{ margin: 0 }}>Quick SOS Reporting</span>
        <div className="badge badge-red">
          <span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: '#EF4444' }} />
          Live Tracking
        </div>
      </div>

      <div className="sos-grid">
        {sosTypes.map(s => (
          <button key={s.type} className="sos-card" onClick={() => navigate(`/student/report/${s.type}`)}>
            <div className="sos-icon" style={{ background: s.bg }}>
              <span className="material-symbols-outlined notranslate notranslate" style={{ color: s.color }}>{s.icon}</span>
            </div>
            <span className="sos-label">{s.label}</span>
          </button>
        ))}
      </div>

      <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--text-main)', color: 'white', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.625rem', borderRadius: '0.75rem' }}>
            <span className="material-symbols-outlined notranslate notranslate" style={{ color: 'white' }}>call</span>
          </div>
          <div>
            <p style={{ fontSize: '0.875rem', fontWeight: 700 }}>Campus Security</p>
            <p style={{ fontSize: '0.625rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500 }}>Direct Hotline 24/7</p>
          </div>
        </div>
        <a href="tel:112" style={{ background: 'white', color: 'var(--text-main)', padding: '0.625rem 1.25rem', borderRadius: '0.75rem', fontSize: '0.75rem', fontWeight: 800, textDecoration: 'none' }}>
          CALL NOW
        </a>
      </div>

      <div>
        <span className="section-label">Security Updates</span>
        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          <div style={{ width: '3rem', height: '3rem', borderRadius: '0.75rem', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span className="material-symbols-outlined notranslate notranslate" style={{ color: '#3B82F6' }}>info</span>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 700 }}>Mock Drill Today</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', lineHeight: 1.5 }}>Fire safety drill at Main Library building at 4:00 PM today.</p>
          </div>
          <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#94A3B8' }}>2h ago</span>
        </div>
      </div>

      <BottomNav role="student" active="home" />
    </div>
  );
}
