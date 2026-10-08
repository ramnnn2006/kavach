// "What's happening?" — one plain-language row per emergency type.
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Phone } from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import { AlertBanner, PageHeader, TypeIcon } from '../../components/ui';
import { TYPE_ORDER } from '../../config/society';
import { useT } from '../../i18n';
import CallLink from './parts/CallLink';
import '../../styles/resident.css';

export default function ReportType() {
  const { t } = useT();
  const navigate = useNavigate();

  return (
    <main className="page res-page">
      <PageHeader back="/resident" title={t('resident.whatsHappening')} subtitle={t('resident.whatsHappeningSub')} />

      <div className="stack">
        <nav aria-label={t('resident.whatsHappening')} className="card settings-group">
          {TYPE_ORDER.map(type => (
            <button
              key={type}
              type="button"
              className="settings-row res-type-row"
              onClick={() => navigate(`/resident/report/${type}`)}
            >
              <TypeIcon type={type} />
              <span className="res-type-row__text">
                <span className="res-type-row__title">{t(`common.type_${type}`)}</span>
                <span className="res-type-row__hint">{t(`common.typeHint_${type}`)}</span>
              </span>
              <ChevronRight size={20} className="res-chevron" aria-hidden="true" />
            </button>
          ))}
        </nav>

        <AlertBanner tone="var(--red)" icon={Phone}>
          <p>{t('resident.lifeDanger')}</p>
          <div className="res-banner-actions">
            <CallLink phone="112" label={t('resident.call112')} variant="danger" />
          </div>
        </AlertBanner>
      </div>

      <BottomNav />
    </main>
  );
}
