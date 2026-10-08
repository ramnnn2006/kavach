-- Kavach for Societies — RPCs (all state changes), reports and views
--
-- Every RPC: security definer, search_path = public, checks the caller's role, raises with a
-- stable message the client can switch on: 'already_claimed' | 'forbidden' | 'not_found' | 'invalid'.

-- Which specialty a scheduled check belongs to (zone-level checks have no asset)
create or replace function public.check_kind_type(k public.asset_check_kind)
returns public.incident_type
language sql immutable
set search_path = public
as $$
  select case k
    when 'dg_fuel'                  then 'power'::public.incident_type
    when 'dg_load_test'             then 'power'::public.incident_type
    when 'transformer_service'      then 'power'::public.incident_type
    when 'lift_ard_battery'         then 'lift'::public.incident_type
    when 'lift_licence'             then 'lift'::public.incident_type
    when 'lift_amc'                 then 'lift'::public.incident_type
    when 'fire_extinguisher_expiry' then 'fire'::public.incident_type
    when 'fire_pump_test'           then 'fire'::public.incident_type
    when 'pump_service'             then 'water'::public.incident_type
    else null
  end;
$$;

-- ── Incidents ───────────────────────────────────────────────────────────────
create or replace function public.claim_incident(p_incident_id uuid)
returns public.incidents
language plpgsql security definer
set search_path = public
as $$
declare
  me  public.profiles%rowtype;
  inc public.incidents%rowtype;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null or me.role not in ('responder', 'admin') then
    raise exception 'forbidden' using detail = 'Only responders can claim alerts';
  end if;

  select * into inc from public.incidents
   where id = p_incident_id and society_id = me.society_id
   for update;
  if not found then
    raise exception 'not_found';
  end if;
  if inc.status <> 'pending' then
    raise exception 'already_claimed' using detail = 'Claimed by ' || coalesce(inc.assigned_name, 'someone else');
  end if;
  if me.role = 'responder' and not (inc.type = any (me.specialties)) then
    raise exception 'forbidden' using detail = 'This alert is outside your specialty';
  end if;

  update public.incidents
     set status = 'acknowledged',
         assigned_to = me.id, assigned_name = me.full_name, assigned_phone = me.phone,
         assigned_at = now(), acknowledged_at = now()
   where id = inc.id
   returning * into inc;
  return inc;
end;
$$;

create or replace function public.advance_incident(p_incident_id uuid, p_next public.incident_status, p_note text default null)
returns public.incidents
language plpgsql security definer
set search_path = public
as $$
declare
  me   public.profiles%rowtype;
  inc  public.incidents%rowtype;
  note text := nullif(trim(coalesce(p_note, '')), '');
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null or me.role not in ('responder', 'admin') then
    raise exception 'forbidden';
  end if;

  select * into inc from public.incidents
   where id = p_incident_id and society_id = me.society_id
   for update;
  if not found then
    raise exception 'not_found';
  end if;
  if not public.is_active_status(inc.status) then
    raise exception 'invalid' using detail = 'Incident is already closed';
  end if;
  if p_next in ('pending', 'cancelled') then
    raise exception 'invalid' using detail = 'Use cancel_incident to cancel';
  end if;
  if public.status_rank(p_next) <= public.status_rank(inc.status) then
    raise exception 'invalid' using detail = 'Status can only move forward';
  end if;
  if me.role = 'responder' and inc.assigned_to is distinct from me.id then
    raise exception 'forbidden' using detail = 'Only the assigned responder can update this alert';
  end if;

  update public.incidents
     set status = p_next,
         assigned_to    = coalesce(assigned_to, me.id),
         assigned_name  = coalesce(assigned_name, me.full_name),
         assigned_phone = coalesce(assigned_phone, me.phone),
         assigned_at    = coalesce(assigned_at, now()),
         resolution_note = case when p_next = 'resolved' then note else resolution_note end
   where id = inc.id
   returning * into inc;

  if note is not null and p_next <> 'resolved' then
    insert into public.incident_events (incident_id, society_id, actor_id, actor_name, action, note)
    values (inc.id, inc.society_id, me.id, me.full_name, 'note_added', note);
  end if;
  return inc;
end;
$$;

