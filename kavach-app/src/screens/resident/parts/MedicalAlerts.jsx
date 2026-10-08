import { useCallback, useState } from 'react';
import { CircleAlert, CircleCheck } from 'lucide-react';
import { AlertBanner, Button, Card, Spinner, TypeIcon } from '../../../components/ui';
import { errorMessage, firstResponderAck } from '../../../data/db';
import { listenMedicalAlerts } from '../../../data/resident';
import { useToast } from '../../../context/ToastContext';
import { useT } from '../../../i18n';
import { timeAgo } from '../../../utils/time';
import { incidentPlace } from './format';
import { useLive } from './hooks';

// Community first responders: active medical alerts in the society with "I'm coming".
export default function MedicalAlerts({ userId, now }) {
  const { t } = useT();
  const { showToast } = useToast();
  const sub = useCallback((ok, err) => listenMedicalAlerts(userId, ok, err), [userId]);
  const { data, error, loading, retry } = useLive(userId ? sub : null);
  const [busy, setBusy] = useState(null);
  const [coming, setComing] = useState([]);

  const ack = async (id) => {
    if (busy) return;
    setBusy(id);
    try {
      await firstResponderAck(id);
      setComing(c => [...c, id]);
    } catch (err) {
      showToast(errorMessage(err, t), 'error');
    } finally {
      setBusy(null);
    }
  };

  let body;
  if (loading) {
    body = <div className="card res-center"><Spinner label={t('common.loading')} /></div>;
  } else if (error && !data) {
    body = (
      <AlertBanner tone="var(--red)" icon={CircleAlert} role="alert">
        <p>{t('resident.medError')}</p>
        <Button variant="ghost" size="sm" className="res-btn-44" onClick={retry}>{t('common.retry')}</Button>
      </AlertBanner>
    );
  } else if (!data?.length) {
    body = <Card><p className="text-sm muted">{t('resident.medEmpty')}</p></Card>;
  } else {
    body = (
      <div className="list">
        {data.map(inc => {
          const mine = inc.iAmComing || coming.includes(inc.id);
          const others = inc.ackCount - (inc.iAmComing ? 1 : 0);
          return (
            <Card key={inc.id} className="res-med">
              <div className="res-med__top">
                <TypeIcon type="medical" />
                <div className="grow">
                  <p className="semibold">{incidentPlace(inc, t) || t('common.type_medical')}</p>
                  <p className="res-row__meta">
                    {[
                      timeAgo(inc.created_at, now, t),
                      inc.people_affected > 1 ? t('common.peopleCount', { n: inc.people_affected }) : t('common.onePerson'),
                    ].join(' · ')}
                  </p>
                  {inc.description && <p className="res-med__desc">{inc.description}</p>}
                </div>
              </div>
              {others > 0 && (
                <p className="text-sm muted">
                  {others === 1 ? t('resident.medOthersOne') : t('resident.medOthersMany', { n: others })}
                </p>
              )}
              {mine ? (
                <p className="res-coming" role="status">
                  <CircleCheck size={20} aria-hidden="true" />
                  {t('resident.medOnYourWay')}
                </p>
              ) : (
                <Button variant="primary" block loading={busy === inc.id} disabled={!!busy} onClick={() => ack(inc.id)}>
                  {t('resident.medImComing')}
                </Button>
              )}
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <section aria-labelledby="res-med-title">
      <h2 id="res-med-title" className="section-title">{t('resident.medTitle')}</h2>
      {body}
    </section>
  );
}
