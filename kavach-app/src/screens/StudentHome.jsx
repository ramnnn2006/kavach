import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';

export default function StudentHome() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const firstName = userProfile?.name?.split(' ')[0] || 'Student';

  const sosTypes = [
    { type: 'medical', label: 'Medical', icon: 'medical_services', color: 'var(--sos-red)', size: 'large' },
    { type: 'fire', label: 'Fire', icon: 'local_fire_department', color: 'var(--sos-orange)', size: 'small' },
    { type: 'power', label: 'Power', icon: 'bolt', color: 'var(--sos-amber)', size: 'small' },
    { type: 'lift', label: 'Lift', icon: 'elevator', color: 'var(--sos-blue)', size: 'small' },
  ];

  const handleSOS = (type) => {
    if (navigator.vibrate) navigator.vibrate(50);
    navigate(`/student/report/${type}`);
  };

  return (
    <div className="page" style={{ padding: '24px 20px', paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px 0' }}>Campus Safety</p>
          <h1 style={{ fontSize: '32px', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Hi, {firstName}.</h1>
        </div>
        <div className="avatar" style={{ width: '44px', height: '44px', background: 'var(--primary)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, boxShadow: 'var(--shadow-sm)' }}>
          {firstName[0]}
        </div>
      </div>

      <div className="bento-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {sosTypes.map((s, index) => (
          <button 
            key={s.type} 
            className={`glass-card ${s.size === 'large' ? 'bento-large' : 'bento-small'}`}
            style={{ 
              gridColumn: s.size === 'large' ? 'span 4' : 'span 2',
              gridRow: s.size === 'large' ? 'span 2' : 'span 1',
              display: 'flex',
              flexDirection: s.size === 'large' ? 'row' : 'column',
              alignItems: 'center',
              justifyContent: s.size === 'large' ? 'flex-start' : 'center',
              padding: '20px',
              gap: s.size === 'large' ? '20px' : '12px',
              background: s.size === 'large' ? s.color : 'var(--card-bg)',
              color: s.size === 'large' ? '#fff' : 'var(--text-main)',
              border: s.size === 'large' ? 'none' : '1px solid var(--card-border)'
            }}
            onClick={() => handleSOS(s.type)}
          >
            <div style={{ 
              background: s.size === 'large' ? 'rgba(255,255,255,0.2)' : `${s.color}15`, 
              borderRadius: '16px', 
              padding: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <span className="material-symbols-outlined notranslate" style={{ fontSize: '32px', color: s.size === 'large' ? '#fff' : s.color }}>{s.icon}</span>
            </div>
            <div style={{ textAlign: s.size === 'large' ? 'left' : 'center' }}>
              <span style={{ fontSize: s.size === 'large' ? '24px' : '16px', fontWeight: 700 }}>{s.label}</span>
              {s.size === 'large' && <p style={{ margin: '4px 0 0 0', fontSize: '14px', opacity: 0.9 }}>Immediate assistance required</p>}
            </div>
          </button>
        ))}
      </div>

      <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--text-main)', color: 'var(--bg)', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px', borderRadius: '14px' }}>
            <span className="material-symbols-outlined notranslate" style={{ color: 'var(--bg)' }}>call</span>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Campus Security</p>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94A3B8', fontWeight: 500 }}>Direct Hotline 24/7</p>
          </div>
        </div>
        <a href="tel:112" style={{ background: 'var(--bg)', color: 'var(--text-main)', padding: '10px 16px', borderRadius: '12px', fontSize: '14px', fontWeight: 800, textDecoration: 'none' }}>
          CALL
        </a>
      </div>

      <BottomNav role="student" active="home" />
    </div>
  );
}
