import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';

export default function CampusMap() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const role = userProfile?.role || 'student';

  const mapUrl = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15545.918967912061!2d80.1425946!3d13.0688008!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a5261ab7b500331%3A0x6bbaaa3b4ddbb022!2sSRM%20Institute%20of%20Science%20and%20Technology%2C%20Ramapuram%20Campus!5e0!3m2!1sen!2sin!4v1703649491632!5m2!1sen!2sin';

  return (
    <div className="page fade-up" style={{ padding: 0, height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '1.5rem 1.5rem 1rem 1.5rem', background: 'var(--bg)', zIndex: 10, position: 'relative', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
            <span className="material-symbols-outlined notranslate notranslate">arrow_back</span>
          </button>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Live Campus Map</h1>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Real-time location and zones</p>
      </div>

      <div style={{ flex: 1, position: 'relative', background: '#e2e8f0' }}>
        <iframe 
          src={mapUrl}
          width="100%" 
          height="100%" 
          style={{ border: 0, filter: 'contrast(1.1) saturate(1.2)' }} 
          allowFullScreen="" 
          loading="lazy" 
          referrerPolicy="no-referrer-when-downgrade"
          title="Campus Map"
        ></iframe>

        <div style={{ position: 'absolute', bottom: '6rem', left: '1rem', right: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', borderRadius: '1rem', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '0.75rem', height: '0.75rem', borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 0 4px rgba(34, 197, 94, 0.2)' }} />
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Your Location</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', marginLeft: '1.5rem' }}>Main Block, Ground Floor</p>
        </div>
      </div>

      <BottomNav role={role} active="map" />
    </div>
  );
}