create or replace function public.cancel_incident(p_incident_id uuid, p_reason text default null)
returns public.incidents
language plpgsql security definer
set search_path = public
as $$
declare
  me  public.profiles%rowtype;
  inc public.incidents%rowtype;
  by_reporter boolean;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null then
    raise exception 'forbidden';
  end if;

  select * into inc from public.incidents
   where id = p_incident_id and society_id = me.society_id
   for update;
  if not found then
    raise exception 'not_found';
  end if;
  if not public.is_active_status(inc.status) then
    raise exception 'invalid' using detail = 'Incident is already closed';
  end if;

  by_reporter := inc.reporter_id = me.id and inc.status in ('pending', 'acknowledged');
  if not (by_reporter or me.role = 'admin') then
    raise exception 'forbidden' using detail = 'Only the reporter (before help is on the way) or an admin can cancel';
  end if;

  update public.incidents
     set status = 'cancelled',
         resolution_note = coalesce(nullif(trim(coalesce(p_reason, '')), ''),
                                    case when by_reporter then 'Cancelled by reporter' else 'Cancelled by admin' end)
   where id = inc.id
   returning * into inc;
  return inc;
end;
$$;

create or replace function public.assign_incident(p_incident_id uuid, p_responder_id uuid)
returns public.incidents
language plpgsql security definer
set search_path = public
as $$
declare
  me  public.profiles%rowtype;
  r   public.profiles%rowtype;
  inc public.incidents%rowtype;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null or me.role <> 'admin' then
    raise exception 'forbidden';
  end if;

  select * into inc from public.incidents
   where id = p_incident_id and society_id = me.society_id
   for update;
  if not found then
    raise exception 'not_found';
  end if;
  if not public.is_active_status(inc.status) then
    raise exception 'invalid' using detail = 'Incident is already closed';
  end if;

  select * into r from public.profiles
   where id = p_responder_id and society_id = me.society_id and role in ('responder', 'admin');
  if not found then
    raise exception 'not_found' using detail = 'Responder not found in this society';
  end if;
  if inc.assigned_to = r.id then
    return inc;
  end if;

  update public.incidents
     set assigned_to = r.id, assigned_name = r.full_name, assigned_phone = r.phone, assigned_at = now(),
         status = case when inc.status = 'pending' then 'acknowledged'::public.incident_status else inc.status end
   where id = inc.id
   returning * into inc;
  return inc;
end;
$$;

create or replace function public.update_incident_details(
  p_incident_id uuid,
  p_description text default null,
  p_location_note text default null,
  p_people_affected int default null,
  p_asset_id uuid default null
)
returns public.incidents
language plpgsql security definer
set search_path = public
as $$
declare
  me  public.profiles%rowtype;
  inc public.incidents%rowtype;
  a   public.assets%rowtype;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null then
    raise exception 'forbidden';
  end if;

  select * into inc from public.incidents
   where id = p_incident_id and society_id = me.society_id
   for update;
  if not found then
    raise exception 'not_found';
  end if;
  if inc.reporter_id <> me.id and me.role <> 'admin' then
    raise exception 'forbidden';
  end if;
  if not public.is_active_status(inc.status) then
    raise exception 'invalid' using detail = 'Incident is already closed';
  end if;

  if p_asset_id is not null then
    select * into a from public.assets where id = p_asset_id and society_id = me.society_id;
    if not found then
      raise exception 'invalid' using detail = 'Asset not in society';
    end if;
  end if;

  update public.incidents
     set description     = case when p_description   is null then description   else nullif(trim(p_description), '') end,
         location_note   = case when p_location_note is null then location_note else nullif(trim(p_location_note), '') end,
         people_affected = case when p_people_affected is null then people_affected
                                else least(500, greatest(1, p_people_affected)) end,
         asset_id        = coalesce(p_asset_id, asset_id),
         asset_name      = coalesce(a.name, asset_name),
         urgency_score   = public.compute_urgency(
                             hazard_weight, zone_tier,
                             case when p_people_affected is null then people_affected
                                  else least(500, greatest(1, p_people_affected)) end,
                             extract(epoch from (now() - created_at)) / 60.0, vulnerable)
   where id = inc.id
   returning * into inc;
  return inc;
end;
$$;

