-- Kavach for Societies — advisor fixes: one policy per table/action, auth calls evaluated once
-- per statement ((select …) initplans), FK indexes, and no direct execution of trigger functions.

-- ── Trigger functions are never called directly ─────────────────────────────
revoke execute on function public.incidents_before_insert() from public, anon, authenticated;
revoke execute on function public.incidents_after_insert() from public, anon, authenticated;
revoke execute on function public.incidents_after_update() from public, anon, authenticated;
revoke execute on function public.safety_check_responses_before_write() from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_proc where proname = 'rls_auto_enable' and pronamespace = 'public'::regnamespace) then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end $$;

-- ── Helper: split "for all" admin policies so SELECT has exactly one policy ──
do $$
declare
  t text;
begin
  foreach t in array array['zones', 'flats', 'hazard_weights', 'assets', 'asset_checks', 'contacts'] loop
    execute format('drop policy if exists %I on public.%I', t || '_admin_write', t);
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format($p$create policy %I on public.%I for select to authenticated
                     using (society_id = (select public.auth_society()))$p$, t || '_select', t);
    execute format($p$create policy %I on public.%I for insert to authenticated
                     with check (society_id = (select public.auth_society()) and (select public.is_admin()))$p$, t || '_admin_insert', t);
    execute format($p$create policy %I on public.%I for update to authenticated
                     using (society_id = (select public.auth_society()) and (select public.is_admin()))
                     with check (society_id = (select public.auth_society()) and (select public.is_admin()))$p$, t || '_admin_update', t);
    execute format($p$create policy %I on public.%I for delete to authenticated
                     using (society_id = (select public.auth_society()) and (select public.is_admin()))$p$, t || '_admin_delete', t);
  end loop;
end $$;

-- societies
drop policy if exists societies_select on public.societies;
create policy societies_select on public.societies for select to authenticated
  using (id = (select public.auth_society()));
drop policy if exists societies_admin_update on public.societies;
create policy societies_admin_update on public.societies for update to authenticated
  using (id = (select public.auth_society()) and (select public.is_admin()))
  with check (id = (select public.auth_society()) and (select public.is_admin()));

-- notices
drop policy if exists notices_select on public.notices;
drop policy if exists notices_admin_write on public.notices;
create policy notices_select on public.notices for select to authenticated
  using (society_id = (select public.auth_society()));
create policy notices_admin_insert on public.notices for insert to authenticated
  with check (society_id = (select public.auth_society()) and (select public.is_admin())
              and (author_id is null or author_id = (select auth.uid())));
create policy notices_admin_update on public.notices for update to authenticated
  using (society_id = (select public.auth_society()) and (select public.is_admin()))
  with check (society_id = (select public.auth_society()) and (select public.is_admin()));
create policy notices_admin_delete on public.notices for delete to authenticated
  using (society_id = (select public.auth_society()) and (select public.is_admin()));

-- profiles: one SELECT, one UPDATE
drop policy if exists profiles_select_self on public.profiles;
drop policy if exists profiles_select_staff on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid())
         or (society_id = (select public.auth_society()) and (select public.is_staff())));
drop policy if exists profiles_update_self on public.profiles;
drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())
         or (society_id = (select public.auth_society()) and (select public.is_admin())))
  with check (id = (select auth.uid())
              or (society_id = (select public.auth_society()) and (select public.is_admin())));

-- incidents: one SELECT policy covering reporter / responder / admin / first responder
drop policy if exists incidents_select_reporter on public.incidents;
drop policy if exists incidents_select_responder on public.incidents;
drop policy if exists incidents_select_admin on public.incidents;
drop policy if exists incidents_select_first_responder on public.incidents;
create policy incidents_select on public.incidents for select to authenticated
  using (
    reporter_id = (select auth.uid())
    or (
      society_id = (select public.auth_society())
      and (
        (select public.is_admin())
        or ((select public.is_responder())
            and (assigned_to = (select auth.uid()) or type = any ((select public.auth_specialties())::public.incident_type[])))
        or (type = 'medical' and public.is_active_status(status) and (select public.auth_is_first_responder()))
      )
    )
  );
drop policy if exists incidents_insert_self on public.incidents;
create policy incidents_insert_self on public.incidents for insert to authenticated
  with check (reporter_id = (select auth.uid()) and society_id = (select public.auth_society()));

-- safety checks
drop policy if exists safety_checks_select on public.safety_checks;
create policy safety_checks_select on public.safety_checks for select to authenticated
  using (society_id = (select public.auth_society()));
drop policy if exists safety_check_responses_select_self on public.safety_check_responses;
drop policy if exists safety_check_responses_select_staff on public.safety_check_responses;
create policy safety_check_responses_select on public.safety_check_responses for select to authenticated
  using (profile_id = (select auth.uid())
         or (society_id = (select public.auth_society()) and (select public.is_staff())));

-- power events
drop policy if exists power_events_select on public.power_events;
create policy power_events_select on public.power_events for select to authenticated
  using (society_id = (select public.auth_society()));

-- ── Foreign-key indexes ─────────────────────────────────────────────────────
create index if not exists asset_checks_asset_idx on public.asset_checks (asset_id);
create index if not exists asset_checks_done_by_idx on public.asset_checks (done_by);
create index if not exists asset_checks_zone_idx on public.asset_checks (zone_id);
create index if not exists assets_state_changed_by_idx on public.assets (state_changed_by);
create index if not exists assets_zone_idx on public.assets (zone_id);
create index if not exists first_responder_acks_profile_idx on public.first_responder_acks (profile_id);
create index if not exists incident_events_actor_idx on public.incident_events (actor_id);
create index if not exists incident_events_society_idx on public.incident_events (society_id);
create index if not exists incidents_flat_idx on public.incidents (flat_id);
create index if not exists incidents_safety_check_idx on public.incidents (safety_check_id);
create index if not exists incidents_zone_idx on public.incidents (zone_id);
create index if not exists notices_author_idx on public.notices (author_id);
create index if not exists power_events_switched_by_idx on public.power_events (switched_by);
create index if not exists safety_check_responses_incident_idx on public.safety_check_responses (incident_id);
create index if not exists safety_check_responses_profile_idx on public.safety_check_responses (profile_id);
create index if not exists safety_check_responses_society_idx on public.safety_check_responses (society_id);
create index if not exists safety_checks_started_by_idx on public.safety_checks (started_by);
create index if not exists safety_checks_zone_idx on public.safety_checks (zone_id);
