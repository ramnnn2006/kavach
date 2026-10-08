import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '../i18n';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])';

export default function ConfirmDialog({ title, message, confirmLabel, destructive, onConfirm, onCancel }) {
  const { t } = useT();
  const cancelRef = useRef(null);
  const dialogRef = useRef(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const previous = document.activeElement;
    cancelRef.current?.focus();
    const node = dialogRef.current;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation(); // don't also close a form dialog underneath
        onCancel();
      }
      if (e.key === 'Tab' && node) {
        const items = [...node.querySelectorAll(FOCUSABLE)];
        if (!items.length) { e.preventDefault(); node.focus(); return; }
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === node)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
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
      <div ref={dialogRef} tabIndex={-1} className="dialog fade-in" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-text">
        <h2 id="dialog-title" className="dialog__title">{title}</h2>
        <p id="dialog-text" className="dialog__text">{message}</p>
        <div className="dialog__actions">
          <button ref={cancelRef} className="btn btn--secondary" onClick={onCancel} disabled={busy}>{t('common.cancel')}</button>
          <button className={`btn ${destructive ? 'btn--danger' : 'btn--primary'}`} onClick={handleConfirm} disabled={busy}>
            {confirmLabel || t('common.confirm')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
