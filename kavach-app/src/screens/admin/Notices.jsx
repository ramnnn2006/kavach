// Admin Notices — post announcements residents see on their Notices tab; pin or delete them.
import { useState } from 'react';
import { Megaphone, Pin, Send, Trash2 } from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import { Badge, Button, EmptyState, Field, IconButton, PageHeader, Switch } from '../../components/ui';
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

      <form className="card stack admin-form" onSubmit={submit} noValidate aria-labelledby="compose-title">
        <h2 id="compose-title" className="admin-card-title">{t('admin.newNotice')}</h2>
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
        <div className="admin-form-2">
          <div className="field">
            <span className="field__label" id="pin-label">{t('admin.pinToTop')}</span>
            <div className="row admin-switch-row">
              <Switch
                checked={form.pinned}
                onChange={(v) => setForm(f => ({ ...f, pinned: v }))}
                label={t('admin.pinToTop')}
              />
              <span className="text-sm muted">{form.pinned ? t('admin.pinnedHint') : t('admin.notPinnedHint')}</span>
            </div>
          </div>
          <Field label={t('admin.expiresOptional')} htmlFor="notice-expiry" hint={t('admin.expiresHint')}>
            <input
              id="notice-expiry"
              className="input admin-input"
              type="date"
              min={minDate}
              value={form.expires}
              onChange={(e) => setForm(f => ({ ...f, expires: e.target.value }))}
            />
          </Field>
        </div>
        <Button type="submit" loading={busy}>
          <Send size={18} aria-hidden="true" />
          {t('admin.postNotice')}
        </Button>
      </form>

      <h2 className="section-title">{t('admin.postedNotices')}</h2>
      {notices.error && <LoadError error={notices.error} onRetry={notices.retry} />}
      {notices.loading && <Loading />}
      {notices.data && list.length === 0 && (
        <div className="card">
          <EmptyState icon={Megaphone} title={t('admin.noNotices')} text={t('admin.noNoticesText')} />
        </div>
      )}
      <div className="stack-sm">
        {list.map(n => (
          <article key={n.id} className="card admin-notice" aria-labelledby={`notice-${n.id}`}>
            <div className="admin-notice__head">
              <div className="grow">
                {n.pinned && (
                  <Badge tone="var(--orange)"><Pin size={12} aria-hidden="true" />{t('admin.pinnedBadge')}</Badge>
                )}
                <h3 id={`notice-${n.id}`} className="admin-notice__title">{n.title}</h3>
                <p className="text-xs muted">
                  {[n.author_name, dateTime(n.created_at, lang)].filter(Boolean).join(' · ')}
                  {n.expires_at && ` · ${t('admin.expiresOn', { date: shortDate(n.expires_at, lang) })}`}
                </p>
              </div>
              <IconButton
                label={t('admin.deleteNoticeName', { title: n.title })}
                className="admin-icon-danger"
                onClick={() => remove(n)}
                disabled={rowBusy === n.id}
              >
                <Trash2 size={20} aria-hidden="true" />
              </IconButton>
            </div>
            {n.body && <p className="admin-notice__body">{n.body}</p>}
            <div className="row admin-notice__foot">
              <Switch
                checked={n.pinned}
                onChange={() => togglePin(n)}
                label={t('admin.pinNoticeName', { title: n.title })}
                disabled={rowBusy === n.id}
              />
              <span className="text-sm">{t('admin.pinToTop')}</span>
            </div>
          </article>
        ))}
      </div>

      <BottomNav />
    </main>
  );
}
