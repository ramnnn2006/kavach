import { useNavigate } from 'react-router-dom';
import { MapPinOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useT } from '../i18n';
import { Button, EmptyState, Spinner } from '../components/ui';
import { roleHome } from '../config/society';
import '../styles/landing.css';

export default function NotFound() {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const { t } = useT();

  if (loading) {
    return (
      <main className="page page--center" style={{ alignItems: 'center' }}>
        <Spinner large label={t('common.loading')} />
      </main>
    );
  }

  const target = user && profile ? roleHome(profile.role) : '/';
  const label = user && profile ? t('landing.notFoundHome') : t('landing.notFoundStart');

  return (
    <main className="page page--center fade-in">
      <div className="card not-found">
        <EmptyState
          icon={MapPinOff}
          title={t('landing.notFoundTitle')}
          text={t('landing.notFoundText')}
          action={<Button onClick={() => navigate(target, { replace: true })}>{label}</Button>}
        />
      </div>
    </main>
  );
}
