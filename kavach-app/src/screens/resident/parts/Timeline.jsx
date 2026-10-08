import { useT } from '../../../i18n';
import { clock } from '../../../utils/time';

const NOTE_ACTIONS = ['resolved', 'status_changed', 'note_added'];

function sentence(ev, t) {
  const actor = ev.actor_name || t('resident.someone');
  const d = ev.data || {};
  switch (ev.action) {
    case 'created':
      return t('resident.evCreated');
    case 'claimed':
      return t('resident.evClaimed', { name: actor });
    case 'assigned':
      return t('resident.evAssigned', { name: d.assigned_name || d.to || actor });
    case 'reassigned':
      return t('resident.evReassigned', { name: d.to || actor });
    case 'status_changed':
      if (ev.to_status === 'acknowledged') return t('resident.evClaimed', { name: actor });
      if (ev.to_status === 'en_route') return t('resident.evEnRoute', { name: actor });
      if (ev.to_status === 'on_scene') return t('resident.evOnScene', { name: actor });
      return t('resident.evStatus', { status: t(`common.status_${ev.to_status}`) });
    case 'escalated':
      return t('resident.evEscalated');
    case 'first_responder_ack':
      return t('resident.evFirstResponder', { name: actor });
    case 'resolved':
      return t('resident.evResolved', { name: actor });
    case 'cancelled':
      return t('resident.evCancelled');
    case 'details_updated':
      return t('resident.evDetails');
    case 'note_added':
      return t('resident.evNote', { name: actor });
    default:
      return t('resident.evOther');
  }
}

// Plain-language history of an incident (incident_events).
export default function Timeline({ events }) {
  const { t, lang } = useT();
  if (!events?.length) return null;
  return (
    <ol className="card res-timeline">
      {events.map(ev => (
        <li key={ev.id} className="res-timeline__item">
          <time className="res-timeline__time" dateTime={ev.created_at}>{clock(ev.created_at, lang)}</time>
          <div className="res-timeline__body">
            <p>{sentence(ev, t)}</p>
            {ev.note && NOTE_ACTIONS.includes(ev.action) && <p className="res-timeline__note">{ev.note}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
