// Admin Society — backup power, assets, compliance and contacts (one tab each; tab lives in the URL hash).
import { useLocation, useNavigate } from 'react-router-dom';
import BottomNav from '../../components/BottomNav';
import { PageHeader, Segmented } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../i18n';
import PowerPanel from './parts/PowerPanel';
import AssetsPanel from './parts/AssetsPanel';
import CompliancePanel from './parts/CompliancePanel';
import ContactsPanel from './parts/ContactsPanel';
import '../../styles/admin.css';

const TABS = ['power', 'assets', 'compliance', 'contacts'];
const PANELS = { power: PowerPanel, assets: AssetsPanel, compliance: CompliancePanel, contacts: ContactsPanel };

export default function Society() {
  const { t } = useT();
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const fromHash = location.hash.replace('#', '');
  const tab = TABS.includes(fromHash) ? fromHash : 'power';
  const Panel = PANELS[tab];

  const setTab = (next) => {
    navigate(`/admin/society${next === 'power' ? '' : `#${next}`}`, { replace: true });
  };

  return (
    <main className="page admin-page admin-narrow">
      <PageHeader
        eyebrow={profile?.society?.name}
        title={t('common.nav_society')}
      />
      <div className="admin-tabs">
        <Segmented
          label={t('admin.societySections')}
          value={tab}
          onChange={setTab}
          options={TABS.map(id => ({ value: id, label: t(`admin.tab_${id}`) }))}
        />
      </div>
      <section id={tab} className="admin-panel" role="tabpanel" aria-label={t(`admin.tab_${tab}`)}>
        <Panel />
      </section>
      <BottomNav />
    </main>
  );
}
