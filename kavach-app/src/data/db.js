// Data layer: every screen talks to Supabase through these functions only.
// RLS decides what each user can see; RPCs enforce every state change server-side.
import { supabase } from '../lib/supabase';
import { live } from './live';

// ── Errors ─────────────────────────────────────────────────────────────────
// Thrown errors carry `code`: already_claimed | forbidden | not_found | invalid | offline | unknown
export class DbError extends Error {
  constructor(code, message, cause) {
    super(message || code);
    this.code = code;
    this.cause = cause;
  }
}

const KNOWN_CODES = ['already_claimed', 'forbidden', 'not_found', 'invalid', 'not_on_duty', 'wrong_specialty'];

function toDbError(error) {
  if (!error) return null;
  if (error instanceof DbError) return error;
  const text = `${error.message || ''} ${error.details || ''} ${error.hint || ''}`.toLowerCase();
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return new DbError('offline', error.message, error);
  if (text.includes('failed to fetch') || text.includes('network')) return new DbError('offline', error.message, error);
  const known = KNOWN_CODES.find(c => (error.message || '').toLowerCase().startsWith(c));
  if (known) return new DbError(known, error.details || error.message, error);
  if (error.code === '42501' || text.includes('row-level security') || text.includes('permission denied')) return new DbError('forbidden', error.message, error);
  if (error.code === 'PGRST116') return new DbError('not_found', error.message, error);
  if (error.code === '23505') return new DbError('duplicate', error.message, error);
  if (error.code === '23514' || error.code === '22P02' || error.code === '23502') return new DbError('invalid', error.message, error);
  return new DbError('unknown', error.message, error);
}

async function q(promise) {
  const { data, error } = await promise;
  if (error) throw toDbError(error);
  return data;
}

async function rpc(fn, args) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new DbError('offline');
  return q(supabase.rpc(fn, args));
}

/** Map any thrown error to a translated, user-facing message. `t` is from useT(). */
export function errorMessage(err, t) {
  const code = err?.code;
  const map = {
    offline: 'common.errorOffline',
    forbidden: 'common.errorForbidden',
    not_found: 'common.errorNotFound',
    already_claimed: 'responder.errAlreadyClaimed',
    not_on_duty: 'responder.errNotOnDuty',
    wrong_specialty: 'responder.errWrongSpecialty',
  };
  if (map[code]) return t(map[code]);
  if (code === 'invalid' && err.message && err.message !== 'invalid') return err.message;
  return t('common.errorGeneric');
}

async function myId() {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user?.id;
  if (!id) throw new DbError('forbidden', 'Not signed in');
  return id;
}

// ── Profile ────────────────────────────────────────────────────────────────
const SELF_EDITABLE = ['full_name', 'phone', 'language', 'vulnerability', 'first_responder_skill'];

export async function updateMyProfile(fields) {
  const id = await myId();
  const patch = Object.fromEntries(Object.entries(fields).filter(([k]) => SELF_EDITABLE.includes(k)));
  if (!Object.keys(patch).length) return null;
  return q(supabase.from('profiles').update(patch).eq('id', id).select('id').single());
}

// ── Society structure ──────────────────────────────────────────────────────
export function listZones() {
  return q(supabase.from('zones').select('id, name, code, kind, tier, power_state, floors, sort_order').order('sort_order').order('name'));
}

export function listenZones(cb, onError) {
  return live(['zones'], listZones, cb, onError);
}

export function getSociety() {
  return q(supabase.from('societies').select('id, name, city, address, security_phone, power_source, escalate_l2_after, escalate_l3_after').maybeSingle());
}

export function listenSociety(cb, onError) {
  return live(['societies'], getSociety, cb, onError);
}

const ASSET_COLUMNS = 'id, zone_id, kind, name, code, state, vendor, amc_expires_on, licence_expires_on, notes, state_changed_at, zone:zones(id, name)';

export function listAssets({ zoneId, kind } = {}) {
  let query = supabase.from('assets').select(ASSET_COLUMNS).order('kind').order('name');
  if (zoneId) query = query.eq('zone_id', zoneId);
  if (kind) query = query.eq('kind', kind);
  return q(query);
}

