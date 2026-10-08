import { useEffect, useState } from 'react';
import { Avatar, Badge, Button, Spinner } from '../../../components/ui';
import { assignIncident, errorMessage, listResponders } from '../../../data/db';
import { useToast } from '../../../context/ToastContext';
import { useT } from '../../../i18n';
import FormDialog from './FormDialog';
import LoadError from './LoadError';

// Admin: pick a responder. On-duty first, then people whose specialties include the type.
export default function AssignDialog({ inc, onClose }) {
  const { t } = useT();
  const { showToast } = useToast();
  const [list, setList] = useState(null);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [busyId, setBusyId] = useState(null);
  const typeName = t(`common.typeShort_${inc.type}`);

  useEffect(() => {
    let alive = true;
    listResponders()
      .then((rows) => { if (alive) { setList(rows || []); setError(null); } })
      .catch((err) => { if (alive) setError(err); });
    return () => { alive = false; };
  }, [attempt]);

  const handles = (r) => (r.specialties || []).includes(inc.type);
  const sorted = (list || []).slice().sort((a, b) =>
    (Number(b.on_duty) - Number(a.on_duty))
    || (Number(handles(b)) - Number(handles(a)))
    || (a.full_name || '').localeCompare(b.full_name || ''));

  const pick = async (r) => {
    if (busyId) return;
    if (r.id === inc.assigned_to) { onClose(); return; }
    setBusyId(r.id);
    try {
      await assignIncident(inc.id, r.id);
      showToast(t('responder.assignedToast', { name: r.full_name }), 'success');
      onClose();
    } catch (err) {
      showToast(errorMessage(err, t), 'error');
      setBusyId(null);
    }
  };

  return (
    <FormDialog title={t('responder.assignTitle')} text={t('responder.assignText', { type: typeName })} onClose={onClose} busy={Boolean(busyId)} wide>
      {error && (
        <LoadError title={t('responder.respondersLoadError')} error={error} onRetry={() => { setError(null); setAttempt(a => a + 1); }} />
      )}
      {!error && list === null && <div className="rsp-center"><Spinner label={t('common.loading')} /></div>}
      {list && !sorted.length && <p className="muted">{t('responder.noResponders')}</p>}
      {sorted.length > 0 && (
        <div className="card settings-group rsp-pick-list">
          {sorted.map((r) => {
            const current = r.id === inc.assigned_to;
            return (
              <button
                key={r.id}
                type="button"
                className="settings-row"
                onClick={() => pick(r)}
                disabled={Boolean(busyId)}
                aria-current={current || undefined}
              >
                <Avatar name={r.full_name} />
                <span className="grow">
                  <span className="list-row__title rsp-block">{r.full_name}</span>
                  <span className="rsp-badges rsp-badges--tight">
                    <Badge tone={r.on_duty ? 'var(--green)' : 'var(--gray)'}>
                      {r.on_duty ? t('responder.onDuty') : t('responder.offDuty')}
                    </Badge>
                    {handles(r)
                      ? <Badge tone="var(--blue)">{t('responder.handlesType', { type: typeName })}</Badge>
                      : <Badge>{t('responder.notTheirSpecialty')}</Badge>}
                    {current && <Badge tone="var(--indigo)">{t('responder.assignedNow')}</Badge>}
                  </span>
                </span>
                {busyId === r.id && <Spinner label={t('common.loading')} />}
              </button>
            );
          })}
        </div>
      )}
      <div className="dialog__actions">
        <Button type="button" variant="secondary" onClick={onClose} disabled={Boolean(busyId)}>{t('common.cancel')}</Button>
      </div>
    </FormDialog>
  );
}
