import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

// Modal shell with the shared .dialog look, left-aligned for forms and lists.
export default function FormDialog({ title, text, onClose, busy, wide, children }) {
  const ref = useRef(null);
  const titleId = useId();
  const textId = useId();

  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.focus();
    return () => previous?.focus?.();
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  return createPortal(
    <div className="dialog-overlay" onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div
        ref={ref}
        tabIndex={-1}
        className={`dialog rsp-dialog fade-in${wide ? ' rsp-dialog--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={text ? textId : undefined}
      >
        <h2 id={titleId} className="dialog__title">{title}</h2>
        {text && <p id={textId} className="dialog__text">{text}</p>}
        {children}
      </div>
    </div>,
    document.body,
  );
}
