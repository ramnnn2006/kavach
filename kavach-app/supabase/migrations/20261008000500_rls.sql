-- Kavach for Societies — grants and row-level security
--
-- Principle: anon gets nothing. authenticated gets narrow column grants + policies.
-- All state transitions (claim / status / assign / power / checks / safety checks) go through RPCs.

-- ── Reset default grants (Supabase default-privileges grant ALL to anon/authenticated) ──
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, public;

grant usage on schema public to authenticated;

-- ── Enable RLS everywhere ──────────────────────────────────────────────────
alter table public.societies              enable row level security;
alter table public.zones                  enable row level security;
alter table public.flats                  enable row level security;
alter table public.profiles               enable row level security;
alter table public.hazard_weights         enable row level security;
alter table public.assets                 enable row level security;
alter table public.asset_checks           enable row level security;
alter table public.incidents              enable row level security;
alter table public.incident_events        enable row level security;
alter table public.notices                enable row level security;
alter table public.contacts               enable row level security;
alter table public.safety_checks          enable row level security;
alter table public.safety_check_responses enable row level security;
alter table public.first_responder_acks   enable row level security;
alter table public.power_events           enable row level security;

-- ── societies ──────────────────────────────────────────────────────────────
grant select on public.societies to authenticated;
grant update (name, city, address, security_phone, escalate_l2_after, escalate_l3_after) on public.societies to authenticated;

drop policy if exists societies_select on public.societies;
create policy societies_select on public.societies
  for select to authenticated
  using (id = public.auth_society());

drop policy if exists societies_admin_update on public.societies;
create policy societies_admin_update on public.societies
  for update to authenticated
  using (id = public.auth_society() and public.is_admin())
  with check (id = public.auth_society() and public.is_admin());

-- ── zones ──────────────────────────────────────────────────────────────────
grant select on public.zones to authenticated;
grant insert (society_id, name, code, kind, tier, floors, sort_order) on public.zones to authenticated;
grant update (name, code, kind, tier, floors, sort_order) on public.zones to authenticated;   -- power_state via RPC
grant delete on public.zones to authenticated;

drop policy if exists zones_select on public.zones;
create policy zones_select on public.zones
  for select to authenticated
  using (society_id = public.auth_society());

drop policy if exists zones_admin_write on public.zones;
create policy zones_admin_write on public.zones
  for all to authenticated
  using (society_id = public.auth_society() and public.is_admin())
  with check (society_id = public.auth_society() and public.is_admin());

-- ── flats ──────────────────────────────────────────────────────────────────
grant select on public.flats to authenticated;
grant insert (society_id, zone_id, number, floor) on public.flats to authenticated;
grant update (zone_id, number, floor) on public.flats to authenticated;
grant delete on public.flats to authenticated;

drop policy if exists flats_select on public.flats;
create policy flats_select on public.flats
  for select to authenticated
  using (society_id = public.auth_society());

drop policy if exists flats_admin_write on public.flats;
create policy flats_admin_write on public.flats
  for all to authenticated
  using (society_id = public.auth_society() and public.is_admin())
  with check (society_id = public.auth_society() and public.is_admin());

-- ── profiles ───────────────────────────────────────────────────────────────
-- role / specialties / on_duty / society_id are NOT grantable: changed only through RPCs.
grant select on public.profiles to authenticated;
grant update (full_name, phone, flat_id, language, vulnerability, first_responder_skill) on public.profiles to authenticated;

drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select to authenticated
  using (id = auth.uid());

drop policy if exists profiles_select_staff on public.profiles;
create policy profiles_select_staff on public.profiles
  for select to authenticated
  using (society_id = public.auth_society() and public.is_staff());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (society_id = public.auth_society() and public.is_admin())
  with check (society_id = public.auth_society() and public.is_admin());

-- ── hazard_weights ─────────────────────────────────────────────────────────
grant select, insert, update, delete on public.hazard_weights to authenticated;