create or replace function public.first_responder_ack(p_incident_id uuid)
returns public.first_responder_acks
language plpgsql security definer
set search_path = public
as $$
declare
  me  public.profiles%rowtype;
  inc public.incidents%rowtype;
  ack public.first_responder_acks%rowtype;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null or me.first_responder_skill is null then
    raise exception 'forbidden' using detail = 'Only community first responders can respond';
  end if;

  select * into inc from public.incidents
   where id = p_incident_id and society_id = me.society_id;
  if not found then
    raise exception 'not_found';
  end if;
  if inc.type <> 'medical' or not public.is_active_status(inc.status) then
    raise exception 'invalid' using detail = 'Only active medical incidents';
  end if;

  insert into public.first_responder_acks (incident_id, profile_id)
  values (inc.id, me.id)
  on conflict do nothing
  returning * into ack;

  if ack.incident_id is not null then
    insert into public.incident_events (incident_id, society_id, actor_id, actor_name, action, data)
    values (inc.id, inc.society_id, me.id, me.full_name, 'first_responder_ack',
            jsonb_build_object('skill', me.first_responder_skill, 'flat', (select number from public.flats where id = me.flat_id)));
  else
    select * into ack from public.first_responder_acks where incident_id = inc.id and profile_id = me.id;
  end if;
  return ack;
end;
$$;

-- ── Team ────────────────────────────────────────────────────────────────────
create or replace function public.set_on_duty(p_on boolean)
returns public.profiles
language plpgsql security definer
set search_path = public
as $$
declare
  me public.profiles%rowtype;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null or me.role not in ('responder', 'admin') then
    raise exception 'forbidden';
  end if;
  update public.profiles set on_duty = coalesce(p_on, false) where id = me.id returning * into me;
  return me;
end;
$$;

create or replace function public.update_member(
  p_profile_id uuid, p_role public.user_role, p_specialties public.incident_type[] default null
)
returns public.profiles
language plpgsql security definer
set search_path = public
as $$
declare
  me     public.profiles%rowtype;
  target public.profiles%rowtype;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null or me.role <> 'admin' then
    raise exception 'forbidden';
  end if;

  select * into target from public.profiles where id = p_profile_id and society_id = me.society_id for update;
  if not found then
    raise exception 'not_found';
  end if;
  if target.id = me.id and p_role <> 'admin' then
    raise exception 'invalid' using detail = 'You cannot remove your own admin role';
  end if;

  update public.profiles
     set role = p_role,
         specialties = case when p_role = 'resident' then '{}'::public.incident_type[]
                            else coalesce(p_specialties, specialties) end,
         on_duty = case when p_role = 'resident' then false else on_duty end
   where id = target.id
   returning * into target;
  return target;
end;
$$;

-- ── Society: power and zones ────────────────────────────────────────────────
create or replace function public.set_zone_power(p_zone_id uuid, p_state public.power_state)
returns public.zones
language plpgsql security definer
set search_path = public
as $$
declare
  me public.profiles%rowtype;
  z  public.zones%rowtype;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null or me.role <> 'admin' then
    raise exception 'forbidden';
  end if;
  update public.zones set power_state = p_state
   where id = p_zone_id and society_id = me.society_id
   returning * into z;
  if z.id is null then
    raise exception 'not_found';
  end if;
  return z;
end;
$$;

create or replace function public.set_power_source(p_source public.power_source, p_note text default null)
returns public.societies
language plpgsql security definer
set search_path = public
as $$
declare
  me public.profiles%rowtype;
  s  public.societies%rowtype;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null or me.role <> 'admin' then
    raise exception 'forbidden';
  end if;

  update public.societies set power_source = p_source where id = me.society_id returning * into s;
  if s.id is null then
    raise exception 'not_found';
  end if;

  if p_source = 'dg' then
    -- P1 never cut · P2 cut last · P3 rotate · P4 cut first
    update public.zones
       set power_state = case tier
                           when 'P1' then 'on'::public.power_state
                           when 'P2' then 'on'::public.power_state
                           when 'P3' then 'rotating'::public.power_state
                           else 'off'::public.power_state
                         end
     where society_id = me.society_id;
  else
    update public.zones set power_state = 'on' where society_id = me.society_id;
  end if;

  insert into public.power_events (society_id, source, switched_by, note)
  values (me.society_id, p_source, me.id, nullif(trim(coalesce(p_note, '')), ''));
  return s;
