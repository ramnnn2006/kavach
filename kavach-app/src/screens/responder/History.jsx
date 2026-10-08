import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, History as HistoryIcon } from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import { Button, Card, EmptyState, PageHeader, Spinner, TypeIcon } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { listenMyHandled } from '../../data/responder';
import { useT } from '../../i18n';
import { dateTime, minutesBetween, toMillis } from '../../utils/time';
import LoadError from './parts/LoadError';
import { formatDuration, placeLine, specialtySummary } from './parts/format';
import { useNow } from './parts/useNow';
import '../../styles/responder.css';

function startOfWeek(now) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const sinceMonday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - sinceMonday);
  return d.getTime();
}

export default function History() {
  const { t, lang } = useT();
  const navigate = useNavigate();
  const { profile, role } = useAuth();
  const now = useNow(60000);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => listenMyHandled(
    (data) => { setRows(data || []); setError(null); },
    (err) => setError(err),
  ), [attempt]);

  const stats = useMemo(() => {
    const list = rows || [];
    const resolved = list.filter(i => i.status === 'resolved' && i.resolved_at);
    const weekStart = startOfWeek(now);
    const durations = resolved.map(i => minutesBetween(i.created_at, i.resolved_at)).filter(n => n != null);
    return {
      week: resolved.filter(i => toMillis(i.resolved_at) >= weekStart).length,
      avg: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null,
      total: list.length,
    };
  }, [rows, now]);

  return (
    <main className="page rsp-narrow">
      <PageHeader eyebrow={specialtySummary(profile, t)} title={t('responder.historyTitle')} />

      <div className="stack">
        {error && (
          <LoadError title={t('responder.historyLoadError')} error={error} onRetry={() => { setError(null); setAttempt(a => a + 1); }} />
        )}

        {rows === null && !error && <div className="rsp-center"><Spinner large label={t('common.loading')} /></div>}

        {rows !== null && rows.length > 0 && (
          <Card className="settings-group" as="dl">
            {[
              [t('responder.statResolvedWeek'), stats.week],
              [t('responder.statAvgResolve'), formatDuration(stats.avg, t)],
              [t('responder.statTotal'), stats.total],
            ].map(([label, value]) => (
              <div key={label} className="settings-row rsp-summary">
                <dt className="grow">{label}</dt>
                <dd className="rsp-summary__value">{value}</dd>
              </div>
            ))}
          </Card>
        )}

        {rows !== null && rows.length === 0 && (
          <Card>
            <EmptyState
              icon={HistoryIcon}
              title={t('responder.historyEmptyTitle')}
              text={t('responder.historyEmptyText')}
              action={role === 'responder' && <Button variant="secondary" onClick={() => navigate('/responder')}>{t('responder.goToAlerts')}</Button>}
            />
          </Card>
        )}

        {rows !== null && rows.length > 0 && (
          <section aria-labelledby="rsp-history-jobs">
          <h2 id="rsp-history-jobs" className="section-title">{t('responder.historyJobs')}</h2>
          <Card className="settings-group">
            {rows.map(inc => {
              const place = placeLine(inc, t);
              const when = dateTime(inc.resolved_at || inc.cancelled_at || inc.created_at, lang);
              const mins = inc.status === 'resolved' ? minutesBetween(inc.created_at, inc.resolved_at) : null;
              return (
                <button key={inc.id} type="button" className="settings-row rsp-history" onClick={() => navigate(`/incident/${inc.id}`)}>
                  <TypeIcon type={inc.type} size="sm" />
                  <span className="grow">
                    <span className="list-row__title rsp-block">{t(`common.type_${inc.type}`)}</span>
                    <span className="list-row__meta rsp-block">{[place, when].filter(Boolean).join(' · ')}</span>
                    <span className="list-row__meta rsp-block">
                      {inc.status === 'resolved'
                        ? t('responder.resolvedIn', { d: formatDuration(mins, t) })
                        : t(`common.staffStatus_${inc.status}`)}
                    </span>
                  </span>
                  <ChevronRight size={18} className="rsp-chevron" aria-hidden="true" />
                </button>
              );
            })}
          </Card>
          </section>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
