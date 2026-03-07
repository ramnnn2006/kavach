import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './screens/Login';
import StudentHome from './screens/StudentHome';
import ReportForm from './screens/ReportForm';
import IncidentTracker from './screens/IncidentTracker';
import MyReports from './screens/MyReports';
import ResponderAlerts from './screens/ResponderAlerts';
import AdminDashboard from './screens/AdminDashboard';
import Settings from './screens/Settings';
import CampusMap from './screens/CampusMap';
function ProtectedRoute({ children, allowedRole }) {
  const { user, userProfile, loading } = useAuth();
  if (loading) return <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="material-symbols-outlined notranslate notranslate" style={{ fontSize: '3rem', animation: 'pulse 2s infinite', color: 'var(--primary)' }}>shield</span></div>;
  if (!user) return <Navigate to="/login" />;
  if (allowedRole && userProfile?.role !== allowedRole) return <Navigate to={`/${userProfile?.role || 'student'}`} />;
  return children;
}

function AppRoutes() {
  const { user, userProfile } = useAuth();


  return (
    <div style={{ maxWidth: '430px', margin: '0 auto', minHeight: '100dvh', position: 'relative', background: 'var(--bg)' }}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to={`/${userProfile?.role || 'student'}`} /> : <Login />} />

        {/* Student */}
        <Route path="/student" element={<ProtectedRoute><StudentHome /></ProtectedRoute>} />
        <Route path="/student/report/:type" element={<ProtectedRoute><ReportForm /></ProtectedRoute>} />
        <Route path="/student/tracker/:id" element={<ProtectedRoute><IncidentTracker /></ProtectedRoute>} />
        <Route path="/student/reports" element={<ProtectedRoute><MyReports /></ProtectedRoute>} />

        {/* Responder */}
        <Route path="/responder" element={<ProtectedRoute><ResponderAlerts /></ProtectedRoute>} />

        {/* Admin */}
        <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />

        {/* Settings & Global Map */}
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/map" element={<ProtectedRoute><CampusMap /></ProtectedRoute>} />

        {/* Default */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
