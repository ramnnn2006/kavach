import { Badge } from '../../../components/ui';
import { getStatus } from '../../../config/society';
import { useT } from '../../../i18n';
import { vulnerabilityShort } from './format';

// Status pill with staff wording ("Open", "Claimed", "En route"…)
export function StaffStatusBadge({ status }) {
  const { t } = useT();
  return <Badge tone={getStatus(status).tone}>{t(`common.staffStatus_${status}`)}</Badge>;
}

// Status as a dot + text, for headers and rows where a pill would be noise
export function StatusText({ status, children }) {
  const { t } = useT();
  return (
    <span className="rsp-status" style={{ '--tone': getStatus(status).tone }}>
      <span className="rsp-status__dot" aria-hidden="true" />
      {children ?? t(`common.staffStatus_${status}`)}
    </span>
  );
}

// Vulnerable reporter and escalation as one line of plain tinted text (never colour alone: the words carry it)
export function IncidentFlags({ inc }) {
  const { t } = useT();
  const vuln = inc.vulnerable ? (vulnerabilityShort(inc.reporter_vulnerability, t) || t('responder.vulnerableBadge')) : '';
  const escalated = inc.escalation_level > 1;
  if (!vuln && !escalated) return null;
  return (
    <span className="rsp-flags">
      {escalated && <span className="rsp-flag rsp-flag--red">{t('responder.escalated', { n: inc.escalation_level })}</span>}
      {vuln && <span className="rsp-flag rsp-flag--purple">{vuln}</span>}
    </span>
  );
}
