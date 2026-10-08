import { useNavigate } from 'react-router-dom';
import { Phone } from 'lucide-react';
import { Button, Card, TypeIcon } from '../../../components/ui';
import { NEXT_STATUS } from '../../../config/society';
import { useT } from '../../../i18n';
import { timeAgo } from '../../../utils/time';
import { IncidentBadges, StaffStatusBadge } from './IncidentBadges';
import { peopleLabel, placeLine, telHref, urgencyTone } from './format';

/**
 * One alert. variant "mine" → next-step button + call; variant "open" → one-tap Claim.
 */
export default function IncidentCard({ inc, now, variant, busy, onClaim, onAdvance, onResolve }) {
  const { t } = useT();
  const navigate = useNavigate();
  const next = variant === 'mine' ? NEXT_STATUS[inc.status] : null;
  const place = placeLine(inc, t);
  const titleId = `rsp-inc-${inc.id}`;
  const reporter = inc.reporter_name || t('responder.callReporter');

  return (
    <Card
      as="article"
      className="rsp-card"
      accent={inc.urgency_score >= 50}
      tone={urgencyTone(inc.urgency_score)}
      aria-labelledby={titleId}
    >
      <div className="rsp-card__head">
        <TypeIcon type={inc.type} />
        <div className="grow">
          <h3 id={titleId} className="rsp-card__title">{t(`common.type_${inc.type}`)}</h3>
          {place && <p className="rsp-card__place">{place}</p>}
          <p className="rsp-card__meta">
            {peopleLabel(inc.people_affected, t)} · <time dateTime={inc.created_at}>{timeAgo(inc.created_at, now, t)}</time>
          </p>
        </div>
        {variant === 'mine' && <StaffStatusBadge status={inc.status} />}
      </div>

      <IncidentBadges inc={inc} />
      {inc.description && <p className="rsp-card__desc">{inc.description}</p>}

      <div className="rsp-card__actions">
        {variant === 'open' && (
          <Button className="rsp-card__primary" onClick={() => onClaim(inc)} loading={busy}>
            {t('responder.claim')}
          </Button>
        )}
        {next && (
          <Button
            className="rsp-card__primary"
            variant={next.status === 'resolved' ? 'success' : 'primary'}
            loading={busy}
            onClick={() => (next.status === 'resolved' ? onResolve(inc) : onAdvance(inc, next.status))}
          >
            {t(next.labelKey)}
          </Button>
        )}
        {variant === 'mine' && inc.reporter_phone && (
          <a
            className="btn btn--secondary btn--sm rsp-tap"
            href={telHref(inc.reporter_phone)}
            aria-label={t('responder.callName', { name: reporter })}
          >
            <Phone size={18} aria-hidden="true" />
            {t('common.call')}
          </a>
        )}
        <button type="button" className="btn btn--secondary btn--sm rsp-tap" onClick={() => navigate(`/incident/${inc.id}`)}>
          {t('responder.details')}
        </button>
      </div>
    </Card>
  );
}
