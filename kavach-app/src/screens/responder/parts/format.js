// Formatting helpers shared by responder screens and the incident detail.
import { SPECIALTY_PRESETS } from '../../../config/society';

const VULN_FLAGS = ['elderly', 'mobility', 'medical_device', 'infant'];

export function urgencyTone(score) {
  if (score >= 75) return 'var(--red)';
  if (score >= 50) return 'var(--orange)';
  return 'var(--gray)';
}

export function floorLabel(floor, t) {
  if (floor == null) return null;
  return floor === 0 ? t('common.groundFloor') : t('responder.floorN', { n: floor });
}

/** "Tower A · A-1204 · Floor 12 · Lift A2" */
export function placeLine(inc, t) {
  return [inc?.zone_name, inc?.flat_label, floorLabel(inc?.floor, t), inc?.asset_name].filter(Boolean).join(' · ');
}

export function peopleLabel(n, t) {
  return n === 1 ? t('common.onePerson') : t('common.peopleCount', { n: n || 1 });
}

/** Short text for the badge: the reporter's own note wins ("Uses a wheelchair"), else the flags. */
export function vulnerabilityShort(v, t) {
  if (!v || typeof v !== 'object') return '';
  const note = typeof v.note === 'string' ? v.note.trim() : '';
  if (note) return note;
  return VULN_FLAGS.filter(k => v[k]).map(k => t(`responder.vuln_${k}`)).join(', ');
}

/** Full text for the detail screen: flags + note. */
export function vulnerabilityFull(v, t) {
  if (!v || typeof v !== 'object') return '';
  const flags = VULN_FLAGS.filter(k => v[k]).map(k => t(`responder.vuln_${k}`));
  const note = typeof v.note === 'string' ? v.note.trim() : '';
  return [...flags, note].filter(Boolean).join(' · ');
}

/** "Maintenance · Lift, Power, Water" — admins get "All specialties". */
export function specialtySummary(profile, t) {
  if (profile?.role === 'admin') return t('responder.allSpecialties');
  const list = profile?.specialties || [];
  if (!list.length) return t('responder.noSpecialties');
  const names = list.map(s => t(`common.typeShort_${s}`)).join(', ');
  const preset = Object.entries(SPECIALTY_PRESETS)
    .find(([, types]) => types.length === list.length && types.every(x => list.includes(x)))?.[0];
  return preset ? `${t(`responder.preset_${preset}`)} · ${names}` : names;
}

/** "14 min" / "1 h 5 min" */
export function formatDuration(mins, t) {
  if (mins == null || Number.isNaN(mins)) return '–';
  if (mins < 60) return t('responder.minutes', { n: mins });
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? t('responder.hoursMinutes', { h, m }) : t('responder.hours', { h });
}

/** Parse a Postgres date ('2026-10-03') as a local calendar day. */
export function parseDay(value) {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value).slice(0, 10));
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** "3 Oct" (adds the year when it isn't this year). Accepts a date string or timestamp. */
export function shortDate(value, lang = 'en', now = Date.now()) {
  if (!value) return '';
  const d = typeof value === 'string' && value.length === 10 ? parseDay(value) : new Date(value);
  if (!d || Number.isNaN(d.getTime())) return '';
  const opts = { day: 'numeric', month: 'short' };
  if (d.getFullYear() !== new Date(now).getFullYear()) opts.year = 'numeric';
  return d.toLocaleDateString(lang === 'ta' ? 'ta-IN' : 'en-IN', opts);
}

/** Whole days from today (local) to a date string; negative when in the past. */
export function daysUntil(value, now = Date.now()) {
  const d = parseDay(value);
  if (!d) return null;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

export function telHref(phone) {
  return `tel:${String(phone || '').replace(/[^\d+]/g, '')}`;
}
