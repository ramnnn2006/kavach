// Resident-only queries that db.js does not cover. RLS still decides what is visible.
import { supabase } from '../lib/supabase';
import { live } from './live';
import { DbError, listContacts, listQueue, getMySafetyResponse, listFirstResponderAcks } from './db';

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

/**
 * Active medical incidents a community first responder can see (not my own),
 * each with `ackCount` and `iAmComing`.
 */
export async function listMedicalAlerts(myId) {
  const rows = (await listQueue({ active: true }))
    .filter(i => i.type === 'medical' && i.reporter_id !== myId);
  if (!rows.length) return [];
  const acks = await run(supabase.from('first_responder_acks')
    .select('incident_id, profile_id')
    .in('incident_id', rows.map(r => r.id)));
  return rows
    .map(r => {
      const mine = acks.filter(a => a.incident_id === r.id);
      return { ...r, ackCount: mine.length, iAmComing: mine.some(a => a.profile_id === myId) };
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export function listenMedicalAlerts(myId, cb, onError) {
  return live(['incidents', 'incident_events'], () => listMedicalAlerts(myId), cb, onError);
}
