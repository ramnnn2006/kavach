// Small formatting helpers shared by resident screens. `t` comes from useT().
import { SPECIALTY_PRESETS } from '../../../config/society';

export function floorLabel(floor, t) {
  if (floor == null || floor === '') return '';
  return Number(floor) === 0 ? t('resident.floorGround') : t('resident.floorN', { n: floor });
}

/** "Tower A · Flat A-1204" (+ " · Floor 12" with withFloor) */
export function homeLine(profile, t, { withFloor = false } = {}) {
  const flat = profile?.flat;
  if (!flat) return '';
  const parts = [];
  if (flat.zone?.name) parts.push(flat.zone.name);
  if (flat.number) parts.push(t('resident.flatN', { n: flat.number }));
  if (withFloor && flat.floor != null) parts.push(floorLabel(flat.floor, t));
  return parts.join(' · ');
}

/**
 * Where an incident is. The server attaches the reporter's home flat even to reports made
 * "somewhere else", so the flat is only shown when the report is in the home tower.
 */
export function incidentPlace(inc, t, profile) {
  if (!inc) return '';
  const homeZone = profile?.flat?.zone?.id || profile?.flat?.zone_id;
  const atHome = !homeZone || inc.zone_id === homeZone;
  // Elsewhere with no floor picked, the server copies the home floor — don't show that
  const copiedFloor = !atHome && inc.flat_id && inc.flat_id === profile?.flat_id && inc.floor === profile?.flat?.floor;
  const parts = [];
  if (inc.zone_name) parts.push(inc.zone_name);
  if (inc.flat_label && atHome) parts.push(t('resident.flatN', { n: inc.flat_label }));
  else if (inc.floor != null && !copiedFloor) parts.push(floorLabel(inc.floor, t));
  if (inc.asset_name) parts.push(inc.asset_name);
  if (inc.location_note) parts.push(inc.location_note);
  return parts.join(' · ');
}

/** 'maintenance' for lift/power/water, 'security' for fire/medical/security */
export function teamFor(type) {
  return SPECIALTY_PRESETS.maintenance.includes(type) ? 'maintenance' : 'security';
}

export function telHref(phone) {
  return `tel:${String(phone || '').replace(/[^\d+]/g, '')}`;
}

export function firstName(profile) {
  return (profile?.full_name || '').trim().split(/\s+/)[0] || '';
}

/** RFC 4122 v4 id; works on plain-http LAN dev too, where crypto.randomUUID is missing. */
export function newClientId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
