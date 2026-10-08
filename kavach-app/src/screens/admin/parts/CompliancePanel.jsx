// Society → Compliance: scheduled checks (overdue / due soon / up to date) and AMC / licence renewals.
import { useState } from 'react';
import { CalendarClock, ClipboardCheck } from 'lucide-react';
import { Badge, Button, EmptyState } from '../../../components/ui';
import { errorMessage, listenAssets, listenCompliance, logAssetCheck } from '../../../data/db';
import { useConfirm } from '../../../context/DialogContext';
import { useToast } from '../../../context/ToastContext';
import { useT } from '../../../i18n';
import { useLive, useNow } from './hooks';
import { daysUntil, shortDate } from './format';
import { IconTile, LoadError, Loading } from './ui';

const GROUPS = [
  { key: 'overdue', tone: 'var(--red)' },
  { key: 'due_soon', tone: 'var(--orange)' },
  { key: 'ok', tone: 'var(--green)' },
];
const RENEWAL_WINDOW_DAYS = 30;

function dueText(c, t) {
  const d = c.days_left;
  if (d === -1) return t('admin.dayOverdue');
  if (d < 0) return t('admin.daysOverdue', { n: -d });
  if (d === 0) return t('admin.dueToday');
  if (d === 1) return t('admin.dueTomorrow');
  if (c.compliance_status === 'due_soon') return t('admin.dueInDays', { n: d });
  return null;
}

export default function CompliancePanel() {
  const { t, lang } = useT();
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const now = useNow(60 * 60000);
  const checks = useLive((ok, err) => listenCompliance(ok, err), 'compliance');
  const assets = useLive((ok, err) => listenAssets(ok, err), 'assets');
  const [busyId, setBusyId] = useState(null);

  const markDone = async (c) => {
    const ok = await confirm(
      t('admin.markDoneTitle', { title: c.title }),
      t('admin.markDoneText', { n: c.interval_days }),
      { confirmLabel: t('admin.markDone') },
    );
    if (!ok) return;
    setBusyId(c.id);
    try {
      await logAssetCheck(c.id);
      showToast(t('admin.markedDone', { title: c.title }), 'success');
    } catch (err) {
      showToast(errorMessage(err, t), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const renewals = [];
  for (const a of assets.data || []) {
    for (const [field, kind] of [['amc_expires_on', 'amc'], ['licence_expires_on', 'licence']]) {
      const days = daysUntil(a[field], now);
      if (days != null && days <= RENEWAL_WINDOW_DAYS) renewals.push({ id: `${a.id}-${kind}`, asset: a, kind, days, date: a[field] });
    }
  }
  renewals.sort((a, b) => a.days - b.days);

  const list = checks.data || [];

  return (
    <div className="stack-lg">
      {checks.error && <LoadError error={checks.error} onRetry={checks.retry} />}
      {checks.loading && <Loading />}
      {checks.data && list.length === 0 && (
        <div className="card">
          <EmptyState icon={ClipboardCheck} title={t('admin.noChecks')} text={t('admin.noChecksText')} />
        </div>
      )}
      {list.length > 0 && GROUPS.map(g => {
        const items = list.filter(c => c.compliance_status === g.key);
        return (
          <section key={g.key} aria-labelledby={`cg-${g.key}`}>
            <h2 id={`cg-${g.key}`} className="section-title admin-count-title">
              <span>{t(`admin.compliance_${g.key}`)}</span>
              <Badge tone={items.length ? g.tone : undefined}>{items.length}</Badge>
            </h2>
            {items.length === 0 ? (
              <p className="card text-sm muted">{t(`admin.complianceNone_${g.key}`)}</p>
            ) : (
              <div className="card settings-group">
                {items.map(c => {
                  const due = dueText(c, t);
                  return (
                    <div key={c.id} className="settings-row admin-check-row">
                      <IconTile icon={ClipboardCheck} tone={g.tone} />
                      <div className="grow admin-check-row__body">
                        <p className="semibold">{c.title}</p>
                        <p className="text-sm muted">
                          {[c.asset_name || c.zone_name, t('admin.dueOn', { date: shortDate(c.due_at, lang) })].filter(Boolean).join(' · ')}
                        </p>
                        {due && <p className={`text-sm semibold ${g.key === 'overdue' ? 'admin-text-red' : 'admin-warn-text'}`}>{due}</p>}
                        {c.last_done_at && (
                          <p className="text-xs muted">{t('admin.lastDone', { date: shortDate(c.last_done_at, lang) })}</p>
                        )}
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="admin-btn-44"
                        loading={busyId === c.id}
                        onClick={() => markDone(c)}
                        aria-label={t('admin.markDoneName', { title: c.title })}
                      >
                        {t('admin.markDone')}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      <section aria-labelledby="renewals-title">
        <h2 id="renewals-title" className="section-title">{t('admin.renewals')}</h2>
        {assets.error && <LoadError error={assets.error} onRetry={assets.retry} />}
        {assets.data && renewals.length === 0 && (
          <p className="card text-sm muted">{t('admin.noRenewals', { n: RENEWAL_WINDOW_DAYS })}</p>
        )}
        {renewals.length > 0 && (
          <div className="card settings-group">
            {renewals.map(r => (
              <div key={r.id} className="settings-row">
                <IconTile icon={CalendarClock} tone={r.days < 0 ? 'var(--red)' : 'var(--orange)'} />
                <div className="grow">
                  <p className="semibold">{r.asset.name}</p>
                  <p className="text-sm muted">
                    {[t(`admin.renewal_${r.kind}`), r.asset.vendor].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <Badge className="admin-badge-wrap" tone={r.days < 0 ? 'var(--red)' : 'var(--orange)'}>
                  {r.days < 0
                    ? t('admin.expiredOn', { date: shortDate(r.date, lang) })
                    : t('admin.expiresOn', { date: shortDate(r.date, lang) })}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
