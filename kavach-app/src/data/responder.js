// Responder-only queries and specialty rules. Mirrors the SQL helpers so the UI filters the
// same way the RPCs check permissions (public.asset_kind_type / public.check_kind_type).
import { supabase } from '../lib/supabase';
import { live } from './live';
import { DbError, listMyHandled } from './db';

// asset_kind → incident type (specialty) — mirror of public.asset_kind_type()
export const ASSET_KIND_TYPE = {
  lift: 'lift',
  dg: 'power',
  transformer: 'power',
  water_pump: 'water',
  sump: 'water',
  fire_pump: 'fire',
};

// asset_check_kind → incident type — mirror of public.check_kind_type()
export const CHECK_KIND_TYPE = {
  dg_fuel: 'power',
  dg_load_test: 'power',
  transformer_service: 'power',
  lift_ard_battery: 'lift',
  lift_licence: 'lift',
  lift_amc: 'lift',
  fire_extinguisher_expiry: 'fire',
  fire_pump_test: 'fire',
  pump_service: 'water',
};

export const ASSET_STATE_ORDER = ['ok', 'degraded', 'down', 'maintenance'];

/** Specialty a v_compliance row belongs to. Like log_asset_check: the asset's kind wins, then the check kind. */
export function checkSpecialty(row) {
  return (row?.asset_kind && ASSET_KIND_TYPE[row.asset_kind]) || CHECK_KIND_TYPE[row?.kind] || null;
}

export function assetSpecialty(asset) {
  return ASSET_KIND_TYPE[asset?.kind] || null;
}

/** Does this profile cover an incident type? Admins cover everything. */
export function covers(profile, type) {
  if (profile?.role === 'admin') return true;
  return Boolean(type) && (profile?.specialties || []).includes(type);
}

function fail(error) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return new DbError('offline', error.message, error);
  const text = `${error.message || ''}`.toLowerCase();
  if (text.includes('failed to fetch') || text.includes('network')) return new DbError('offline', error.message, error);
  if (error.code === '42501') return new DbError('forbidden', error.message, error);
  return new DbError('unknown', error.message, error);
}

// Assets with zone order and the name of whoever last changed the state
const ASSET_COLUMNS =
  'id, zone_id, kind, name, code, state, vendor, amc_expires_on, licence_expires_on, notes, state_changed_at, ' +
  'changed_by:profiles!assets_state_changed_by_fkey(full_name), zone:zones(id, name, sort_order)';

export async function listAssetsDetailed() {
  const { data, error } = await supabase.from('assets').select(ASSET_COLUMNS).order('kind').order('name');
  if (error) throw fail(error);
  return data;
}

export function listenAssetsDetailed(cb, onError) {
  return live(['assets'], listAssetsDetailed, cb, onError);
}

/** Resolved/cancelled incidents I handled, kept live. */
export function listenMyHandled(cb, onError) {
  return live(['incidents'], () => listMyHandled(), cb, onError);
}
