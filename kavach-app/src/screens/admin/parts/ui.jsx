// UI pieces shared by the admin screens (built on src/components/ui).
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { ChevronRight, Phone, RotateCw, TriangleAlert, X } from 'lucide-react';
import { AlertBanner, Button, Spinner, TypeIcon } from '../../../components/ui';
import { isActive } from '../../../config/society';
import { errorMessage } from '../../../data/db';
import { useT } from '../../../i18n';
import { dateTime, timeAgo } from '../../../utils/time';
import { isEscalated, placeLabel } from './format';

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
      className={`btn ${compact ? 'btn--ghost admin-call--icon' : 'btn--secondary btn--sm'} admin-call`}
      href={`tel:${phone.replace(/\s+/g, '')}`}
      aria-label={t('admin.callName', { name: name || phone })}
      title={t('admin.callName', { name: name || phone })}
      style={{ minHeight: 44 }}
    >
      <Phone size={compact ? 20 : 18} aria-hidden="true" />
      {!compact && <span>{t('common.call')}</span>}
    </a>
  );
}

/**
 * One incident as a grouped-list row linking to /incident/:id, with an optional trailing action.
 * Mail-style: type + time on the first line, place, then status · who · urgency as plain text.
 */
export function IncidentRow({ inc, now, action, showReporter = true }) {
  const { t, lang } = useT();
  const active = isActive(inc.status);
  const when = active ? timeAgo(inc.created_at, now, t) : dateTime(inc.created_at, lang);
  const escalated = active && isEscalated(inc);
  const urgent = active && inc.urgency_score >= 70;
  return (
    <div className="settings-row admin-inc">
      <Link to={`/incident/${inc.id}`} className="admin-inc__link">
        <TypeIcon type={inc.type} />
        <span className="admin-inc__body">
          <span className="admin-inc__top">
            <span className="admin-inc__title">{t(`common.type_${inc.type}`)}</span>
            <span className="admin-inc__time">{when}</span>
          </span>
          <span className="admin-inc__meta">
            {placeLabel(inc, t)}
            {showReporter && inc.reporter_name ? ` · ${inc.reporter_name}` : ''}
          </span>
          <span className="admin-inc__state">
            <span>{t(`common.staffStatus_${inc.status}`)}</span>
            {' · '}
            <span className={inc.assigned_name ? undefined : 'admin-unassigned'}>
              {inc.assigned_name || t('admin.unassigned')}
            </span>
            {active && (
              <>
                {' · '}
                <span className={urgent ? 'admin-text-red' : undefined}>{t('admin.urgencyN', { n: inc.urgency_score })}</span>
              </>
            )}
          </span>
          {(escalated || inc.vulnerable) && (
            <span className="admin-inc__flags">
              {escalated && <span className="admin-text-red">{t('admin.escalatedLevel', { n: inc.escalation_level })}</span>}
              {escalated && inc.vulnerable && ' · '}
              {inc.vulnerable && <span className="admin-inc__flag">{t('admin.vulnerable')}</span>}
            </span>
          )}
        </span>
        {!action && <ChevronRight size={18} className="admin-chevron" aria-hidden="true" />}
      </Link>
      {action}
    </div>
  );
}

/** A responder's specialties as plain text ("Lift, Power, Water"); `highlight` is emphasised. */
export function SpecialtyChips({ specialties, highlight }) {
  const { t } = useT();
  if (!specialties?.length) return null;
  return (
    <span className="admin-specs">
      {specialties.map((s, i) => (
        <span key={s} className={s === highlight ? 'admin-specs__hit' : undefined}>
          {t(`common.typeShort_${s}`)}{i < specialties.length - 1 ? ', ' : ''}
        </span>
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
