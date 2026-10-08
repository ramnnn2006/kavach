// Admin-only data helpers that db.js does not cover (contacts CRUD, extra live feeds).
// RLS: admins may insert/update/delete contacts in their own society; everyone else is rejected server-side.
import { supabase } from '../lib/supabase';
import { live } from './live';
import {
  DbError, listContacts, listPowerEvents, listSafetyChecks, listSafetyResponses, getSafetyCheckSummary,
  reportSummary, reportByAsset, reportByZone, reportMonthly,
} from './db';

function toError(error) {
  if (!error) return null;
  if (error instanceof DbError) return error;
  const text = `${error.message || ''} ${error.details || ''}`.toLowerCase();
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return new DbError('offline', error.message, error);
  if (text.includes('failed to fetch') || text.includes('network')) return new DbError('offline', error.message, error);
  if (error.code === '42501' || text.includes('row-level security') || text.includes('permission denied')) {
    return new DbError('forbidden', error.message, error);
  }
  if (['23514', '22P02', '23502'].includes(error.code)) return new DbError('invalid', 'invalid', error);
  return new DbError('unknown', error.message, error);
}

async function run(promise) {
  const { data, error } = await promise;
  if (error) throw toError(error);
  return data;
}

// ── Contacts ───────────────────────────────────────────────────────────────
export function listenContacts(cb, onError) {
  return live(['contacts'], listContacts, cb, onError);
}

export function addContact({ societyId, kind = 'society', name, roleLabel, phone, available, sortOrder = 0 }) {
  return run(supabase.from('contacts').insert({
    society_id: societyId,
    kind,
    name: name.trim(),
    role_label: roleLabel?.trim() || null,
    phone: phone.trim(),
    available: available?.trim() || null,
    sort_order: sortOrder,
  }).select('id').single());
}

export function deleteContact(id) {
  return run(supabase.from('contacts').delete().eq('id', id));
}

// ── Power ──────────────────────────────────────────────────────────────────
export function listenPowerEvents(cb, onError, limit = 10) {
  return live(['power_events'], () => listPowerEvents(limit), cb, onError);
}

// ── Safety Check ───────────────────────────────────────────────────────────
export function listenSafetyChecks(cb, onError, limit = 20) {
  return live(['safety_checks'], () => listSafetyChecks(limit), cb, onError);
}

/** Live roll call for one check: every response plus the server-side counts. */
export function listenRollCall(checkId, cb, onError) {
  const fetcher = async () => {
    const [responses, summary] = await Promise.all([listSafetyResponses(checkId), getSafetyCheckSummary(checkId)]);
    return { responses: responses || [], summary };
  };
  return live([{ table: 'safety_check_responses', filter: `check_id=eq.${checkId}` }], fetcher, cb, onError);
}

// ── Reports ────────────────────────────────────────────────────────────────
/** All Insights data for the last `days` days (+ 6-month trend); refetches when incidents change. */
export function listenReports(days, cb, onError, months = 6) {
  const fetcher = async () => {
    const to = new Date();
    const from = new Date(to.getTime() - days * 86400000);
    const [summary, byAsset, byZone, monthly] = await Promise.all([
      reportSummary(from.toISOString(), to.toISOString()),
      reportByAsset(from.toISOString(), to.toISOString()),
      reportByZone(from.toISOString(), to.toISOString()),
      reportMonthly(months),
    ]);
    return { summary: summary || [], byAsset: byAsset || [], byZone: byZone || [], monthly: monthly || [], from, to };
  };
  return live(['incidents'], fetcher, cb, onError);
}
