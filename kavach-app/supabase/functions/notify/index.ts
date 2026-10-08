// Kavach — `notify` edge function: Web Push for incidents and Safety Checks.
//
// Called only by the database trigger public.notify_dispatch() through pg_net, after commit.
// Deployed with verify_jwt = false because the caller is Postgres, not a signed-in user. Instead it
// authenticates every request with the `x-kavach-hook` header, compared in constant time against the
// Vault secret `notify_hook_secret` (read through the service-role-only RPC public.get_push_config()).
//
// The trigger payload only says WHAT changed (row id + old/new status, level, assignee, actor).
// Everything the push says, and who receives it, comes from a fresh read of the row.
//
// Web Push: jsr:@negrel/webpush (Deno-native WebCrypto, RFC 8291 aes128gcm + RFC 8292 VAPID).
// VAPID keys are stored in Vault as base64url strings (web-push format) and converted to JWK here.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import * as webpush from 'jsr:@negrel/webpush@0.5.0';

// ── Types ──────────────────────────────────────────────────────────────────
type Lang = 'en' | 'ta';
type IncidentType = 'lift' | 'fire' | 'medical' | 'water' | 'power' | 'security';
type Status = 'pending' | 'acknowledged' | 'en_route' | 'on_scene' | 'resolved' | 'cancelled';
type Role = 'resident' | 'responder' | 'admin';

interface Hook {
  table: 'incidents' | 'safety_checks';
  op: 'INSERT' | 'UPDATE';
  id: string;
  status?: Status | null;
  old_status?: Status | null;
  escalation_level?: number | null;
  old_escalation_level?: number | null;
  assigned_to?: string | null;
  old_assigned_to?: string | null;
  actor_id?: string | null;
}

interface Incident {
  id: string;
  society_id: string;
  type: IncidentType;
  status: Status;
  reporter_id: string;
  zone_name: string | null;
  flat_label: string | null;
  floor: number | null;
  asset_name: string | null;
  people_affected: number;
  vulnerable: boolean;
  assigned_to: string | null;
  assigned_name: string | null;
  escalation_level: number;
  created_at: string;
}

interface SafetyCheck {
  id: string;
  society_id: string;
  scope: 'society' | 'zone';
  zone_id: string | null;
  message: string;
  started_by: string | null;
  ended_at: string | null;
}

interface Recipient {
  id: string;
  role: Role;
  language: Lang;
}

interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag: string;
  urgent: boolean;
}

interface Message {
  to: Recipient;
  payload: PushPayload;
  ttl: number; // seconds the push service keeps it for an offline device
}

interface Subscription {
  id: string;
  profile_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface PushConfig {
  hookSecret: string;
  subject: string;
  vapidKeys: CryptoKeyPair;
}

// ── Setup ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? secretKeyFallback();

function secretKeyFallback(): string {
  try {
    return JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}').default ?? '';
  } catch {
    return '';
  }
}

const db: SupabaseClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const HOOK_HEADER = 'x-kavach-hook';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CONFIG_TTL_MS = 5 * 60 * 1000;
const CONFIG_REFRESH_MIN_MS = 30 * 1000; // a wrong secret can force at most one re-read per 30 s
const RESPONSE_BUDGET_MS = 4000; // pg_net waits 5 s; anything slower finishes in the background
const SEND_TIMEOUT_MS = 10000;
const SEND_CONCURRENCY = 25;
const TTL_URGENT = 60 * 60; // an unanswered emergency is stale after an hour
const TTL_UPDATE = 6 * 60 * 60;

