// Single source of truth for incident types, statuses and roles.
// Screens read labels, icons and colours from here instead of local maps.
import { ArrowUpDown, Flame, HeartPulse, Droplets, Zap, ShieldAlert, CircleAlert } from 'lucide-react';

export const INCIDENT_TYPES = {
  lift:     { label: 'Lift stuck',     short: 'Lift',     icon: ArrowUpDown, tone: 'var(--t-lift)',     weight: 85 },
  fire:     { label: 'Fire',           short: 'Fire',     icon: Flame,       tone: 'var(--t-fire)',     weight: 100 },
  medical:  { label: 'Medical',        short: 'Medical',  icon: HeartPulse,  tone: 'var(--t-medical)',  weight: 90 },
  water:    { label: 'Water outage',   short: 'Water',    icon: Droplets,    tone: 'var(--t-water)',    weight: 65 },
  power:    { label: 'Power failure',  short: 'Power',    icon: Zap,         tone: 'var(--t-power)',    weight: 60 },
  security: { label: 'Security',       short: 'Security', icon: ShieldAlert, tone: 'var(--t-security)', weight: 70 },
};

export const TYPE_ORDER = ['lift', 'fire', 'medical', 'water', 'power', 'security'];

const UNKNOWN_TYPE = { label: 'Incident', short: 'Incident', icon: CircleAlert, tone: 'var(--text-muted)', weight: 50 };

export function getType(type) {
  return INCIDENT_TYPES[type] || UNKNOWN_TYPE;
}

// Forward-only lifecycle. `step` orders them; `tone` colours the badge.
export const STATUSES = {
  pending:      { label: 'Waiting',       staffLabel: 'Open',      step: 0, tone: 'var(--warning)' },
  acknowledged: { label: 'Accepted',      staffLabel: 'Claimed',   step: 1, tone: 'var(--primary)' },
  en_route:     { label: 'On the way',    staffLabel: 'En route',  step: 2, tone: 'var(--primary)' },
  on_scene:     { label: 'Help arrived',  staffLabel: 'On scene',  step: 3, tone: 'var(--primary)' },
  resolved:     { label: 'Resolved',      staffLabel: 'Resolved',  step: 4, tone: 'var(--success)' },
  cancelled:    { label: 'Cancelled',     staffLabel: 'Cancelled', step: 4, tone: 'var(--text-muted)' },
};

export const ACTIVE_STATUSES = ['pending', 'acknowledged', 'en_route', 'on_scene'];

export function getStatus(status) {
  return STATUSES[status] || STATUSES.pending;
}

// Next action a responder can take from each status
export const NEXT_STATUS = {
  acknowledged: { status: 'en_route', label: 'On my way' },
  en_route: { status: 'on_scene', label: 'Reached' },
  on_scene: { status: 'resolved', label: 'Mark resolved' },
};

export const ROLES = {
  student: { label: 'Student', home: '/student' },
  responder: { label: 'Responder', home: '/responder' },
  admin: { label: 'Admin', home: '/admin' },
};

export function roleHome(role) {
  return ROLES[role?.toLowerCase()]?.home || '/student';
}

// Zone tiers for backup power priority
export const TIERS = {
  P1: { label: 'Never cut', tone: 'var(--danger)' },
  P2: { label: 'Cut last', tone: 'var(--warning)' },
  P3: { label: 'Rotate', tone: 'var(--primary)' },
  P4: { label: 'Cut first', tone: 'var(--success)' },
};

export const POWER_STATES = {
  on: { label: 'On', tone: 'var(--success)' },
  rotating: { label: 'Rotating', tone: 'var(--warning)' },
  off: { label: 'Off', tone: 'var(--danger)' },
};
