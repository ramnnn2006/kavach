import { Badge } from '../../../components/ui';
import { getStatus } from '../../../config/society';
import { useT } from '../../../i18n';
import { urgencyTone, vulnerabilityShort } from './format';

// Status pill with staff wording ("Open", "Claimed", "En route"…)
export function StaffStatusBadge({ status }) {
  const { t } = useT();
  return <Badge tone={getStatus(status).tone}>{t(`common.staffStatus_${status}`)}</Badge>;
}

// Urgency, vulnerable reporter and escalation — always text, never colour alone
export function IncidentBadges({ inc }) {
  const { t } = useT();
  const vuln = inc.vulnerable ? (vulnerabilityShort(inc.reporter_vulnerability, t) || t('responder.vulnerableBadge')) : '';
  return (
    <div className="rsp-badges">
      <Badge tone={urgencyTone(inc.urgency_score)}>{t('responder.urgency', { n: inc.urgency_score })}</Badge>
      {vuln && <Badge tone="var(--purple)">{vuln}</Badge>}
      {inc.escalation_level > 1 && <Badge tone="var(--red)">{t('responder.escalated', { n: inc.escalation_level })}</Badge>}
    </div>
  );
}
