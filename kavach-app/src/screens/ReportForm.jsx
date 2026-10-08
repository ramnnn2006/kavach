import { useState, useRef } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Minus, Plus, CircleAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { createIncident, calculateUrgency } from '../firebase/firestore';
import { INCIDENT_TYPES, getType } from '../config/society';
import { PageHeader, TypeIcon, Field, IconButton, Button, AlertBanner } from '../components/ui';

const buildings = ['Block A', 'Block B', 'Block C', 'Main Building', 'Hostel 1', 'Hostel 2'];

const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
const floors = ['Ground', ...Array.from({ length: 20 }, (_, i) => ordinal(i + 1))];

const MAX_PEOPLE = 50;

export default function ReportForm() {
  const { type } = useParams();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();

  const [building, setBuilding] = useState('');
  const [floor, setFloor] = useState('');
  const [zone, setZone] = useState('');
  const [people, setPeople] = useState(1);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const lastSubmit = useRef(0);

  if (!Object.hasOwn(INCIDENT_TYPES, type)) {
    return <Navigate to="/student" replace />;
  }

  const info = getType(type);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const now = Date.now();
    if (submitting || now - lastSubmit.current < 1000) return;
    lastSubmit.current = now;

    setSubmitting(true);
    setError('');

    try {
      const urgencyScore = calculateUrgency(type, people);
      const floorLabel = floor === 'Ground' ? 'Ground Floor' : `${floor} Floor`;
      const result = await createIncident({
        type,
        locationBuilding: building,
        locationFloor: floor,
        locationZone: `${building}, ${floorLabel}${zone.trim() ? `, ${zone.trim()}` : ''}`,
        reporterUid: user?.uid || 'demo-student',
        reporterName: userProfile?.name || 'Demo Student',
        description: description.trim(),
        peopleAffected: people,
        urgencyScore,
      });
      navigate(`/student/tracker/${result.id}`, { replace: true });
    } catch (err) {
      console.error('Error creating incident:', err);
      setError(err.message || 'Could not send the alert. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="page fade-in">
      <PageHeader compact back title={info.label} action={<TypeIcon type={type} size="sm" />} />

      <form onSubmit={handleSubmit} className="stack">
        <Field label="Building" htmlFor="rf-building">
          <select
            id="rf-building"
            className="select"
            value={building}
            onChange={e => setBuilding(e.target.value)}
            required
            disabled={submitting}
          >
            <option value="">Select building</option>
            {buildings.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </Field>

        <Field label="Floor" htmlFor="rf-floor">
          <select
            id="rf-floor"
            className="select"
            value={floor}
            onChange={e => setFloor(e.target.value)}
            required
            disabled={submitting}
          >
            <option value="">Select floor</option>
            {floors.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </Field>

        <Field label="Area or landmark (optional)" htmlFor="rf-zone" hint="For example: near Lift 2">
          <input
            id="rf-zone"
            className="input"
            type="text"
            value={zone}
            onChange={e => setZone(e.target.value)}
            disabled={submitting}
            autoComplete="off"
          />
        </Field>

        <div className="field">
          <p className="field__label" id="rf-people-label">People affected</p>
          <div className="counter" role="group" aria-labelledby="rf-people-label">
            <IconButton
              type="button"
              label="Fewer people"
              onClick={() => setPeople(p => Math.max(1, p - 1))}
              disabled={submitting || people <= 1}
            >
              <Minus size={20} aria-hidden="true" />
            </IconButton>
            <span className="counter__value" aria-live="polite">
              {people >= MAX_PEOPLE ? `${MAX_PEOPLE}+` : people}
            </span>
            <IconButton
              type="button"
              label="More people"
              onClick={() => setPeople(p => Math.min(MAX_PEOPLE, p + 1))}
              disabled={submitting || people >= MAX_PEOPLE}
            >
              <Plus size={20} aria-hidden="true" />
            </IconButton>
          </div>
        </div>

        <Field label="Details (optional)" htmlFor="rf-details" hint={`${description.length}/500`}>
          <textarea
            id="rf-details"
            className="textarea"
            placeholder="Briefly describe the situation"
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={500}
            disabled={submitting}
            rows={3}
          />
        </Field>

        {error && (
          <AlertBanner tone="var(--red)" icon={CircleAlert} role="alert">
            {error}
          </AlertBanner>
        )}

        <Button
          type="submit"
          variant="danger"
          size="lg"
          block
          loading={submitting}
          aria-label={submitting ? 'Sending alert' : undefined}
          disabled={!building || !floor}
        >
          Send alert
        </Button>
      </form>
    </div>
  );
}