// ── Strings (English + Tamil) ───────────────────────────────────────────────
const TYPE: Record<Lang, Record<IncidentType, string>> = {
  en: { lift: 'lift', fire: 'fire', medical: 'medical', water: 'water', power: 'power', security: 'security' },
  ta: { lift: 'லிஃப்ட்', fire: 'தீ', medical: 'மருத்துவ', water: 'தண்ணீர்', power: 'மின்சார', security: 'பாதுகாப்பு' },
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const T = {
  en: {
    someone: 'A responder',
    people: (n: number) => (n === 1 ? '1 person' : `${n} people`),
    floor: (n: number) => (n === 0 ? 'Ground floor' : `Floor ${n}`),
    vulnerable: 'Needs extra care',
    newAlert: (type: string) => `New ${type} alert`,
    newAlertNoDuty: (type: string) => `New ${type} alert — no one on duty`,
    firstAidTitle: 'Medical help needed nearby',
    firstAidBody: (place: string) => `${place} — can you help? Tap to see.`,
    accepted: (name: string) => `${name} accepted your alert`,
    assignedToYours: (name: string) => `${name} is assigned to your alert`,
    acceptedBody: 'Help is being arranged. Tap to track.',
    enRoute: (name: string) => `${name} is on the way`,
    enRouteBody: 'Stay where you are if it is safe.',
    onScene: 'Help has arrived',
    onSceneBody: (name: string) => `${name} is at your location.`,
    resolved: 'Your alert is resolved',
    resolvedBody: 'Tap to see what was done.',
    cancelled: 'Your alert was cancelled',
    cancelledBody: (type: string, place: string) => `${cap(type)} alert · ${place}`,
    assigned: (type: string) => `You've been assigned: ${type} alert`,
    reassigned: 'Alert reassigned',
    reassignedBody: (type: string, zone: string, name: string) => `${cap(type)} alert in ${zone} is now with ${name}.`,
    staffCancelled: 'Alert cancelled',
    staffCancelledBody: (type: string, zone: string) => `${cap(type)} alert in ${zone} was cancelled.`,
    escalated: (min: number, type: string, zone: string) => `Unclaimed for ${min} min: ${type} alert in ${zone}`,
    escalatedBody: (rest: string, level: number) => `${rest} · Level ${level}. Assign someone now.`,
    safetyTitle: 'Safety Check',
    safetyBody: (message: string) => `${message} — tap to answer`,
  },
  ta: {
    someone: 'ஒருவர்',
    people: (n: number) => (n === 1 ? '1 நபர்' : `${n} நபர்கள்`),
    floor: (n: number) => (n === 0 ? 'தரைத்தளம்' : `மாடி ${n}`),
    vulnerable: 'கூடுதல் கவனம் தேவை',
    newAlert: (type: string) => `புதிய ${type} அவசர அழைப்பு`,
    newAlertNoDuty: (type: string) => `புதிய ${type} அவசர அழைப்பு — பணியில் யாரும் இல்லை`,
    firstAidTitle: 'அருகில் மருத்துவ உதவி தேவை',
    firstAidBody: (place: string) => `${place} — உதவ முடியுமா? பார்க்க தட்டவும்.`,
    accepted: (name: string) => `${name} உங்கள் அழைப்பை ஏற்றுக்கொண்டார்`,
    assignedToYours: (name: string) => `உங்கள் அழைப்புக்கு ${name} நியமிக்கப்பட்டார்`,
    acceptedBody: 'உதவி ஏற்பாடு ஆகிறது. பார்க்க தட்டவும்.',
    enRoute: (name: string) => `${name} வந்துகொண்டிருக்கிறார்`,
    enRouteBody: 'பாதுகாப்பாக இருந்தால் அங்கேயே இருங்கள்.',
    onScene: 'உதவி வந்துவிட்டது',
    onSceneBody: (name: string) => `${name} உங்கள் இடத்தில் இருக்கிறார்.`,
    resolved: 'உங்கள் பிரச்சனை சரி செய்யப்பட்டது',
    resolvedBody: 'என்ன செய்தார்கள் என்று பார்க்க தட்டவும்.',
    cancelled: 'உங்கள் அழைப்பு ரத்து செய்யப்பட்டது',
    cancelledBody: (type: string, place: string) => `${type} அழைப்பு · ${place}`,
    assigned: (type: string) => `உங்களுக்கு ஒதுக்கப்பட்டது: ${type} அழைப்பு`,
    reassigned: 'அழைப்பு மாற்றப்பட்டது',
    reassignedBody: (type: string, zone: string, name: string) =>
      `${zone} ${type} அழைப்பை இப்போது ${name} பார்த்துக்கொள்கிறார்.`,
    staffCancelled: 'அழைப்பு ரத்து',
    staffCancelledBody: (type: string, zone: string) => `${zone} ${type} அழைப்பு ரத்து செய்யப்பட்டது.`,
    escalated: (min: number, type: string, zone: string) =>
      `${min} நிமிடமாக யாரும் எடுக்கவில்லை: ${zone} ${type} அழைப்பு`,
    escalatedBody: (rest: string, level: number) => `${rest} · நிலை ${level}. உடனே ஒருவரை அனுப்புங்கள்.`,
    safetyTitle: 'பாதுகாப்பு சோதனை',
    safetyBody: (message: string) => `${message} — பதில் சொல்ல தட்டவும்`,
  },
} as const;

const lang = (r: Recipient): Lang => (r.language === 'ta' ? 'ta' : 'en');
const isStaff = (r: Recipient) => r.role === 'responder' || r.role === 'admin';
const staffUrl = (id: string) => `/incident/${id}`;
const trackerUrl = (id: string) => `/resident/sos/${id}`;

function where(inc: Incident, l: Lang, withZone = true): string {
  const parts = [
    withZone ? inc.zone_name : null,
    inc.flat_label ?? (inc.floor == null ? null : T[l].floor(inc.floor)),
    inc.asset_name,
  ];
  return parts.filter(Boolean).join(' · ');
}

function details(inc: Incident, l: Lang, withZone = true): string {
  const parts = [where(inc, l, withZone), T[l].people(inc.people_affected)];
  if (inc.vulnerable) parts.push(T[l].vulnerable);
  return parts.filter(Boolean).join(' · ');
}

// ── Helpers ────────────────────────────────────────────────────────────────
function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function b64uToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function bytesToB64u(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256(text: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
}

// Constant-time: compare fixed-length digests with no early exit.
async function safeEqual(a: string, b: string): Promise<boolean> {
  const [x, y] = await Promise.all([sha256(a), sha256(b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: number | undefined;
  return Promise.race([
    p.finally(() => clearTimeout(timer)),
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error('timeout')), ms);
    }),
  ]);
}

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

async function pool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

// ── Config (Vault via service-role RPC), cached per warm worker ─────────────
let cached: { at: number; cfg: PushConfig } | null = null;

async function importVapidKeys(publicKey: string, privateKey: string): Promise<CryptoKeyPair> {
  const raw = b64uToBytes(publicKey);
  if (raw.length !== 65 || raw[0] !== 4) throw new Error('vapid_public_key is not an uncompressed P-256 point');
  if (b64uToBytes(privateKey).length !== 32) throw new Error('vapid_private_key is not a 32-byte P-256 scalar');
  const pub: JsonWebKey = {
    kty: 'EC',
    crv: 'P-256',
    x: bytesToB64u(raw.slice(1, 33)),
    y: bytesToB64u(raw.slice(33, 65)),
    ext: true,
  };
  return await webpush.importVapidKeys({ publicKey: pub, privateKey: { ...pub, d: privateKey } }, { extractable: false });
}

async function loadConfig(force = false): Promise<PushConfig> {
  const now = Date.now();
  if (cached && !force && now - cached.at < CONFIG_TTL_MS) return cached.cfg;
  if (cached && force && now - cached.at < CONFIG_REFRESH_MIN_MS) return cached.cfg;
  const { data, error } = await db.rpc('get_push_config');
  if (error) throw new Error(`get_push_config: ${error.message}`);
  const c = (data ?? {}) as Record<string, string | null>;
  if (!c.hook_secret || !c.public_key || !c.private_key) throw new Error('push secrets missing from Vault');
  const cfg: PushConfig = {
    hookSecret: c.hook_secret,
    subject: c.subject || 'mailto:alerts@kavach.app',
    vapidKeys: await importVapidKeys(c.public_key, c.private_key),
  };
  cached = { at: now, cfg };
  return cfg;
}

// ── Data access ────────────────────────────────────────────────────────────
const PROFILE_COLS = 'id, role, language';
const PAGE = 1000;

// Reads every page of a profiles query (PostgREST caps a response at 1000 rows).
// deno-lint-ignore no-explicit-any
type ProfileQuery = any;
async function allProfiles(build: () => ProfileQuery): Promise<Recipient[]> {
  const out: Recipient[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build().order('id').range(from, from + PAGE - 1);
    if (error) throw new Error(`profiles: ${error.message}`);
    const rows = (data ?? []) as unknown as Recipient[];
    out.push(...rows.map((r) => ({ id: r.id, role: r.role, language: r.language })));
    if (rows.length < PAGE) return out;
  }
}

async function profilesByIds(ids: (string | null | undefined)[]): Promise<Map<string, Recipient>> {
  const unique = [...new Set(ids.filter((v): v is string => typeof v === 'string' && UUID_RE.test(v)))];
  const map = new Map<string, Recipient>();
  if (!unique.length) return map;
  const { data, error } = await db.from('profiles').select(PROFILE_COLS).in('id', unique);
  if (error) throw new Error(`profiles: ${error.message}`);
  for (const r of (data ?? []) as Recipient[]) map.set(r.id, r);
  return map;
}

async function loadIncident(id: string): Promise<Incident | null> {
  const { data, error } = await db
    .from('incidents')
    .select(
      'id, society_id, type, status, reporter_id, zone_name, flat_label, floor, asset_name, people_affected, ' +
        'vulnerable, assigned_to, assigned_name, escalation_level, created_at',
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`incidents: ${error.message}`);
  return data as Incident | null;
}

async function loadSubscriptions(profileIds: string[]): Promise<Subscription[]> {
  const out: Subscription[] = [];
  for (const ids of chunk(profileIds, 150)) {
    const { data, error } = await db
      .from('push_subscriptions')
      .select('id, profile_id, endpoint, p256dh, auth')
      .in('profile_id', ids);
    if (error) throw new Error(`push_subscriptions: ${error.message}`);
    out.push(...((data ?? []) as Subscription[]));
  }
  return out;
}

// ── Who gets what ──────────────────────────────────────────────────────────
async function forNewIncident(inc: Incident): Promise<Message[]> {
  if (inc.status !== 'pending') return []; // already handled before we got here
  const messages: Message[] = [];

  const responders = await allProfiles(() =>
    db
      .from('profiles')
      .select(PROFILE_COLS)
      .eq('society_id', inc.society_id)
      .in('role', ['responder', 'admin'])
      .eq('on_duty', true)
      .contains('specialties', [inc.type]),
  );
  const onDuty = responders.filter((r) => r.id !== inc.reporter_id);

  for (const r of onDuty) {
    const l = lang(r);
    messages.push({
      to: r,
      payload: {
        title: T[l].newAlert(TYPE[l][inc.type]),
        body: details(inc, l),
        url: staffUrl(inc.id),
        tag: `incident-${inc.id}`,
        urgent: true,
      },
      ttl: TTL_URGENT,
    });
  }

  if (!onDuty.length) {
    const admins = await allProfiles(() =>
      db.from('profiles').select(PROFILE_COLS).eq('society_id', inc.society_id).eq('role', 'admin'),
    );
    for (const r of admins) {
      const l = lang(r);
      messages.push({
        to: r,
        payload: {
          title: T[l].newAlertNoDuty(TYPE[l][inc.type]),
          body: details(inc, l),
          url: staffUrl(inc.id),
          tag: `incident-${inc.id}`,
          urgent: true,
        },
        ttl: TTL_URGENT,
      });
    }
  }

  if (inc.type === 'medical') {
    const helpers = await allProfiles(() =>
      db
        .from('profiles')
        .select(PROFILE_COLS)
        .eq('society_id', inc.society_id)
        .eq('role', 'resident')
        .not('first_responder_skill', 'is', null),
    );
    for (const r of helpers) {
      const l = lang(r);
      messages.push({
        to: r,
        payload: {
          title: T[l].firstAidTitle,
          body: T[l].firstAidBody(where(inc, l)),
          url: '/resident',
          tag: `incident-${inc.id}`,
          urgent: true,
        },
        ttl: TTL_URGENT,
      });
    }
  }
  return messages;
}

const RANK: Record<Status, number> = { pending: 0, acknowledged: 1, en_route: 2, on_scene: 3, resolved: 4, cancelled: 4 };

async function forIncidentUpdate(inc: Incident, hook: Hook): Promise<Message[]> {
  const messages: Message[] = [];
  const statusChanged = !!hook.status && hook.status !== hook.old_status;
  const assigneeChanged = (hook.assigned_to ?? null) !== (hook.old_assigned_to ?? null);
  const escalated =
    typeof hook.escalation_level === 'number' &&
    typeof hook.old_escalation_level === 'number' &&
    hook.escalation_level > hook.old_escalation_level;

  // Ignore stale events: if the row has already moved on, the newer change has its own webhook.
  const statusCurrent = statusChanged && inc.status === hook.status;
  const assigneeCurrent = assigneeChanged && (inc.assigned_to ?? null) === (hook.assigned_to ?? null);
  const escalationCurrent = escalated && inc.status === 'pending' && inc.escalation_level >= (hook.escalation_level ?? 0);

  const people = await profilesByIds([inc.reporter_id, inc.assigned_to, hook.old_assigned_to]);
  const reporter = people.get(inc.reporter_id);
  const assignee = inc.assigned_to ? people.get(inc.assigned_to) : undefined;
  const name = (l: Lang) => inc.assigned_name || T[l].someone;
  const selfClaim = !!hook.actor_id && hook.actor_id === inc.assigned_to;

  // Reporter: progress of their own alert
  if (statusCurrent && reporter && RANK[inc.status] > RANK[hook.old_status ?? 'pending']) {
    const l = lang(reporter);
    const url = isStaff(reporter) ? staffUrl(inc.id) : trackerUrl(inc.id);
    let title = '';
    let body = '';
    switch (inc.status) {
      case 'acknowledged':
        title = selfClaim ? T[l].accepted(name(l)) : T[l].assignedToYours(name(l));
        body = T[l].acceptedBody;
        break;
      case 'en_route':
        title = T[l].enRoute(name(l));
        body = T[l].enRouteBody;
        break;
      case 'on_scene':
        title = T[l].onScene;
        body = T[l].onSceneBody(name(l));
        break;
      case 'resolved':
        title = T[l].resolved;
        body = T[l].resolvedBody;
        break;
      case 'cancelled':
        title = T[l].cancelled;
        body = T[l].cancelledBody(TYPE[l][inc.type], where(inc, l));
        break;
    }
    if (title) {
      messages.push({ to: reporter, payload: { title, body, url, tag: `sos-${inc.id}`, urgent: false }, ttl: TTL_UPDATE });
    }
  }

  // Assigned responder: told when the alert they are on is cancelled by someone else
  if (statusCurrent && inc.status === 'cancelled' && assignee) {
    const l = lang(assignee);
    messages.push({
      to: assignee,
      payload: {
        title: T[l].staffCancelled,
        body: T[l].staffCancelledBody(TYPE[l][inc.type], inc.zone_name ?? ''),
        url: staffUrl(inc.id),
        tag: `incident-${inc.id}`,
        urgent: false,
      },
      ttl: TTL_UPDATE,
    });
  }

  // New assignee (admin assignment — a responder claiming it themselves is not told)
  if (assigneeCurrent && assignee && !selfClaim && RANK[inc.status] < 4) {
    const l = lang(assignee);
    messages.push({
      to: assignee,
      payload: {
        title: T[l].assigned(TYPE[l][inc.type]),
        body: details(inc, l),
        url: staffUrl(inc.id),
        tag: `incident-${inc.id}`,
        urgent: true,
      },
      ttl: TTL_URGENT,
    });
  }

  // Previous assignee on a reassignment
  const previous = hook.old_assigned_to ? people.get(hook.old_assigned_to) : undefined;
  if (assigneeCurrent && previous && previous.id !== inc.assigned_to) {
    const l = lang(previous);
    messages.push({
      to: previous,
      payload: {
        title: T[l].reassigned,
        body: T[l].reassignedBody(TYPE[l][inc.type], inc.zone_name ?? '', name(l)),
        url: staffUrl(inc.id),
        tag: `incident-${inc.id}`,
        urgent: false,
      },
      ttl: TTL_UPDATE,
    });
  }

  // Escalation: still unclaimed → every admin
  if (escalationCurrent) {
    const minutes = Math.max(1, Math.floor((Date.now() - new Date(inc.created_at).getTime()) / 60000));
    const admins = await allProfiles(() =>
      db.from('profiles').select(PROFILE_COLS).eq('society_id', inc.society_id).eq('role', 'admin'),
    );
    for (const r of admins) {
      const l = lang(r);
      messages.push({
        to: r,
        payload: {
          title: T[l].escalated(minutes, TYPE[l][inc.type], inc.zone_name ?? ''),
          body: T[l].escalatedBody(details(inc, l, false), inc.escalation_level),
          url: staffUrl(inc.id),
          tag: `incident-${inc.id}`,
          urgent: true,
        },
        ttl: TTL_URGENT,
      });
    }
  }
  return messages;
}

async function forSafetyCheck(id: string): Promise<Message[]> {
  const { data, error } = await db
    .from('safety_checks')
    .select('id, society_id, scope, zone_id, message, started_by, ended_at')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`safety_checks: ${error.message}`);
  const chk = data as SafetyCheck | null;
  if (!chk || chk.ended_at) return [];

  const residents = chk.scope === 'zone' && chk.zone_id
    ? await allProfiles(() =>
      db
        .from('profiles')
        .select(`${PROFILE_COLS}, flats!inner(zone_id)`)
        .eq('society_id', chk.society_id)
        .eq('role', 'resident')
        .eq('flats.zone_id', chk.zone_id as string)
    )
    : await allProfiles(() =>
      db.from('profiles').select(PROFILE_COLS).eq('society_id', chk.society_id).eq('role', 'resident')
    );

  return residents.map((r) => {
    const l = lang(r);
    return {
      to: r,
      payload: {
        title: T[l].safetyTitle,
        body: T[l].safetyBody(chk.message),
        url: '/resident',
        tag: `safety-${chk.id}`,
        urgent: true,
      },
      ttl: TTL_URGENT,
    };
  });
}

