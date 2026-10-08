-- Kavach for Societies — tables and indexes

-- ── Societies ───────────────────────────────────────────────────────────────
create table if not exists public.societies (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  city               text,
  address            text,
  security_phone     text,
  power_source       public.power_source not null default 'grid',
  escalate_l2_after  interval not null default interval '2 minutes',   -- unclaimed → level 2
  escalate_l3_after  interval not null default interval '5 minutes',   -- unclaimed → level 3
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint societies_escalation_order check (escalate_l3_after > escalate_l2_after)
);

-- ── Zones (towers, common areas, utility rooms) ─────────────────────────────
create table if not exists public.zones (
  id           uuid primary key default gen_random_uuid(),
  society_id   uuid not null references public.societies(id) on delete cascade,
  name         text not null,
  code         text,
  kind         public.zone_kind not null default 'common',
  tier         public.priority_tier not null default 'P3',
  power_state  public.power_state not null default 'on',
  floors       int check (floors is null or floors between 1 and 100),
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (society_id, name)
);
create index if not exists zones_society_idx on public.zones (society_id, sort_order);

-- ── Flats ───────────────────────────────────────────────────────────────────
create table if not exists public.flats (
  id          uuid primary key default gen_random_uuid(),
  society_id  uuid not null references public.societies(id) on delete cascade,
  zone_id     uuid not null references public.zones(id) on delete cascade,
  number      text not null,                       -- "A-1204"
  floor       int not null check (floor between 0 and 100),
  created_at  timestamptz not null default now(),
  unique (society_id, number)
);
create index if not exists flats_zone_idx on public.flats (zone_id);

-- ── Profiles (1:1 with auth.users) ──────────────────────────────────────────
create table if not exists public.profiles (
  id                     uuid primary key references auth.users(id) on delete cascade,
  society_id             uuid references public.societies(id) on delete set null,
  full_name              text not null default '',
  email                  text,
  phone                  text,
  role                   public.user_role not null default 'resident',
  specialties            public.incident_type[] not null default '{}',
  on_duty                boolean not null default false,
  flat_id                uuid references public.flats(id) on delete set null,
  language               public.language_code not null default 'en',
  -- {"elderly":bool,"mobility":bool,"medical_device":bool,"infant":bool,"note":text}
  vulnerability          jsonb not null default '{}'::jsonb,
  first_responder_skill  public.first_responder_skill,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint profiles_vulnerability_object check (jsonb_typeof(vulnerability) = 'object')
);
create index if not exists profiles_society_role_idx on public.profiles (society_id, role);
create index if not exists profiles_flat_idx on public.profiles (flat_id);

-- ── Hazard weights per society (override defaults) ──────────────────────────
create table if not exists public.hazard_weights (
  society_id  uuid not null references public.societies(id) on delete cascade,
  type        public.incident_type not null,
  weight      int not null check (weight between 0 and 100),
  primary key (society_id, type)
);

-- ── Assets (lifts, DG, pumps…) ──────────────────────────────────────────────
create table if not exists public.assets (
  id                  uuid primary key default gen_random_uuid(),
  society_id          uuid not null references public.societies(id) on delete cascade,
  zone_id             uuid references public.zones(id) on delete set null,
  kind                public.asset_kind not null,
  name                text not null,                 -- "Lift A1"
  code                text,
  state               public.asset_state not null default 'ok',
  vendor              text,
  amc_expires_on      date,
  licence_expires_on  date,
  notes               text,
  state_changed_at    timestamptz,
  state_changed_by    uuid references public.profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (society_id, name)
);
create index if not exists assets_society_kind_idx on public.assets (society_id, kind);

-- ── Compliance / scheduled checks ───────────────────────────────────────────
create table if not exists public.asset_checks (
  id             uuid primary key default gen_random_uuid(),
  society_id     uuid not null references public.societies(id) on delete cascade,
  asset_id       uuid references public.assets(id) on delete cascade,
  zone_id        uuid references public.zones(id) on delete cascade,
  kind           public.asset_check_kind not null default 'other',
  title          text not null,
  interval_days  int not null default 30 check (interval_days between 1 and 3660),
  due_at         date not null,
  last_done_at   timestamptz,
  done_by        uuid references public.profiles(id) on delete set null,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint asset_checks_target check (asset_id is not null or zone_id is not null)
);
create index if not exists asset_checks_due_idx on public.asset_checks (society_id, due_at);