end;
$$;

-- ── Assets and compliance ───────────────────────────────────────────────────
create or replace function public.set_asset_status(p_asset_id uuid, p_state public.asset_state, p_note text default null)
returns public.assets
language plpgsql security definer
set search_path = public
as $$
declare
  me public.profiles%rowtype;
  a  public.assets%rowtype;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null or me.role not in ('responder', 'admin') then
    raise exception 'forbidden';
  end if;

  select * into a from public.assets where id = p_asset_id and society_id = me.society_id for update;
  if not found then
    raise exception 'not_found';
  end if;
  if me.role = 'responder' and not (public.asset_kind_type(a.kind) = any (me.specialties)) then
    raise exception 'forbidden' using detail = 'This asset is outside your specialty';
  end if;

  update public.assets
     set state = p_state,
         notes = coalesce(nullif(trim(coalesce(p_note, '')), ''), notes)
   where id = a.id
   returning * into a;
  return a;
end;
$$;

create or replace function public.log_asset_check(p_check_id uuid, p_notes text default null)
returns public.asset_checks
language plpgsql security definer
set search_path = public
as $$
declare
  me     public.profiles%rowtype;
  c      public.asset_checks%rowtype;
  needed public.incident_type;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null or me.role not in ('responder', 'admin') then
    raise exception 'forbidden';
  end if;

  select * into c from public.asset_checks where id = p_check_id and society_id = me.society_id for update;
  if not found then
    raise exception 'not_found';
  end if;

  if c.asset_id is not null then
    select public.asset_kind_type(kind) into needed from public.assets where id = c.asset_id;
  end if;
  needed := coalesce(needed, public.check_kind_type(c.kind));

  if me.role = 'responder' and (needed is null or not (needed = any (me.specialties))) then
    raise exception 'forbidden' using detail = 'This check is outside your specialty';
  end if;

  update public.asset_checks
     set last_done_at = now(),
         done_by = me.id,
         due_at = current_date + c.interval_days,
         notes = coalesce(nullif(trim(coalesce(p_notes, '')), ''), notes)
   where id = c.id
   returning * into c;
  return c;
end;
$$;

-- ── Safety Check (roll call) ────────────────────────────────────────────────
create or replace function public.start_safety_check(
  p_scope public.safety_check_scope, p_zone_id uuid, p_message text, p_type public.incident_type default 'fire'
)
returns public.safety_checks
language plpgsql security definer
set search_path = public
as $$
declare
  me  public.profiles%rowtype;
  chk public.safety_checks%rowtype;
  msg text := nullif(trim(coalesce(p_message, '')), '');
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null or me.role <> 'admin' then
    raise exception 'forbidden';
  end if;
  if msg is null or length(msg) > 300 then
    raise exception 'invalid' using detail = 'Message is required (max 300 characters)';
  end if;
  if p_scope = 'zone' then
    perform 1 from public.zones where id = p_zone_id and society_id = me.society_id;
    if not found then
      raise exception 'invalid' using detail = 'Zone not in society';
    end if;
  end if;

  insert into public.safety_checks (society_id, scope, zone_id, incident_type, message, started_by)
  values (me.society_id, p_scope, case when p_scope = 'zone' then p_zone_id else null end,
          coalesce(p_type, 'fire'), msg, me.id)
  returning * into chk;
  return chk;
end;
$$;

create or replace function public.end_safety_check(p_check_id uuid)
returns public.safety_checks
language plpgsql security definer
set search_path = public
as $$
declare
  me  public.profiles%rowtype;
  chk public.safety_checks%rowtype;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null or me.role <> 'admin' then
    raise exception 'forbidden';
  end if;
  update public.safety_checks set ended_at = coalesce(ended_at, now())
   where id = p_check_id and society_id = me.society_id
   returning * into chk;
  if chk.id is null then
    raise exception 'not_found';
  end if;
  return chk;
end;
$$;

