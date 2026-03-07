import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createIncident, calculateUrgency } from '../firebase/firestore';

const typeInfo = {
  lift: { label: 'Lift Stuck', icon: 'elevator', color: '#EF4444', bg: '#FEF2F2' },
  power: { label: 'Power Outage', icon: 'bolt', color: '#F59E0B', bg: '#FFFBEB' },
  medical: { label: 'Medical Emergency', icon: 'medical_services', color: '#3B82F6', bg: '#EFF6FF' },
  fire: { label: 'Fire Emergency', icon: 'local_fire_department', color: '#F97316', bg: '#FFF7ED' },
};

const buildings = ['Block A', 'Block B', 'Block C', 'Main Building', 'Hostel 1', 'Hostel 2'];
const floors = ['Ground', '1st', '2nd', '3rd', '4th', '5th'];

export default function ReportForm() {
  const { type } = useParams();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const info = typeInfo[type] || typeInfo.lift;

  const [building, setBuilding] = useState('');
  const [floor, setFloor] = useState('');
  const [zone, setZone] = useState('');
  const [people, setPeople] = useState(1);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const urgencyScore = calculateUrgency(type, people);
      const result = await createIncident({
        type,
        locationBuilding: building,
        locationFloor: floor,
        locationZone: `${building}, ${floor} Floor${zone ? `, ${zone}` : ''}`,
        reporterUid: user?.uid || 'demo-student',
        reporterName: userProfile?.name || 'Demo Student',
        description,
        peopleAffected: people,
        urgencyScore,
      });
      // Navigate to tracker with the real incident ID
      navigate(`/student/tracker/${result.id}`);
    } catch (err) {
      console.error('Error creating incident:', err);
      setError(err.message || 'Failed to submit report. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="page fade-up">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
          <span className="material-symbols-outlined notranslate notranslate">arrow_back</span>
        </button>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Report Emergency</h1>
      </div>

      <div className="badge" style={{ background: info.bg, color: info.color, marginBottom: '1.5rem', padding: '0.5rem 1rem', fontSize: '0.75rem' }}>
        <span className="material-symbols-outlined notranslate notranslate" style={{ fontSize: '1rem' }}>{info.icon}</span>
        {info.label}
      </div>

      <form onSubmit={handleSubmit}>
        <label className="section-label">Location</label>
        <select className="input-field" value={building} onChange={e => setBuilding(e.target.value)} required style={{ marginBottom: '0.75rem', paddingLeft: '1rem' }}>
          <option value="">Select Building</option>
          {buildings.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select className="input-field" value={floor} onChange={e => setFloor(e.target.value)} required style={{ marginBottom: '0.75rem', paddingLeft: '1rem' }}>
          <option value="">Select Floor</option>
          {floors.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <input className="input-field" type="text" placeholder="Zone / Room (e.g., Near Lift 2)" value={zone} onChange={e => setZone(e.target.value)} style={{ marginBottom: '1.5rem', paddingLeft: '1rem' }} />

        <label className="section-label">People Affected</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <button type="button" onClick={() => setPeople(Math.max(1, people - 1))} style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'white', cursor: 'pointer', fontSize: '1.25rem', fontWeight: 700 }}>−</button>
          <span style={{ fontSize: '1.5rem', fontWeight: 700, minWidth: '2rem', textAlign: 'center' }}>{people}</span>
          <button type="button" onClick={() => setPeople(Math.min(50, people + 1))} style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'white', cursor: 'pointer', fontSize: '1.25rem', fontWeight: 700 }}>+</button>
        </div>

        <label className="section-label">Description (optional)</label>
        <textarea className="input-field" placeholder="Briefly describe the situation" value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ resize: 'none', marginBottom: '2rem', paddingLeft: '1rem' }} />

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '0.75rem', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-symbols-outlined notranslate notranslate" style={{ fontSize: '1.125rem', color: '#DC2626' }}>error</span>
            <p style={{ color: '#DC2626', fontSize: '0.75rem', fontWeight: 500 }}>{error}</p>
          </div>
        )}

        <button type="submit" className="btn btn-danger" disabled={submitting || !building || !floor}>
          <span className="material-symbols-outlined notranslate notranslate" style={{ fontSize: '1.25rem' }}>emergency_share</span>
          {submitting ? 'Sending...' : '🚨 Send SOS'}
        </button>
      </form>
    </div>
  );
}