export function listenAssets(cb, onError, filter) {
  return live(['assets'], () => listAssets(filter), cb, onError);
}

const CHECK_COLUMNS = 'id, asset_id, zone_id, kind, title, interval_days, due_at, last_done_at, notes, asset:assets(id, name, kind), zone:zones(id, name), done_by_profile:profiles!asset_checks_done_by_fkey(full_name)';

export function listChecks() {
  return q(supabase.from('asset_checks').select(CHECK_COLUMNS).order('due_at'));
}

export function listenChecks(cb, onError) {
  return live(['asset_checks'], listChecks, cb, onError);
}

// ── Contacts & notices ─────────────────────────────────────────────────────
export function listContacts() {
  return q(supabase.from('contacts').select('id, kind, name, role_label, phone, available, sort_order').order('kind').order('sort_order'));
}

export function listNotices() {
  return q(supabase.from('notices')
    .select('id, title, body, pinned, expires_at, author_name, created_at')
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false }));
}

export function listenNotices(cb, onError) {
  return live(['notices'], listNotices, cb, onError);
}

export async function postNotice({ title, body, pinned = false, expiresAt = null }) {
  const id = await myId();
  const { data: me } = await supabase.from('profiles').select('society_id, full_name').eq('id', id).single();
  return q(supabase.from('notices').insert({
    society_id: me.society_id, author_id: id, author_name: me.full_name,
    title: title.trim(), body: (body || '').trim(), pinned, expires_at: expiresAt,
  }).select('id').single());
}

export function updateNotice(id, fields) {
  return q(supabase.from('notices').update(fields).eq('id', id).select('id').single());
}

export function deleteNotice(id) {
  return q(supabase.from('notices').delete().eq('id', id));
}

// ── Incidents ──────────────────────────────────────────────────────────────
export const INCIDENT_COLUMNS =
  'id, client_id, source, type, status, reporter_id, reporter_name, reporter_phone, reporter_vulnerability, vulnerable, ' +
  'zone_id, zone_name, flat_id, flat_label, floor, asset_id, asset_name, location_note, description, people_affected, ' +
  'hazard_weight, zone_tier, urgency_score, escalation_level, assigned_to, assigned_name, assigned_phone, assigned_at, ' +
  'acknowledged_at, en_route_at, on_scene_at, resolved_at, cancelled_at, resolution_note, safety_check_id, created_at, updated_at';

/**
 * Create an incident. `clientId` (uuid) makes retries idempotent: a duplicate returns the existing row.
 */
export async function createIncident({ clientId, type, zoneId, flatId, floor, assetId, locationNote, description, peopleAffected = 1 }) {
  const row = {
    client_id: clientId || crypto.randomUUID(),
    type,
    zone_id: zoneId || null,
    flat_id: flatId || null,
    floor: floor ?? null,
    asset_id: assetId || null,
    location_note: locationNote || null,
    description: description || null,
    people_affected: peopleAffected,
  };
  const { data, error } = await supabase.from('incidents').insert(row).select(INCIDENT_COLUMNS).single();
  if (!error) return data;
  if (error.code === '23505') {
    // Already sent (retry after a dropped response) → return the original
    const id = await myId();
    return q(supabase.from('incidents').select(INCIDENT_COLUMNS).eq('reporter_id', id).eq('client_id', row.client_id).single());
  }
  throw toDbError(error);
}

export function getIncident(id) {
  return q(supabase.from('incidents').select(INCIDENT_COLUMNS).eq('id', id).maybeSingle());
}

export function listenIncident(id, cb, onError) {
  return live([{ table: 'incidents', filter: `id=eq.${id}` }], () => getIncident(id), cb, onError);
}

export function listIncidentEvents(incidentId) {
  return q(supabase.from('incident_events')
    .select('id, actor_name, action, from_status, to_status, note, data, created_at')
    .eq('incident_id', incidentId)
    .order('created_at'));
}

export function listenIncidentEvents(incidentId, cb, onError) {
  return live([{ table: 'incident_events', filter: `incident_id=eq.${incidentId}` }], () => listIncidentEvents(incidentId), cb, onError);
}

