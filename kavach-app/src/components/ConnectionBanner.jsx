import React from 'react';
import useNetworkStatus from '../hooks/useNetworkStatus';

export default function ConnectionBanner() {
  const { isOnline } = useNetworkStatus();

  if (isOnline) return null;

  return (
    <div style={{
      background: 'var(--sos-red, #ef4444)',
      color: 'white',
      textAlign: 'center',
      padding: '0.75rem',
      fontSize: '0.875rem',
      fontWeight: '600',
      position: 'sticky',
      top: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    }}>
      <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>wifi_off</span>
      ⚠️ Connection lost. Retrying...
    </div>
  );
}
