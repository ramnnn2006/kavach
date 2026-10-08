import { useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, CircleCheck } from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import { AlertBanner, Card, EmptyState, PageHeader, Spinner, TypeIcon } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { errorMessage, listenCompliance, logAssetCheck } from '../../data/db';
import { checkSpecialty, covers } from '../../data/responder';
import { useT } from '../../i18n';
import LoadError from './parts/LoadError';
import NoteDialog from './parts/NoteDialog';
import { shortDate, specialtySummary } from './parts/format';
import '../../styles/responder.css';

const SECTIONS = [
  { status: 'overdue', titleKey: 'responder.sectionOverdue', badgeKey: 'responder.sectionOverdue', tone: 'var(--red)' },
  { status: 'due_soon', titleKey: 'responder.sectionDueSoon', badgeKey: 'responder.sectionDueSoon', tone: 'var(--orange)' },
  { status: 'ok', titleKey: 'responder.sectionOk', badgeKey: null, tone: 'var(--green)' },
];

function dueText(row, t, lang) {
  const date = t('responder.dueOn', { date: shortDate(row.due_at, lang) });
  const n = row.days_left;
  if (n == null) return date;
  if (n < 0) return `${date} · ${n === -1 ? t('responder.dayOverdue') : t('responder.daysOverdue', { n: -n })}`;
  if (n === 0) return `${date} · ${t('responder.dueToday')}`;
  if (n === 1) return `${date} · ${t('responder.dueTomorrow')}`;
  return `${date} · ${t('responder.dueInDays', { n })}`;
}

export default function Checks() {
  const { t, lang } = useT();
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [marking, setMarking] = useState(null);

  useEffect(() => listenCompliance(
    (data) => { setRows(data || []); setError(null); },
    (err) => setError(err),
  ), [attempt]);

  const grouped = useMemo(() => {
    const mine = (rows || []).filter(r => covers(profile, checkSpecialty(r)));
    return SECTIONS.map(s => ({
      ...s,
      items: mine.filter(r => (r.compliance_status || 'ok') === s.status)
        .sort((a, b) => (a.days_left ?? 0) - (b.days_left ?? 0)),
    }));
  }, [rows, profile]);

  const total = grouped.reduce((n, s) => n + s.items.length, 0);
  const attention = grouped[0].items.length + grouped[1].items.length;

  const markDone = async (note) => {
    try {
      const updated = await logAssetCheck(marking.id, note);
      showToast(t('responder.checkLoggedToast', { date: shortDate(updated?.due_at, lang) }), 'success');
      return true;
    } catch (err) {
      showToast(errorMessage(err, t), 'error');
      return false;
    }
  };

  return (
    <main className="page">
      <PageHeader eyebrow={specialtySummary(profile, t)} title={t('responder.checksTitle')} />

      <div className="stack">
        {error && (
          <LoadError title={t('responder.checksLoadError')} error={error} onRetry={() => { setError(null); setAttempt(a => a + 1); }} />
        )}

        {rows === null && !error && <div className="rsp-center"><Spinner large label={t('common.loading')} /></div>}

        {rows !== null && total === 0 && (
          <Card>
            <EmptyState icon={ClipboardCheck} title={t('responder.checksEmptyTitle')} text={t('responder.checksEmptyText')} />
          </Card>
        )}

        {rows !== null && total > 0 && attention === 0 && (
          <AlertBanner tone="var(--green)" icon={CircleCheck}>{t('responder.allChecksOk')}</AlertBanner>
        )}

        {grouped.filter(s => s.items.length).map(section => (
          <section key={section.status} aria-labelledby={`rsp-checks-${section.status}`}>
            <h2 id={`rsp-checks-${section.status}`} className="section-title">
              {t(section.titleKey)} · {section.items.length}
            </h2>
            <Card className="settings-group">
              {section.items.map(row => (
                <div key={row.id} className="settings-row rsp-check">
                  <TypeIcon type={checkSpecialty(row)} size="sm" />
                  <div className="grow">
                    <p className="list-row__title">{row.title}</p>
                    <p className="list-row__meta">{[row.asset_name, row.zone_name].filter(Boolean).join(' · ')}</p>
                    <p className={`rsp-check__due${section.badgeKey ? ' rsp-check__due--flag' : ''}`} style={{ '--tone': section.tone }}>
                      {dueText(row, t, lang)}
                    </p>
                    <p className="list-row__meta">
                      {row.last_done_at ? t('responder.lastDone', { date: shortDate(row.last_done_at, lang) }) : t('responder.neverDone')}
                    </p>
                  </div>
                  <button type="button" className="btn btn--ghost btn--sm rsp-tap" onClick={() => setMarking(row)}>
                    {t('responder.markDone')}
                  </button>
                </div>
              ))}
            </Card>
          </section>
        ))}
      </div>

      {marking && (
        <NoteDialog
          title={t('responder.markDoneTitle')}
          text={t('responder.markDoneText', { title: marking.title })}
          label={t('responder.checkNoteLabel')}
          placeholder={t('responder.checkNotePlaceholder')}
          confirmLabel={t('responder.markDone')}
          variant="success"
          onConfirm={markDone}
          onClose={() => setMarking(null)}
        />
      )}

      <BottomNav />
    </main>
  );
}
