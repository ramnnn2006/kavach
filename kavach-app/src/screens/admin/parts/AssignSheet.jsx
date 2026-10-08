// Responder picker: on-duty first, matching specialty marked. Tap a person to assign.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Users } from 'lucide-react';
import { Avatar, EmptyState, Spinner } from '../../../components/ui';
import { assignIncident, errorMessage, listenTeam } from '../../../data/db';
import { useToast } from '../../../context/ToastContext';
import { useT } from '../../../i18n';
import { useLive } from './hooks';
import { placeLabel } from './format';
import { DutyDot, LoadError, Loading, Sheet, SpecialtyChips } from './ui';

function rank(m, type) {
  return (m.on_duty ? 0 : 2) + ((m.specialties || []).includes(type) ? 0 : 1);
}

export default function AssignSheet({ incident, onClose }) {
  const { t } = useT();
  const { showToast } = useToast();
  const team = useLive((ok, err) => listenTeam(ok, err), 'team');
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);

  const responders = (team.data || [])
    .filter(m => m.role === 'responder')
    .sort((a, b) => rank(a, incident.type) - rank(b, incident.type)
      || (a.active_load || 0) - (b.active_load || 0)
      || a.full_name.localeCompare(b.full_name));

  const assign = async (m) => {
    if (busyId) return;
    setBusyId(m.id);
    setError(null);
    try {
      await assignIncident(incident.id, m.id);
      showToast(t('admin.assignedTo', { name: m.full_name }), 'success');
      onClose();
    } catch (err) {
      setError(err);
      showToast(errorMessage(err, t), 'error');
      setBusyId(null);
    }
  };

  return (
    <Sheet
      title={t('admin.assignTitle')}
      subtitle={`${t(`common.type_${incident.type}`)} · ${placeLabel(incident, t)}`}
      onClose={onClose}
      busy={!!busyId}
    >
      {error && <LoadError error={error} />}
      {team.error && <LoadError error={team.error} onRetry={team.retry} />}
      {team.loading && <Loading />}
      {!team.loading && !team.error && responders.length === 0 && (
        <EmptyState
          icon={Users}
          title={t('admin.noResponders')}
          text={t('admin.noRespondersText')}
          action={<Link className="btn btn--secondary" to="/admin/team" onClick={onClose}>{t('admin.openTeam')}</Link>}
        />
      )}
      {responders.length > 0 && (
        <div className="card settings-group" role="list">
          {responders.map(m => {
            const matches = (m.specialties || []).includes(incident.type);
            const current = incident.assigned_to === m.id;
            return (
              <button
                key={m.id}
                type="button"
                role="listitem"
                className="settings-row admin-pick"
                onClick={() => assign(m)}
                disabled={current || (!!busyId && busyId !== m.id)}
                aria-label={t('admin.assignToName', { name: m.full_name })}
              >
                <Avatar name={m.full_name} />
                <span className="grow admin-pick__body">
                  <span className="admin-pick__name">{m.full_name}</span>
                  <span className="admin-pick__meta">
                    <DutyDot on={m.on_duty} />
                    {` · ${t('admin.activeLoad', { n: m.active_load || 0 })}`}
                  </span>
                  <span className="admin-pick__meta">
                    {matches && <span className="admin-text-green">{t('admin.handlesType', { type: t(`common.typeShort_${incident.type}`) })} · </span>}
                    <SpecialtyChips specialties={m.specialties} />
                  </span>
                </span>
                {busyId === m.id && <Spinner label={t('common.loading')} />}
                {current && (
                  <span className="admin-pick__current">
                    <Check size={20} aria-hidden="true" />
                    <span className="sr-only">{t('admin.assigned')}</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </Sheet>
  );
}