// ── Delivery ───────────────────────────────────────────────────────────────
type Outcome = 'sent' | 'gone' | 'failed';

function validKeys(sub: Subscription): boolean {
  try {
    const p = b64uToBytes(sub.p256dh);
    return p.length === 65 && p[0] === 4 && b64uToBytes(sub.auth).length === 16 && /^https:\/\//.test(sub.endpoint);
  } catch {
    return false;
  }
}

async function sendOne(cfg: PushConfig, sub: Subscription, msg: Message): Promise<Outcome> {
  const host = (() => {
    try {
      return new URL(sub.endpoint).host;
    } catch {
      return 'invalid-endpoint';
    }
  })();
  if (!validKeys(sub)) {
    console.warn(JSON.stringify({ msg: 'push_invalid_subscription', sub: sub.id, host }));
    return 'gone';
  }
  try {
    // Fresh ephemeral ECDH key per message (RFC 8291); VAPID JWT signed with our key (RFC 8292).
    const server = await webpush.ApplicationServer.new({ contactInformation: cfg.subject, vapidKeys: cfg.vapidKeys });
    const subscriber = server.subscribe({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } });
    await withTimeout(
      subscriber.pushTextMessage(JSON.stringify(msg.payload), {
        ttl: msg.ttl,
        urgency: msg.payload.urgent ? webpush.Urgency.High : webpush.Urgency.Normal,
      }),
      SEND_TIMEOUT_MS,
    );
    return 'sent';
  } catch (err) {
    if (err instanceof webpush.PushMessageError) {
      const status = err.response.status;
      const detail = (await err.response.text().catch(() => '')).slice(0, 200);
      if (status === 404 || status === 410) {
        console.log(JSON.stringify({ msg: 'push_gone', sub: sub.id, host, status }));
        return 'gone';
      }
      console.warn(JSON.stringify({ msg: 'push_rejected', sub: sub.id, host, status, detail }));
      return 'failed';
    }
    console.warn(JSON.stringify({ msg: 'push_network_error', sub: sub.id, host, error: String(err) }));
    return 'failed';
  }
}