drop policy if exists hazard_weights_select on public.hazard_weights;
create policy hazard_weights_select on public.hazard_weights
  for select to authenticated
  using (society_id = public.auth_society());

drop policy if exists hazard_weights_admin_write on public.hazard_weights;
create policy hazard_weights_admin_write on public.hazard_weights
  for all to authenticated
  using (society_id = public.auth_society() and public.is_admin())
  with check (society_id = public.auth_society() and public.is_admin());

-- ── assets ─────────────────────────────────────────────────────────────────
grant select on public.assets to authenticated;
grant insert (society_id, zone_id, kind, name, code, vendor, amc_expires_on, licence_expires_on, notes) on public.assets to authenticated;
grant update (zone_id, name, code, vendor, amc_expires_on, licence_expires_on, notes) on public.assets to authenticated;  -- state via RPC
grant delete on public.assets to authenticated;

drop policy if exists assets_select on public.assets;
create policy assets_select on public.assets
  for select to authenticated
  using (society_id = public.auth_society());

drop policy if exists assets_admin_write on public.assets;
create policy assets_admin_write on public.assets
  for all to authenticated
  using (society_id = public.auth_society() and public.is_admin())
  with check (society_id = public.auth_society() and public.is_admin());

-- ── asset_checks ───────────────────────────────────────────────────────────
grant select on public.asset_checks to authenticated;
grant insert (society_id, asset_id, zone_id, kind, title, interval_days, due_at, notes) on public.asset_checks to authenticated;
grant update (asset_id, zone_id, kind, title, interval_days, due_at, notes) on public.asset_checks to authenticated;  -- completion via RPC
grant delete on public.asset_checks to authenticated;

drop policy if exists asset_checks_select on public.asset_checks;
create policy asset_checks_select on public.asset_checks
  for select to authenticated
  using (society_id = public.auth_society());

drop policy if exists asset_checks_admin_write on public.asset_checks;
create policy asset_checks_admin_write on public.asset_checks
  for all to authenticated
  using (society_id = public.auth_society() and public.is_admin())
  with check (society_id = public.auth_society() and public.is_admin());

-- ── incidents ──────────────────────────────────────────────────────────────
-- Insert only (trigger forces reporter/status/score); every change goes through RPCs.
grant select on public.incidents to authenticated;
grant insert (client_id, source, type, zone_id, flat_id, floor, asset_id, location_note, description, people_affected) on public.incidents to authenticated;

drop policy if exists incidents_select_reporter on public.incidents;
create policy incidents_select_reporter on public.incidents
  for select to authenticated
  using (reporter_id = auth.uid());

drop policy if exists incidents_select_responder on public.incidents;
create policy incidents_select_responder on public.incidents
  for select to authenticated
  using (
    society_id = public.auth_society()
    and public.is_responder()
    and (assigned_to = auth.uid() or type = any (public.auth_specialties()))
  );

drop policy if exists incidents_select_admin on public.incidents;
create policy incidents_select_admin on public.incidents
  for select to authenticated
  using (society_id = public.auth_society() and public.is_admin());

-- Community first responders see active medical incidents in their society
drop policy if exists incidents_select_first_responder on public.incidents;
create policy incidents_select_first_responder on public.incidents
  for select to authenticated
  using (
    society_id = public.auth_society()
    and type = 'medical'
    and public.is_active_status(status)
    and public.auth_is_first_responder()
  );

drop policy if exists incidents_insert_self on public.incidents;
create policy incidents_insert_self on public.incidents
  for insert to authenticated
  with check (reporter_id = auth.uid() and society_id = public.auth_society());

-- ── incident_events (read if you can read the incident; written by triggers only) ──
grant select on public.incident_events to authenticated;

drop policy if exists incident_events_select on public.incident_events;
create policy incident_events_select on public.incident_events
  for select to authenticated
  using (exists (select 1 from public.incidents i where i.id = incident_events.incident_id));

