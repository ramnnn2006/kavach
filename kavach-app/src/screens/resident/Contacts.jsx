// Society contacts and public emergency numbers; tap a row to call.
import { CircleAlert } from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import { AlertBanner, Button, PageHeader, Spinner } from '../../components/ui';
import { errorMessage } from '../../data/db';
import { listenContacts } from '../../data/resident';
import { PUBLIC_EMERGENCY } from '../../config/society';
import { useT } from '../../i18n';
import { useLive } from './parts/hooks';
import CallRow from './parts/CallRow';
import '../../styles/resident.css';

function ContactRow({ name, role, available, phone, t }) {
  return (
    <CallRow
      phone={phone}
      title={name}
      detail={[role, available].filter(Boolean).join(' · ')}
      number={phone}
      ariaLabel={t('resident.callNamed', { name })}
    />
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
      <PageHeader title={t('resident.contactsTitle')} />

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