async function deliver(cfg: PushConfig, messages: Message[], actorId: string | null | undefined) {
  // At most one message per person per notification tag (first rule wins), never to whoever caused the change.
  const byProfile = new Map<string, Message[]>();
  for (const m of messages) {
    if (actorId && m.to.id === actorId) continue;
    const list = byProfile.get(m.to.id) ?? [];
    if (!list.some((x) => x.payload.tag === m.payload.tag)) list.push(m);
    byProfile.set(m.to.id, list);
  }
  const recipients = [...byProfile.keys()];
  const subs = recipients.length ? await loadSubscriptions(recipients) : [];

  const jobs = subs.flatMap((sub) => (byProfile.get(sub.profile_id) ?? []).map((msg) => ({ sub, msg })));
  const outcomes = await pool(jobs, SEND_CONCURRENCY, ({ sub, msg }) => sendOne(cfg, sub, msg));

  const okIds = new Set<string>();
  const goneIds = new Set<string>();
  outcomes.forEach((o, i) => {
    if (o === 'sent') okIds.add(jobs[i].sub.id);
    if (o === 'gone') goneIds.add(jobs[i].sub.id);
  });

  for (const ids of chunk([...goneIds], 150)) {
    const { error } = await db.from('push_subscriptions').delete().in('id', ids);
    if (error) console.warn(JSON.stringify({ msg: 'push_cleanup_failed', error: error.message }));
  }
  const fresh = [...okIds].filter((id) => !goneIds.has(id));
  for (const ids of chunk(fresh, 150)) {
    const { error } = await db.from('push_subscriptions').update({ last_used_at: new Date().toISOString() }).in('id', ids);
    if (error) console.warn(JSON.stringify({ msg: 'push_touch_failed', error: error.message }));
  }

  return {
    recipients: recipients.length,
    subscriptions: subs.length,
    sent: outcomes.filter((o) => o === 'sent').length,
    failed: outcomes.filter((o) => o === 'failed').length,
    removed: goneIds.size,
  };
}

