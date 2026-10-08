import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleCheck, LifeBuoy, Siren } from 'lucide-react';
import { Button } from '../../../components/ui';
import { errorMessage, listenActiveSafetyCheck, respondSafetyCheck } from '../../../data/db';
import { listenMySafetyResponse } from '../../../data/resident';
import { useToast } from '../../../context/ToastContext';
import { useT } from '../../../i18n';
import { clock, toMillis } from '../../../utils/time';
import { useLive } from './hooks';

// Safety Check roll call on Home: "I'm safe" / "I need help", then my answer with a Change link.
export default function SafetyCheckCard({ profile }) {
  const { t, lang } = useT();
  const { showToast } = useToast();
  const check = useLive(listenActiveSafetyCheck).data;

  const myZone = profile?.flat?.zone?.id || profile?.flat?.zone_id;
  const applies = !!check && (check.scope === 'society' || (check.scope === 'zone' && check.zone_id === myZone));
  const checkId = applies ? check.id : null;

  const subResponse = useCallback((ok, err) => listenMySafetyResponse(checkId, ok, err), [checkId]);
  const saved = useLive(checkId ? subResponse : null).data;

  const [busy, setBusy] = useState(null);
  const [changing, setChanging] = useState(false);
  const [local, setLocal] = useState(null); // RPC result, shown until realtime catches up

  if (!applies) return null;

  const localForThis = local?.check_id === checkId ? local : null;
  const answer = [saved, localForThis].filter(Boolean)
    .sort((a, b) => (toMillis(b.responded_at) || 0) - (toMillis(a.responded_at) || 0))[0] || null;
  const asking = !answer || changing;

  const respond = async (status) => {
    if (busy) return;
    setBusy(status);
    try {
      const row = await respondSafetyCheck(checkId, status);
      setLocal({ ...(row || {}), check_id: checkId, status, responded_at: row?.responded_at || new Date().toISOString() });
      setChanging(false);
    } catch (err) {
      showToast(errorMessage(err, t), 'error');
    } finally {
      setBusy(null);
    }
  };

  const safe = answer?.status === 'safe';
  const where = check.scope === 'zone' ? (check.zone?.name || '') : t('resident.scWholeSociety');

  return (
    <section
      className={`res-sc${asking ? '' : ' res-sc--answered'}`}
      style={{ '--tone': asking ? 'var(--red)' : safe ? 'var(--green)' : 'var(--orange)' }}
      aria-labelledby="res-sc-title"
    >
      <div className="res-sc__head">
        <span className="type-icon" style={{ '--tone': 'var(--red)' }} aria-hidden="true">
          <Siren size={22} />
        </span>
        <div className="grow">
          <p className="res-sc__eyebrow">{t('resident.scEyebrow')}</p>
          <h2 id="res-sc-title" className="res-sc__msg">{check.message}</h2>
          <p className="res-sc__meta">{[where, t('resident.scStarted', { time: clock(check.started_at, lang) })].filter(Boolean).join(' · ')}</p>
        </div>
      </div>

      {asking ? (
        <>
          <p className="res-sc__ask">{t('resident.scAsk')}</p>
          <div className="res-actions">
            <Button variant="success" size="lg" loading={busy === 'safe'} disabled={!!busy} onClick={() => respond('safe')}>
              <CircleCheck size={20} aria-hidden="true" />
              <span>{t('resident.scSafe')}</span>
            </Button>
            <Button variant="danger" size="lg" loading={busy === 'need_help'} disabled={!!busy} onClick={() => respond('need_help')}>
              <LifeBuoy size={20} aria-hidden="true" />
              <span>{t('resident.scNeedHelp')}</span>
            </Button>
          </div>
          {changing && (
            <Button variant="ghost" size="sm" onClick={() => setChanging(false)}>{t('resident.scKeep')}</Button>
          )}
        </>
      ) : (
        <div className="res-sc__answer" role="status">
          {safe
            ? <CircleCheck size={22} className="res-sc__answer-icon" aria-hidden="true" />
            : <LifeBuoy size={22} className="res-sc__answer-icon" aria-hidden="true" />}
          <div className="grow">
            <p className="semibold">
              {safe ? t('resident.scAnsweredSafe') : t('resident.scAnsweredHelp')}
              <span className="muted"> · {clock(answer.responded_at, lang)}</span>
            </p>
            {!safe && <p className="text-sm muted">{t('resident.scHelpComing')}</p>}
            {!safe && answer.incident_id && (
              <Link className="res-link" to={`/resident/sos/${answer.incident_id}`}>{t('resident.scTrackHelp')}</Link>
            )}
          </div>
          <Button variant="ghost" size="sm" className="res-btn-44" onClick={() => setChanging(true)}>{t('resident.scChange')}</Button>
        </div>
      )}
    </section>
  );
}
