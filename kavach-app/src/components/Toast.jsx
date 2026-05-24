import React, { useEffect, useState } from 'react';

const COLORS = {
  success: {
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.35)',
    icon: '#10b981',
    bar: '#10b981',
  },
  error: {
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.35)',
    icon: '#ef4444',
    bar: '#ef4444',
  },
  info: {
    bg: 'rgba(99, 102, 241, 0.12)',
    border: 'rgba(99, 102, 241, 0.35)',
    icon: '#6366f1',
    bar: '#6366f1',
  },
};

const ICONS = {
  success: '✓',
  error: '✕',
  info: 'i',
};

export default function Toast({ id, message, type = 'info', onDismiss }) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const c = COLORS[type] || COLORS.info;

  useEffect(() => {
    const enter = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(enter);
  }, []);

  function handleDismiss() {
    setLeaving(true);
    setTimeout(() => onDismiss(id), 280);
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '0.85rem 1rem',
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: '12px',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        minWidth: '280px',
        maxWidth: '360px',
        position: 'relative',
        overflow: 'hidden',
        transform: visible && !leaving ? 'translateX(0) scale(1)' : 'translateX(40px) scale(0.95)',
        opacity: visible && !leaving ? 1 : 0,
        transition: 'transform 0.28s cubic-bezier(0.34,1.56,0.64,1), opacity 0.28s ease',
      }}
    >
      {/* Progress bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: '2px',
          width: '100%',
          background: c.bar,
          opacity: 0.5,
          transformOrigin: 'left',
          animation: 'toastProgress 4s linear forwards',
        }}
      />

      {/* Icon badge */}
      <div
        style={{
          flexShrink: 0,
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          background: c.border,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: type === 'info' ? '0.6rem' : '0.7rem',
          fontWeight: '800',
          color: c.icon,
          marginTop: '1px',
        }}
      >
        {ICONS[type]}
      </div>

      {/* Message */}
      <p
        style={{
          margin: 0,
          flex: 1,
          fontSize: '0.875rem',
          color: 'var(--text-main, #f1f5f9)',
          lineHeight: '1.5',
          wordBreak: 'break-word',
        }}
      >
        {message}
      </p>

      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        aria-label="Dismiss notification"
        style={{
          flexShrink: 0,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'rgba(241,245,249,0.45)',
          fontSize: '1rem',
          lineHeight: 1,
          padding: '0 2px',
          marginTop: '1px',
          transition: 'color 0.15s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(241,245,249,0.9)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(241,245,249,0.45)')}
      >
        ✕
      </button>

      <style>{`
        @keyframes toastProgress {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
      `}</style>
    </div>
  );
}
