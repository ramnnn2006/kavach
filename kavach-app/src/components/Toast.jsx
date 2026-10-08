import { CircleCheck, CircleAlert, Info, X } from 'lucide-react';

const KINDS = {
  success: { icon: CircleCheck, tone: 'var(--green)' },
  error: { icon: CircleAlert, tone: 'var(--red)' },
  info: { icon: Info, tone: 'var(--blue)' },
};

export default function Toast({ id, message, type = 'info', onDismiss }) {
  const { icon: Icon, tone } = KINDS[type] || KINDS.info;
  return (
    <div className="toast" style={{ '--tone': tone }} role={type === 'error' ? 'alert' : 'status'}>
      <Icon size={18} aria-hidden="true" />
      <p className="toast__msg">{message}</p>
      <button className="toast__close" onClick={() => onDismiss(id)} aria-label="Dismiss">
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
