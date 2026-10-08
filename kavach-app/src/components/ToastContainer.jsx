import { useContext } from 'react';
import { createPortal } from 'react-dom';
import { ToastContext } from '../context/ToastContext';
import Toast from './Toast';

export default function ToastContainer() {
  const ctx = useContext(ToastContext);
  if (!ctx) return null;
  return createPortal(
    <div className="toasts">
      {ctx.toasts.map((t) => (
        <Toast key={t.id} id={t.id} message={t.message} type={t.type} onDismiss={ctx.dismiss} />
      ))}
    </div>,
    document.body
  );
}
