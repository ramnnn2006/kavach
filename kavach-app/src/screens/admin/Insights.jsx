// Admin Insights — reliability reports: incidents by type, repeat problems, towers, 6-month trend. Printable.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChartColumn, Printer } from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import { Button, EmptyState, PageHeader, Segmented, TypeIcon } from '../../components/ui';
import { listenReports } from '../../data/admin';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../i18n';
import { useLive, useNow } from './parts/hooks';
import { assetKind } from './parts/assetKinds';
import { incidentsLabel } from './parts/format';
import { IconTile, LoadError, Loading } from './parts/ui';
import MonthlyChart from './parts/MonthlyChart';
import '../../styles/admin.css';

const RANGES = [7, 30, 90];
const MONTHS = 6;

function mins(v, t) {
  return v == null ? '—' : t('admin.minutesShort', { n: Number(v) });
}

export default function Insights() {
  const { t, lang } = useT();
  const { profile } = useAuth();
  const now = useNow(60 * 60000);
  const [days, setDays] = useState(30);
  const report = useLive((ok, err) => listenReports(days, ok, err, MONTHS), `reports:${days}`, { keepStale: true });

  const data = report.data;
  const summary = data?.summary || [];
  const sum = (k) => summary.reduce((s, r) => s + Number(r[k] || 0), 0);
  const total = sum('total');
  const repeat = (data?.byAsset || []).filter(a => Number(a.incidents) > 1).slice(0, 5);
  const zones = (data?.byZone || []).filter(z => Number(z.incidents) > 0);
  const zoneMax = Math.max(1, ...zones.map(z => Number(z.incidents)));
  const monthlyTotal = (data?.monthly || []).reduce((s, r) => s + Number(r.incidents || 0), 0);
  const fmtDate = (d) => d.toLocaleDateString(lang === 'ta' ? 'ta-IN' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <main className="page admin-page admin-print">
      <PageHeader
        eyebrow={profile?.society?.name}
        title={t('common.nav_insights')}
        subtitle={data ? t('admin.rangeLine', { from: fmtDate(data.from), to: fmtDate(data.to) }) : undefined}
        action={(
          <Button variant="ghost" size="sm" className="admin-btn-44 admin-no-print admin-header-action" onClick={() => window.print()}>
            <Printer size={18} aria-hidden="true" />
            {t('admin.print')}
          </Button>
        )}
      />

      <div className="admin-no-print admin-range">
        <Segmented
          label={t('admin.period')}
          value={days}
          onChange={setDays}
          options={RANGES.map(n => ({ value: n, label: t('admin.lastNDays', { n }) }))}
        />
      </div>

      {report.error && <LoadError error={report.error} onRetry={report.retry} />}
      {report.loading && <Loading />}

      {data && (
        <div className="stack-lg">
          <section className="card admin-figures" aria-label={t('admin.totals')}>
            {[
              { key: 'total', value: total, label: t('admin.totalIncidents') },
              { key: 'resolved', value: sum('resolved'), label: t('admin.resolved') },
              { key: 'escalated', value: sum('escalated'), label: t('admin.escalated') },
              { key: 'cancelled', value: sum('cancelled'), label: t('admin.cancelled') },
            ].map(f => (
              <div key={f.key} className="admin-figure">
                <p className="admin-figure__value">{f.value}</p>
                <p className="admin-figure__label">{f.label}</p>
              </div>
            ))}
          </section>

          {total === 0 && (
            <div className="card">
              <EmptyState
                icon={ChartColumn}
                title={t('admin.noDataTitle', { n: days })}
                text={t('admin.noDataText')}
                action={(
                  <Link className="btn btn--secondary admin-no-print" to="/admin/society#compliance">{t('admin.reviewCompliance')}</Link>
                )}
              />
            </div>
          )}

          {total > 0 && (
            <section aria-labelledby="by-type-title">
              <h2 id="by-type-title" className="section-title">{t('admin.byType')}</h2>
              <div className="card card--flush admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th scope="col">{t('admin.type')}</th>
                      <th scope="col" className="num">{t('admin.total')}</th>
                      <th scope="col" className="num">{t('admin.resolved')}</th>
                      <th scope="col" className="num">{t('admin.cancelled')}</th>
                      <th scope="col" className="num">{t('admin.escalated')}</th>
                      <th scope="col" className="num">{t('admin.avgClaim')}</th>
                      <th scope="col" className="num">{t('admin.avgResolve')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.map(r => (
                      <tr key={r.type}>
                        <th scope="row">
                          <span className="row admin-table__type">
                            <TypeIcon type={r.type} size="sm" />
                            {t(`common.typeShort_${r.type}`)}
                          </span>
                        </th>
                        <td className="num">{r.total}</td>
                        <td className="num">{r.resolved}</td>
                        <td className="num">{r.cancelled}</td>
                        <td className="num">{r.escalated}</td>
                        <td className="num">{mins(r.avg_claim_minutes, t)}</td>
                        <td className="num">{mins(r.avg_resolve_minutes, t)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs muted admin-footnote">{t('admin.byTypeNote')}</p>
            </section>
          )}

          {total > 0 && (
            <div className="admin-pair">
              <section aria-labelledby="repeat-title">
                <h2 id="repeat-title" className="section-title">{t('admin.repeatProblems')}</h2>
                {repeat.length === 0 ? <p className="card text-sm muted">{t('admin.noRepeat')}</p> : (
                  <div className="card settings-group">
                    {repeat.map(a => {
                      const kind = assetKind(a.kind);
                      return (
                        <div key={a.asset_id} className="settings-row">
                          <IconTile icon={kind.icon} tone={kind.tone} />
                          <div className="grow admin-asset__body">
                            <p>{a.asset_name}</p>
                            <p className="admin-asset__meta">
                              {a.zone_name}
                              {a.avg_resolve_minutes != null && ` · ${t('admin.avgMin', { n: Number(a.avg_resolve_minutes) })}`}
                            </p>
                          </div>
                          <span className="admin-trailing">{incidentsLabel(a.incidents, t)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section aria-labelledby="zones-title">
                <h2 id="zones-title" className="section-title">{t('admin.byZone')}</h2>
                {zones.length === 0 ? <p className="card text-sm muted">{t('admin.noZoneData')}</p> : (
                  <div className="card stack-sm">
                    {zones.map(z => (
                      <div key={z.zone_id} className="admin-hbar">
                        <div className="row-between text-sm">
                          <span>{z.zone_name}</span>
                          <span className="muted">
                            {incidentsLabel(z.incidents, t)}
                            {z.avg_resolve_minutes != null && ` · ${t('admin.avgMin', { n: Number(z.avg_resolve_minutes) })}`}
                          </span>
                        </div>
                        <div className="admin-hbar__track" aria-hidden="true">
                          <span className="admin-hbar__fill" style={{ width: `${(Number(z.incidents) / zoneMax) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          <section aria-labelledby="monthly-title">
            <h2 id="monthly-title" className="section-title">{t('admin.lastNMonths', { n: MONTHS })}</h2>
            <div className="card">
              {monthlyTotal === 0
                ? <p className="text-sm muted">{t('admin.noMonthlyData')}</p>
                : <MonthlyChart rows={data.monthly} months={MONTHS} now={now} />}
            </div>
          </section>
        </div>
      )}

      <BottomNav />
    </main>
  );
}
