import { Phone } from 'lucide-react';
import { telHref } from './format';

// A list row that places a call when tapped (iOS Phone style): title, detail, trailing phone glyph.
export default function CallRow({ phone, title, detail, number, ariaLabel, icon }) {
  if (!phone) return null;
  return (
    <a className="settings-row res-call-row" href={telHref(phone)} aria-label={ariaLabel}>
      {icon}
      <span className="res-call-row__text">
        <span className="res-call-row__title">{title}</span>
        {detail && <span className="res-call-row__detail">{detail}</span>}
        {number && <span className="res-call-row__detail res-call-row__number">{number}</span>}
      </span>
      <Phone size={20} className="res-call-row__glyph" aria-hidden="true" />
    </a>
  );
}
