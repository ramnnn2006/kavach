import { useState } from 'react';
import { Moon, Type, LogOut } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/DialogContext';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../config/society';
import BottomNav from '../components/BottomNav';
import { PageHeader, Card, Badge, Switch, Avatar } from '../components/ui';

function useHtmlClassPref(className, storageKey) {
  const [on, setOn] = useState(() => document.documentElement.classList.contains(className));
  const set = (value) => {
    setOn(value);
    document.documentElement.classList.toggle(className, value);
    try { localStorage.setItem(storageKey, String(value)); } catch { /* storage unavailable */ }
  };
  return [on, set];
}

export default function Settings() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { user, userProfile, logout } = useAuth();
  const [darkMode, setDarkMode] = useHtmlClassPref('dark', 'kavach_dark');
  const [largeText, setLargeText] = useHtmlClassPref('large-text', 'kavach_largetext');

  const role = userProfile?.role?.toLowerCase();
  const roleLabel = ROLES[role]?.label;

  const handleLogout = async () => {
    const ok = await confirm('Log out?', 'You will need to sign in again.', { confirmLabel: 'Log out', destructive: true });
    if (!ok) return;
    await logout();
    showToast('Logged out', 'info');
  };

  return (
    <div className="page">
      <PageHeader title="Profile" />

      <div className="stack-lg">
        <Card className="row" style={{ gap: 'var(--s-3)' }}>
          <Avatar name={userProfile?.name} large />
          <div className="grow">
            <p className="text-lg semibold truncate">{userProfile?.name || 'Guest'}</p>
            <p className="text-sm muted truncate">{userProfile?.email || user?.email || ''}</p>
            {roleLabel && <div style={{ marginTop: 'var(--s-1)' }}><Badge tone="var(--primary)">{roleLabel}</Badge></div>}
          </div>
        </Card>

        <section>
          <h2 className="section-title">Display</h2>
          <Card className="settings-group">
            <div className="settings-row">
              <Moon size={22} aria-hidden="true" className="muted" />
              <span className="grow">Dark mode</span>
              <Switch checked={darkMode} onChange={setDarkMode} label="Dark mode" />
            </div>
            <div className="settings-row">
              <Type size={22} aria-hidden="true" className="muted" />
              <span className="grow">Larger text</span>
              <Switch checked={largeText} onChange={setLargeText} label="Larger text" />
            </div>
          </Card>
        </section>

        <section>
          <h2 className="section-title">Account</h2>
          <Card className="settings-group">
            <button type="button" className="settings-row" style={{ color: 'var(--red)' }} onClick={handleLogout}>
              <LogOut size={22} aria-hidden="true" />
              <span className="grow">Log out</span>
            </button>
          </Card>
        </section>

        <p className="text-xs muted center">Kavach v0.2</p>
      </div>

      <BottomNav role={userProfile?.role} active="profile" />
    </div>
  );
}
