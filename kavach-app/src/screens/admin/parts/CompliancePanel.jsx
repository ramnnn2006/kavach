// Society → Compliance: scheduled checks (overdue / due soon / up to date) and AMC / licence renewals.
import { useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { Button, EmptyState } from '../../../components/ui';
import { errorMessage, listenAssets, listenCompliance, logAssetCheck } from '../../../data/db';
import { useConfirm } from '../../../context/DialogContext';
import { useToast } from '../../../context/ToastContext';
import { useT } from '../../../i18n';
import { useLive, useNow } from './hooks';
import { daysUntil, shortDate } from './format';
import { assetKind } from './assetKinds';
import { IconTile, LoadError, Loading } from './ui';

const GROUPS = [{ key: 'overdue' }, { key: 'due_soon' }, { key: 'ok' }];
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
  const needsWork = list.filter(c => c.compliance_status !== 'ok').length;

  return (
    <div className="stack-lg">
      {checks.error && <LoadError error={checks.error} onRetry={checks.retry} />}
      {checks.loading && <Loading />}
      {checks.data && list.length === 0 && (
        <div className="card">
          <EmptyState icon={ClipboardCheck} title={t('admin.noChecks')} text={t('admin.noChecksText')} />
        </div>
      )}
      {list.length > 0 && needsWork === 0 && (
        <p className="card text-sm muted">{t('admin.complianceAllClear')}</p>
      )}
      {list.length > 0 && GROUPS.map(g => {
        const items = list.filter(c => c.compliance_status === g.key);
        if (!items.length) return null;
        return (
          <section key={g.key} aria-labelledby={`cg-${g.key}`}>
            <h2 id={`cg-${g.key}`} className="section-title">
              {t(`admin.compliance_${g.key}`)} · {items.length}
            </h2>
            <div className="card settings-group">
              {items.map(c => {
                const due = dueText(c, t);
                const kind = c.asset_kind ? assetKind(c.asset_kind) : { icon: ClipboardCheck, tone: 'var(--gray)' };
                return (
                  <div key={c.id} className="settings-row admin-check-row">
                    <IconTile icon={kind.icon} tone={kind.tone} />
                    <div className="grow admin-check-row__body">
                      <p className="admin-check-row__title">{c.title}</p>
                      <p className="admin-check-row__meta">
                        {[c.asset_name || c.zone_name, t('admin.dueOn', { date: shortDate(c.due_at, lang) })].filter(Boolean).join(' · ')}
                      </p>
                      {due && (
                        <p className={`admin-check-row__due ${g.key === 'overdue' ? 'admin-text-red' : 'admin-warn-text'}`}>{due}</p>
                      )}
                      <p className="admin-check-row__meta">
                        {c.last_done_at ? t('admin.lastDone', { date: shortDate(c.last_done_at, lang) }) : t('admin.neverDone')}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="admin-btn-44 admin-row-action"
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
            {renewals.map(r => {
              const kind = assetKind(r.asset.kind);
              return (
                <div key={r.id} className="settings-row admin-check-row">
                  <IconTile icon={kind.icon} tone={kind.tone} />
                  <div className="grow admin-check-row__body">
                    <p className="admin-check-row__title">{r.asset.name}</p>
                    <p className="admin-check-row__meta">
                      {[t(`admin.renewal_${r.kind}`), r.asset.vendor].filter(Boolean).join(' · ')}
                    </p>
                    <p className={`admin-check-row__due ${r.days < 0 ? 'admin-text-red' : 'admin-warn-text'}`}>
                      {r.days < 0
                        ? t('admin.expiredOn', { date: shortDate(r.date, lang) })
                        : t('admin.expiresOn', { date: shortDate(r.date, lang) })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
