// Admin Incidents — every report in the society, live, with status / type / tower filters.
import { useState } from 'react';
import { ChevronsUpDown, ListTodo } from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import { Button, EmptyState, PageHeader, Segmented } from '../../components/ui';
import { TYPE_ORDER } from '../../config/society';
import { listenIncidents, listenZones } from '../../data/db';
import { useT } from '../../i18n';
import { useLive, useNow } from './parts/hooks';
import { byUrgency } from './parts/format';
import { IncidentRow, LoadError, Loading } from './parts/ui';
import '../../styles/admin.css';

export default function Incidents() {
  const { t } = useT();
  const now = useNow(30000);
  const [status, setStatus] = useState('active');
  const [types, setTypes] = useState([]);
  const [zoneId, setZoneId] = useState('');

  const filters = { status: status === 'all' ? undefined : status, zoneId: zoneId || undefined };
  const incidents = useLive(
    (ok, err) => listenIncidents(filters, ok, err),
    `inc:${status}:${zoneId}`,
    { keepStale: true },
  );
  const zones = useLive((ok, err) => listenZones(ok, err), 'zones');

  const toggleType = (type) => setTypes(ts => (ts.includes(type) ? ts.filter(x => x !== type) : [...ts, type]));
  const filtered = (incidents.data || []).filter(i => !types.length || types.includes(i.type));
  const rows = status === 'active' ? [...filtered].sort(byUrgency) : filtered;
  const hasFilters = types.length > 0 || !!zoneId;
  const clearFilters = () => { setTypes([]); setZoneId(''); };

  const emptyTitle = status === 'active' ? t('admin.noActiveIncidents') : t('admin.noIncidents');
  const emptyText = hasFilters ? t('admin.noIncidentsFiltered') : status === 'active' ? t('admin.noActiveText') : t('admin.noIncidentsText');

  return (
    <main className="page admin-page admin-narrow">
      <PageHeader
        title={t('common.nav_incidents')}
        subtitle={incidents.data ? t('admin.showingN', { n: rows.length }) : undefined}
      />

      <div className="stack">
        <div className="admin-seg-fit">
          <Segmented
            label={t('admin.statusFilter')}
            value={status}
            onChange={setStatus}
            options={[
              { value: 'active', label: t('admin.filterActive') },
              { value: 'closed', label: t('admin.filterClosed') },
              { value: 'all', label: t('admin.filterAll') },
            ]}
          />
        </div>

        <div className="admin-filters admin-filters--scroll" role="group" aria-label={t('admin.typeFilter')}>
          {TYPE_ORDER.map(type => (
            <button
              key={type}
              type="button"
              className="admin-chip"
              aria-pressed={types.includes(type)}
              onClick={() => toggleType(type)}
            >
              {t(`common.typeShort_${type}`)}
            </button>
          ))}
        </div>

        <div className="admin-toolbar">
          <label htmlFor="inc-zone" className="sr-only">{t('admin.towerFilter')}</label>
          <span className="admin-popup">
            <select
              id="inc-zone"
              className="admin-popup__select"
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
            >
              <option value="">{t('admin.allPlaces')}</option>
              {(zones.data || []).map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
            <ChevronsUpDown size={16} aria-hidden="true" />
          </span>
          {hasFilters && (
            <Button variant="ghost" size="sm" className="admin-btn-44 admin-toolbar__end" onClick={clearFilters}>{t('admin.clearFilters')}</Button>
          )}
        </div>

        {incidents.error && <LoadError error={incidents.error} onRetry={incidents.retry} />}
        {incidents.loading && <Loading />}
        {incidents.data && rows.length === 0 && (
          <div className="card">
            <EmptyState
              icon={ListTodo}
              title={emptyTitle}
              text={emptyText}
              action={hasFilters
                ? <Button variant="secondary" onClick={clearFilters}>{t('admin.clearFilters')}</Button>
                : status === 'active'
                  ? <Button variant="secondary" onClick={() => setStatus('all')}>{t('admin.showAll')}</Button>
                  : null}
            />
          </div>
        )}
        {rows.length > 0 && (
          <div className="card settings-group">
            {rows.map(inc => <IncidentRow key={inc.id} inc={inc} now={now} />)}
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
