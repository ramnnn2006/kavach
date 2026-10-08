import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Badge, Card, TypeIcon } from '../../../components/ui';
import { getStatus } from '../../../config/society';
import { useAuth } from '../../../context/AuthContext';
import { useT } from '../../../i18n';
import { timeAgo } from '../../../utils/time';
import { incidentPlace } from './format';

// One of my reports as a tappable row → tracker.
export default function IncidentRow({ incident, now, detail }) {
  const navigate = useNavigate();
  const { t } = useT();
  const { profile } = useAuth();
  const place = incidentPlace(incident, t, profile);
  return (
    <Card as="button" type="button" interactive className="res-row" onClick={() => navigate(`/resident/sos/${incident.id}`)}>
      <TypeIcon type={incident.type} />
      <div className="res-row__body">
        <div className="res-row__head">
          <p className="res-row__title">{t(`common.type_${incident.type}`)}</p>
          <Badge tone={getStatus(incident.status).tone}>{t(`common.status_${incident.status}`)}</Badge>
        </div>
        {detail && <p className="res-row__detail">{detail}</p>}
        <p className="res-row__meta">
          {[place, timeAgo(incident.created_at, now, t)].filter(Boolean).join(' · ')}
        </p>
      </div>
      <ChevronRight size={20} className="res-chevron" aria-hidden="true" />
    </Card>
  );
}
