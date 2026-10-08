import { useState } from 'react';
import { CircleAlert, CloudOff } from 'lucide-react';
import { AlertBanner, Button } from '../../../components/ui';
import { flushOutbox, removeFromOutbox, useOutbox } from '../../../data/outbox';
import { useToast } from '../../../context/ToastContext';
import { useT } from '../../../i18n';
import CallLink from './CallLink';

// Reports waiting in the offline outbox (and any the server refused).
export default function OutboxNotice({ userId, securityPhone }) {
  const { t } = useT();
  const { showToast } = useToast();
  const { items, failed } = useOutbox(userId);
  const [sending, setSending] = useState(false);

  if (!items.length && !failed.length) return null;

  const sendNow = async () => {
    setSending(true);
    try {
      const r = await flushOutbox();
      if (r.sent) showToast(t('resident.outboxSent'), 'success');
      else if (r.kept) showToast(t('common.errorOffline'), 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="stack-sm">
      {items.length > 0 && (
        <AlertBanner tone="var(--orange)" icon={CloudOff} role="status">
          <p className="semibold">
            {items.length === 1 ? t('resident.outboxOne') : t('resident.outboxMany', { n: items.length })}
          </p>
          <p>{t('resident.outboxHint')}</p>
          <div className="res-banner-actions">
            <CallLink phone={securityPhone} label={t('resident.callSecurity')} variant="danger" />
            <Button variant="secondary" size="sm" className="res-btn-44" loading={sending} onClick={sendNow}>
              {t('resident.sendNow')}
            </Button>
          </div>
        </AlertBanner>
      )}
      {failed.map(f => (
        <AlertBanner key={f.clientId} tone="var(--red)" icon={CircleAlert} role="alert">
          <p className="semibold">{t('resident.outboxFailed', { type: t(`common.type_${f.payload?.type}`) })}</p>
          <p>{t('resident.outboxFailedHint')}</p>
          <div className="res-banner-actions">
            <CallLink phone={securityPhone} label={t('resident.callSecurity')} variant="danger" />
            <Button variant="ghost" size="sm" className="res-btn-44" onClick={() => removeFromOutbox(f.clientId)}>
              {t('resident.dismiss')}
            </Button>
          </div>
        </AlertBanner>
      ))}
    </div>
  );
}