/** Resident: my own reports, newest first. */
export async function listMyIncidents(limit = 100) {
  const id = await myId();
  return q(supabase.from('incidents').select(INCIDENT_COLUMNS).eq('reporter_id', id).order('created_at', { ascending: false }).limit(limit));
}

export function listenMyIncidents(cb, onError) {
  return live(['incidents'], () => listMyIncidents(), cb, onError);
}

/**
 * Staff queue — RLS limits responders to their specialties + assigned, admins see everything.
 * @param {{ active?: boolean, since?: string, limit?: number }} opts
 */
export function listQueue({ active = true, since, limit = 200 } = {}) {
  let query = supabase.from('incidents').select(INCIDENT_COLUMNS);
  if (active) query = query.in('status', ['pending', 'acknowledged', 'en_route', 'on_scene']);
  if (since) query = query.gte('created_at', since);
  return q(query.order('urgency_score', { ascending: false }).order('created_at').limit(limit));
}

export function listenQueue(cb, onError, opts) {
  return live(['incidents'], () => listQueue(opts), cb, onError);
}

/** Resolved/cancelled incidents I handled (responder history). */
export async function listMyHandled(limit = 100) {
  const id = await myId();
  return q(supabase.from('incidents').select(INCIDENT_COLUMNS)
    .eq('assigned_to', id).in('status', ['resolved', 'cancelled'])
    .order('resolved_at', { ascending: false, nullsFirst: false }).limit(limit));
}

/** Admin: incidents with filters. */
export function listIncidents({ status, type, zoneId, from, to, limit = 300 } = {}) {
  let query = supabase.from('incidents').select(INCIDENT_COLUMNS);
  if (status === 'active') query = query.in('status', ['pending', 'acknowledged', 'en_route', 'on_scene']);
  else if (status === 'closed') query = query.in('status', ['resolved', 'cancelled']);
  else if (status) query = query.eq('status', status);
  if (type) query = query.eq('type', type);
  if (zoneId) query = query.eq('zone_id', zoneId);
  if (from) query = query.gte('created_at', from);
  if (to) query = query.lt('created_at', to);
  return q(query.order('created_at', { ascending: false }).limit(limit));
}

export function listenIncidents(filters, cb, onError) {
  return live(['incidents'], () => listIncidents(filters), cb, onError);
}

// ── Team ───────────────────────────────────────────────────────────────────
const MEMBER_COLUMNS = 'id, full_name, email, phone, role, specialties, on_duty, flat_id, first_responder_skill, vulnerability, updated_at, flat:flats(number, floor, zone:zones(name))';

export function listMembers({ role } = {}) {
  let query = supabase.from('profiles').select(MEMBER_COLUMNS).order('role').order('full_name');
  if (role) query = query.eq('role', role);
  return q(query);
}

export function listenMembers(cb, onError, opts) {
  return live(['profiles'], () => listMembers(opts), cb, onError);
}

export function listResponders() {
  return listMembers({ role: 'responder' });
}

// ── Safety Check ───────────────────────────────────────────────────────────
export function getActiveSafetyCheck() {
  return q(supabase.from('safety_checks')
    .select('id, scope, zone_id, incident_type, message, started_at, ended_at, zone:zones(id, name)')
    .is('ended_at', null).order('started_at', { ascending: false }).limit(1).maybeSingle());
}

export function listenActiveSafetyCheck(cb, onError) {
  return live(['safety_checks'], getActiveSafetyCheck, cb, onError);
}

export async function getMySafetyResponse(checkId) {
  const id = await myId();
  return q(supabase.from('safety_check_responses').select('id, status, note, responded_at, incident_id')
    .eq('check_id', checkId).eq('profile_id', id).maybeSingle());
}

export function listSafetyResponses(checkId) {
  return q(supabase.from('safety_check_responses')
    .select('id, profile_id, status, note, responded_at, incident_id')
    .eq('check_id', checkId));
}

export function listenSafetyResponses(checkId, cb, onError) {
  return live([{ table: 'safety_check_responses', filter: `check_id=eq.${checkId}` }], () => listSafetyResponses(checkId), cb, onError);
}

