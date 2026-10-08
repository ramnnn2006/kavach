import { useNavigate } from 'react-router-dom';
import { MapPinOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button, EmptyState, Spinner } from '../components/ui';
import { roleHome } from '../config/society';

export default function NotFound() {
  const navigate = useNavigate();
  const { user, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <main className="page page--center" style={{ alignItems: 'center' }}>
        <Spinner large />
      </main>
    );
  }

  const target = user ? roleHome(userProfile?.role) : '/';
  const label = user ? 'Go home' : 'Back to start';

  return (
    <main className="page page--center fade-in">
      <div className="card">
        <EmptyState
          icon={MapPinOff}
          title="Page not found"
          text="This page doesn't exist or may have moved."
          action={<Button onClick={() => navigate(target, { replace: true })}>{label}</Button>}
        />
      </div>
    </main>
  );
}
