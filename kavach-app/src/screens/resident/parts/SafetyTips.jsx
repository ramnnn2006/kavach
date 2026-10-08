import { useId, useState } from 'react';
import { ChevronDown, Lightbulb } from 'lucide-react';
import { useT } from '../../../i18n';

// Collapsible "What to do now" tips for an incident type (one tip per line in resident.tips_<type>).
export default function SafetyTips({ type, defaultOpen = true }) {
  const { t } = useT();
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  const raw = t(`resident.tips_${type}`);
  const tips = raw.startsWith('resident.') ? [] : raw.split('\n').filter(Boolean);
  if (!tips.length) return null;
  return (
    <section className="card res-tips">
      <button
        type="button"
        className="res-tips__toggle"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(o => !o)}
      >
        <span className="type-icon type-icon--sm" style={{ '--tone': 'var(--orange)' }} aria-hidden="true">
          <Lightbulb size={18} />
        </span>
        <span className="grow semibold">{t('resident.tipsTitle')}</span>
        <ChevronDown size={20} className={`res-tips__chev${open ? ' is-open' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <ol id={id} className="res-tips__list">
          {tips.map(tip => <li key={tip}>{tip}</li>)}
        </ol>
      )}
    </section>
  );
}
