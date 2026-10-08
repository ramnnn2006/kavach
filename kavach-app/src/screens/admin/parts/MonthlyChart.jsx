// Monthly incident bars — plain CSS, no chart library. One restrained tint; the per-type
// breakdown is text (hover/focus card, accessible label) and a full table view.
import { useT } from '../../../i18n';
import { CHART_TYPE_ORDER, incidentsLabel } from './format';

function monthKeys(count, now) {
  const d = new Date(now);
  const out = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

export default function MonthlyChart({ rows, months = 6, now }) {
  const { t, lang } = useT();
  const locale = lang === 'ta' ? 'ta-IN' : 'en-IN';
  const keys = monthKeys(months, now);
  const data = keys.map(key => {
    const counts = {};
    for (const r of rows) {
      if (String(r.month).slice(0, 7) === key) counts[r.type] = (counts[r.type] || 0) + Number(r.incidents || 0);
    }
    const total = Object.values(counts).reduce((s, n) => s + n, 0);
    const [y, m] = key.split('-').map(Number);
    const date = new Date(y, m - 1, 1);
    return {
      key,
      counts,
      total,
      label: date.toLocaleDateString(locale, { month: 'short' }),
      long: date.toLocaleDateString(locale, { month: 'long', year: 'numeric' }),
    };
  });
  const max = Math.max(1, ...data.map(d => d.total));
  const present = CHART_TYPE_ORDER.filter(type => data.some(d => d.counts[type]));

  return (
    <div className="admin-chart">
      <div className="admin-chart__plot" role="list" aria-label={t('admin.monthlyChartLabel', { n: months })}>
        {data.map(d => {
          const breakdown = present.filter(type => d.counts[type]).map(type => `${t(`common.typeShort_${type}`)} ${d.counts[type]}`);
          const label = `${d.long}: ${incidentsLabel(d.total, t)}${breakdown.length ? ` (${breakdown.join(', ')})` : ''}`;
          return (
            <div key={d.key} className="admin-chart__col" role="listitem" tabIndex={0} aria-label={label}>
              <div className="admin-chart__area" aria-hidden="true">
                <div className="admin-chart__bar" style={{ height: `${(d.total / max) * 100}%` }}>
                  {d.total > 0 && <span className="admin-chart__total">{d.total}</span>}
                  {d.total > 0 && <span className="admin-chart__seg" />}
                </div>
              </div>
              <span className="admin-chart__label" aria-hidden="true">{d.label}</span>
              {d.total > 0 && (
                <div className="admin-chart__tip" aria-hidden="true">
                  <p className="semibold">{d.long}</p>
                  {present.filter(type => d.counts[type]).map(type => (
                    <p key={type} className="admin-chart__tip-row">
                      <span className="grow">{t(`common.typeShort_${type}`)}</span>
                      <span className="mono">{d.counts[type]}</span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <details className="admin-chart__table">
        <summary>{t('admin.showAsTable')}</summary>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">{t('admin.month')}</th>
                {CHART_TYPE_ORDER.map(type => (
                  <th key={type} scope="col" className="num">{t(`common.typeShort_${type}`)}</th>
                ))}
                <th scope="col" className="num">{t('admin.total')}</th>
              </tr>
            </thead>
            <tbody>
              {data.map(d => (
                <tr key={d.key}>
                  <th scope="row">{d.long}</th>
                  {CHART_TYPE_ORDER.map(type => <td key={type} className="num">{d.counts[type] || 0}</td>)}
                  <td className="num semibold">{d.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      {present.length === 0 && <p className="text-sm muted">{t('admin.noMonthlyData')}</p>}
    </div>
  );
}
