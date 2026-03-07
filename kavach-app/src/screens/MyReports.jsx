import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { listenMyIncidents } from '../firebase/firestore';
import BottomNav from '../components/BottomNav';

const typeIcons = { lift: 'elevator', power: 'bolt', medical: 'medical_services', fire: 'local_fire_department' };
const typeColors = { lift: '#EF4444', power: '#F59E0B', medical: '#3B82F6', fire: '#F97316' };
const typeBgs = { lift: '#FEF2F2', power: '#FFFBEB', medical: '#EFF6FF', fire: '#FFF7ED' };
const statusBadge = { pending: 'badge-amber', acknowledged: 'badge-blue', in_progress: 'badge-blue', resolved: 'badge-green' };

export default function MyReports() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState([]);

  useEffect(() => {
    if (!user) return;
    return listenMyIncidents(user.uid, setIncidents);
  }, [user]);

  function timeAgo(ts) {
    if (!ts) return '';
    let date;
    if (ts.toDate && typeof ts.toDate === 'function') {
      date = ts.toDate();
    } else if (ts instanceof Date) {
      date = ts;
    } else if (typeof ts === 'number') {
      date = new Date(ts);
    } else if (ts.seconds) {
      // Firestore Timestamp object from JSON
      date = new Date(ts.seconds * 1000);
    } else {
      date = new Date(ts);
    }
    const mins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return `${Math.floor(mins / 1440)}d ago`;
  }

  const hasData = incidents.length > 0;

  return (
    <div className="page fade-up">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={() => navigate('/student')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
          <span className="material-symbols-outlined notranslate notranslate">arrow_back</span>
        </button>
        <h1 className="page-title">My Reports</h1>
      </div>

      {!hasData && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <span className="material-symbols-outlined notranslate notranslate" style={{ fontSize: '3rem', color: 'var(--text-muted)', marginBottom: '1rem', display: 'block' }}>description</span>
          <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem' }}>No Reports Yet</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Your submitted incidents will appear here</p>
          <button className="btn btn-primary" style={{ marginTop: '1.5rem', maxWidth: '16rem', margin: '1.5rem auto 0' }} onClick={() => navigate('/student')}>
            <span className="material-symbols-outlined notranslate notranslate" style={{ fontSize: '1.125rem' }}>add</span>
            Report Emergency
          </button>
        </div>
      )}

      {incidents.map((inc, i) => (
        <div key={inc.id} className="incident-card fade-up" style={{ animationDelay: `${i * 0.1}s`, cursor: 'pointer' }} onClick={() => navigate(`/student/tracker/${inc.id}`)}>
          <div className="incident-icon" style={{ background: typeBgs[inc.type] }}>
            <span className="material-symbols-outlined notranslate notranslate" style={{ color: typeColors[inc.type] }}>{typeIcons[inc.type]}</span>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, fontSize: '0.875rem', textTransform: 'capitalize' }}>{inc.type?.replace('_', ' ')} Emergency</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{inc.locationZone}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className={`badge ${statusBadge[inc.status] || 'badge-gray'}`}>{inc.status}</span>
            <p style={{ fontSize: '0.625rem', color: '#94A3B8', marginTop: '0.5rem', fontWeight: 600 }}>{timeAgo(inc.createdAt)}</p>
          </div>
        </div>
      ))}

      <BottomNav role="student" active="reports" />
    </div>
  );
}
