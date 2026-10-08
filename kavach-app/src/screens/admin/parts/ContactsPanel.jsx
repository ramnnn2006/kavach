// Society → Contacts: numbers residents see on their Contacts tab. Add / delete (admin RLS).
import { useState } from 'react';
import { CircleMinus, Contact, Plus } from 'lucide-react';
import { Button, EmptyState, Field, IconButton } from '../../../components/ui';
import { errorMessage } from '../../../data/db';
import { addContact, deleteContact, listenContacts } from '../../../data/admin';
import { useAuth } from '../../../context/AuthContext';
import { useConfirm } from '../../../context/DialogContext';
import { useToast } from '../../../context/ToastContext';
import { useT } from '../../../i18n';
import { useLive } from './hooks';
import { CallLink, LoadError, Loading } from './ui';

const KINDS = ['society', 'emergency'];
const PHONE_RE = /^[0-9+()\-\s]{3,20}$/;
const EMPTY = { name: '', roleLabel: '', phone: '', kind: 'society' };

export default function ContactsPanel() {
  const { t } = useT();
  const { profile } = useAuth();
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const contacts = useLive((ok, err) => listenContacts(ok, err), 'contacts');
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [editing, setEditing] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!form.name.trim()) next.name = t('admin.errNameRequired');
    if (!PHONE_RE.test(form.phone.trim())) next.phone = t('admin.errPhone');
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      const sameKind = (contacts.data || []).filter(c => c.kind === form.kind);
      const sortOrder = sameKind.reduce((m, c) => Math.max(m, c.sort_order || 0), 0) + 1;
      await addContact({ ...form, societyId: profile?.society_id, sortOrder });
      setForm(EMPTY);
      showToast(t('admin.contactAdded', { name: form.name.trim() }), 'success');
    } catch (err) {
      showToast(errorMessage(err, t), 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (c) => {
    const ok = await confirm(
      t('admin.deleteContactTitle', { name: c.name }),
      t('admin.deleteContactText'),
      { confirmLabel: t('common.delete'), destructive: true },
    );
    if (!ok) return;
    setDeleting(c.id);
    try {
      await deleteContact(c.id);
      showToast(t('admin.contactDeleted', { name: c.name }), 'success');
    } catch (err) {
      showToast(errorMessage(err, t), 'error');
    } finally {
      setDeleting(null);
    }
  };

  const list = contacts.data || [];

  return (
    <div className="stack-lg">
      {contacts.error && <LoadError error={contacts.error} onRetry={contacts.retry} />}
      {contacts.loading && <Loading />}
      {contacts.data && list.length === 0 && (
        <div className="card"><EmptyState icon={Contact} title={t('admin.noContacts')} text={t('admin.noContactsText')} /></div>
      )}
      {KINDS.filter(kind => list.some(c => c.kind === kind)).map((kind, index) => {
        const items = list.filter(c => c.kind === kind);
        return (
          <section key={kind} aria-labelledby={`contacts-${kind}`}>
            <div className="admin-section-head">
              <h2 id={`contacts-${kind}`} className="section-title">{t(`admin.contactKind_${kind}`)}</h2>
              {index === 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="admin-btn-44 admin-section-head__action"
                  aria-pressed={editing}
                  aria-label={editing ? t('common.done') : t('admin.editContacts')}
                  onClick={() => setEditing(e => !e)}
                >
                  {editing ? t('common.done') : t('common.edit')}
                </Button>
              )}
            </div>
            <div className="card settings-group">
              {items.map(c => (
                <div key={c.id} className="settings-row admin-contact">
                  {editing && (
                    <IconButton
                      label={t('admin.deleteContactName', { name: c.name })}
                      className="admin-icon-danger admin-contact__delete"
                      onClick={() => remove(c)}
                      disabled={deleting === c.id}
                    >
                      <CircleMinus size={22} aria-hidden="true" />
                    </IconButton>
                  )}
                  <div className="grow admin-contact__body">
                    <p className="admin-contact__name">{c.name}</p>
                    {(c.role_label || c.available) && (
                      <p className="admin-contact__meta">{[c.role_label, c.available].filter(Boolean).join(' · ')}</p>
                    )}
                    <p className="admin-contact__phone">{c.phone}</p>
                  </div>
                  {!editing && <CallLink phone={c.phone} name={c.name} compact />}
                </div>
              ))}
            </div>
          </section>
        );
      })}

      <section aria-labelledby="add-contact-title">
        <h2 id="add-contact-title" className="section-title">{t('admin.addContact')}</h2>
        <form className="card stack admin-form" onSubmit={submit} noValidate>
          <Field label={t('common.name')} htmlFor="contact-name" error={errors.name}>
            <input
              id="contact-name"
              className={`input admin-input${errors.name ? ' input--error' : ''}`}
              value={form.name}
              maxLength={80}
              onChange={set('name')}
              placeholder={t('admin.contactNamePlaceholder')}
              aria-invalid={!!errors.name}
            />
          </Field>
          <Field label={t('admin.contactRole')} htmlFor="contact-role">
            <input
              id="contact-role"
              className="input admin-input"
              value={form.roleLabel}
              maxLength={80}
              onChange={set('roleLabel')}
              placeholder={t('admin.contactRolePlaceholder')}
            />
          </Field>
          <div className="admin-form-2">
            <Field label={t('common.phone')} htmlFor="contact-phone" error={errors.phone}>
              <input
                id="contact-phone"
                className={`input admin-input${errors.phone ? ' input--error' : ''}`}
                type="tel"
                inputMode="tel"
                value={form.phone}
                maxLength={20}
                onChange={set('phone')}
                placeholder="+91 44 2345 0000"
                aria-invalid={!!errors.phone}
              />
            </Field>
            <Field label={t('admin.contactKind')} htmlFor="contact-kind">
              <select id="contact-kind" className="select admin-input" value={form.kind} onChange={set('kind')}>
                {KINDS.map(k => <option key={k} value={k}>{t(`admin.contactKind_${k}`)}</option>)}
              </select>
            </Field>
          </div>
          <Button type="submit" loading={busy}>
            <Plus size={18} aria-hidden="true" />
            {t('admin.addContact')}
          </Button>
        </form>
      </section>
    </div>
  );
}