create or replace function public.respond_safety_check(
  p_check_id uuid, p_status public.safety_response_status, p_note text default null
)
returns public.safety_check_responses
language plpgsql security definer
set search_path = public
as $$
declare
  me      public.profiles%rowtype;
  chk     public.safety_checks%rowtype;
  my_zone uuid;
  resp    public.safety_check_responses%rowtype;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null then
    raise exception 'forbidden';
  end if;

  select * into chk from public.safety_checks where id = p_check_id and society_id = me.society_id;
  if not found then
    raise exception 'not_found';
  end if;
  if chk.ended_at is not null then
    raise exception 'invalid' using detail = 'This safety check has ended';
  end if;
  if chk.scope = 'zone' and me.role = 'resident' then
    select zone_id into my_zone from public.flats where id = me.flat_id;
    if my_zone is distinct from chk.zone_id then
      raise exception 'forbidden' using detail = 'This safety check is for another tower';
    end if;
  end if;

  insert into public.safety_check_responses (check_id, society_id, profile_id, status, note)
  values (chk.id, chk.society_id, me.id, p_status, p_note)
  on conflict (check_id, profile_id) do update
    set status = excluded.status, note = excluded.note
  returning * into resp;
  return resp;
end;
$$;

-- ── Reports (security invoker: RLS applies; admin only) ─────────────────────
create or replace function public.report_summary(p_from timestamptz, p_to timestamptz)
returns table (
  type public.incident_type, total bigint, resolved bigint, cancelled bigint, escalated bigint,
  avg_claim_minutes numeric, avg_resolve_minutes numeric
)
language plpgsql stable
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  return query
    select i.type,
           count(*)::bigint,
           count(*) filter (where i.status = 'resolved')::bigint,
           count(*) filter (where i.status = 'cancelled')::bigint,
           count(*) filter (where i.escalation_level > 1)::bigint,
           round(avg(extract(epoch from (i.acknowledged_at - i.created_at)) / 60.0)::numeric, 1),
           round(avg(extract(epoch from (i.resolved_at - i.created_at)) / 60.0)::numeric, 1)
      from public.incidents i
     where i.created_at >= p_from and i.created_at < p_to
     group by i.type
     order by count(*) desc;
end;
$$;

create or replace function public.report_by_asset(p_from timestamptz, p_to timestamptz)
returns table (
  asset_id uuid, asset_name text, zone_name text, kind public.asset_kind,
  incidents bigint, avg_resolve_minutes numeric, last_incident_at timestamptz
)
language plpgsql stable
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  return query
    select a.id, a.name, z.name, a.kind,
           count(i.id)::bigint,
           round(avg(extract(epoch from (i.resolved_at - i.created_at)) / 60.0)::numeric, 1),
           max(i.created_at)
      from public.assets a
      left join public.zones z on z.id = a.zone_id
      left join public.incidents i on i.asset_id = a.id and i.created_at >= p_from and i.created_at < p_to
     group by a.id, a.name, z.name, a.kind
     order by count(i.id) desc, a.name;
end;
$$;

create or replace function public.report_by_zone(p_from timestamptz, p_to timestamptz)
returns table (zone_id uuid, zone_name text, incidents bigint, avg_resolve_minutes numeric)
language plpgsql stable
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  return query
    select z.id, z.name, count(i.id)::bigint,
           round(avg(extract(epoch from (i.resolved_at - i.created_at)) / 60.0)::numeric, 1)
      from public.zones z
      left join public.incidents i on i.zone_id = z.id and i.created_at >= p_from and i.created_at < p_to
     group by z.id, z.name
     order by count(i.id) desc, z.name;
end;
$$;

create or replace function public.report_monthly(p_months int default 6)
returns table (month date, type public.incident_type, incidents bigint)
language plpgsql stable
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  return query
    select date_trunc('month', i.created_at)::date, i.type, count(*)::bigint
      from public.incidents i
     where i.created_at >= date_trunc('month', now()) - make_interval(months => greatest(0, coalesce(p_months, 6) - 1))
     group by 1, 2
     order by 1, 2;
end;
$$;

-- Printable post-incident report: incident + audit trail + first-responder acks (RLS decides visibility)
create or replace function public.incident_report(p_incident_id uuid)
returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'incident', to_jsonb(i),
    'events', coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at)
                          from public.incident_events e where e.incident_id = i.id), '[]'::jsonb),
    'first_responders', coalesce((select jsonb_agg(jsonb_build_object('profile_id', f.profile_id, 'at', f.created_at))
                                    from public.first_responder_acks f where f.incident_id = i.id), '[]'::jsonb),
    'generated_at', now()
  )
  from public.incidents i
  where i.id = p_incident_id;
