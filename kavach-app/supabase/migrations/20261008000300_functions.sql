-- Kavach for Societies — helper functions (pure + auth context)

-- ── Auth context helpers (security definer so RLS policies can read profiles without recursion)
create or replace function public.auth_role()
returns public.user_role
language sql stable security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.auth_society()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select society_id from public.profiles where id = auth.uid();
$$;

create or replace function public.auth_specialties()
returns public.incident_type[]
language sql stable security definer
set search_path = public
as $$
  select coalesce(specialties, '{}'::public.incident_type[]) from public.profiles where id = auth.uid();
$$;

create or replace function public.auth_is_first_responder()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce((select first_responder_skill is not null from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_admin()
returns boolean
language sql stable
set search_path = public
as $$ select public.auth_role() = 'admin'::public.user_role $$;

create or replace function public.is_responder()
returns boolean
language sql stable
set search_path = public
as $$ select public.auth_role() = 'responder'::public.user_role $$;

create or replace function public.is_staff()
returns boolean
language sql stable
set search_path = public
as $$ select public.auth_role() in ('responder'::public.user_role, 'admin'::public.user_role) $$;

-- ── Pure helpers ────────────────────────────────────────────────────────────
create or replace function public.default_hazard_weight(t public.incident_type)
returns int
language sql immutable
set search_path = public
as $$
  select case t
    when 'fire'     then 100
    when 'medical'  then 90
    when 'lift'     then 85
    when 'security' then 75
    when 'power'    then 65
    when 'water'    then 60
  end;
$$;

-- Which incident specialty covers an asset kind (used for asset status / checks permissions)
create or replace function public.asset_kind_type(k public.asset_kind)
returns public.incident_type
language sql immutable
set search_path = public
as $$
  select case k
    when 'lift'        then 'lift'::public.incident_type
    when 'dg'          then 'power'::public.incident_type
    when 'transformer' then 'power'::public.incident_type
    when 'water_pump'  then 'water'::public.incident_type
    when 'sump'        then 'water'::public.incident_type
    when 'fire_pump'   then 'fire'::public.incident_type
  end;
$$;

create or replace function public.status_rank(s public.incident_status)
returns int
language sql immutable
set search_path = public
as $$
  select case s
    when 'pending'      then 0
    when 'acknowledged' then 1
    when 'en_route'     then 2
    when 'on_scene'     then 3
    when 'resolved'     then 4
    when 'cancelled'    then 4
  end;
$$;

create or replace function public.is_active_status(s public.incident_status)
returns boolean
language sql immutable
set search_path = public
as $$ select s in ('pending', 'acknowledged', 'en_route', 'on_scene') $$;

create or replace function public.tier_score(t public.priority_tier)
returns int
language sql immutable
set search_path = public
as $$
  select case t when 'P1' then 100 when 'P2' then 75 when 'P3' then 50 when 'P4' then 25 end;
$$;

create or replace function public.has_vulnerability(v jsonb)
returns boolean
language sql immutable
set search_path = public
as $$
  select coalesce((v->>'elderly')::boolean, false)
      or coalesce((v->>'mobility')::boolean, false)
      or coalesce((v->>'medical_device')::boolean, false)
      or coalesce((v->>'infant')::boolean, false);
$$;

-- Urgency 0–100: hazard 35% · zone tier 25% · people 25% · waiting time 15% · +10 if reporter is vulnerable
create or replace function public.compute_urgency(
  p_hazard int, p_tier public.priority_tier, p_people int, p_age_minutes numeric, p_vulnerable boolean
)
returns int
language sql immutable
set search_path = public
as $$
  select least(100, greatest(0, round(
      0.35 * coalesce(p_hazard, 50)
    + 0.25 * public.tier_score(coalesce(p_tier, 'P3'))
    + 0.25 * least(100, greatest(1, coalesce(p_people, 1)) * 20)
    + 0.15 * least(100, greatest(0, coalesce(p_age_minutes, 0)) * 10)
    + case when coalesce(p_vulnerable, false) then 10 else 0 end
  )))::int;
$$;

-- Escalation level for an unclaimed incident given society thresholds
create or replace function public.escalation_for(
  p_created timestamptz, p_status public.incident_status, p_l2 interval, p_l3 interval
)
returns int
language sql stable
set search_path = public
as $$
  select case
    when p_status <> 'pending' then 1
    when now() - p_created >= p_l3 then 3
    when now() - p_created >= p_l2 then 2
    else 1
  end;
$$;

-- Generic updated_at bump
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Lock helpers down: callable by authenticated only (RLS policies run as the user)
revoke execute on function public.auth_role() from public, anon;
revoke execute on function public.auth_society() from public, anon;
revoke execute on function public.auth_specialties() from public, anon;
revoke execute on function public.auth_is_first_responder() from public, anon;
grant execute on function public.auth_role() to authenticated, service_role;
grant execute on function public.auth_society() to authenticated, service_role;
grant execute on function public.auth_specialties() to authenticated, service_role;
grant execute on function public.auth_is_first_responder() to authenticated, service_role;
