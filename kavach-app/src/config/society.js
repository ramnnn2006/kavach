// Single source of truth for incident types, statuses, roles and navigation.
// Labels come from i18n (src/i18n/strings/common.js): t(`common.type_${type}`) etc.
import {
  ArrowUpDown, Flame, HeartPulse, Droplets, Zap, ShieldAlert, CircleAlert,
  House, ClipboardList, Megaphone, Phone, User, Bell, ClipboardCheck, Cog, History,
  LayoutDashboard, ListTodo, Users, Building2, ChartColumn, Siren, Monitor,
} from 'lucide-react';

export const APP_NAME = 'Kavach';
export const APP_VERSION = '0.3';

export const INCIDENT_TYPES = {
  lift:     { icon: ArrowUpDown, tone: 'var(--t-lift)' },
  fire:     { icon: Flame,       tone: 'var(--t-fire)' },
  medical:  { icon: HeartPulse,  tone: 'var(--t-medical)' },
  water:    { icon: Droplets,    tone: 'var(--t-water)' },
  power:    { icon: Zap,         tone: 'var(--t-power)' },
  security: { icon: ShieldAlert, tone: 'var(--t-security)' },
};

// Order shown in the report picker (most life-threatening first; lift has its own hero button)
export const TYPE_ORDER = ['fire', 'medical', 'lift', 'security', 'power', 'water'];

const UNKNOWN_TYPE = { icon: CircleAlert, tone: 'var(--gray)' };
export function getType(type) {
  return INCIDENT_TYPES[type] || UNKNOWN_TYPE;
}

// Forward-only lifecycle
export const STATUSES = {
  pending:      { step: 0, tone: 'var(--orange)' },
  acknowledged: { step: 1, tone: 'var(--blue)' },
  en_route:     { step: 2, tone: 'var(--blue)' },
  on_scene:     { step: 3, tone: 'var(--indigo)' },
  resolved:     { step: 4, tone: 'var(--green)' },
  cancelled:    { step: 4, tone: 'var(--gray)' },
};
export const ACTIVE_STATUSES = ['pending', 'acknowledged', 'en_route', 'on_scene'];
export function getStatus(status) {
  return STATUSES[status] || STATUSES.pending;
}
export function isActive(status) {
  return ACTIVE_STATUSES.includes(status);
}

// Next action a responder can take from each status (labels are i18n keys in responder ns)
export const NEXT_STATUS = {
  acknowledged: { status: 'en_route', labelKey: 'responder.actionOnMyWay' },
  en_route: { status: 'on_scene', labelKey: 'responder.actionReached' },
  on_scene: { status: 'resolved', labelKey: 'responder.actionResolve' },
};

export const ROLES = ['resident', 'responder', 'admin'];
const ROLE_HOME = { resident: '/resident', responder: '/responder', admin: '/admin' };
export function roleHome(role) {
  return ROLE_HOME[role] || '/resident';
}

// Responder specialties presets
export const SPECIALTY_PRESETS = {
  maintenance: ['lift', 'power', 'water'],
  security: ['fire', 'medical', 'security'],
};

// Navigation per role. `tabs` = bottom tab bar (≤ 5) and sidebar; `more` = sidebar-only extras on desktop.
export const NAV = {
  resident: {
    tabs: [
      { id: 'home', icon: House, labelKey: 'common.nav_home', path: '/resident' },
      { id: 'reports', icon: ClipboardList, labelKey: 'common.nav_reports', path: '/resident/reports' },
      { id: 'notices', icon: Megaphone, labelKey: 'common.nav_notices', path: '/resident/notices' },
      { id: 'contacts', icon: Phone, labelKey: 'common.nav_contacts', path: '/resident/contacts' },
      { id: 'profile', icon: User, labelKey: 'common.nav_profile', path: '/profile' },
    ],
    more: [],
  },
  responder: {
    tabs: [
      { id: 'alerts', icon: Bell, labelKey: 'common.nav_alerts', path: '/responder' },
      { id: 'checks', icon: ClipboardCheck, labelKey: 'common.nav_checks', path: '/responder/checks' },
      { id: 'assets', icon: Cog, labelKey: 'common.nav_assets', path: '/responder/assets' },
      { id: 'history', icon: History, labelKey: 'common.nav_history', path: '/responder/history' },
      { id: 'profile', icon: User, labelKey: 'common.nav_profile', path: '/profile' },
    ],
    more: [],
  },
  admin: {
    tabs: [
      { id: 'overview', icon: LayoutDashboard, labelKey: 'common.nav_overview', path: '/admin' },
      { id: 'incidents', icon: ListTodo, labelKey: 'common.nav_incidents', path: '/admin/incidents' },
      { id: 'team', icon: Users, labelKey: 'common.nav_team', path: '/admin/team' },
      { id: 'society', icon: Building2, labelKey: 'common.nav_society', path: '/admin/society' },
      { id: 'profile', icon: User, labelKey: 'common.nav_profile', path: '/profile' },
    ],
    more: [
      { id: 'insights', icon: ChartColumn, labelKey: 'common.nav_insights', path: '/admin/insights' },
      { id: 'notices', icon: Megaphone, labelKey: 'common.nav_notices', path: '/admin/notices' },
      { id: 'safety', icon: Siren, labelKey: 'admin.navSafetyCheck', path: '/admin/safety-check' },
      { id: 'board', icon: Monitor, labelKey: 'admin.navBoard', path: '/board' },
    ],
  },
};

// Zone tiers for backup power priority (labels: admin.tier_P1 …)
export const TIERS = {
  P1: { tone: 'var(--red)' },
  P2: { tone: 'var(--orange)' },
  P3: { tone: 'var(--blue)' },
  P4: { tone: 'var(--green)' },
};
export const POWER_STATES = {
  on: { tone: 'var(--green)' },
  rotating: { tone: 'var(--orange)' },
  off: { tone: 'var(--red)' },
};
export const ASSET_STATES = {
  ok: { tone: 'var(--green)' },
  degraded: { tone: 'var(--orange)' },
  down: { tone: 'var(--red)' },
  maintenance: { tone: 'var(--gray)' },
};

// Society-independent public emergency numbers (India)
export const PUBLIC_EMERGENCY = [
  { number: '112', labelKey: 'resident.contact112' },
  { number: '101', labelKey: 'resident.contact101' },
  { number: '108', labelKey: 'resident.contact108' },
];
