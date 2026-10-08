import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function ConfirmDialog({ title, message, confirmLabel = 'Confirm', destructive, onConfirm, onCancel }) {
  const cancelRef = useRef(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const previous = document.activeElement;
    cancelRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [onCancel]);

  const handleConfirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="dialog-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="dialog fade-in" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-text">
        <h2 id="dialog-title" className="dialog__title">{title}</h2>
        <p id="dialog-text" className="dialog__text">{message}</p>
        <div className="dialog__actions">
          <button ref={cancelRef} className="btn btn--secondary" onClick={onCancel} disabled={busy}>Cancel</button>
          <button className={`btn ${destructive ? 'btn--danger' : 'btn--primary'}`} onClick={handleConfirm} disabled={busy}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
