// Society notices from admins — pinned first.
import { CircleAlert, Megaphone } from 'lucide-react';
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
    body = <div className="card"><EmptyState icon={Megaphone} title={t('resident.noNoticesTitle')} text={t('resident.noNoticesText')} /></div>;
  } else {
    const pinned = data.filter(n => n.pinned);
    const rest = data.filter(n => !n.pinned);
    const group = (items, key, title) => items.length > 0 && (
      <section key={key} aria-labelledby={`res-notices-${key}`}>
        <h2 id={`res-notices-${key}`} className="section-title">{title}</h2>
        <div className="card settings-group">
          {items.map(n => (
            <article key={n.id} className="settings-row res-notice" aria-labelledby={`notice-${n.id}`}>
              <h3 id={`notice-${n.id}`} className="res-notice__title">{n.title}</h3>
              {n.body && <p className="res-notice__body">{n.body}</p>}
              <p className="res-notice__meta">
                {[n.author_name, dateTime(n.created_at, lang)].filter(Boolean).join(' · ')}
              </p>
            </article>
          ))}
        </div>
      </section>
    );
    body = (
      <div className="res-notices">
        {group(pinned, 'pinned', t('resident.pinned'))}
        {group(rest, 'recent', pinned.length ? t('resident.noticesRecent') : t('resident.noticesAll'))}
      </div>
    );
  }

  return (
    <main className="page res-page">
      <PageHeader title={t('resident.noticesTitle')} />
      {body}
      <BottomNav />
    </main>
  );
}
