import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { listenIncidents, listenZones, seedZones } from '../firebase/firestore';
import { getType, TIERS, POWER_STATES } from '../config/society';
import BottomNav from '../components/BottomNav';
import { PageHeader, Card, TypeIcon, StatusBadge, Badge, Segmented, Stat, EmptyState } from '../components/ui';

const IN_PROGRESS = ['acknowledged', 'en_route', 'on_scene'];
const CLOSED = ['resolved', 'cancelled'];
const TABS = [
  { value: 'incidents', label: 'Incidents' },
  { value: 'power', label: 'Power' },
];

function IncidentRow({ inc }) {
  const t = getType(inc.type);
  const closed = CLOSED.includes(inc.status);
  return (
    <Card accent tone={t.tone} className="list-row">
      <TypeIcon type={inc.type} />
      <div className="list-row__body">
        <p className="list-row__title">{t.label}</p>
        <p className="list-row__meta truncate">{inc.locationZone || 'Location not given'}</p>
        <p className="list-row__meta truncate">{inc.assignedResponderName || 'Unassigned'}</p>
      </div>
      <div className="stack-sm" style={{ alignItems: 'flex-end' }}>
        <StatusBadge status={inc.status} staff />
        {!closed && inc.escalationLevel > 1 && (
          <Badge tone="var(--danger)">Escalated L{inc.escalationLevel}</Badge>
        )}
      </div>
    </Card>
  );
}

export default function AdminDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'power' ? 'power' : 'incidents';
  const [incidents, setIncidents] = useState([]);
  const [zones, setZones] = useState([]);

  useEffect(() => {
    // Seed zones if the Firestore 'zones' collection is empty
    seedZones();
    const u1 = listenIncidents(setIncidents);
    const u2 = listenZones(setZones);
    return () => { u1(); u2(); };
  }, []);

  const openCount = incidents.filter(i => i.status === 'pending').length;
  const progressCount = incidents.filter(i => IN_PROGRESS.includes(i.status)).length;
  const resolvedCount = incidents.filter(i => i.status === 'resolved').length;

  const active = incidents
    .filter(i => !CLOSED.includes(i.status))
    .sort((a, b) => (b.urgencyScore ?? 0) - (a.urgencyScore ?? 0));
  const resolved = incidents.filter(i => CLOSED.includes(i.status));

  return (
    <div className="page">
      <PageHeader eyebrow="Admin" title="Overview" />

      <div className="stack-lg">
        <div className="grid-3">
          <Stat value={openCount} label="Open" tone="var(--warning)" />
          <Stat value={progressCount} label="In progress" tone="var(--primary)" />
          <Stat value={resolvedCount} label="Resolved" tone="var(--success)" />
        </div>

        <Segmented
          label="Dashboard sections"
          options={TABS}
          value={tab}
          onChange={v => setSearchParams(v === 'incidents' ? {} : { tab: v })}
        />

        {tab === 'incidents' && (
          incidents.length === 0 ? (
            <EmptyState icon={ShieldCheck} title="No incidents" text="Nothing has been reported yet." />
          ) : (
            <div className="stack-lg">
              <section>
                <h2 className="section-title">Active</h2>
                {active.length === 0 ? (
                  <p className="muted text-sm">No active incidents.</p>
                ) : (
                  <div className="list">
                    {active.map(inc => <IncidentRow key={inc.id} inc={inc} />)}
                  </div>
                )}
              </section>
              {resolved.length > 0 && (
                <section>
                  <h2 className="section-title">Resolved</h2>
                  <div className="list">
                    {resolved.map(inc => <IncidentRow key={inc.id} inc={inc} />)}
                  </div>
                </section>
              )}
            </div>
          )
        )}

        {tab === 'power' && (
          <div className="stack-lg">
            {Object.entries(TIERS).map(([tier, cfg]) => {
              const tierZones = zones.filter(z => z.priorityTier === tier);
              if (tierZones.length === 0) return null;
              return (
                <section key={tier}>
                  <h2 className="section-title">{tier} · {cfg.label}</h2>
                  <Card className="settings-group">
                    {tierZones.map(z => {
                      const power = POWER_STATES[z.powerStatus] || { label: 'Unknown', tone: 'var(--gray)' };
                      return (
                        <div key={z.id || z.name} className="settings-row">
                          <div className="grow">
                            <p className="truncate">{z.name}</p>
                            <p className="text-sm muted truncate">{z.building}</p>
                          </div>
                          <Badge tone={power.tone}>{power.label}</Badge>
                        </div>
                      );
                    })}
                  </Card>
                </section>
              );
            })}
            <p className="text-sm muted">Read-only for now — live power control arrives with the database upgrade.</p>
          </div>
        )}
      </div>

      <BottomNav role="admin" active={tab === 'power' ? 'power' : 'dashboard'} />
    </div>
  );
}