// ── Request handling ───────────────────────────────────────────────────────
function parseHook(raw: unknown): Hook | null {
  if (!raw || typeof raw !== 'object') return null;
  const h = raw as Record<string, unknown>;
  if (h.table !== 'incidents' && h.table !== 'safety_checks') return null;
  if (h.op !== 'INSERT' && h.op !== 'UPDATE') return null;
  if (typeof h.id !== 'string' || !UUID_RE.test(h.id)) return null;
  const uuidOrNull = (v: unknown) => (typeof v === 'string' && UUID_RE.test(v) ? v : null);
  const statusOrNull = (v: unknown) => (typeof v === 'string' && v in RANK ? (v as Status) : null);
  const intOrNull = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) ? v : null);
  return {
    table: h.table,
    op: h.op,
    id: h.id,
    status: statusOrNull(h.status),
    old_status: statusOrNull(h.old_status),
    escalation_level: intOrNull(h.escalation_level),
    old_escalation_level: intOrNull(h.old_escalation_level),
    assigned_to: uuidOrNull(h.assigned_to),
    old_assigned_to: uuidOrNull(h.old_assigned_to),
    actor_id: uuidOrNull(h.actor_id),
  };
}

async function handle(cfg: PushConfig, hook: Hook) {
  let kind = `${hook.table}.${hook.op}`;
  let messages: Message[] = [];

  if (hook.table === 'safety_checks') {
    if (hook.op === 'INSERT') messages = await forSafetyCheck(hook.id);
  } else {
    const inc = await loadIncident(hook.id);
    if (!inc) {
      kind += ':missing';
    } else if (hook.op === 'INSERT') {
      messages = await forNewIncident(inc);
    } else {
      messages = await forIncidentUpdate(inc, hook);
    }
  }

  const result = { kind, id: hook.id, messages: messages.length, ...(await deliver(cfg, messages, hook.actor_id)) };
  console.log(JSON.stringify({ msg: 'notify_done', ...result }));
  return result;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const provided = req.headers.get(HOOK_HEADER) ?? '';
  if (!provided) return json(401, { error: 'unauthorized' });

  let cfg: PushConfig;
  try {
    cfg = await loadConfig();
    if (!(await safeEqual(provided, cfg.hookSecret))) {
      cfg = await loadConfig(true); // the secret may have been rotated
      if (!(await safeEqual(provided, cfg.hookSecret))) return json(401, { error: 'unauthorized' });
    }
  } catch (err) {
    console.error(JSON.stringify({ msg: 'notify_config_error', error: String(err) }));
    return json(500, { error: 'not_configured' });
  }

  let hook: Hook | null = null;
  try {
    hook = parseHook(await req.json());
  } catch {
    hook = null;
  }
  if (!hook) return json(400, { error: 'bad_payload' });

  const work = handle(cfg, hook).catch((err) => {
    console.error(JSON.stringify({ msg: 'notify_failed', table: hook?.table, id: hook?.id, error: String(err) }));
    return { error: 'failed' } as const;
  });
  // Keep the worker alive until delivery finishes, even if we answer pg_net first.
  EdgeRuntime.waitUntil(work);

  const done = await Promise.race([
    work,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), RESPONSE_BUDGET_MS)),
  ]);
  if (done === null) return json(202, { accepted: true });
  if ('error' in done) return json(500, done);
  return json(200, done);
});
