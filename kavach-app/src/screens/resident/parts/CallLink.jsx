import { Phone } from 'lucide-react';
import { telHref } from './format';

// A phone call link styled as a button. Renders nothing without a number.
export default function CallLink({ phone, label, ariaLabel, variant = 'secondary', size = 'sm', block, className }) {
  if (!phone) return null;
  const cls = ['btn', `btn--${variant}`, size && `btn--${size}`, block && 'btn--block', className].filter(Boolean).join(' ');
  return (
    <a className={cls} href={telHref(phone)} aria-label={ariaLabel || label} style={{ minHeight: size === 'lg' ? 52 : 44 }}>
      <Phone size={size === 'lg' ? 20 : 18} aria-hidden="true" />
      <span>{label}</span>
    </a>
  );
}
