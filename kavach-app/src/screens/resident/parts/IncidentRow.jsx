import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { TypeIcon } from '../../../components/ui';
import { getStatus, isActive } from '../../../config/society';
import { useAuth } from '../../../context/AuthContext';
import { useT } from '../../../i18n';
import { timeAgo } from '../../../utils/time';
import { incidentPlace } from './format';

// One of my reports as a row in a grouped list → tracker.
// Mail-style: type + time on the first line, status (tinted while active) and place below.
export default function IncidentRow({ incident, now }) {
  const navigate = useNavigate();
  const { t } = useT();
  const { profile } = useAuth();
  const place = incidentPlace(incident, t, profile);
  const active = isActive(incident.status);
  return (
    <button type="button" className="settings-row res-row" onClick={() => navigate(`/resident/sos/${incident.id}`)}>
      <TypeIcon type={incident.type} />
      <span className="res-row__body">
        <span className="res-row__head">
          <span className="res-row__title">{t(`common.type_${incident.type}`)}</span>
          <span className="res-row__time">{timeAgo(incident.created_at, now, t)}</span>
        </span>
        <span className="res-row__meta">
          <span className="res-row__status" style={active ? { color: getStatus(incident.status).tone } : undefined}>
            {t(`common.status_${incident.status}`)}
          </span>
          {place && ` · ${place}`}
        </span>
      </span>
      <ChevronRight size={18} className="res-chevron" aria-hidden="true" />
    </button>
  );
}
