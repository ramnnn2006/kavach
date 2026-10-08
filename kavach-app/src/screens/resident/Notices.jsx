// Society notices from admins — pinned first.
import { CircleAlert, Megaphone, Pin } from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import { AlertBanner, Button, EmptyState, PageHeader, Spinner } from '../../components/ui';
import { errorMessage, listenNotices } from '../../data/db';
import { useT } from '../../i18n';
import { dateTime } from '../../utils/time';
import { useLive } from './parts/hooks';
import '../../styles/resident.css';

export default function ResidentNotices() {
  const { t, lang } = useT();
  const { data, error, loading, retry } = useLive(listenNotices);

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
  } else if (!data?.length) {
    body = <EmptyState icon={Megaphone} title={t('resident.noNoticesTitle')} text={t('resident.noNoticesText')} />;
  } else {
    body = (
      <div className="list">
        {data.map(n => (
          <article key={n.id} className="card res-notice" aria-labelledby={`notice-${n.id}`}>
            {n.pinned && (
              <p className="res-notice__pin">
                <Pin size={14} aria-hidden="true" />
                {t('resident.pinned')}
              </p>
            )}
            <h2 id={`notice-${n.id}`} className="res-notice__title">{n.title}</h2>
            {n.body && <p className="res-notice__body">{n.body}</p>}
            <p className="res-notice__meta">
              {[n.author_name, dateTime(n.created_at, lang)].filter(Boolean).join(' · ')}
            </p>
          </article>
        ))}
      </div>
    );
  }

  return (
    <main className="page res-page">
      <PageHeader title={t('resident.noticesTitle')} subtitle={t('resident.noticesSub')} />
      {body}
      <BottomNav />
    </main>
  );
}
