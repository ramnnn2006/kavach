import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';
import { PageHeader, Card } from '../components/ui';

const MAP_URL = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15545.918967912061!2d80.1425946!3d13.0688008!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a5261ab7b500331%3A0x6bbaaa3b4ddbb022!2sSRM%20Institute%20of%20Science%20and%20Technology%2C%20Ramapuram%20Campus!5e0!3m2!1sen!2sin!4v1703649491632!5m2!1sen!2sin';

const DESKTOP_QUERY = '(min-width: 768px)';

function useIsDesktop() {
  const [desktop, setDesktop] = useState(() => window.matchMedia?.(DESKTOP_QUERY).matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.(DESKTOP_QUERY);
    if (!mq) return;
    const onChange = e => setDesktop(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return desktop;
}

export default function CampusMap() {
  const { userProfile } = useAuth();
  const isDesktop = useIsDesktop();

  return (
    <div className="page">
      <PageHeader compact back title="Campus map" subtitle="Static map" />

      <Card flush style={{ aspectRatio: isDesktop ? '16 / 9' : '3 / 4' }}>
        <iframe
          src={MAP_URL}
          title="Campus map"
          width="100%"
          height="100%"
          style={{ border: 0, display: 'block' }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </Card>

      <BottomNav role={userProfile?.role} active="map" />
    </div>
  );
}