-- ── Incidents ───────────────────────────────────────────────────────────────
create table if not exists public.incidents (
  id                     uuid primary key default gen_random_uuid(),
  society_id             uuid not null references public.societies(id) on delete cascade,
  client_id              uuid,                                           -- idempotency key for offline outbox
  source                 public.incident_source not null default 'app',
  type                   public.incident_type not null,
  status                 public.incident_status not null default 'pending',
  reporter_id            uuid not null references public.profiles(id) on delete restrict,
  reporter_name          text,                                            -- snapshots for audit / fast reads
  reporter_phone         text,
  reporter_vulnerability jsonb not null default '{}'::jsonb,
  vulnerable             boolean not null default false,
  zone_id                uuid references public.zones(id) on delete set null,
  zone_name              text,
  flat_id                uuid references public.flats(id) on delete set null,
  flat_label             text,
  floor                  int check (floor is null or floor between 0 and 100),
  asset_id               uuid references public.assets(id) on delete set null,
  asset_name             text,
  location_note          text,
  description            text,
  people_affected        int not null default 1 check (people_affected between 1 and 500),
  hazard_weight          int not null default 50 check (hazard_weight between 0 and 100),
  zone_tier              public.priority_tier not null default 'P3',
  urgency_score          int not null default 0 check (urgency_score between 0 and 100),
  escalation_level       int not null default 1 check (escalation_level between 1 and 3),
  assigned_to            uuid references public.profiles(id) on delete set null,
  assigned_name          text,
  assigned_phone         text,
  assigned_at            timestamptz,
  acknowledged_at        timestamptz,
  en_route_at            timestamptz,
  on_scene_at            timestamptz,
  resolved_at            timestamptz,
  cancelled_at           timestamptz,
  resolution_note        text,
  safety_check_id        uuid,                                            -- fk added after safety_checks exists
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint incidents_client_id_unique unique (reporter_id, client_id),
  constraint incidents_description_len check (description is null or length(description) <= 2000)
);
create index if not exists incidents_society_status_idx on public.incidents (society_id, status, urgency_score desc, created_at);
create index if not exists incidents_reporter_idx on public.incidents (reporter_id, created_at desc);
create index if not exists incidents_assigned_idx on public.incidents (assigned_to, status);
create index if not exists incidents_type_idx on public.incidents (society_id, type, created_at desc);
create index if not exists incidents_asset_idx on public.incidents (asset_id) where asset_id is not null;

-- ── Audit log (append-only, written by triggers) ────────────────────────────
create table if not exists public.incident_events (
  id           bigint generated always as identity primary key,
  incident_id  uuid not null references public.incidents(id) on delete cascade,
  society_id   uuid not null references public.societies(id) on delete cascade,
  actor_id     uuid references public.profiles(id) on delete set null,   -- null = system
  actor_name   text,
  action       public.event_action not null,
  from_status  public.incident_status,
  to_status    public.incident_status,
  note         text,
  data         jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists incident_events_incident_idx on public.incident_events (incident_id, created_at);

-- ── Notices ─────────────────────────────────────────────────────────────────
create table if not exists public.notices (
  id          uuid primary key default gen_random_uuid(),
  society_id  uuid not null references public.societies(id) on delete cascade,
  author_id   uuid references public.profiles(id) on delete set null,
  author_name text,
  title       text not null check (length(title) between 1 and 160),
  body        text not null default '' check (length(body) <= 4000),
  pinned      boolean not null default false,
  expires_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists notices_society_idx on public.notices (society_id, pinned desc, created_at desc);

-- ── Contacts ────────────────────────────────────────────────────────────────
create table if not exists public.contacts (
  id          uuid primary key default gen_random_uuid(),
  society_id  uuid not null references public.societies(id) on delete cascade,
  kind        public.contact_kind not null default 'society',
  name        text not null,
  role_label  text,
  phone       text not null,
  available   text,                                                       -- "24×7", "9am–6pm"
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists contacts_society_idx on public.contacts (society_id, kind, sort_order);

-- ── Safety Check (roll call) ────────────────────────────────────────────────
create table if not exists public.safety_checks (
  id             uuid primary key default gen_random_uuid(),
  society_id     uuid not null references public.societies(id) on delete cascade,
  scope          public.safety_check_scope not null default 'society',
  zone_id        uuid references public.zones(id) on delete cascade,
  incident_type  public.incident_type not null default 'fire',           -- what "need help" turns into
  message        text not null check (length(message) between 1 and 300),
  started_by     uuid references public.profiles(id) on delete set null,
  started_at     timestamptz not null default now(),
  ended_at       timestamptz,
  constraint safety_checks_scope_zone check (
    (scope = 'society' and zone_id is null) or (scope = 'zone' and zone_id is not null)
  )
);
create index if not exists safety_checks_active_idx on public.safety_checks (society_id, started_at desc) where ended_at is null;

create table if not exists public.safety_check_responses (
  id            uuid primary key default gen_random_uuid(),
  check_id      uuid not null references public.safety_checks(id) on delete cascade,
  society_id    uuid not null references public.societies(id) on delete cascade,
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  status        public.safety_response_status not null,
  note          text check (note is null or length(note) <= 300),
  incident_id   uuid references public.incidents(id) on delete set null,
  responded_at  timestamptz not null default now(),
  unique (check_id, profile_id)
);
create index if not exists safety_check_responses_check_idx on public.safety_check_responses (check_id, status);

alter table public.incidents
  drop constraint if exists incidents_safety_check_fk;
alter table public.incidents
  add constraint incidents_safety_check_fk
  foreign key (safety_check_id) references public.safety_checks(id) on delete set null;

-- ── Community first responders: "I'm coming" acks ───────────────────────────
create table if not exists public.first_responder_acks (
  incident_id  uuid not null references public.incidents(id) on delete cascade,
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (incident_id, profile_id)
);

-- ── Power source switches (grid ↔ DG) ───────────────────────────────────────
create table if not exists public.power_events (
  id           bigint generated always as identity primary key,
  society_id   uuid not null references public.societies(id) on delete cascade,
  source       public.power_source not null,
  switched_by  uuid references public.profiles(id) on delete set null,
  switched_at  timestamptz not null default now(),
  note         text
);
create index if not exists power_events_society_idx on public.power_events (society_id, switched_at desc);

-- Realtime needs full row images so RLS-filtered UPDATE/DELETE payloads work
alter table public.incidents replica identity full;
alter table public.safety_check_responses replica identity full;
alter table public.zones replica identity full;
alter table public.assets replica identity full;
