import { useNavigate } from 'react-router-dom';
import { ChevronRight, Phone } from 'lucide-react';
import { Button, TypeIcon } from '../../../components/ui';
import { NEXT_STATUS } from '../../../config/society';
import { useT } from '../../../i18n';
import { timeAgo } from '../../../utils/time';
import { IncidentFlags } from './IncidentBadges';
import { peopleLabel, placeLine, telHref } from './format';

// Tappable summary (type, place, status/people/age, flags) that opens the detail screen.
function Summary({ inc, now, showStatus, chevron }) {
  const { t } = useT();
  const navigate = useNavigate();
  const place = placeLine(inc, t);
  const meta = [
    showStatus && t(`common.staffStatus_${inc.status}`),
    peopleLabel(inc.people_affected, t),
  ].filter(Boolean).join(' · ');
  return (
    <button type="button" className="rsp-alert__link" onClick={() => navigate(`/incident/${inc.id}`)}>
      <TypeIcon type={inc.type} />
      <span className="grow">
        <span className="rsp-alert__title">{t(`common.type_${inc.type}`)}</span>
        {place && <span className="rsp-alert__place">{place}</span>}
        <span className="rsp-alert__meta">
          {meta} · <time dateTime={inc.created_at}>{timeAgo(inc.created_at, now, t)}</time>
        </span>
        <IncidentFlags inc={inc} />
        {inc.description && <span className="rsp-alert__desc">{inc.description}</span>}
      </span>
      {chevron && <ChevronRight size={18} className="rsp-chevron" aria-hidden="true" />}
    </button>
  );
}

/** A job assigned to me: summary on top, the next step and a call button underneath. */
export function MyJob({ inc, now, busy, onAdvance, onResolve }) {
  const { t } = useT();
  const next = NEXT_STATUS[inc.status];
  const reporter = inc.reporter_name || t('responder.callReporter');
  return (
    <article className="card card--flush rsp-job">
      <Summary inc={inc} now={now} showStatus chevron />
      {(next || inc.reporter_phone) && (
        <div className="rsp-job__actions">
          {next && (
            <Button
              className="grow"
              variant={next.status === 'resolved' ? 'success' : 'primary'}
              loading={busy}
              onClick={() => (next.status === 'resolved' ? onResolve(inc) : onAdvance(inc, next.status))}
            >
              {t(next.labelKey)}
            </Button>
          )}
          {inc.reporter_phone && (
            <a className="btn btn--secondary rsp-job__call" href={telHref(inc.reporter_phone)} aria-label={t('responder.callName', { name: reporter })}>
              <Phone size={18} aria-hidden="true" />
              {t('common.call')}
            </a>
          )}
        </div>
      )}
    </article>
  );
}

/** An open alert as a list row: tap to read, trailing Claim. */
export function OpenAlertRow({ inc, now, busy, onClaim }) {
  const { t } = useT();
  return (
    <div className="settings-row rsp-alert">
      <Summary inc={inc} now={now} />
      <Button
        variant="secondary"
        size="sm"
        className="rsp-alert__claim"
        loading={busy}
        onClick={() => onClaim(inc)}
        aria-label={`${t('responder.claim')}: ${t(`common.type_${inc.type}`)}`}
      >
        {t('responder.claim')}
      </Button>
    </div>
  );
}
