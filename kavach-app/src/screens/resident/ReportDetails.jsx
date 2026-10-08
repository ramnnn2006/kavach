// Report details: where (prefilled home), which lift, people affected, note → Send alert.
// Offline or a failed network send goes to the outbox and is re-sent automatically.
import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { CircleAlert, CloudOff, House, MapPin, Minus, Plus } from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import { AlertBanner, Button, Field, IconButton, PageHeader, Spinner } from '../../components/ui';
import { createIncident, errorMessage, listAssets, listZones } from '../../data/db';
import { addToOutbox, flushOutbox, markSent, onOutboxSent, startOutboxSync } from '../../data/outbox';
import { ASSET_STATES, INCIDENT_TYPES } from '../../config/society';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../i18n';
import { floorLabel, homeLine, newClientId } from './parts/format';
import CallLink from './parts/CallLink';
import CallRow from './parts/CallRow';
import RadioRow from './parts/RadioRow';
import '../../styles/resident.css';

const MAX_PEOPLE = 50;
const NOTE_MAX = 500;
const NOTE_WARN = 100; // show the characters-left count only near the limit
const SPOT_MAX = 200;
const SEND_TIMEOUT_MS = 15000;
const QUEUE_CODES = ['offline', 'timeout', 'unknown'];

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'timeout' })), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export default function ReportDetails() {
  const { type } = useParams();
  if (!INCIDENT_TYPES[type]) return <Navigate to="/resident/report" replace />;
  return <ReportForm key={type} type={type} />;
}

