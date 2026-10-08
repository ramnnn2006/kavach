// Pure helpers for admin screens (labels, sorting, simple stats). No React here.
import { toMillis, minutesBetween } from '../../../utils/time';

export const ESCALATE_DEFAULT_MIN = 2;
// Stacking order for charts: no two neighbouring colours are red/pink (colour-blind safe)
export const CHART_TYPE_ORDER = ['fire', 'lift', 'medical', 'water', 'security', 'power'];
export const VULN_KEYS = ['elderly', 'mobility', 'medical_device', 'infant'];

/** Postgres interval "00:02:00" → minutes (fallback 2). */
export function intervalMinutes(value, fallback = ESCALATE_DEFAULT_MIN) {
  if (!value || typeof value !== 'string') return fallback;
  const m = value.match(/^(\d+):(\d{2}):(\d{2})/);
  if (!m) return fallback;
  return Number(m[1]) * 60 + Number(m[2]) + Number(m[3]) / 60;
}

export function startOfToday(now = Date.now()) {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
}

export function isEscalated(inc) {
  return (inc?.escalation_level || 1) > 1;
}

export function needsAttention(inc) {
  return inc.status === 'pending' || isEscalated(inc) || inc.vulnerable;
}

export function byUrgency(a, b) {
  return (b.urgency_score || 0) - (a.urgency_score || 0) || (toMillis(a.created_at) || 0) - (toMillis(b.created_at) || 0);
}

/** Pending for longer than `minutes`. */
export function isUnclaimedFor(inc, minutes, now) {
  if (inc.status !== 'pending') return false;
  const created = toMillis(inc.created_at);
  return created != null && now - created >= minutes * 60000;
}

/** Average created → acknowledged minutes, or null if nothing was acknowledged. */
export function avgResponseMinutes(incidents) {
  const mins = incidents
    .map(i => minutesBetween(i.created_at, i.acknowledged_at))
    .filter(m => m != null);
  if (!mins.length) return null;
  return Math.round((mins.reduce((s, m) => s + m, 0) / mins.length) * 10) / 10;
}

/** "Tower B · B-0502 · Lift B2" — whatever the incident snapshot has. */
export function placeLabel(inc, t) {
  const parts = [];
  if (inc.zone_name) parts.push(inc.zone_name);
  if (inc.flat_label) parts.push(inc.flat_label);
  else if (inc.floor != null) parts.push(inc.floor === 0 ? t('common.groundFloor') : t('admin.floorN', { n: inc.floor }));
  if (inc.asset_name) parts.push(inc.asset_name);
  if (!parts.length && inc.location_note) parts.push(inc.location_note);
  return parts.join(' · ') || t('admin.placeUnknown');
}

/** Vulnerability flags → short translated labels (plus free-text note). */
export function vulnerabilityLabels(v, t) {
  if (!v || typeof v !== 'object') return [];
  const out = VULN_KEYS.filter(k => v[k]).map(k => t(`admin.vuln_${k}`));
  if (typeof v.note === 'string' && v.note.trim()) out.push(v.note.trim());
  return out;
}

export function hasVulnerability(v) {
  return vulnerabilityLabels(v, (k) => k).length > 0;
}

export function urgencyTone(score) {
  if (score >= 70) return 'var(--red)';
  if (score >= 40) return 'var(--orange)';
  return 'var(--gray)';
}

/** Elapsed time as m:ss or h:mm:ss for the command board. */
export function elapsed(ts, now) {
  const ms = toMillis(ts);
  if (ms == null) return '';
  const s = Math.max(0, Math.floor((now - ms) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

/** "8 Oct 2026" */
export function shortDate(value, lang = 'en') {
  const ms = toMillis(value);
  if (ms == null) return '';
  return new Date(ms).toLocaleDateString(lang === 'ta' ? 'ta-IN' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Whole days from today (local) to a "YYYY-MM-DD" date; negative = past. */
export function daysUntil(dateStr, now = Date.now()) {
  if (!dateStr) return null;
  const [y, m, d] = String(dateStr).slice(0, 10).split('-').map(Number);
  if (!y) return null;
  const today = new Date(now);
  const a = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const b = Date.UTC(y, m - 1, d);
  return Math.round((b - a) / 86400000);
}

export function memberFlat(m) {
  if (!m?.flat) return '';
  return [m.flat.number, m.flat.zone?.name].filter(Boolean).join(' · ');
}

/** "1 incident" / "6 incidents" */
export function incidentsLabel(n, t) {
  return Number(n) === 1 ? t('admin.incidentsOne') : t('admin.incidentsN', { n });
}
