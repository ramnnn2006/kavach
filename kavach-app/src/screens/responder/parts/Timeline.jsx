import { useState } from 'react';
import { useT } from '../../../i18n';
import { dateTime } from '../../../utils/time';

const VISIBLE = 6;
const STATUS_SENTENCE = ['acknowledged', 'en_route', 'on_scene'];

const TONE = {
  created: 'var(--orange)',
  claimed: 'var(--blue)',
  assigned: 'var(--blue)',
  reassigned: 'var(--blue)',
  status_changed: 'var(--indigo)',
  resolved: 'var(--green)',
  cancelled: 'var(--gray)',
  escalated: 'var(--red)',
  note_added: 'var(--gray)',
  details_updated: 'var(--gray)',
  first_responder_ack: 'var(--pink)',
};

function describeEvent(ev, t) {
  const someone = t('responder.someone');
  const actor = ev.actor_name || (ev.action === 'escalated' ? t('responder.system') : someone);
  const d = ev.data || {};
  switch (ev.action) {
    case 'created':
      return t(d.source === 'safety_check' ? 'responder.ev_created_safety' : 'responder.ev_created', { actor });
    case 'claimed':
      return t('responder.ev_claimed', { actor });
    case 'assigned':
      return t('responder.ev_assigned', { actor, to: d.assigned_name || d.to || someone });
    case 'reassigned':
      return t('responder.ev_reassigned', { actor, from: d.from || someone, to: d.to || d.assigned_name || someone });
    case 'status_changed':
      if (STATUS_SENTENCE.includes(ev.to_status)) return t(`responder.ev_status_${ev.to_status}`, { actor });
      return t('responder.ev_status', { actor, status: t(`common.staffStatus_${ev.to_status}`) });
    case 'resolved':
      return t('responder.ev_resolved', { actor });
    case 'cancelled':
      return t('responder.ev_cancelled', { actor });
    case 'escalated':
      return t('responder.ev_escalated', { n: d.level ?? '' });
    case 'note_added':
      return t('responder.ev_note_added', { actor });
    case 'details_updated':
      return t('responder.ev_details_updated', { actor });
    case 'first_responder_ack':
      return t('responder.ev_first_responder_ack', { actor });
    default:
      return actor;
  }
}

// Audit log as plain sentences. Older items collapse on screen but always print.
export default function Timeline({ events }) {
  const { t, lang } = useT();
  const [expanded, setExpanded] = useState(false);
  const hiddenCount = Math.max(0, events.length - VISIBLE);

  if (!events.length) return <p className="muted rsp-timeline__empty">{t('responder.noEvents')}</p>;

  return (
    <>
      <ol className="rsp-timeline">
        {events.map((ev, i) => (
          <li
            key={ev.id}
            className={`rsp-timeline__item${!expanded && i < hiddenCount ? ' rsp-timeline__item--older' : ''}`}
            style={{ '--tone': TONE[ev.action] || 'var(--gray)' }}
          >
            <span className="rsp-timeline__dot" aria-hidden="true" />
            <div className="grow">
              <p className="rsp-timeline__text">{describeEvent(ev, t)}</p>
              {ev.note && <p className="rsp-timeline__note">{ev.note}</p>}
              <p className="rsp-timeline__time"><time dateTime={ev.created_at}>{dateTime(ev.created_at, lang)}</time></p>
            </div>
          </li>
        ))}
      </ol>
      {hiddenCount > 0 && (
        <button type="button" className="btn btn--ghost btn--sm rsp-tap rsp-no-print" onClick={() => setExpanded(v => !v)} aria-expanded={expanded}>
          {expanded ? t('responder.showLess') : t('responder.showAll', { n: events.length })}
        </button>
      )}
    </>
  );
}
