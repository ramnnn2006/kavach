// "What's happening?" — one plain-language row per emergency type.
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import { PageHeader, TypeIcon } from '../../components/ui';
import { TYPE_ORDER } from '../../config/society';
import { useT } from '../../i18n';
import '../../styles/resident.css';

export default function ReportType() {
  const { t } = useT();
  const navigate = useNavigate();

  return (
    <main className="page res-page">
      <PageHeader back="/resident" title={t('resident.whatsHappening')} subtitle={t('resident.whatsHappeningSub')} />

      <div>
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

        <p className="res-footer">
          {t('resident.lifeDanger')}{' '}
          <a href="tel:112" className="res-inline-link">{t('resident.call112')}</a>
        </p>
      </div>

      <BottomNav />
    </main>
  );
}
