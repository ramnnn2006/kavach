import { WifiOff } from 'lucide-react';
import useNetworkStatus from '../hooks/useNetworkStatus';

export default function ConnectionBanner() {
  const { isOnline } = useNetworkStatus();
  if (isOnline) return null;

  return (
    <div className="offline-banner" role="status">
      <WifiOff size={16} aria-hidden="true" />
      You're offline. Reports will fail until you reconnect.
    </div>
  );
}