export function listSafetyChecks(limit = 20) {
  return q(supabase.from('safety_checks')
    .select('id, scope, zone_id, incident_type, message, started_at, ended_at, zone:zones(id, name)')
    .order('started_at', { ascending: false }).limit(limit));
}

// ── Power ──────────────────────────────────────────────────────────────────
export function listPowerEvents(limit = 20) {
  return q(supabase.from('power_events').select('id, source, switched_at, note, by:profiles(full_name)')
    .order('switched_at', { ascending: false }).limit(limit));
}

// ── First responders ───────────────────────────────────────────────────────
export function listFirstResponderAcks(incidentId) {
  return q(supabase.from('first_responder_acks').select('profile_id, created_at').eq('incident_id', incidentId));
}

// ── RPCs: every state change is validated server-side ─────────────────────
export const claimIncident = (id) => rpc('claim_incident', { p_incident_id: id });
export const advanceIncident = (id, next, note) => rpc('advance_incident', { p_incident_id: id, p_next: next, p_note: note || null });
export const cancelIncident = (id, reason) => rpc('cancel_incident', { p_incident_id: id, p_reason: reason || null });
export const assignIncident = (id, responderId) => rpc('assign_incident', { p_incident_id: id, p_responder_id: responderId });
export const updateIncidentDetails = (id, { description, locationNote, peopleAffected, assetId } = {}) =>
  rpc('update_incident_details', {
    p_incident_id: id,
    p_description: description ?? null,
    p_location_note: locationNote ?? null,
    p_people_affected: peopleAffected ?? null,
    p_asset_id: assetId ?? null,
  });
export const firstResponderAck = (id) => rpc('first_responder_ack', { p_incident_id: id });

export const setOnDuty = (on) => rpc('set_on_duty', { p_on: !!on });
export const updateMember = (id, { role, specialties }) =>
  rpc('update_member', { p_profile_id: id, p_role: role, p_specialties: specialties ?? null });

export const setZonePower = (zoneId, state) => rpc('set_zone_power', { p_zone_id: zoneId, p_state: state });
export const setPowerSource = (source, note) => rpc('set_power_source', { p_source: source, p_note: note || null });
export const setAssetStatus = (assetId, state, note) => rpc('set_asset_status', { p_asset_id: assetId, p_state: state, p_note: note || null });
export const logAssetCheck = (checkId, notes) => rpc('log_asset_check', { p_check_id: checkId, p_notes: notes || null });

export const startSafetyCheck = ({ scope, zoneId, message, type = 'fire' }) =>
  rpc('start_safety_check', { p_scope: scope, p_zone_id: zoneId || null, p_message: message, p_type: type });
export const endSafetyCheck = (id) => rpc('end_safety_check', { p_check_id: id });
export const respondSafetyCheck = (id, status, note) => rpc('respond_safety_check', { p_check_id: id, p_status: status, p_note: note || null });
export async function getSafetyCheckSummary(id) {
  const rows = await rpc('safety_check_summary', { p_check_id: id });
  return rows?.[0] || { in_scope: 0, safe: 0, need_help: 0, unanswered: 0 };
}

export const setMyHome = ({ zoneId, floor, flatNumber }) =>
  rpc('set_my_home', { p_zone_id: zoneId, p_floor: floor ?? null, p_flat_number: flatNumber });

// ── Reports (admin) ────────────────────────────────────────────────────────
export const reportSummary = (from, to) => rpc('report_summary', { p_from: from, p_to: to });
export const reportByAsset = (from, to) => rpc('report_by_asset', { p_from: from, p_to: to });
export const reportByZone = (from, to) => rpc('report_by_zone', { p_from: from, p_to: to });
export const reportMonthly = (months = 6) => rpc('report_monthly', { p_months: months });
export const incidentReport = (id) => rpc('incident_report', { p_incident_id: id });

// Views
export function listCompliance() {
  return q(supabase.from('v_compliance').select('*').order('due_at'));
}
export function listenCompliance(cb, onError) {
  return live(['asset_checks'], listCompliance, cb, onError);
}
export function listTeam() {
  return q(supabase.from('v_team').select('*').order('role', { ascending: false }).order('full_name'));
}
export function listenTeam(cb, onError) {
  return live(['profiles', 'incidents'], listTeam, cb, onError);
}
