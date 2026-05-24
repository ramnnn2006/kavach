import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function ConfirmDialog({ title, message, onConfirm, onCancel }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  const handleBackdropClick = (e) => {
    if (e.target === overlayRef.current) onCancel();
  };

  return createPortal(
    <div
      ref={overlayRef}
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div 
        className="glass-card fade-up"
        style={{
          width: '100%',
          maxWidth: '400px',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <h3 id="dialog-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700' }}>
          {title}
        </h3>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          {message}
        </p>
        
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button className="btn btn-outline" onClick={onCancel} style={{ flex: 1 }}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={onConfirm} style={{ flex: 1 }}>
            Confirm
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
