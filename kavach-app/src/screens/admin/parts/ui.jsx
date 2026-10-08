// UI pieces shared by the admin screens (built on src/components/ui).
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { ChevronRight, Phone, RotateCw, TriangleAlert, X } from 'lucide-react';
import { AlertBanner, Badge, Button, Spinner, TypeIcon } from '../../../components/ui';
import { getStatus, getType, isActive } from '../../../config/society';
import { errorMessage } from '../../../data/db';
import { useT } from '../../../i18n';
import { dateTime, timeAgo } from '../../../utils/time';
import { isEscalated, placeLabel, urgencyTone } from './format';

/** Staff wording status pill ("Open", "Claimed", …). */
export function StaffStatus({ status }) {
  const { t } = useT();
  return <Badge tone={getStatus(status).tone}>{t(`common.staffStatus_${status}`)}</Badge>;
}

/** Solid Settings-style icon tile for non-incident things (power, compliance…). */
export function IconTile({ icon: Icon, tone, size = 'sm' }) {
  const px = size === 'lg' ? 28 : size === 'sm' ? 18 : 22;
  return (
    <span className={`type-icon${size === 'md' ? '' : ` type-icon--${size}`}`} style={{ '--tone': tone }} aria-hidden="true">
      <Icon size={px} />
    </span>
  );
}

export function Loading() {
  const { t } = useT();
  return (
    <div className="admin-loading">
      <Spinner label={t('common.loading')} />
    </div>
  );
}

/** Error banner with a retry button. */
export function LoadError({ error, onRetry }) {
  const { t } = useT();
  return (
    <div role="alert">
      <AlertBanner tone="var(--red)" icon={TriangleAlert}>
        <p>{errorMessage(error, t)}</p>
        {onRetry && (
          <Button variant="ghost" size="sm" className="admin-retry" onClick={onRetry}>
            <RotateCw size={16} aria-hidden="true" />
            {t('common.retry')}
          </Button>
        )}
      </AlertBanner>
    </div>
  );
}

export function CallLink({ phone, name, compact }) {
  const { t } = useT();
  if (!phone) return null;
  return (
    <a
      className="btn btn--secondary btn--sm admin-call"
      href={`tel:${phone.replace(/\s+/g, '')}`}
      aria-label={t('admin.callName', { name: name || phone })}
      style={{ minHeight: 44 }}
    >
      <Phone size={18} aria-hidden="true" />
      {!compact && <span>{t('common.call')}</span>}
    </a>
  );
}

/** One incident as a grouped-list row linking to /incident/:id, with an optional trailing action. */
export function IncidentRow({ inc, now, action, showReporter = true }) {
  const { t, lang } = useT();
  const active = isActive(inc.status);
  const when = active ? timeAgo(inc.created_at, now, t) : dateTime(inc.created_at, lang);
  return (
    <div className="settings-row admin-inc">
      <Link to={`/incident/${inc.id}`} className="admin-inc__link">
        <TypeIcon type={inc.type} />
        <span className="admin-inc__body">
          <span className="admin-inc__top">
            <span className="admin-inc__title">{t(`common.type_${inc.type}`)}</span>
            <StaffStatus status={inc.status} />
          </span>
          <span className="admin-inc__meta">
            {placeLabel(inc, t)}
            {showReporter && inc.reporter_name ? ` · ${inc.reporter_name}` : ''}
          </span>
          <span className="admin-inc__meta admin-inc__meta--wrap">
            <span className={inc.assigned_name ? undefined : 'admin-unassigned'}>
              {inc.assigned_name || t('admin.unassigned')}
            </span>
            {` · ${when}`}
          </span>
          <span className="admin-inc__tags">
            {active && (
              <Badge tone={urgencyTone(inc.urgency_score)}>{t('admin.urgencyN', { n: inc.urgency_score })}</Badge>
            )}
            {active && isEscalated(inc) && (
              <Badge tone="var(--red)">{t('admin.escalatedLevel', { n: inc.escalation_level })}</Badge>
            )}
            {inc.vulnerable && <Badge tone="var(--purple)">{t('admin.vulnerable')}</Badge>}
          </span>
        </span>
        {!action && <ChevronRight size={18} className="admin-chevron" aria-hidden="true" />}
      </Link>
      {action}
    </div>
  );
}

/** Small chips for a responder's specialties. */
export function SpecialtyChips({ specialties, highlight }) {
  const { t } = useT();
  if (!specialties?.length) return null;
  return (
    <span className="admin-chips">
      {specialties.map(s => (
        <Badge key={s} tone={s === highlight ? getType(s).tone : undefined}>{t(`common.typeShort_${s}`)}</Badge>
      ))}
    </span>
  );
}

export function DutyDot({ on }) {
  const { t } = useT();
  return (
    <span className={`admin-duty${on ? ' admin-duty--on' : ''}`}>
      <span className="admin-duty__dot" aria-hidden="true" />
      {on ? t('admin.onDuty') : t('admin.offDuty')}
    </span>
  );
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal sheet (bottom sheet on phones, centred card on desktop) on the grouped background.
 * Escape / backdrop closes unless `busy`. Focus is trapped inside and restored on close.
 */
export function Sheet({ title, subtitle, onClose, busy, children, footer }) {
  const { t } = useT();
  const ref = useRef(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);
  useEffect(() => {
    closeRef.current = onClose;
    busyRef.current = busy;
  });

  useEffect(() => {
    const previous = document.activeElement;
    const node = ref.current;
    (node?.querySelector('[data-autofocus]') || node?.querySelector(FOCUSABLE))?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape' && !busyRef.current) {
        e.stopPropagation();
        closeRef.current?.();
      }
      if (e.key === 'Tab' && node) {
        const items = [...node.querySelectorAll(FOCUSABLE)];
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, []);

  return createPortal(
    <div
      className="dialog-overlay admin-sheet-overlay"
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}
    >
      <div ref={ref} className="admin-sheet fade-in" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="admin-sheet__head">
          <div className="grow">
            <h2 id={titleId} className="admin-sheet__title">{title}</h2>
            {subtitle && <p className="admin-sheet__subtitle">{subtitle}</p>}
          </div>
          <button type="button" className="icon-btn" aria-label={t('common.close')} title={t('common.close')} onClick={onClose} disabled={busy}>
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        <div className="admin-sheet__body">{children}</div>
        {footer && <div className="admin-sheet__foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