$$;

-- Live roll-call numbers for a Safety Check (staff)
create or replace function public.safety_check_summary(p_check_id uuid)
returns table (in_scope bigint, safe bigint, need_help bigint, unanswered bigint)
language plpgsql stable
set search_path = public
as $$
declare
  chk public.safety_checks%rowtype;
begin
  if not public.is_staff() then
    raise exception 'forbidden';
  end if;
  select * into chk from public.safety_checks where id = p_check_id;
  if not found then
    raise exception 'not_found';
  end if;
  return query
    with scope as (
      select p.id
        from public.profiles p
        left join public.flats f on f.id = p.flat_id
       where p.society_id = chk.society_id
         and p.role = 'resident'
         and (chk.scope = 'society' or f.zone_id = chk.zone_id)
    ),
    answered as (
      select r.profile_id, r.status from public.safety_check_responses r where r.check_id = chk.id
    )
    select (select count(*) from scope)::bigint,
           (select count(*) from answered where status = 'safe')::bigint,
           (select count(*) from answered where status = 'need_help')::bigint,
           (select count(*) from scope s where not exists (select 1 from answered a where a.profile_id = s.id))::bigint;
end;
$$;

-- ── Views (security invoker: RLS of the underlying tables applies) ──────────
create or replace view public.v_compliance
with (security_invoker = true) as
  select c.*,
         a.name as asset_name,
         a.kind as asset_kind,
         coalesce(z.name, az.name) as zone_name,
         case
           when c.due_at < current_date then 'overdue'
           when c.due_at <= current_date + 14 then 'due_soon'
           else 'ok'
         end as compliance_status,
         (c.due_at - current_date) as days_left
    from public.asset_checks c
    left join public.assets a on a.id = c.asset_id
    left join public.zones z on z.id = c.zone_id
    left join public.zones az on az.id = a.zone_id;

create or replace view public.v_team
with (security_invoker = true) as
  select p.id, p.society_id, p.full_name, p.phone, p.role, p.specialties, p.on_duty, p.language,
         (select count(*) from public.incidents i
           where i.assigned_to = p.id and public.is_active_status(i.status))::int as active_load,
         (select max(i.resolved_at) from public.incidents i where i.assigned_to = p.id) as last_resolved_at
    from public.profiles p
   where p.role in ('responder', 'admin');

revoke all on public.v_compliance, public.v_team from anon, public;
grant select on public.v_compliance to authenticated, service_role;
grant select on public.v_team to authenticated, service_role;

-- ── Grants: RPCs callable by signed-in users only ───────────────────────────
do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.check_kind_type(public.asset_check_kind)',
    'public.claim_incident(uuid)',
    'public.advance_incident(uuid, public.incident_status, text)',
    'public.cancel_incident(uuid, text)',
    'public.assign_incident(uuid, uuid)',
    'public.update_incident_details(uuid, text, text, int, uuid)',
    'public.first_responder_ack(uuid)',
    'public.set_on_duty(boolean)',
    'public.update_member(uuid, public.user_role, public.incident_type[])',
    'public.set_zone_power(uuid, public.power_state)',
    'public.set_power_source(public.power_source, text)',
    'public.set_asset_status(uuid, public.asset_state, text)',
    'public.log_asset_check(uuid, text)',
    'public.start_safety_check(public.safety_check_scope, uuid, text, public.incident_type)',
    'public.end_safety_check(uuid)',
    'public.respond_safety_check(uuid, public.safety_response_status, text)',
    'public.report_summary(timestamptz, timestamptz)',
    'public.report_by_asset(timestamptz, timestamptz)',
    'public.report_by_zone(timestamptz, timestamptz)',
    'public.report_monthly(int)',
    'public.incident_report(uuid)',
    'public.safety_check_summary(uuid)'
  ] loop
    execute format('revoke execute on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated, service_role', fn);
  end loop;
end $$;

-- Internal helpers used only by triggers / other definer functions
revoke execute on function public.incident_actor_name(uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
