// Shared UI primitives. Styling lives in src/styles/components.css.
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft } from 'lucide-react';
import { getType, getStatus } from '../../config/society';
import { useT } from '../../i18n';

const cx = (...parts) => parts.filter(Boolean).join(' ');

export function Button({ variant = 'primary', size, block, loading, className, children, disabled, ...props }) {
  return (
    <button
      className={cx('btn', `btn--${variant}`, size && `btn--${size}`, block && 'btn--block', className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} aria-hidden="true" /> : children}
    </button>
  );
}

export function IconButton({ label, className, children, ...props }) {
  return (
    <button className={cx('icon-btn', className)} aria-label={label} title={label} {...props}>
      {children}
    </button>
  );
}

export function Card({ as: Tag = 'div', interactive, accent, tone, flush, className, style, children, ...props }) {
  return (
    <Tag
      className={cx('card', interactive && 'card--interactive', accent && 'card--accent', flush && 'card--flush', className)}
      style={tone ? { '--tone': tone, ...style } : style}
      {...props}
    >
      {children}
    </Tag>
  );
}

// back: true → navigate(-1) with fallback; string → navigate to that path
export function PageHeader({ title, eyebrow, subtitle, back, action, compact }) {
  const navigate = useNavigate();
  const { t } = useT();
  const goBack = () => {
    if (typeof back === 'string') navigate(back);
    else if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };
  const row = (
    <header className={cx('page-header', compact && 'page-header--compact')}>
      {back && compact && (
        <IconButton label={t('common.back')} onClick={goBack}>
          <ArrowLeft size={22} />
        </IconButton>
      )}
      <div className="page-header__text">
        {eyebrow && <p className="page-header__eyebrow">{eyebrow}</p>}
        <h1 className="page-header__title">{title}</h1>
        {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
  if (!back || compact) return row;
  return (
    <>
      <nav className="page-nav" aria-label={t('common.back')}>
        <button type="button" className="page-nav__back" onClick={goBack}>
          <ChevronLeft size={26} aria-hidden="true" />
          {t('common.back')}
        </button>
      </nav>
      {row}
    </>
  );
}

export function Badge({ tone, children, className }) {
  return (
    <span className={cx('badge', className)} style={tone ? { '--tone': tone } : undefined}>
      {children}
    </span>
  );
}

export function StatusBadge({ status, staff }) {
  const { t } = useT();
  const key = staff ? `common.staffStatus_${status}` : `common.status_${status}`;
  return <Badge tone={getStatus(status).tone}>{t(key)}</Badge>;
}

export function TypeIcon({ type, size = 'md' }) {
  const t = getType(type);
  const Icon = t.icon;
  const px = size === 'lg' ? 28 : size === 'sm' ? 18 : 22;
  return (
    <span className={cx('type-icon', size !== 'md' && `type-icon--${size}`)} style={{ '--tone': t.tone }} aria-hidden="true">
      <Icon size={px} />
    </span>
  );
}

export function Field({ label, hint, error, htmlFor, children }) {
  return (
    <div className="field">
      {label && <label className="field__label" htmlFor={htmlFor}>{label}</label>}
      {children}
      {error ? <p className="field__error" role="alert">{error}</p> : hint && <p className="field__hint">{hint}</p>}
    </div>
  );
}

export function Switch({ checked, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="switch"
      disabled={disabled}
      onClick={() => onChange(!checked)}
    />
  );
}

export function Segmented({ options, value, onChange, label }) {
  return (
    <div className="segmented" role="tablist" aria-label={label}>
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          className="segmented__item"
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// steps: [{ label, state: 'done' | 'current' | 'todo', time? }]
export function Stepper({ steps }) {
  return (
    <ol className="stepper">
      {steps.map((s, i) => (
        <li key={s.label} className={`stepper__item stepper__item--${s.state}`} aria-current={s.state === 'current' ? 'step' : undefined}>
          <span className="stepper__dot" aria-hidden="true">{s.state === 'done' ? '✓' : i + 1}</span>
          <div>
            <p className="stepper__label">{s.label}</p>
            {s.time && <p className="stepper__time">{s.time}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function EmptyState({ icon: Icon, title, text, action, titleAs: Title = 'p' }) {
  return (
    <div className="empty">
      {Icon && <Icon size={28} aria-hidden="true" />}
      <Title className="empty__title">{title}</Title>
      {text && <p className="empty__text">{text}</p>}
      {action && <div style={{ marginTop: 'var(--s-2)' }}>{action}</div>}
    </div>
  );
}

export function AlertBanner({ tone = 'var(--primary)', icon: Icon, children, role }) {
  return (
    <div className="alert" style={{ '--tone': tone }} role={role}>
      {Icon && <Icon size={18} aria-hidden="true" />}
      <div>{children}</div>
    </div>
  );
}

export function Stat({ value, label, tone }) {
  return (
    <div className="card stat" style={tone ? { '--tone': tone } : undefined}>
      <p className="stat__value">{value}</p>
      <p className="stat__label">{label}</p>
    </div>
  );
}

export function Spinner({ large, label }) {
  const { t } = useT();
  label = label || t('common.loading');
  return <span className={cx('spinner', large && 'spinner--lg')} role="status" aria-label={label} />;
}

export function Avatar({ name, large }) {
  const initials = (name || '?').split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase();
  return <span className={cx('avatar', large && 'avatar--lg')} aria-hidden="true">{initials}</span>;
}

// Shield-tower mark: shield outline, apartment block inside, one lit (SOS) window
export function Logo({ size = 32, title = 'Kavach' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label={title}>
      <path d="M24 3 6 9.5v13.2C6 34.3 13.7 42.6 24 45c10.3-2.4 18-10.7 18-22.3V9.5L24 3Z" fill="#1e2a5a" />
      <path d="M16 38V17.5L24 13l8 4.5V38" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinejoin="round" />
      <rect x="19.5" y="20" width="3.2" height="3.2" rx=".6" fill="#fff" />
      <rect x="25.3" y="20" width="3.2" height="3.2" rx=".6" fill="#e5372b" />
      <rect x="19.5" y="26" width="3.2" height="3.2" rx=".6" fill="#fff" />
      <rect x="25.3" y="26" width="3.2" height="3.2" rx=".6" fill="#fff" />
      <rect x="22.3" y="32" width="3.4" height="6" rx=".6" fill="#fff" />
    </svg>
  );
}
