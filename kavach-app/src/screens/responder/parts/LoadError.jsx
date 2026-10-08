import { CircleAlert } from 'lucide-react';
import { AlertBanner, Button } from '../../../components/ui';
import { useT } from '../../../i18n';
import { errorMessage } from '../../../data/db';

// Error banner with a retry button (role="alert")
export default function LoadError({ title, error, onRetry }) {
  const { t } = useT();
  return (
    <AlertBanner tone="var(--red)" icon={CircleAlert} role="alert">
      <p className="semibold">{title}</p>
      <p className="muted">{errorMessage(error, t)}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="rsp-banner-btn" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </AlertBanner>
  );
}
