import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { DialogProvider } from './context/DialogContext';
import { I18nProvider } from './i18n';
import { updateMyProfile } from './data/db';
import ToastContainer from './components/ToastContainer';
import ConnectionBanner from './components/ConnectionBanner';
import ErrorBoundary from './components/ErrorBoundary';
import { Spinner } from './components/ui';
import { roleHome } from './config/society';

import LandingPage from './screens/LandingPage';
import Login from './screens/Login';
import NotFound from './screens/NotFound';

// Route-level code splitting: each role only downloads its own screens
const Welcome = lazy(() => import('./screens/shared/Welcome'));
const Profile = lazy(() => import('./screens/shared/Profile'));
const IncidentDetail = lazy(() => import('./screens/shared/IncidentDetail'));

const ResidentHome = lazy(() => import('./screens/resident/Home'));
const ReportType = lazy(() => import('./screens/resident/ReportType'));
const ReportDetails = lazy(() => import('./screens/resident/ReportDetails'));
const Tracker = lazy(() => import('./screens/resident/Tracker'));
const Reports = lazy(() => import('./screens/resident/Reports'));
const ResidentNotices = lazy(() => import('./screens/resident/Notices'));
const Contacts = lazy(() => import('./screens/resident/Contacts'));

const Alerts = lazy(() => import('./screens/responder/Alerts'));
const Checks = lazy(() => import('./screens/responder/Checks'));
const Assets = lazy(() => import('./screens/responder/Assets'));
const History = lazy(() => import('./screens/responder/History'));

const Overview = lazy(() => import('./screens/admin/Overview'));
const Incidents = lazy(() => import('./screens/admin/Incidents'));
const Team = lazy(() => import('./screens/admin/Team'));
const Society = lazy(() => import('./screens/admin/Society'));
const Insights = lazy(() => import('./screens/admin/Insights'));
const AdminNotices = lazy(() => import('./screens/admin/Notices'));
const SafetyCheck = lazy(() => import('./screens/admin/SafetyCheck'));
const Board = lazy(() => import('./screens/admin/Board'));

function FullPageSpinner() {
  return (
    <div className="page page--center" style={{ alignItems: 'center' }}>
      <Spinner large />
    </div>
  );
}

/**
 * Guards a route: must be signed in, have a profile, optionally a given role.
 * Residents without a home (flat) are sent to /welcome first.
 */
function Protected({ children, roles }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (!profile) return <FullPageSpinner />;
  if (roles && !roles.includes(profile.role)) return <Navigate to={roleHome(profile.role)} replace />;
  if (profile.role === 'resident' && !profile.flat_id && location.pathname !== '/welcome') {
    return <Navigate to="/welcome" replace />;
  }
  return children;
}

const R = ['resident'];
const S = ['responder', 'admin'];
const A = ['admin'];

function AppRoutes() {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  const from = location.state?.from;

  const loginElement = loading
    ? <FullPageSpinner />
    : user && profile
      ? <Navigate to={from && from !== '/login' ? from : roleHome(profile.role)} replace />
      : <Login />;

  return (
    <>
      <ConnectionBanner />
      <ErrorBoundary>
        <Suspense fallback={<FullPageSpinner />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={loginElement} />
            <Route path="/welcome" element={<Protected><Welcome /></Protected>} />
            <Route path="/profile" element={<Protected><Profile /></Protected>} />

            {/* Resident */}
            <Route path="/resident" element={<Protected roles={R}><ResidentHome /></Protected>} />
            <Route path="/resident/report" element={<Protected roles={R}><ReportType /></Protected>} />
            <Route path="/resident/report/:type" element={<Protected roles={R}><ReportDetails /></Protected>} />
            <Route path="/resident/sos/:id" element={<Protected roles={R}><Tracker /></Protected>} />
            <Route path="/resident/reports" element={<Protected roles={R}><Reports /></Protected>} />
            <Route path="/resident/notices" element={<Protected roles={R}><ResidentNotices /></Protected>} />
            <Route path="/resident/contacts" element={<Protected roles={R}><Contacts /></Protected>} />

            {/* Responder */}
            <Route path="/responder" element={<Protected roles={['responder']}><Alerts /></Protected>} />
            <Route path="/responder/checks" element={<Protected roles={S}><Checks /></Protected>} />
            <Route path="/responder/assets" element={<Protected roles={S}><Assets /></Protected>} />
            <Route path="/responder/history" element={<Protected roles={S}><History /></Protected>} />

            {/* Shared staff */}
            <Route path="/incident/:id" element={<Protected roles={S}><IncidentDetail /></Protected>} />

            {/* Admin */}
            <Route path="/admin" element={<Protected roles={A}><Overview /></Protected>} />
            <Route path="/admin/incidents" element={<Protected roles={A}><Incidents /></Protected>} />
            <Route path="/admin/team" element={<Protected roles={A}><Team /></Protected>} />
            <Route path="/admin/society" element={<Protected roles={A}><Society /></Protected>} />
            <Route path="/admin/insights" element={<Protected roles={A}><Insights /></Protected>} />
            <Route path="/admin/notices" element={<Protected roles={A}><AdminNotices /></Protected>} />
            <Route path="/admin/safety-check" element={<Protected roles={A}><SafetyCheck /></Protected>} />
            <Route path="/board" element={<Protected roles={S}><Board /></Protected>} />

            {/* Old campus URLs */}
            <Route path="/student/*" element={<Navigate to="/resident" replace />} />
            <Route path="/settings" element={<Navigate to="/profile" replace />} />
            <Route path="/map" element={<Navigate to="/" replace />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </>
  );
}

function LocalizedApp() {
  const { profile, refreshProfile } = useAuth();
  const persist = async (lang) => {
    if (!profile) return;
    try {
      await updateMyProfile({ language: lang });
      refreshProfile();
    } catch (err) {
      console.error('Could not save language:', err);
    }
  };
  return (
    <I18nProvider profileLanguage={profile?.language} onPersist={persist}>
      <DialogProvider>
        <ToastProvider>
          <AppRoutes />
          <ToastContainer />
        </ToastProvider>
      </DialogProvider>
    </I18nProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LocalizedApp />
      </AuthProvider>
    </BrowserRouter>
  );
}
