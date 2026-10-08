// Admin Team — staff with duty, specialties and load; residents who can be made staff.
import { useState } from 'react';
import { Search, Users } from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import { Avatar, Button, EmptyState, PageHeader } from '../../components/ui';
import { listenMembers, listenTeam } from '../../data/db';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../i18n';
import { timeAgo } from '../../utils/time';
import { useLive, useNow } from './parts/hooks';
import { memberFlat, vulnerabilityLabels } from './parts/format';
import { CallLink, DutyDot, LoadError, Loading, SpecialtyChips } from './parts/ui';
import MemberSheet from './parts/MemberSheet';
import '../../styles/admin.css';

export default function Team() {
  const { t } = useT();
  const { user } = useAuth();
  const now = useNow(60000);
  const [editing, setEditing] = useState(null); // { member, initialRole }
  const [query, setQuery] = useState('');

  const team = useLive((ok, err) => listenTeam(ok, err), 'team');
  const residents = useLive((ok, err) => listenMembers(ok, err, { role: 'resident' }), 'residents');

  const staff = [...(team.data || [])].sort((a, b) => Number(b.on_duty) - Number(a.on_duty)
    || (a.role === b.role ? 0 : a.role === 'responder' ? -1 : 1)
    || a.full_name.localeCompare(b.full_name));
  const onDutyCount = staff.filter(m => m.on_duty).length;

  const q = query.trim().toLowerCase();
  const people = (residents.data || []).filter(m => !q
    || (m.full_name || '').toLowerCase().includes(q)
    || (m.flat?.number || '').toLowerCase().includes(q)
    || (m.flat?.zone?.name || '').toLowerCase().includes(q));

  return (
    <main className="page admin-page admin-narrow">
      <PageHeader
        title={t('common.nav_team')}
        subtitle={team.data ? t('admin.teamSubtitle', { onDuty: onDutyCount, staff: staff.length }) : undefined}
      />

      <h2 className="section-title">{t('admin.staff')}</h2>
      {team.error && <LoadError error={team.error} onRetry={team.retry} />}
      {team.loading && <Loading />}
      {team.data && staff.length === 0 && (
        <div className="card">
          <EmptyState icon={Users} title={t('admin.noStaff')} text={t('admin.noStaffText')} />
        </div>
      )}
      {staff.length > 0 && (
        <div className="card settings-group">
          {staff.map(m => (
            <div key={m.id} className="settings-row admin-member">
              <button
                type="button"
                className="admin-member__main"
                onClick={() => setEditing({ member: m })}
                aria-label={t('admin.editMember', { name: m.full_name })}
              >
                <Avatar name={m.full_name} />
                <span className="admin-member__body">
                  <span className="admin-member__name">
                    {m.full_name}
                    {m.id === user?.id && <span className="admin-member__you"> {t('admin.you')}</span>}
                  </span>
                  <span className="admin-member__meta">
                    {t(`common.role_${m.role}`)}
                    {m.specialties?.length > 0 && <> · <SpecialtyChips specialties={m.specialties} /></>}
                  </span>
                  <span className="admin-member__meta">
                    <DutyDot on={m.on_duty} />
                    {` · ${t('admin.activeLoad', { n: m.active_load || 0 })}`}
                    {m.last_resolved_at && ` · ${t('admin.lastResolved', { when: timeAgo(m.last_resolved_at, now, t) })}`}
                  </span>
                </span>
              </button>
              <CallLink phone={m.phone} name={m.full_name} compact />
            </div>
          ))}
        </div>
      )}

      <h2 className="section-title">{t('admin.residents')}</h2>
      <div className="stack-sm">
        <div className="input-wrap">
          <span className="input-wrap__icon"><Search size={18} aria-hidden="true" /></span>
          <label htmlFor="resident-search" className="sr-only">{t('admin.searchResidents')}</label>
          <input
            id="resident-search"
            className="input"
            type="search"
            placeholder={t('admin.searchResidents')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {residents.error && <LoadError error={residents.error} onRetry={residents.retry} />}
        {residents.loading && <Loading />}
        {residents.data && people.length === 0 && (
          <div className="card">
            <EmptyState
              icon={q ? Search : Users}
              title={q ? t('admin.noMatch', { q: query.trim() }) : t('admin.noResidents')}
              text={q ? t('admin.noMatchText') : t('admin.noResidentsText')}
              action={q ? <Button variant="secondary" onClick={() => setQuery('')}>{t('admin.clearSearch')}</Button> : null}
            />
          </div>
        )}
        {people.length > 0 && (
          <div className="card settings-group">
            {people.map(m => {
              const flags = vulnerabilityLabels(m.vulnerability, t);
              return (
                <div key={m.id} className="settings-row admin-member">
                  <div className="admin-member__main admin-member__main--static">
                    <Avatar name={m.full_name} />
                    <span className="admin-member__body">
                      <span className="admin-member__name">{m.full_name || t('admin.unnamed')}</span>
                      <span className="admin-member__meta">{memberFlat(m) || t('admin.noFlat')}</span>
                      {m.first_responder_skill && (
                        <span className="admin-member__meta">
                          {t('admin.firstResponderSkill', { skill: t(`admin.skill_${m.first_responder_skill}`) })}
                        </span>
                      )}
                      {flags.length > 0 && <span className="admin-member__flags">{flags.join(' · ')}</span>}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="admin-btn-44 admin-row-action"
                    onClick={() => setEditing({ member: m, initialRole: 'responder' })}
                    aria-label={t('admin.makeStaffName', { name: m.full_name })}
                  >
                    {t('admin.makeStaff')}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editing && (
        <MemberSheet member={editing.member} initialRole={editing.initialRole} onClose={() => setEditing(null)} />
      )}
      <BottomNav />
    </main>
  );
}
