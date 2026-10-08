import { useNavigate } from 'react-router-dom';
import { House, ClipboardList, Map, User, Bell, ListChecks, LayoutDashboard, Zap } from 'lucide-react';
import { Logo } from './ui';

const navConfigs = {
  student: [
    { id: 'home', icon: House, label: 'Home', path: '/student' },
    { id: 'reports', icon: ClipboardList, label: 'Reports', path: '/student/reports' },
    { id: 'map', icon: Map, label: 'Map', path: '/map' },
    { id: 'profile', icon: User, label: 'Profile', path: '/settings' },
  ],
  responder: [
    { id: 'alerts', icon: Bell, label: 'Alerts', path: '/responder' },
    { id: 'active', icon: ListChecks, label: 'Active', path: '/responder?view=active' },
    { id: 'map', icon: Map, label: 'Map', path: '/map' },
    { id: 'profile', icon: User, label: 'Profile', path: '/settings' },
  ],
  admin: [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
    { id: 'map', icon: Map, label: 'Map', path: '/map' },
    { id: 'power', icon: Zap, label: 'Power', path: '/admin?tab=power' },
    { id: 'profile', icon: User, label: 'Profile', path: '/settings' },
  ],
};

export default function BottomNav({ role, active }) {
  const navigate = useNavigate();
  const items = navConfigs[role?.toLowerCase()] || navConfigs.student;

  return (
    <nav className="bottom-nav" aria-label="Main">
      <div className="bottom-nav__brand">
        <Logo size={28} />
        <span>Kavach</span>
      </div>
      {items.map(({ id, icon: Icon, label, path }) => (
        <button
          key={id}
          className="nav-item"
          aria-current={active === id ? 'page' : undefined}
          onClick={() => navigate(path)}
        >
          <Icon size={24} strokeWidth={active === id ? 2.4 : 2} aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
