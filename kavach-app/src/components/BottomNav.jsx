import { useNavigate } from 'react-router-dom';

const navConfigs = {
  student: [
    { id: 'home', icon: 'home', label: 'Home', path: '/student' },
    { id: 'reports', icon: 'description', label: 'Reports', path: '/student/reports' },
    { id: 'map', icon: 'map', label: 'Map', path: '/map' },
    { id: 'profile', icon: 'person', label: 'Profile', path: '/settings' },
  ],
  responder: [
    { id: 'alerts', icon: 'notifications', label: 'Alerts', path: '/responder' },
    { id: 'active', icon: 'description', label: 'Active', path: '/responder' },
    { id: 'map', icon: 'map', label: 'Map', path: '/map' },
    { id: 'profile', icon: 'person', label: 'Profile', path: '/settings' },
  ],
  admin: [
    { id: 'dashboard', icon: 'dashboard', label: 'Dashboard', path: '/admin' },
    { id: 'map', icon: 'map', label: 'Map', path: '/map' },
    { id: 'power', icon: 'bolt', label: 'Power', path: '/admin' },
    { id: 'profile', icon: 'person', label: 'Profile', path: '/settings' },
  ],
};

export default function BottomNav({ role, active }) {
  const navigate = useNavigate();
  const items = navConfigs[role] || navConfigs.student;

  return (
    <>
      <nav className="bottom-nav">
        {items.map(item => (
          <button
            key={item.id}
            className={`nav-item ${active === item.id ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <span className={`material-symbols-outlined notranslate ${active === item.id ? 'filled' : ''}`}>
              {item.icon}
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div style={{ position: 'fixed', bottom: '0.375rem', left: '50%', transform: 'translateX(-50%)', width: '9rem', height: '0.3125rem', background: '#CBD5E1', borderRadius: '9999px', zIndex: 50 }} />
    </>
  );
}
