import { useId, useState } from 'react';
import { Button, Field } from '../../../components/ui';
import { useT } from '../../../i18n';
import FormDialog from './FormDialog';

/**
 * Confirm with an optional note. `onConfirm(note)` resolves true to close, false to stay open.
 */
export default function NoteDialog({
  title, text, label, placeholder, confirmLabel, cancelLabel, destructive, variant, onConfirm, onClose, maxLength = 500,
}) {
  const { t } = useT();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const id = useId();

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const ok = await onConfirm(note.trim());
    if (ok) onClose();
    else setBusy(false);
  };

  return (
    <FormDialog title={title} text={text} onClose={onClose} busy={busy}>
      <form onSubmit={submit} className="stack">
        <Field label={label} htmlFor={id}>
          <textarea
            id={id}
            className="textarea"
            value={note}
            maxLength={maxLength}
            placeholder={placeholder}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
          />
        </Field>
        <div className="dialog__actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            {cancelLabel || t('common.cancel')}
          </Button>
          <Button type="submit" variant={destructive ? 'danger' : variant || 'primary'} loading={busy}>
            {confirmLabel}
          </Button>
        </div>
      </form>
    </FormDialog>
  );
}
