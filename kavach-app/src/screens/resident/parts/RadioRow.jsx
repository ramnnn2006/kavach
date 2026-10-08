import { Check } from 'lucide-react';

// Settings-style single-choice row; put several inside an element with role="radiogroup".
export default function RadioRow({ checked, onSelect, icon, tone = 'var(--gray)', title, subtitle, trailing, disabled }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      className="settings-row res-radio"
      onClick={onSelect}
      disabled={disabled}
    >
      {icon && (
        <span className="type-icon type-icon--sm" style={{ '--tone': tone }} aria-hidden="true">{icon}</span>
      )}
      <span className="res-radio__text">
        <span className="res-radio__title">{title}</span>
        {subtitle && <span className="res-radio__sub">{subtitle}</span>}
      </span>
      {trailing}
      <span className="res-radio__check" aria-hidden="true">{checked && <Check size={20} strokeWidth={2.6} />}</span>
    </button>
  );
}
