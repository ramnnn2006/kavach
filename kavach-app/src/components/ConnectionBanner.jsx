import { WifiOff } from 'lucide-react';
import useNetworkStatus from '../hooks/useNetworkStatus';
import { useT } from '../i18n';

export default function ConnectionBanner() {
  const { isOnline } = useNetworkStatus();
  const { t } = useT();
  if (isOnline) return null;
  return (
    <div className="offline-banner" role="status">
      <WifiOff size={16} aria-hidden="true" />
      {t('common.offline')}
    </div>
  );
}
