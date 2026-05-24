import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function NotFound() {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();

  const handleBackToSafety = () => {
    if (user) {
      const defaultRoute = userProfile?.role ? `/${userProfile.role.toLowerCase()}` : '/student';
      navigate(defaultRoute);
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="page fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', padding: '1.5rem', textAlign: 'center' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '400px', padding: '3rem 2rem', position: 'relative', overflow: 'hidden' }}>
        
        {/* Neon Backdrop Glow */}
        <div style={{ position: 'absolute', top: '-20%', left: '-20%', width: '140%', height: '60%', background: 'radial-gradient(circle, rgba(239, 68, 68, 0.08) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

        {/* Broken Shield / Alert Icon */}
        <div style={{
          width: '5.5rem', height: '5.5rem', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem',
          border: '2px solid rgba(239, 68, 68, 0.15)', zIndex: 1
        }}>
          <span className="material-symbols-outlined notranslate" style={{ fontSize: '3rem', color: 'var(--sos-red)', animation: 'pulse 3s infinite' }}>explore_off</span>
        </div>

        {/* 404 Badge */}
        <div style={{ display: 'inline-block', padding: '0.25rem 0.75rem', borderRadius: '9999px', background: 'rgba(239, 68, 68, 0.12)', color: 'var(--sos-red)', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.05em', marginBottom: '1rem', textTransform: 'uppercase' }}>
          Error Code: 404
        </div>

        {/* Headline */}
        <h1 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.75rem', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
          Area Unsecured
        </h1>

        {/* Description */}
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '2rem' }}>
          You have wandered outside the secured perimeter. This page does not exist or has been relocated for safety protocols.
        </p>

        {/* Action Button */}
        <button
          onClick={handleBackToSafety}
          className="btn btn-primary"
          style={{ background: 'var(--primary)', boxShadow: '0 4px 14px rgba(59, 130, 246, 0.2)' }}
        >
          <span className="material-symbols-outlined notranslate" style={{ fontSize: '1.25rem' }}>shield</span>
          Return to Safety
        </button>
      </div>

      {/* Small footer */}
      <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2rem', fontWeight: 500, letterSpacing: '0.05em' }}>
        KAVACH APP SECURITY CENTER
      </p>
    </div>
  );
}
