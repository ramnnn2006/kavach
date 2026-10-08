// Resident Home — calm, fast emergency start: Safety Check prompt, live reports,
// one big "Report an emergency" action and a one-tap lift shortcut.
import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, CircleAlert, ShieldCheck, Siren } from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import { AlertBanner, Button, Card, PageHeader, TypeIcon } from '../../components/ui';
import { listenMyIncidents, listenSociety } from '../../data/db';
import { startOutboxSync } from '../../data/outbox';
import { getStatus, isActive } from '../../config/society';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../i18n';
import { timeAgo } from '../../utils/time';
import { firstName, homeLine, teamFor } from './parts/format';
import { useLive, useNow } from './parts/hooks';
import CallLink from './parts/CallLink';
import IncidentRow from './parts/IncidentRow';
import MedicalAlerts from './parts/MedicalAlerts';
import OutboxNotice from './parts/OutboxNotice';
import PowerNotice from './parts/PowerNotice';
import SafetyCheckCard from './parts/SafetyCheckCard';
import '../../styles/resident.css';

function activeSentence(inc, t) {
  const name = inc.assigned_name || t('resident.someone');
  switch (inc.status) {
    case 'acknowledged': return t('resident.sentenceAccepted', { name });
    case 'en_route': return t('resident.sentenceEnRoute', { name });
    case 'on_scene': return t('resident.sentenceOnScene');
    default: return t(`resident.sentencePending_${teamFor(inc.type)}`);
  }
}

function ActiveReport({ incident, now }) {
  const { t } = useT();
  const navigate = useNavigate();
  const status = getStatus(incident.status);
  return (
    <Card
      as="button"
      type="button"
      interactive
      className="res-active"
      style={{ '--tone': status.tone }}
      onClick={() => navigate(`/resident/sos/${incident.id}`)}
    >
      <TypeIcon type={incident.type} />
      <div className="res-row__body">
        <p className="res-row__title">
          {t(`common.type_${incident.type}`)} · <span className="res-active__status">{t(`common.status_${incident.status}`)}</span>
        </p>
        <p className="res-row__detail">{activeSentence(incident, t)}</p>
        <p className="res-row__meta">
          {incident.status === 'pending' && <span className="res-dot pulse" aria-hidden="true" />}
          {t('resident.sentAgo', { ago: timeAgo(incident.created_at, now, t) })}
        </p>
      </div>
      <ChevronRight size={20} className="res-chevron" aria-hidden="true" />
    </Card>
  );
}

export default function Home() {
  const { t } = useT();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const now = useNow(30000);

  useEffect(() => startOutboxSync(), []);

  const mine = useLive(listenMyIncidents);
  const society = useLive(listenSociety).data || profile?.society;

  const reports = mine.data || [];
  const active = reports.filter(i => isActive(i.status));
  const recent = reports.filter(i => !isActive(i.status)).slice(0, 3);
  const securityPhone = society?.security_phone || profile?.society?.security_phone;
  const name = firstName(profile);

  return (
    <main className="page res-page">
      <PageHeader
        eyebrow={society?.name || profile?.society?.name}
        title={name ? t('resident.hiName', { name }) : t('resident.hi')}
        subtitle={homeLine(profile, t)}
      />

      <div className="stack">
        <SafetyCheckCard profile={profile} />

        <OutboxNotice userId={user?.id} securityPhone={securityPhone} />

        {mine.error && !mine.data && (
          <AlertBanner tone="var(--red)" icon={CircleAlert} role="alert">
            <p>{t('resident.loadReportsError')}</p>
            <Button variant="ghost" size="sm" className="res-btn-44" onClick={mine.retry}>{t('common.retry')}</Button>
          </AlertBanner>
        )}

        {active.length > 0 && (
          <section aria-labelledby="res-active-title" className="stack-sm">
            <h2 id="res-active-title" className="sr-only">{t('resident.activeTitle')}</h2>
            {active.map(inc => <ActiveReport key={inc.id} incident={inc} now={now} />)}
          </section>
        )}

        <div className="stack-sm">
          <button type="button" className="res-hero" onClick={() => navigate('/resident/report')}>
            <span className="res-hero__icon" aria-hidden="true"><Siren size={28} /></span>
            <span className="res-hero__text">
              <span className="res-hero__title">{t('resident.reportEmergency')}</span>
              <span className="res-hero__sub">{t('resident.reportEmergencySub')}</span>
            </span>
            <ChevronRight size={24} className="res-hero__chev" aria-hidden="true" />
          </button>

          <button type="button" className="res-lift" onClick={() => navigate('/resident/report/lift')}>
            <TypeIcon type="lift" />
            <span className="res-lift__text">
              <span className="res-lift__title">{t('resident.stuckInLift')}</span>
              <span className="res-lift__sub">{t('resident.stuckInLiftSub')}</span>
            </span>
            <ChevronRight size={20} className="res-chevron" aria-hidden="true" />
          </button>
        </div>

        <section aria-labelledby="res-call-title">
          <h2 id="res-call-title" className="section-title">{t('resident.quickCall')}</h2>
          <div className="card settings-group">
            {securityPhone && (
              <div className="settings-row">
                <span className="type-icon type-icon--sm" style={{ '--tone': 'var(--blue)' }} aria-hidden="true">
                  <ShieldCheck size={18} />
                </span>
                <div className="grow">
                  <p className="semibold">{t('resident.securityDesk')}</p>
                  <p className="text-sm muted">{securityPhone}</p>
                </div>
                <CallLink
                  phone={securityPhone}
                  label={t('common.call')}
                  ariaLabel={t('resident.callNamed', { name: t('resident.securityDesk') })}
                />
              </div>
            )}
            <div className="settings-row">
              <span className="type-icon type-icon--sm" style={{ '--tone': 'var(--red)' }} aria-hidden="true">
                <Siren size={18} />
              </span>
              <div className="grow">
                <p className="semibold">{t('common.emergency112')}</p>
                <p className="text-sm muted">{t('resident.contact112')}</p>
              </div>
              <CallLink phone="112" label={t('common.call')} ariaLabel={t('resident.call112')} />
            </div>
          </div>
        </section>

        <PowerNotice powerSource={society?.power_source} zoneId={profile?.flat?.zone?.id || profile?.flat?.zone_id} />

        {profile?.first_responder_skill && <MedicalAlerts userId={user?.id} now={now} />}

        {recent.length > 0 && (
          <section aria-labelledby="res-recent-title">
            <div className="res-section-head">
              <h2 id="res-recent-title" className="section-title">{t('resident.recentTitle')}</h2>
              <Link className="res-link res-section-head__link" to="/resident/reports">{t('resident.seeAll')}</Link>
            </div>
            <div className="list">
              {recent.map(inc => <IncidentRow key={inc.id} incident={inc} now={now} />)}
            </div>
          </section>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
