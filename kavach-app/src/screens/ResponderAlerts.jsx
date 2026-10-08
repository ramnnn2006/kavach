import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { listenIncidents, claimIncident, updateIncidentStatus } from '../firebase/firestore';
import BottomNav from '../components/BottomNav';
import ConfirmDialog from '../components/ConfirmDialog';

const typeIcons = { lift: 'elevator', power: 'bolt', medical: 'medical_services', fire: 'local_fire_department' };
const typeColors = { lift: 'var(--sos-red)', power: 'var(--sos-amber)', medical: 'var(--primary)', fire: 'var(--sos-orange)' };

export default function ResponderAlerts() {
  const { user, userProfile } = useAuth();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const view = searchParams.get('view') || 'alerts';
  const [incidents, setIncidents] = useState([]);
  const [dialog, setDialog] = useState(null);

  useEffect(() => {
    return listenIncidents(setIncidents);
  }, []);

  const openAlerts = incidents.filter(i => i.status === 'pending');
  const activeAlerts = incidents.filter(i => i.status !== 'pending' && i.status !== 'resolved' && i.assignedResponder === user?.uid);

  const handleClaim = (inc) => {
    setDialog({
      title: 'Claim Incident',
      message: `You are taking responsibility for the ${inc.type} at ${inc.locationZone}. Proceed?`,
      onConfirm: async () => {
        try {
          await claimIncident(inc.id, user.uid, userProfile?.name || 'Responder');
        } catch {
          showToast('Someone else already claimed this incident.', 'error');
        }
        setDialog(null);
      },
      onCancel: () => setDialog(null)
    });
  };

  const handleStatusUpdate = async (incId, newStatus) => {
    if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
    try {
      await updateIncidentStatus(incId, newStatus);
    } catch {
      showToast('Could not update status. Check your connection.', 'error');
    }
  };

  return (
    <div className="page" style={{ padding: '24px 20px', paddingTop: 'calc(env(safe-area-inset-top) + 24px)' }}>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px 0' }}>Responder View</p>
          <h1 style={{ fontSize: '32px', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>{view === 'alerts' ? 'Incoming Alerts' : 'Active Tasks'}</h1>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', flexDirection: 'column', marginBottom: '80px' }}>
        {(view === 'alerts' ? openAlerts : activeAlerts).length === 0 && (
          <div className="glass-card" style={{ padding: '40px 20px', textAlign: 'center', background: 'var(--card-bg)' }}>
            <span className="material-symbols-outlined notranslate" style={{ fontSize: '48px', color: 'var(--text-muted)', marginBottom: '16px' }}>check_circle</span>
            <p style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0' }}>All Clear</p>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>No {view === 'alerts' ? 'incoming emergencies' : 'active tasks'} at the moment.</p>
          </div>
        )}

        {(view === 'alerts' ? openAlerts : activeAlerts).map(inc => (
          <div key={inc.id} className="glass-card" style={{ padding: '20px', borderLeft: `6px solid ${typeColors[inc.type]}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: typeColors[inc.type], textTransform: 'uppercase', letterSpacing: '1px' }}>{inc.type}</span>
                <p style={{ fontSize: '20px', fontWeight: 800, margin: '4px 0 0 0' }}>{inc.locationBuilding}</p>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>{inc.locationZone} • {inc.locationFloor}</p>
              </div>
              <div style={{ background: `${typeColors[inc.type]}15`, padding: '12px', borderRadius: '16px' }}>
                <span className="material-symbols-outlined notranslate" style={{ color: typeColors[inc.type], fontSize: '28px' }}>{typeIcons[inc.type]}</span>
              </div>
            </div>
            
            <p style={{ fontSize: '14px', margin: '0 0 20px 0', lineHeight: 1.5 }}>"{inc.description}"</p>

            {view === 'alerts' ? (
              <button style={{ width: '100%', background: 'var(--text-main)', color: 'var(--bg)', borderRadius: '14px', padding: '16px', fontSize: '16px', fontWeight: 700 }} onClick={() => handleClaim(inc)}>
                Accept Task
              </button>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button 
                  style={{ background: inc.status === 'en_route' ? 'var(--primary)' : 'var(--card-border)', color: inc.status === 'en_route' ? '#fff' : 'var(--text-main)' }} 
                  onClick={() => handleStatusUpdate(inc.id, 'en_route')}
                >
                  En Route
                </button>
                <button 
                  style={{ background: inc.status === 'on_scene' ? 'var(--sos-amber)' : 'var(--card-border)', color: inc.status === 'on_scene' ? '#fff' : 'var(--text-main)' }} 
                  onClick={() => handleStatusUpdate(inc.id, 'on_scene')}
                >
                  On Scene
                </button>
                <button 
                  style={{ gridColumn: 'span 2', background: 'var(--success)', color: '#fff', marginTop: '8px' }} 
                  onClick={() => handleStatusUpdate(inc.id, 'resolved')}
                >
                  Mark Resolved
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {dialog && <ConfirmDialog {...dialog} />}
      <BottomNav role="responder" active={view === 'alerts' ? 'alerts' : 'active'} />
    </div>
  );
}