function ReportForm({ type }) {
  const { t } = useT();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const isLift = type === 'lift';
  const homeZoneId = profile?.flat?.zone?.id || profile?.flat?.zone_id || null;
  const securityPhone = profile?.society?.security_phone;

  const [where, setWhere] = useState(homeZoneId ? 'home' : 'else');
  const [zoneId, setZoneId] = useState('');
  const [floor, setFloor] = useState('');
  const [spot, setSpot] = useState('');
  const [assetId, setAssetId] = useState('');
  const [people, setPeople] = useState(1);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [queued, setQueued] = useState(false);
  const [formError, setFormError] = useState(null); // { field: 'zone' | 'spot' | 'server', message }

  const [zones, setZones] = useState(null);
  const [zonesFailed, setZonesFailed] = useState(false);
  const [lifts, setLifts] = useState(null);
  const [liftsFailed, setLiftsFailed] = useState(false);
  const [liftAttempt, setLiftAttempt] = useState(0);

  const sendingRef = useRef(false);
  const clientIdRef = useRef(null);
  const zoneRef = useRef(null);
  const spotRef = useRef(null);

  useEffect(() => startOutboxSync(), []);

  useEffect(() => {
    let alive = true;
    listZones()
      .then(z => { if (alive) setZones(z || []); })
      .catch(() => { if (alive) setZonesFailed(true); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!isLift) return undefined;
    let alive = true;
    listAssets({ kind: 'lift' })
      .then(a => { if (alive) setLifts(a || []); })
      .catch(() => { if (alive) setLiftsFailed(true); });
    return () => { alive = false; };
  }, [isLift, liftAttempt]);

  // A queued report that gets delivered in the background → straight to its tracker
  useEffect(() => {
    if (!queued) return undefined;
    return onOutboxSent((clientId, incident) => {
      if (clientId === clientIdRef.current && incident?.id) {
        navigate(`/resident/sos/${incident.id}`, { replace: true, state: { justSent: true } });
      }
    });
  }, [queued, navigate]);

  const targetZoneId = where === 'home' ? homeZoneId : zoneId;
  const targetZone = zones?.find(z => z.id === targetZoneId) || null;
  const liftsHere = lifts ? lifts.filter(l => l.zone_id === targetZoneId) : null;
  const floorCount = targetZone?.floors || 0;
  const showFloor = floorCount > 0 && (where === 'else' || isLift);

  const chooseWhere = (next) => {
    if (next === where) return;
    setWhere(next);
    setZoneId('');
    setFloor('');
    setAssetId('');
    setFormError(null);
  };

  const buildPayload = () => ({
    type,
    zoneId: where === 'else' && zoneId ? zoneId : undefined,
    flatId: where === 'home' ? profile?.flat_id || undefined : undefined,
    floor: floor === '' ? undefined : Number(floor),
    assetId: isLift && assetId ? assetId : undefined,
    locationNote: where === 'else' ? spot.trim() || undefined : undefined,
    description: note.trim() || undefined,
    peopleAffected: people,
  });

  const validate = () => {
    if (where !== 'else') return true;
    if (zones && !zoneId) {
      setFormError({ field: 'zone', message: t('resident.errChooseZone') });
      zoneRef.current?.focus();
      return false;
    }
    if (!zones && !spot.trim()) {
      setFormError({ field: 'spot', message: t('resident.errDescribeWhere') });
      spotRef.current?.focus();
      return false;
    }
    return true;
  };

  const send = async () => {
    if (sendingRef.current) return;
    setFormError(null);
    if (!validate()) return;
    sendingRef.current = true;
    setSending(true);
    if (!clientIdRef.current) clientIdRef.current = newClientId();
    const clientId = clientIdRef.current;
    const payload = buildPayload();

    const queue = async (code) => {
      await addToOutbox({ clientId, payload, userId: user?.id, lastError: { code } });
      setQueued(true);
      setSending(false);
    };

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      await queue('offline');
      return;
    }

    const request = createIncident({ clientId, ...payload });
    try {
      const incident = await withTimeout(request, SEND_TIMEOUT_MS);
      navigate(`/resident/sos/${incident.id}`, { replace: true, state: { justSent: true } });
    } catch (err) {
      const code = err?.code || 'unknown';
      if (QUEUE_CODES.includes(code)) {
        // A slow request may still land; if it does, clear it from the outbox and move on
        if (code === 'timeout') request.then(inc => markSent(clientId, inc)).catch(() => {});
        await queue(code);
      } else {
        sendingRef.current = false;
        setSending(false);
        setFormError({ field: 'server', message: errorMessage(err, t) });
      }
    }
  };

  const retryNow = async () => {
    setRetrying(true);
    try { await flushOutbox(); } finally { setRetrying(false); }
  };

  const typeLabel = t(`common.type_${type}`);

  if (queued) {
    return (
      <main className="page res-page">
        <PageHeader back="/resident" title={typeLabel} />
        <div className="stack">
          <section className="card res-queued" role="status">
            <span className="type-icon type-icon--lg" style={{ '--tone': 'var(--orange)' }} aria-hidden="true">
              <CloudOff size={28} />
            </span>
            <h2 className="res-queued__title">{t('resident.queuedTitle')}</h2>
            <p className="muted">{t('resident.queuedText')}</p>
          </section>
          <CallLink phone={securityPhone} label={t('resident.callSecurity')} variant="danger" size="lg" block />
          <div className="card settings-group">
            <CallRow phone="112" title={t('resident.call112')} detail={t('resident.contact112')} ariaLabel={t('resident.call112')} />
            <button type="button" className="settings-row res-link-row" onClick={retryNow} disabled={retrying} aria-busy={retrying || undefined}>
              <span className="grow">{t('resident.sendNow')}</span>
              {retrying && <Spinner label={t('common.loading')} />}
            </button>
          </div>
          <Button variant="ghost" block onClick={() => navigate('/resident')}>{t('resident.backHome')}</Button>
        </div>
        <BottomNav />
      </main>
    );
  }

  const floorOptions = Array.from({ length: floorCount + 1 }, (_, i) => i);
  const homeTitle = isLift ? t('resident.whereMyTower') : t('resident.whereHome');
  const homeSub = isLift ? (profile?.flat?.zone?.name || '') : homeLine(profile, t, { withFloor: true });

  return (
    <main className="page res-page">
      <PageHeader back title={typeLabel} subtitle={t(`common.typeHint_${type}`)} />

      <div className="stack">
        {/* Where */}
        <section aria-labelledby="res-where-title">
          <h2 id="res-where-title" className="section-title">{t('resident.whereTitle')}</h2>
          <div role="radiogroup" aria-labelledby="res-where-title" className="card settings-group">
            {homeZoneId && (
              <RadioRow
                checked={where === 'home'}
                onSelect={() => chooseWhere('home')}
                icon={<House size={18} />}
                tone="var(--blue)"
                title={homeTitle}
                subtitle={homeSub}
              />
            )}
            <RadioRow
              checked={where === 'else'}
              onSelect={() => chooseWhere('else')}
              icon={<MapPin size={18} />}
              tone="var(--gray)"
              title={t('resident.whereElse')}
              subtitle={t('resident.whereElseSub')}
            />
          </div>

          {where === 'else' && (
            <div className="stack-sm res-fields">
              <Field label={t('resident.placeLabel')} htmlFor="res-zone" error={formError?.field === 'zone' ? formError.message : null}>
                <select
                  id="res-zone"
                  ref={zoneRef}
                  className={`select${formError?.field === 'zone' ? ' input--error' : ''}`}
                  value={zoneId}
                  disabled={!zones}
                  onChange={(e) => { setZoneId(e.target.value); setFloor(''); setAssetId(''); setFormError(null); }}
                >
                  <option value="">
                    {zones ? t('resident.choosePlace') : zonesFailed ? t('resident.placesUnavailable') : t('common.loading')}
                  </option>
                  {zones?.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </Field>
              {showFloor && !isLift && (
                <Field label={t('resident.floorLabel')} htmlFor="res-floor">
                  <select id="res-floor" className="select" value={floor} onChange={(e) => setFloor(e.target.value)}>
                    <option value="">{t('resident.floorUnknown')}</option>
                    {floorOptions.map(n => <option key={n} value={n}>{floorLabel(n, t)}</option>)}
                  </select>
                </Field>
              )}
              <Field
                label={t('resident.spotLabel')}
                htmlFor="res-spot"
                hint={t('resident.spotHint')}
                error={formError?.field === 'spot' ? formError.message : null}
              >
                <input
                  id="res-spot"
                  ref={spotRef}
                  className={`input${formError?.field === 'spot' ? ' input--error' : ''}`}
                  value={spot}
                  maxLength={SPOT_MAX}
                  autoComplete="off"
                  onChange={(e) => { setSpot(e.target.value); if (formError?.field === 'spot') setFormError(null); }}
                />
              </Field>
            </div>
          )}
        </section>

        {/* Which lift */}
        {isLift && (
          <section aria-labelledby="res-lift-title">
            <h2 id="res-lift-title" className="section-title">{t('resident.whichLift')}</h2>
            <div role="radiogroup" aria-labelledby="res-lift-title" className="card settings-group">
              {!targetZoneId && (
                <div className="settings-row"><p className="grow text-sm muted">{t('resident.liftChoosePlace')}</p></div>
              )}
              {targetZoneId && liftsHere === null && !liftsFailed && (
                <div className="settings-row res-center"><Spinner label={t('common.loading')} /></div>
              )}
              {liftsFailed && (
                <div className="settings-row">
                  <p className="grow text-sm muted">{t('resident.liftsError')}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="res-btn-44"
                    onClick={() => { setLiftsFailed(false); setLifts(null); setLiftAttempt(a => a + 1); }}
                  >
                    {t('common.retry')}
                  </Button>
                </div>
              )}
              {liftsHere?.map(lift => (
                <RadioRow
                  key={lift.id}
                  checked={assetId === lift.id}
                  onSelect={() => setAssetId(lift.id)}
                  title={lift.name}
                  trailing={lift.state && lift.state !== 'ok' && (
                    <span className="res-trailing" style={{ color: (ASSET_STATES[lift.state] || ASSET_STATES.ok).tone }}>
                      {t(`resident.liftState_${lift.state}`)}
                    </span>
                  )}
                />
              ))}
              <RadioRow
                checked={!assetId}
                onSelect={() => setAssetId('')}
                title={t('resident.liftNotSure')}
              />
            </div>
            {showFloor && (
              <div className="res-fields">
                <Field label={t('resident.liftFloorLabel')} htmlFor="res-lift-floor">
                  <select id="res-lift-floor" className="select" value={floor} onChange={(e) => setFloor(e.target.value)}>
                    <option value="">{t('resident.floorUnknown')}</option>
                    {floorOptions.map(n => <option key={n} value={n}>{floorLabel(n, t)}</option>)}
                  </select>
                </Field>
              </div>
            )}
          </section>
        )}

        {/* People */}
        <section className="card res-people" aria-labelledby="res-people-label">
          <div className="grow">
            <h2 id="res-people-label" className="res-people__label">{t('resident.peopleLabel')}</h2>
            <p className="res-people__hint">{t('resident.peopleHint')}</p>
          </div>
          <div className="counter" role="group" aria-labelledby="res-people-label">
            <IconButton label={t('resident.fewer')} disabled={people <= 1} onClick={() => setPeople(p => Math.max(1, p - 1))}>
              <Minus size={20} aria-hidden="true" />
            </IconButton>
            <span className="counter__value" aria-live="polite">{people}</span>
            <IconButton label={t('resident.more')} disabled={people >= MAX_PEOPLE} onClick={() => setPeople(p => Math.min(MAX_PEOPLE, p + 1))}>
              <Plus size={20} aria-hidden="true" />
            </IconButton>
          </div>
        </section>

        {/* Note */}
        <section>
          <label htmlFor="res-note" className="section-title res-label">{t('resident.noteLabel')}</label>
          <textarea
            id="res-note"
            className="textarea"
            rows={3}
            maxLength={NOTE_MAX}
            value={note}
            placeholder={t(`resident.notePlaceholder_${type}`)}
            aria-describedby={NOTE_MAX - note.length <= NOTE_WARN ? 'res-note-left' : undefined}
            onChange={(e) => setNote(e.target.value)}
          />
          {NOTE_MAX - note.length <= NOTE_WARN && (
            <p id="res-note-left" className="res-footer">{t('resident.charsLeft', { n: NOTE_MAX - note.length })}</p>
          )}
        </section>

        {formError?.field === 'server' && (
          <AlertBanner tone="var(--red)" icon={CircleAlert} role="alert">
            <p>{formError.message}</p>
            <div className="res-banner-actions">
              <CallLink phone={securityPhone} label={t('resident.callSecurity')} variant="danger" />
            </div>
          </AlertBanner>
        )}

        <p className="res-footer">
          {t('resident.lifeDanger')}{' '}
          <a href="tel:112" className="res-inline-link">{t('resident.call112')}</a>
        </p>

        <div className="res-send-bar">
          <Button variant="danger" size="lg" block loading={sending} onClick={send}>
            {t('resident.sendAlert')}
          </Button>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
