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
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-6px) rotate(1deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.96) rotate(0deg); opacity: 0.25; }
          50% { transform: scale(1.04) rotate(180deg); opacity: 0.55; }
          100% { transform: scale(0.96) rotate(360deg); opacity: 0.25; }
        }
      `}</style>
      <div className="glass-card" style={{ width: '100%', maxWidth: '400px', padding: '3rem 2rem', position: 'relative', overflow: 'hidden' }}>
        
        {/* Neon Backdrop Glow */}
        <div style={{ position: 'absolute', top: '-20%', left: '-20%', width: '140%', height: '60%', background: 'radial-gradient(circle, rgba(239, 68, 68, 0.08) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

        {/* Broken Shield / Alert Icon */}
        <div style={{
          width: '6.5rem', height: '6.5rem', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.04)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem',
          border: '1.5px solid rgba(239, 68, 68, 0.12)', zIndex: 1, position: 'relative'
        }}>
          <svg width="68" height="68" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ animation: 'float 4s ease-in-out infinite' }}>
            <defs>
              <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#EF4444" />
                <stop offset="100%" stopColor="#B91C1C" />
              </linearGradient>
              <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            
            {/* Pulsing outer radar ring */}
            <circle cx="32" cy="32" r="28" stroke="#EF4444" strokeWidth="1.5" strokeOpacity="0.3" strokeDasharray="4 4" style={{ animation: 'pulse-ring 6s linear infinite', transformOrigin: 'center' }} />
            
            {/* Inner radar grid lines */}
            <circle cx="32" cy="32" r="20" stroke="#EF4444" strokeWidth="1" strokeOpacity="0.15" />
            <line x1="32" y1="12" x2="32" y2="52" stroke="#EF4444" strokeWidth="1" strokeOpacity="0.1" />
            <line x1="12" y1="32" x2="52" y2="32" stroke="#EF4444" strokeWidth="1" strokeOpacity="0.1" />

            {/* Main warning shield illustration */}
            <path d="M32 16L46 22V34C46 42.5 39.5 48 32 50C24.5 48 18 42.5 18 34V22L32 16Z" fill="url(#shieldGrad)" filter="url(#neonGlow)" opacity="0.95" />
            
            {/* Shield overlay outline */}
            <path d="M32 18L44 23.2V34C44 41.3 38.6 46 32 47.8C25.4 46 20 41.3 20 34V23.2L32 18Z" stroke="#FFF" strokeWidth="1.2" strokeOpacity="0.5" />

            {/* Bold warning exclamation mark inside the shield */}
            <rect x="30" y="24" width="4" height="12" rx="2" fill="white" />
            <circle cx="32" cy="40" r="2" fill="white" />
          </svg>
        </div>

        {/* 404 Badge */}
        <div style={{ display: 'inline-block', padding: '0.25rem 0.75rem', borderRadius: '9999px', background: 'rgba(239, 68, 68, 0.12)', color: 'var(--sos-red)', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.05em', marginBottom: '1rem', textTransform: 'uppercase' }}>
          404 Error
        </div>

        {/* Headline */}
        <h1 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.75rem', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
          Page Not Found
        </h1>

        {/* Description */}
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '2rem' }}>
          The page you are trying to access doesn't exist. It might have been moved or deleted.
        </p>

        {/* Action Button */}
        <button
          onClick={handleBackToSafety}
          className="btn btn-primary"
          style={{ background: 'var(--primary)', boxShadow: '0 4px 14px rgba(59, 130, 246, 0.2)' }}
        >
          <span className="material-symbols-outlined notranslate" style={{ fontSize: '1.25rem' }}>home</span>
          Back to Dashboard
        </button>
      </div>

      {/* Small footer */}
      <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2rem', fontWeight: 500, letterSpacing: '0.05em' }}>
        KAVACH SAFETY
      </p>
    </div>
  );
}