-- ── notices ────────────────────────────────────────────────────────────────
grant select on public.notices to authenticated;
grant insert (society_id, author_id, author_name, title, body, pinned, expires_at) on public.notices to authenticated;
grant update (title, body, pinned, expires_at) on public.notices to authenticated;
grant delete on public.notices to authenticated;

drop policy if exists notices_select on public.notices;
create policy notices_select on public.notices
  for select to authenticated
  using (society_id = public.auth_society());

drop policy if exists notices_admin_write on public.notices;
create policy notices_admin_write on public.notices
  for all to authenticated
  using (society_id = public.auth_society() and public.is_admin())
  with check (society_id = public.auth_society() and public.is_admin()
              and (author_id is null or author_id = auth.uid()));

-- ── contacts ───────────────────────────────────────────────────────────────
grant select on public.contacts to authenticated;
grant insert (society_id, kind, name, role_label, phone, available, sort_order) on public.contacts to authenticated;
grant update (kind, name, role_label, phone, available, sort_order) on public.contacts to authenticated;
grant delete on public.contacts to authenticated;

drop policy if exists contacts_select on public.contacts;
create policy contacts_select on public.contacts
  for select to authenticated
  using (society_id = public.auth_society());

drop policy if exists contacts_admin_write on public.contacts;
create policy contacts_admin_write on public.contacts
  for all to authenticated
  using (society_id = public.auth_society() and public.is_admin())
  with check (society_id = public.auth_society() and public.is_admin());

-- ── safety_checks / responses (writes via RPC) ─────────────────────────────
grant select on public.safety_checks to authenticated;

drop policy if exists safety_checks_select on public.safety_checks;
create policy safety_checks_select on public.safety_checks
  for select to authenticated
  using (society_id = public.auth_society());

grant select on public.safety_check_responses to authenticated;

drop policy if exists safety_check_responses_select_self on public.safety_check_responses;
create policy safety_check_responses_select_self on public.safety_check_responses
  for select to authenticated
  using (profile_id = auth.uid());

drop policy if exists safety_check_responses_select_staff on public.safety_check_responses;
create policy safety_check_responses_select_staff on public.safety_check_responses
  for select to authenticated
  using (society_id = public.auth_society() and public.is_staff());

-- ── first_responder_acks (insert via RPC) ──────────────────────────────────
grant select on public.first_responder_acks to authenticated;

drop policy if exists first_responder_acks_select on public.first_responder_acks;
create policy first_responder_acks_select on public.first_responder_acks
  for select to authenticated
  using (exists (select 1 from public.incidents i where i.id = first_responder_acks.incident_id));

-- ── power_events (insert via RPC) ──────────────────────────────────────────
grant select on public.power_events to authenticated;

drop policy if exists power_events_select on public.power_events;
create policy power_events_select on public.power_events
  for select to authenticated
  using (society_id = public.auth_society());

-- service_role keeps full access (Supabase default) for seeding and server jobs
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- Helpers used inside policies must be executable by authenticated
grant execute on function public.is_admin()                                   to authenticated, service_role;
grant execute on function public.is_responder()                               to authenticated, service_role;
grant execute on function public.is_staff()                                   to authenticated, service_role;
grant execute on function public.is_active_status(public.incident_status)     to authenticated, service_role;
grant execute on function public.status_rank(public.incident_status)          to authenticated, service_role;
grant execute on function public.default_hazard_weight(public.incident_type)  to authenticated, service_role;
grant execute on function public.asset_kind_type(public.asset_kind)           to authenticated, service_role;
grant execute on function public.tier_score(public.priority_tier)             to authenticated, service_role;
grant execute on function public.has_vulnerability(jsonb)                     to authenticated, service_role;
grant execute on function public.compute_urgency(int, public.priority_tier, int, numeric, boolean) to authenticated, service_role;
grant execute on function public.escalation_for(timestamptz, public.incident_status, interval, interval) to authenticated, service_role;
grant execute on function public.safe_uuid(text)                              to authenticated, service_role;
