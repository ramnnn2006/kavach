// Edit a member's role and specialties (admin). Server rejects demoting yourself.
import { useState } from 'react';
import { Button, Field, Segmented, TypeIcon } from '../../../components/ui';
import { ROLES, SPECIALTY_PRESETS, TYPE_ORDER } from '../../../config/society';
import { errorMessage, updateMember } from '../../../data/db';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { useT } from '../../../i18n';
import { Sheet } from './ui';
import { memberFlat } from './format';

export default function MemberSheet({ member, initialRole, onClose }) {
  const { t } = useT();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [role, setRole] = useState(initialRole || member.role);
  const [specialties, setSpecialties] = useState(member.specialties || []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isSelf = user?.id === member.id;

  const toggle = (type) => {
    setSpecialties(s => (s.includes(type) ? s.filter(x => x !== type) : [...s, type]));
  };
  const applyPreset = (key) => setSpecialties(SPECIALTY_PRESETS[key]);
  const presetActive = (key) => SPECIALTY_PRESETS[key].length === specialties.length
    && SPECIALTY_PRESETS[key].every(x => specialties.includes(x));

  const save = async () => {
    if (role === 'responder' && specialties.length === 0) {
      setError(t('admin.pickSpecialty'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      const ordered = TYPE_ORDER.filter(x => specialties.includes(x));
      await updateMember(member.id, { role, specialties: role === 'resident' ? [] : ordered });
      showToast(t('admin.memberSaved', { name: member.full_name }), 'success');
      onClose();
    } catch (err) {
      const msg = isSelf && err?.code === 'invalid' ? t('admin.errSelfDemote') : errorMessage(err, t);
      setError(msg);
      showToast(msg, 'error');
      setBusy(false);
    }
  };

  const subtitle = [t(`common.role_${member.role}`), memberFlat(member)].filter(Boolean).join(' · ');

  return (
    <Sheet
      title={member.full_name || t('admin.unnamed')}
      subtitle={subtitle}
      onClose={onClose}
      busy={busy}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>{t('common.cancel')}</Button>
          <Button onClick={save} loading={busy}>{t('common.save')}</Button>
        </>
      )}
    >
      <div className="stack">
        <Field label={t('admin.role')}>
          <Segmented
            label={t('admin.role')}
            value={role}
            onChange={(r) => { setRole(r); setError(''); }}
            options={ROLES.map(r => ({ value: r, label: t(`common.role_${r}`) }))}
          />
        </Field>
        <p className="text-sm muted">{t(`admin.roleHint_${role}`)}</p>
        {isSelf && role !== 'admin' && <p className="text-sm admin-warn-text">{t('admin.selfDemoteHint')}</p>}

        {role !== 'resident' && (
          <fieldset className="admin-fieldset">
            <legend className="field__label">{t('admin.handles')}</legend>
            <div className="row wrap admin-presets">
              {Object.keys(SPECIALTY_PRESETS).map(key => (
                <Button
                  key={key}
                  type="button"
                  variant="secondary"
                  size="sm"
                  aria-pressed={presetActive(key)}
                  className="admin-preset"
                  onClick={() => applyPreset(key)}
                >
                  {t(`admin.preset_${key}`)}
                </Button>
              ))}
            </div>
            <div className="card settings-group">
              {TYPE_ORDER.map(type => {
                const id = `spec-${member.id}-${type}`;
                return (
                  <label key={type} htmlFor={id} className="settings-row admin-check">
                    <TypeIcon type={type} size="sm" />
                    <span className="grow">{t(`common.type_${type}`)}</span>
                    <input
                      id={id}
                      type="checkbox"
                      className="admin-checkbox"
                      checked={specialties.includes(type)}
                      onChange={() => toggle(type)}
                    />
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}
        {error && <p className="field__error" role="alert">{error}</p>}
      </div>
    </Sheet>
  );
}
