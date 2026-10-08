// Society contacts and public emergency numbers, each one tap to call.
import { CircleAlert, Phone, ShieldCheck, Siren } from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import { AlertBanner, Button, PageHeader, Spinner } from '../../components/ui';
import { errorMessage } from '../../data/db';
import { listenContacts } from '../../data/resident';
import { PUBLIC_EMERGENCY } from '../../config/society';
import { useT } from '../../i18n';
import { useLive } from './parts/hooks';
import CallLink from './parts/CallLink';
import '../../styles/resident.css';

function ContactRow({ name, role, available, phone, icon: Icon, tone, t }) {
  return (
    <div className="settings-row">
      <span className="type-icon type-icon--sm" style={{ '--tone': tone }} aria-hidden="true"><Icon size={18} /></span>
      <div className="grow res-contact">
        <p className="semibold">{name}</p>
        <p className="text-sm muted">{[role, available].filter(Boolean).join(' · ')}</p>
        <p className="text-sm muted mono">{phone}</p>
      </div>
      <CallLink phone={phone} label={t('common.call')} ariaLabel={t('resident.callNamed', { name })} />
    </div>
  );
}

export default function Contacts() {
  const { t } = useT();
  const { data, error, loading, retry } = useLive(listenContacts);

  const society = (data || []).filter(c => c.kind === 'society');
  const emergencyRows = (data || []).filter(c => c.kind === 'emergency');
  const emergency = emergencyRows.length
    ? emergencyRows
    : PUBLIC_EMERGENCY.map(e => ({ id: e.number, name: t(e.labelKey), role_label: null, available: t('resident.allDay'), phone: e.number }));

  return (
    <main className="page res-page">
      <PageHeader title={t('resident.contactsTitle')} subtitle={t('resident.contactsSub')} />

      <div className="stack">
        {error && !data && (
          <AlertBanner tone="var(--red)" icon={CircleAlert} role="alert">
            <p>{errorMessage(error, t)}</p>
            <Button variant="ghost" size="sm" className="res-btn-44" onClick={retry}>{t('common.retry')}</Button>
          </AlertBanner>
        )}

        <section aria-labelledby="res-society-contacts">
          <h2 id="res-society-contacts" className="section-title">{t('resident.groupSociety')}</h2>
          {loading ? (
            <div className="card res-center"><Spinner label={t('common.loading')} /></div>
          ) : society.length ? (
            <div className="card settings-group">
              {society.map(c => (
                <ContactRow
                  key={c.id}
                  name={c.name}
                  role={c.role_label}
                  available={c.available}
                  phone={c.phone}
                  icon={ShieldCheck}
                  tone="var(--blue)"
                  t={t}
                />
              ))}
            </div>
          ) : (
            <div className="card"><p className="text-sm muted">{t('resident.noSocietyContacts')}</p></div>
          )}
        </section>

        <section aria-labelledby="res-emergency-contacts">
          <h2 id="res-emergency-contacts" className="section-title">{t('resident.groupEmergency')}</h2>
          <div className="card settings-group">
            {emergency.map(c => (
              <ContactRow
                key={c.id}
                name={c.name}
                role={c.role_label}
                available={c.available}
                phone={c.phone}
                icon={c.phone === '112' ? Siren : Phone}
                tone="var(--red)"
                t={t}
              />
            ))}
          </div>
        </section>
      </div>

      <BottomNav />
    </main>
  );
}
