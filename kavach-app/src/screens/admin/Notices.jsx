// Admin Notices — post announcements residents see on their Notices tab; pin or delete them.
import { useState } from 'react';
import { CircleMinus, Megaphone, Pin, Send } from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import { Button, EmptyState, Field, IconButton, PageHeader, Switch } from '../../components/ui';
import { deleteNotice, errorMessage, listenNotices, postNotice, updateNotice } from '../../data/db';
import { useConfirm } from '../../context/DialogContext';
import { useToast } from '../../context/ToastContext';
import { useT } from '../../i18n';
import { dateTime } from '../../utils/time';
import { useLive } from './parts/hooks';
import { shortDate } from './parts/format';
import { LoadError, Loading } from './parts/ui';
import '../../styles/admin.css';

const TITLE_MAX = 160;
const BODY_MAX = 4000;
const EMPTY = { title: '', body: '', pinned: false, expires: '' };

function todayInput() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** "2026-10-12" → end of that local day as ISO (notice disappears the morning after). */
function endOfDay(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59).toISOString();
}

export default function AdminNotices() {
  const { t, lang } = useT();
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const notices = useLive((ok, err) => listenNotices(ok, err), 'notices');
  const [form, setForm] = useState(EMPTY);
  const [titleError, setTitleError] = useState('');
  const [busy, setBusy] = useState(false);
  const [rowBusy, setRowBusy] = useState(null);
  const [editing, setEditing] = useState(false);
  const [minDate] = useState(todayInput);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setTitleError(t('admin.errTitleRequired'));
      return;
    }
    setTitleError('');
    setBusy(true);
    try {
      await postNotice({ title: form.title, body: form.body, pinned: form.pinned, expiresAt: endOfDay(form.expires) });
      setForm(EMPTY);
      showToast(t('admin.noticePosted'), 'success');
    } catch (err) {
      showToast(errorMessage(err, t), 'error');
    } finally {
      setBusy(false);
    }
  };

  const togglePin = async (n) => {
    setRowBusy(n.id);
    try {
      await updateNotice(n.id, { pinned: !n.pinned });
      showToast(n.pinned ? t('admin.unpinned') : t('admin.pinned'), 'success');
    } catch (err) {
      showToast(errorMessage(err, t), 'error');
    } finally {
      setRowBusy(null);
    }
  };

  const remove = async (n) => {
    const ok = await confirm(t('admin.deleteNoticeTitle'), t('admin.deleteNoticeText', { title: n.title }), {
      confirmLabel: t('common.delete'), destructive: true,
    });
    if (!ok) return;
    setRowBusy(n.id);
    try {
      await deleteNotice(n.id);
      showToast(t('admin.noticeDeleted'), 'success');
    } catch (err) {
      showToast(errorMessage(err, t), 'error');
    } finally {
      setRowBusy(null);
    }
  };

  const list = notices.data || [];

  return (
    <main className="page admin-page">
      <PageHeader title={t('common.nav_notices')} subtitle={t('admin.noticesSubtitle')} />

      <div className="admin-split">
        <section className="admin-split__main" aria-labelledby="compose-title">
          <h2 id="compose-title" className="section-title">{t('admin.newNotice')}</h2>
          <form className="stack admin-form" onSubmit={submit} noValidate>
            <div className="card stack">
              <Field
                label={t('admin.noticeTitle')}
                htmlFor="notice-title"
                error={titleError}
                hint={t('admin.charsLeft', { n: TITLE_MAX - form.title.length })}
              >
                <input
                  id="notice-title"
                  className={`input admin-input${titleError ? ' input--error' : ''}`}
                  value={form.title}
                  maxLength={TITLE_MAX}
                  onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder={t('admin.noticeTitlePlaceholder')}
                  aria-invalid={!!titleError}
                />
              </Field>
              <Field label={t('admin.noticeBody')} htmlFor="notice-body" hint={t('admin.charsLeft', { n: BODY_MAX - form.body.length })}>
                <textarea
                  id="notice-body"
                  className="textarea admin-input"
                  rows={5}
                  value={form.body}
                  maxLength={BODY_MAX}
                  onChange={(e) => setForm(f => ({ ...f, body: e.target.value }))}
                  placeholder={t('admin.noticeBodyPlaceholder')}
                />
              </Field>
            </div>

            <div className="card settings-group">
              <div className="settings-row admin-form-row">
                <span className="grow">
                  <span id="pin-label" className="admin-form-row__label">{t('admin.pinToTop')}</span>
                  <span className="admin-form-row__hint">{form.pinned ? t('admin.pinnedHint') : t('admin.notPinnedHint')}</span>
                </span>
                <Switch
                  checked={form.pinned}
                  onChange={(v) => setForm(f => ({ ...f, pinned: v }))}
                  label={t('admin.pinToTop')}
                />
              </div>
              <div className="settings-row admin-form-row">
                <label htmlFor="notice-expiry" className="grow">
                  <span className="admin-form-row__label">{t('admin.expiresOptional')}</span>
                  <span className="admin-form-row__hint">{t('admin.expiresHint')}</span>
                </label>
                <input
                  id="notice-expiry"
                  className="input admin-input admin-date"
                  type="date"
                  min={minDate}
                  value={form.expires}
                  onChange={(e) => setForm(f => ({ ...f, expires: e.target.value }))}
                />
              </div>
            </div>

            <Button type="submit" loading={busy}>
              <Send size={18} aria-hidden="true" />
              {t('admin.postNotice')}
            </Button>
          </form>
        </section>

        <section className="admin-split__side" aria-labelledby="posted-title">
          <div className="admin-section-head">
            <h2 id="posted-title" className="section-title">{t('admin.postedNotices')}</h2>
            {list.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="admin-btn-44 admin-section-head__action"
                aria-pressed={editing}
                aria-label={editing ? t('common.done') : t('admin.editNotices')}
                onClick={() => setEditing(e => !e)}
              >
                {editing ? t('common.done') : t('common.edit')}
              </Button>
            )}
          </div>
          {notices.error && <LoadError error={notices.error} onRetry={notices.retry} />}
          {notices.loading && <Loading />}
          {notices.data && list.length === 0 && (
            <div className="card">
              <EmptyState icon={Megaphone} title={t('admin.noNotices')} text={t('admin.noNoticesText')} />
            </div>
          )}
          {list.length > 0 && (
            <div className="card settings-group">
              {list.map(n => (
                <article key={n.id} className="settings-row admin-notice" aria-labelledby={`notice-${n.id}`}>
                  {editing && (
                    <IconButton
                      label={t('admin.deleteNoticeName', { title: n.title })}
                      className="admin-icon-danger admin-notice__delete"
                      onClick={() => remove(n)}
                      disabled={rowBusy === n.id}
                    >
                      <CircleMinus size={22} aria-hidden="true" />
                    </IconButton>
                  )}
                  <div className="grow admin-notice__main">
                    <h3 id={`notice-${n.id}`} className="admin-notice__title">{n.title}</h3>
                    <p className="admin-notice__meta">
                      {n.pinned && <span className="admin-notice__pinned">{t('admin.pinnedBadge')} · </span>}
                      {[n.author_name, dateTime(n.created_at, lang)].filter(Boolean).join(' · ')}
                      {n.expires_at && ` · ${t('admin.expiresOn', { date: shortDate(n.expires_at, lang) })}`}
                    </p>
                    {n.body && <p className="admin-notice__body">{n.body}</p>}
                  </div>
                  {!editing && (
                    <button
                      type="button"
                      className="icon-btn admin-notice__pin"
                      aria-pressed={n.pinned}
                      aria-label={t('admin.pinNoticeName', { title: n.title })}
                      title={n.pinned ? t('admin.pinnedBadge') : t('admin.pinToTop')}
                      onClick={() => togglePin(n)}
                      disabled={rowBusy === n.id}
                    >
                      {n.pinned ? <Pin size={20} fill="currentColor" aria-hidden="true" /> : <Pin size={20} aria-hidden="true" />}
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <BottomNav />
    </main>
  );
}
