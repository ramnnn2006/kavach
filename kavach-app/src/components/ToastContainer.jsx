import React, { useContext } from 'react';
import { createPortal } from 'react-dom';
import { ToastContext } from '../context/ToastContext';
import Toast from './Toast';

export default function ToastContainer() {
  const ctx = useContext(ToastContext);
  if (!ctx) return null;
  const { toasts, dismiss } = ctx;

  return createPortal(
    <div
      aria-live="polite"
      aria-atomic="false"
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem',
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => (
        <div key={toast.id} style={{ pointerEvents: 'auto' }}>
          <Toast
            id={toast.id}
            message={toast.message}
            type={toast.type}
            onDismiss={dismiss}
          />
        </div>
      ))}
    </div>,
    document.body
  );
}
