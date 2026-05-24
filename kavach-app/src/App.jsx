import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { DialogProvider } from './context/DialogContext';
import ToastContainer from './components/ToastContainer';
import ConnectionBanner from './components/ConnectionBanner';

import Login from './screens/Login';
import StudentHome from './screens/StudentHome';
import ReportForm from './screens/ReportForm';
import IncidentTracker from './screens/IncidentTracker';
import MyReports from './screens/MyReports';
import ResponderAlerts from './screens/ResponderAlerts';
import AdminDashboard from './screens/AdminDashboard';
import Settings from './screens/Settings';
import CampusMap from './screens/CampusMap';
import NotFound from './screens/NotFound';

/**
 * Higher-order component to protect routes based on authentication and roles.
 * @param {Object} props - Component props.
 * @param {React.ReactNode} props.children - The child components to render if authorized.
 * @param {string} [props.allowedRole] - The specific role required to access this route.
 * @returns {React.ReactNode} The protected content or a redirect.
 */
function ProtectedRoute({ children, allowedRole }) {
  const { user, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="material-symbols-outlined notranslate" style={{ fontSize: '3rem', animation: 'pulse 2s infinite', color: 'var(--primary)' }}>
          shield
        </span>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRole && userProfile?.role?.toLowerCase() !== allowedRole.toLowerCase()) {
    return <Navigate to={`/${userProfile?.role?.toLowerCase() || 'student'}`} replace />;
  }

  return children;
}

/**
 * Handles all application routing and layout wrappers.
 * @returns {React.ReactNode} The rendered routes.
 */
function AppRoutes() {
  const { user, userProfile } = useAuth();
  const defaultRoute = userProfile?.role ? `/${userProfile.role.toLowerCase()}` : '/student';

  return (
    <div style={{ maxWidth: '430px', margin: '0 auto', minHeight: '100dvh', position: 'relative', background: 'var(--bg)' }}>
      <ConnectionBanner />
      <Routes>
        <Route path="/" element={<Navigate to={user ? defaultRoute : "/login"} replace />} />
        <Route path="/login" element={user ? <Navigate to={defaultRoute} replace /> : <Login />} />

        {/* Student Routes */}
        <Route path="/student" element={<ProtectedRoute><StudentHome /></ProtectedRoute>} />
        <Route path="/student/report/:type" element={<ProtectedRoute><ReportForm /></ProtectedRoute>} />
        <Route path="/student/tracker/:id" element={<ProtectedRoute><IncidentTracker /></ProtectedRoute>} />
        <Route path="/student/reports" element={<ProtectedRoute><MyReports /></ProtectedRoute>} />

        {/* Responder Routes */}
        <Route path="/responder" element={<ProtectedRoute allowedRole="Responder"><ResponderAlerts /></ProtectedRoute>} />

        {/* Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute allowedRole="Admin"><AdminDashboard /></ProtectedRoute>} />

        {/* Shared Routes */}
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/map" element={<ProtectedRoute><CampusMap /></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

/**
 * Root application component that initializes global providers.
 * @returns {React.ReactNode} The complete application tree.
 */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DialogProvider>
          <ToastProvider>
            <AppRoutes />
            <ToastContainer />
          </ToastProvider>
        </DialogProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
