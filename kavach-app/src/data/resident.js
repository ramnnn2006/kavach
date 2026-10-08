// Resident-only queries that db.js does not cover. RLS still decides what is visible.
import { supabase } from '../lib/supabase';
import { live } from './live';
import { DbError, listContacts, getMySafetyResponse, listFirstResponderAcks } from './db';

async function run(promise) {
  const { data, error } = await promise;
  if (error) {
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    throw new DbError(offline ? 'offline' : 'unknown', error.message, error);
  }
  return data;
}

/** Society + emergency contacts, live. */
export function listenContacts(cb, onError) {
  return live(['contacts'], listContacts, cb, onError);
}

/** My answer to a Safety Check, live (null until I answer). */
export function listenMySafetyResponse(checkId, cb, onError) {
  return live(
    [{ table: 'safety_check_responses', filter: `check_id=eq.${checkId}` }],
    () => getMySafetyResponse(checkId),
    cb,
    onError,
  );
}

/** Community first responders on one incident, live (acks write an incident_events row). */
export function listenFirstResponderAcks(incidentId, cb, onError) {
  return live(
    [{ table: 'incident_events', filter: `incident_id=eq.${incidentId}` }],
    () => listFirstResponderAcks(incidentId),
    cb,
    onError,
  );
}

const MEDICAL_POLL_MS = 15000;

/**
 * Active medical incidents a community first responder can act on (not my own), each with
 * `ackCount` and `iAmComing`. Served by an RPC that returns only place, time, people and the
 * reporter's description — never their name, phone or health details.
 */
export async function listMedicalAlerts() {
  const rows = await run(supabase.rpc('list_medical_alerts'));
  return (rows || []).map(r => ({ ...r, type: 'medical', ackCount: r.ack_count, iAmComing: r.i_am_coming }));
}

export function listenMedicalAlerts(_myId, cb, onError) {
  // First responders can't subscribe to medical rows (RLS keeps reporter details private),
  // so refresh on a timer as well as on focus / reconnect. New alerts also arrive by push.
  let closed = false;
  const stop = live([], listMedicalAlerts, cb, onError);
  const timer = setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    listMedicalAlerts().then(
      (rows) => { if (!closed) cb(rows); },
      (err) => { if (!closed) (onError || console.error)(err); },
    );
  }, MEDICAL_POLL_MS);
  return () => { closed = true; clearInterval(timer); stop(); };
}
