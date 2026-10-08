import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Cog, TriangleAlert, CircleCheck } from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import { AlertBanner, Badge, Card, EmptyState, PageHeader, Spinner, TypeIcon } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { ASSET_STATES } from '../../config/society';
import { assetSpecialty, covers, listenAssetsDetailed } from '../../data/responder';
import { useT } from '../../i18n';
import { timeAgo } from '../../utils/time';
import AssetDialog from './parts/AssetDialog';
import LoadError from './parts/LoadError';
import { daysUntil, shortDate, specialtySummary } from './parts/format';
import { useNow } from './parts/useNow';
import '../../styles/responder.css';

const WARN_DAYS = 30;

// AMC / licence warnings within 30 days or already past
function expiryBadges(asset, t, lang, now) {
  const out = [];
  for (const [field, past, soon] of [
    ['amc_expires_on', 'responder.amcExpired', 'responder.amcExpires'],
    ['licence_expires_on', 'responder.licenceExpired', 'responder.licenceExpires'],
  ]) {
    const days = daysUntil(asset[field], now);
    if (days == null || days > WARN_DAYS) continue;
    const date = shortDate(asset[field], lang, now);
    out.push(days < 0
      ? { key: field, tone: 'var(--red)', text: t(past, { date }) }
      : { key: field, tone: 'var(--orange)', text: t(soon, { date }) });
  }
  return out;
}

export default function Assets() {
  const { t, lang } = useT();
  const { profile } = useAuth();
  const now = useNow(60000);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => listenAssetsDetailed(
    (data) => { setRows(data || []); setError(null); },
    (err) => setError(err),
  ), [attempt]);

  const mine = useMemo(() => (rows || []).filter(a => covers(profile, assetSpecialty(a))), [rows, profile]);

  const groups = useMemo(() => {
    const byZone = new Map();
    for (const a of mine) {
      const key = a.zone?.id || 'none';
      if (!byZone.has(key)) byZone.set(key, { key, name: a.zone?.name, order: a.zone?.sort_order ?? 9999, items: [] });
      byZone.get(key).items.push(a);
    }
    return [...byZone.values()].sort((a, b) => a.order - b.order || (a.name || '').localeCompare(b.name || ''));
  }, [mine]);

  const attention = mine.filter(a => a.state === 'down' || a.state === 'degraded').length;
  const editing = editingId ? mine.find(a => a.id === editingId) : null;

  return (
    <main className="page">
      <PageHeader eyebrow={specialtySummary(profile, t)} title={t('responder.assetsTitle')} />

      <div className="stack">
        {error && (
          <LoadError title={t('responder.assetsLoadError')} error={error} onRetry={() => { setError(null); setAttempt(a => a + 1); }} />
        )}

        {rows === null && !error && <div className="rsp-center"><Spinner large label={t('common.loading')} /></div>}

        {rows !== null && mine.length === 0 && (
          <Card>
            <EmptyState icon={Cog} title={t('responder.assetsEmptyTitle')} text={t('responder.assetsEmptyText')} />
          </Card>
        )}

        {mine.length > 0 && (attention > 0
          ? <AlertBanner tone="var(--orange)" icon={TriangleAlert}>{t('responder.needAttention', { n: attention })}</AlertBanner>
          : <AlertBanner tone="var(--green)" icon={CircleCheck}>{t('responder.allWorking')}</AlertBanner>)}

        {groups.map(group => (
          <section key={group.key} aria-labelledby={`rsp-zone-${group.key}`}>
            <h2 id={`rsp-zone-${group.key}`} className="section-title">{group.name || t('responder.otherZone')}</h2>
            <Card className="settings-group">
              {group.items.map(asset => {
                const stateTone = ASSET_STATES[asset.state]?.tone || 'var(--gray)';
                const stateText = t(`responder.assetState_${asset.state}`);
                const warnings = expiryBadges(asset, t, lang, now);
                return (
                  <button
                    key={asset.id}
                    type="button"
                    className="settings-row rsp-asset"
                    onClick={() => setEditingId(asset.id)}
                    aria-label={`${t('responder.editAsset', { name: asset.name })}. ${stateText}`}
                  >
                    <TypeIcon type={assetSpecialty(asset)} size="sm" />
                    <span className="grow">
                      <span className="list-row__title rsp-block">{asset.name}</span>
                      <span className="list-row__meta rsp-block">
                        {[t(`responder.assetKind_${asset.kind}`), asset.vendor].filter(Boolean).join(' · ')}
                      </span>
                      <span className="rsp-badges rsp-badges--tight">
                        <Badge tone={stateTone}>{stateText}</Badge>
                        {warnings.map(w => <Badge key={w.key} tone={w.tone}>{w.text}</Badge>)}
                      </span>
                      {asset.notes && <span className="list-row__meta rsp-block rsp-clamp">{asset.notes}</span>}
                      {asset.state_changed_at && (
                        <span className="rsp-asset__changed rsp-block">
                          {asset.changed_by?.full_name
                            ? t('responder.changedBy', { ago: timeAgo(asset.state_changed_at, now, t), name: asset.changed_by.full_name })
                            : t('responder.changedAgo', { ago: timeAgo(asset.state_changed_at, now, t) })}
                        </span>
                      )}
                    </span>
                    <ChevronRight size={18} className="rsp-chevron" aria-hidden="true" />
                  </button>
                );
              })}
            </Card>
          </section>
        ))}
      </div>

      {editing && <AssetDialog asset={editing} now={now} onClose={() => setEditingId(null)} />}

      <BottomNav />
    </main>
  );
}
