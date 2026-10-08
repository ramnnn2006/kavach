import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useT } from '../i18n';
import { NAV, APP_NAME } from '../config/society';
import { Logo } from './ui';

// Bottom tab bar on phones, sidebar on desktop. `active` is the tab id; inferred from the URL if omitted.
export default function BottomNav({ active }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { role, profile } = useAuth();
  const { t } = useT();
  const nav = NAV[role] || NAV.resident;

  const all = [...nav.tabs, ...nav.more];
  const current = active
    || all.filter(i => pathname === i.path || pathname.startsWith(`${i.path}/`))
      .sort((a, b) => b.path.length - a.path.length)[0]?.id;

  const item = ({ id, icon: Icon, labelKey, path }, extra = '') => (
    <button
      key={id}
      className={`nav-item ${extra}`}
      aria-current={current === id ? 'page' : undefined}
      onClick={() => navigate(path)}
    >
      <Icon size={24} strokeWidth={current === id ? 2.4 : 2} aria-hidden="true" />
      <span>{t(labelKey)}</span>
    </button>
  );

  return (
    <nav className="bottom-nav" aria-label="Main">
      <div className="bottom-nav__brand">
        <Logo size={28} />
        <span>{APP_NAME}</span>
      </div>
      {profile?.society?.name && <p className="bottom-nav__society">{profile.society.name}</p>}
      {nav.tabs.map(i => item(i))}
      {nav.more.length > 0 && <p className="bottom-nav__section">{t('admin.navMore')}</p>}
      {nav.more.map(i => item(i, 'nav-item--more'))}
    </nav>
  );
}
