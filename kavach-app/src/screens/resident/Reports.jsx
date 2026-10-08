// My reports — Active / All, newest first.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CircleAlert, ClipboardList } from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import { AlertBanner, Button, EmptyState, PageHeader, Segmented, Spinner } from '../../components/ui';
import { errorMessage, listenMyIncidents } from '../../data/db';
import { isActive } from '../../config/society';
import { useT } from '../../i18n';
import { useLive, useNow } from './parts/hooks';
import IncidentRow from './parts/IncidentRow';
import '../../styles/resident.css';

export default function Reports() {
  const { t } = useT();
  const navigate = useNavigate();
  const now = useNow(30000);
  const { data, error, loading, retry } = useLive(listenMyIncidents);
  const [tab, setTab] = useState('active');

  const all = data || [];
  const list = tab === 'active' ? all.filter(i => isActive(i.status)) : all;

  let body;
  if (loading) {
    body = <div className="res-center res-center--tall"><Spinner large label={t('common.loading')} /></div>;
  } else if (error && !data) {
    body = (
      <AlertBanner tone="var(--red)" icon={CircleAlert} role="alert">
        <p>{errorMessage(error, t)}</p>
        <Button variant="ghost" size="sm" className="res-btn-44" onClick={retry}>{t('common.retry')}</Button>
      </AlertBanner>
    );
  } else if (!list.length) {
    body = (
      <div className="card">
        <EmptyState
          icon={ClipboardList}
          title={tab === 'active' ? t('resident.noActiveTitle') : t('resident.noReportsTitle')}
          text={tab === 'active' ? t('resident.noActiveText') : t('resident.noReportsText')}
          action={<Button variant="secondary" className="res-btn-44" onClick={() => navigate('/resident/report')}>{t('resident.reportEmergency')}</Button>}
        />
      </div>
    );
  } else {
    body = (
      <div className="card settings-group">
        {list.map(inc => <IncidentRow key={inc.id} incident={inc} now={now} />)}
      </div>
    );
  }

  return (
    <main className="page res-page">
      <PageHeader title={t('resident.reportsTitle')} />
      <div className="stack">
        <Segmented
          label={t('resident.reportsTitle')}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'active', label: t('resident.tabActive') },
            { value: 'all', label: t('resident.tabAll') },
          ]}
        />
        {error && data && (
          <AlertBanner tone="var(--orange)" icon={CircleAlert} role="status">
            <p>{t('resident.staleData')}</p>
          </AlertBanner>
        )}
        {body}
      </div>
      <BottomNav />
    </main>
  );
}
