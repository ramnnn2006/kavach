import { useId, useState } from 'react';
import { Button, Field, Segmented } from '../../../components/ui';
import { errorMessage, setAssetStatus } from '../../../data/db';
import { ASSET_STATE_ORDER } from '../../../data/responder';
import { useToast } from '../../../context/ToastContext';
import { useT } from '../../../i18n';
import { timeAgo } from '../../../utils/time';
import FormDialog from './FormDialog';

// Change an asset's state (ok / degraded / down / maintenance) with an optional note.
export default function AssetDialog({ asset, now, onClose }) {
  const { t } = useT();
  const { showToast } = useToast();
  const [state, setState] = useState(asset.state);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const noteId = useId();
  const stateLabelId = useId();

  const changed = asset.state_changed_at
    ? (asset.changed_by?.full_name
      ? t('responder.changedBy', { ago: timeAgo(asset.state_changed_at, now, t), name: asset.changed_by.full_name })
      : t('responder.changedAgo', { ago: timeAgo(asset.state_changed_at, now, t) }))
    : t('responder.neverChanged');

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (state === asset.state && !note.trim()) { onClose(); return; }
    setBusy(true);
    try {
      await setAssetStatus(asset.id, state, note.trim());
      showToast(t('responder.assetSavedToast', { name: asset.name, state: t(`responder.assetState_${state}`) }), 'success');
      onClose();
    } catch (err) {
      showToast(errorMessage(err, t), 'error');
      setBusy(false);
    }
  };

  return (
    <FormDialog title={asset.name} text={changed} onClose={onClose} busy={busy}>
      <form onSubmit={submit} className="stack">
        <div className="field">
          <p className="field__label" id={stateLabelId}>{t('responder.assetStateLabel')}</p>
          <div className="rsp-segmented-grid">
            <Segmented
              label={t('responder.assetStateLabel')}
              value={state}
              onChange={setState}
              options={ASSET_STATE_ORDER.map(s => ({ value: s, label: t(`responder.assetState_${s}`) }))}
            />
          </div>
        </div>
        <Field label={t('responder.assetNoteLabel')} htmlFor={noteId} hint={asset.notes || undefined}>
          <textarea
            id={noteId}
            className="textarea"
            rows={2}
            maxLength={500}
            value={note}
            placeholder={t('responder.assetNotePlaceholder')}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
        <div className="dialog__actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>{t('common.cancel')}</Button>
          <Button type="submit" loading={busy}>{t('common.save')}</Button>
        </div>
      </form>
    </FormDialog>
  );
}
