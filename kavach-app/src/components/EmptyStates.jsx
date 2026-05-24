import React from 'react';

const baseStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  padding: '3rem 1.5rem',
  gap: '0.75rem',
};

const iconStyle = {
  fontSize: '3rem',
  lineHeight: 1,
  marginBottom: '0.5rem',
};

const headingStyle = {
  fontSize: '1.125rem',
  fontWeight: '700',
  color: 'var(--text-main, #0f172a)',
  margin: 0,
};

const descStyle = {
  fontSize: '0.875rem',
  color: 'var(--text-muted, #64748b)',
  margin: 0,
  maxWidth: '260px',
  lineHeight: '1.6',
};

const btnStyle = {
  marginTop: '0.75rem',
  padding: '0.65rem 1.5rem',
  borderRadius: '0.625rem',
  border: 'none',
  fontWeight: '600',
  fontSize: '0.875rem',
  cursor: 'pointer',
  fontFamily: 'inherit',
  background: 'var(--primary, #3b82f6)',
  color: '#fff',
  transition: 'opacity 0.2s ease',
};

export function EmptyStudentReports({ onAction }) {
  return (
    <div style={baseStyle}>
      <span style={iconStyle}>🛡️</span>
      <h2 style={headingStyle}>No Reports Yet</h2>
      <p style={descStyle}>
        You haven't reported any incidents yet. Stay safe!
      </p>
      {onAction && (
        <button
          style={btnStyle}
          onClick={onAction}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          Report an Incident
        </button>
      )}
    </div>
  );
}

export function EmptyResponderAlerts({ onAction }) {
  return (
    <div style={baseStyle}>
      <span style={iconStyle}>✅</span>
      <h2 style={headingStyle}>All Clear</h2>
      <p style={descStyle}>
        No active incidents. Great job keeping the campus safe!
      </p>
      {onAction && (
        <button
          style={{ ...btnStyle, background: 'var(--success, #22c55e)' }}
          onClick={onAction}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          View History
        </button>
      )}
    </div>
  );
}

export function EmptyAdminDashboard({ onAction }) {
  return (
    <div style={baseStyle}>
      <span style={iconStyle}>🏫</span>
      <h2 style={headingStyle}>Campus is Safe</h2>
      <p style={descStyle}>
        0 active incidents. Everything is under control.
      </p>
      {onAction && (
        <button
          style={{ ...btnStyle, background: 'var(--primary, #3b82f6)' }}
          onClick={onAction}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          View Full Report
        </button>
      )}
    </div>
  );
}
