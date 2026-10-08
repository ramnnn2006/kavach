// Society → Assets: lifts, DG, pumps grouped by zone; tap to change state with a note.
import { useState } from 'react';
import { ChevronRight, Cog } from 'lucide-react';
import { Badge, Button, EmptyState, Field } from '../../../components/ui';
import { ASSET_STATES } from '../../../config/society';
import { errorMessage, listenAssets, listenZones, setAssetStatus } from '../../../data/db';
import { useToast } from '../../../context/ToastContext';
import { useT } from '../../../i18n';
import { timeAgo } from '../../../utils/time';
import { useLive, useNow } from './hooks';
import { assetKind } from './assetKinds';
import { IconTile, LoadError, Loading, Sheet } from './ui';

const STATES = ['ok', 'degraded', 'down', 'maintenance'];

function AssetSheet({ asset, onClose }) {
  const { t } = useT();
  const { showToast } = useToast();
  const [state, setState] = useState(asset.state);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      await setAssetStatus(asset.id, state, note.trim());
      showToast(t('admin.assetSaved', { name: asset.name, state: t(`admin.asset_${state}`) }), 'success');
      onClose();
    } catch (err) {
      const msg = errorMessage(err, t);
      setError(msg);
      showToast(msg, 'error');
      setBusy(false);
    }
  };

  return (
    <Sheet
      title={asset.name}
      subtitle={[t(`admin.assetKind_${asset.kind}`), asset.zone?.name, asset.vendor].filter(Boolean).join(' · ')}
      onClose={onClose}
      busy={busy}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>{t('common.cancel')}</Button>
          <Button onClick={save} loading={busy} disabled={state === asset.state && !note.trim()}>{t('common.save')}</Button>
        </>
      )}
    >
      <div className="stack">
        <fieldset className="admin-fieldset">
          <legend className="field__label">{t('admin.assetState')}</legend>
          <div className="card settings-group">
            {STATES.map(s => (
              <label key={s} className="settings-row admin-check" htmlFor={`asset-${asset.id}-${s}`}>
                <span className="admin-state-dot" style={{ '--tone': ASSET_STATES[s].tone }} aria-hidden="true" />
                <span className="grow">
                  <span className="semibold">{t(`admin.asset_${s}`)}</span>
                  <span className="admin-check__hint">{t(`admin.assetHint_${s}`)}</span>
                </span>
                <input
                  id={`asset-${asset.id}-${s}`}
                  type="radio"
                  name={`asset-state-${asset.id}`}
                  className="admin-checkbox"
                  checked={state === s}
                  onChange={() => setState(s)}
                />
              </label>
            ))}
          </div>
        </fieldset>
        {asset.notes && <p className="text-sm muted">{t('admin.currentNote', { note: asset.notes })}</p>}
        <Field label={t('admin.assetNote')} htmlFor={`asset-note-${asset.id}`} hint={t('admin.assetNoteHint')}>
          <textarea
            id={`asset-note-${asset.id}`}
            className="textarea admin-input"
            value={note}
            maxLength={500}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
        {error && <p className="field__error" role="alert">{error}</p>}
      </div>
    </Sheet>
  );
}

export default function AssetsPanel() {
  const { t } = useT();
  const now = useNow(60000);
  const assets = useLive((ok, err) => listenAssets(ok, err), 'assets');
  const zones = useLive((ok, err) => listenZones(ok, err), 'zones');
  const [editing, setEditing] = useState(null);

  const list = assets.data || [];
  const notOk = list.filter(a => a.state !== 'ok').length;
  const order = new Map((zones.data || []).map((z, i) => [z.id, i]));
  const groups = [];
  for (const a of list) {
    const key = a.zone_id || 'none';
    let g = groups.find(x => x.key === key);
    if (!g) {
      g = { key, name: a.zone?.name || t('admin.noZone'), rank: order.get(a.zone_id) ?? 999, items: [] };
      groups.push(g);
    }
    g.items.push(a);
  }
  groups.sort((a, b) => a.rank - b.rank);

  return (
    <div className="stack">
      {assets.error && <LoadError error={assets.error} onRetry={assets.retry} />}
      {assets.loading && <Loading />}
      {assets.data && (
        <p className={`text-sm ${notOk ? 'admin-warn-text' : 'muted'}`}>
          {notOk ? t('admin.assetsNotOk', { n: notOk, total: list.length }) : t('admin.assetsAllOk', { total: list.length })}
        </p>
      )}
      {assets.data && list.length === 0 && (
        <div className="card"><EmptyState icon={Cog} title={t('admin.noAssets')} text={t('admin.noAssetsText')} /></div>
      )}
      {groups.map(g => (
        <section key={g.key} aria-label={g.name}>
          <h2 className="section-title">{g.name}</h2>
          <div className="card settings-group">
            {g.items.map(a => {
              const kind = assetKind(a.kind);
              return (
                <button key={a.id} type="button" className="settings-row admin-asset" onClick={() => setEditing(a)}>
                  <IconTile icon={kind.icon} tone={kind.tone} />
                  <span className="grow admin-asset__body">
                    <span className="semibold">{a.name}</span>
                    <span className="admin-asset__meta">
                      {[t(`admin.assetKind_${a.kind}`), a.vendor].filter(Boolean).join(' · ')}
                      {a.state_changed_at && ` · ${t('admin.changedAgo', { when: timeAgo(a.state_changed_at, now, t) })}`}
                    </span>
                    {a.notes && a.state !== 'ok' && <span className="admin-asset__note">{a.notes}</span>}
                  </span>
                  <Badge tone={ASSET_STATES[a.state]?.tone}>{t(`admin.asset_${a.state}`)}</Badge>
                  <ChevronRight size={18} className="admin-chevron" aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </section>
      ))}
      {editing && <AssetSheet asset={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
