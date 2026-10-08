-- Fixes from the security review of 7c5b2fe.

-- 1. Community first responders no longer read whole medical incident rows (reporter name, phone,
--    vulnerability notes) through RLS. They get only what they need to go and help, via an RPC.
drop policy if exists incidents_select on public.incidents;
create policy incidents_select on public.incidents
  for select to authenticated
  using (
    reporter_id = (select auth.uid())
    or (
      society_id = (select public.auth_society())
      and (
        (select public.is_admin())
        or (
          (select public.is_responder())
          and (
            assigned_to = (select auth.uid())
            or type = any ((select public.auth_specialties())::public.incident_type[])
          )
        )
      )
    )
  );

create or replace function public.list_medical_alerts()
returns table (
  id uuid,
  zone_name text,
  flat_label text,
  floor int,
  location_note text,
  people_affected int,
  description text,
  status public.incident_status,
  created_at timestamptz,
  ack_count int,
  i_am_coming boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select i.id, i.zone_name, i.flat_label, i.floor, i.location_note, i.people_affected, i.description,
         i.status, i.created_at,
         (select count(*)::int from public.first_responder_acks a where a.incident_id = i.id),
         exists (select 1 from public.first_responder_acks a where a.incident_id = i.id and a.profile_id = (select auth.uid()))
    from public.incidents i
   where (select public.auth_is_first_responder())
     and i.society_id = (select public.auth_society())
     and i.type = 'medical'
     and public.is_active_status(i.status)
     and i.reporter_id <> (select auth.uid())
   order by i.created_at desc;
$$;
revoke execute on function public.list_medical_alerts() from public, anon;
grant execute on function public.list_medical_alerts() to authenticated;

-- 2. A report with only a spot note ("near the clubhouse") must not fall back to the reporter's flat.
--    (Re-applies 001200 with one extra condition.)
create or replace function public.incidents_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  prof public.profiles%rowtype;
  z    public.zones%rowtype;
  f    public.flats%rowtype;
  a    public.assets%rowtype;
  hw   int;
begin
  new.reporter_id := coalesce(auth.uid(), new.reporter_id);
  if new.reporter_id is null then
    raise exception 'forbidden' using detail = 'No reporter';
  end if;

  select * into prof from public.profiles where id = new.reporter_id;
  if not found or prof.society_id is null then
    raise exception 'forbidden' using detail = 'Reporter is not a member of a society';
  end if;

  new.id               := coalesce(new.id, gen_random_uuid());
  new.society_id       := prof.society_id;
  new.status           := 'pending';
  new.assigned_to      := null;
  new.assigned_name    := null;
  new.assigned_phone   := null;
  new.assigned_at      := null;
  new.acknowledged_at  := null;
  new.en_route_at      := null;
  new.on_scene_at      := null;
  new.resolved_at      := null;
  new.cancelled_at     := null;
  new.resolution_note  := null;
  new.escalation_level := 1;
  new.created_at       := now();
  new.updated_at       := now();
  if new.source = 'safety_check' and new.safety_check_id is null then
    new.source := 'app';
  end if;

  new.reporter_name          := prof.full_name;
  new.reporter_phone         := prof.phone;
  new.reporter_vulnerability := prof.vulnerability;
  new.vulnerable             := public.has_vulnerability(prof.vulnerability);

  new.description   := nullif(trim(coalesce(new.description, '')), '');
  new.location_note := nullif(trim(coalesce(new.location_note, '')), '');

  -- No location given at all: assume the reporter's own flat.
  if new.flat_id is null and new.zone_id is null and new.location_note is null then
    new.flat_id := prof.flat_id;
  end if;
  if new.flat_id is not null then
    select * into f from public.flats where id = new.flat_id;
    if not found or f.society_id <> new.society_id then
      raise exception 'invalid' using detail = 'Flat not in society';
    end if;
    if new.zone_id is not null and new.zone_id <> f.zone_id then
      -- Zone wins (e.g. a tower-wide Safety Check); the flat is elsewhere.
      new.flat_id := null;
    else
      new.flat_label := f.number;
      new.zone_id := f.zone_id;
      new.floor   := coalesce(new.floor, f.floor);
    end if;
  end if;

  if new.zone_id is null then
    raise exception 'invalid' using detail = 'Location (zone) is required';
  end if;
  select * into z from public.zones where id = new.zone_id;
  if not found or z.society_id <> new.society_id then
    raise exception 'invalid' using detail = 'Zone not in society';
  end if;
  new.zone_name := z.name;
  new.zone_tier := z.tier;

  if new.asset_id is not null then
    select * into a from public.assets where id = new.asset_id;
    if not found or a.society_id <> new.society_id then
      raise exception 'invalid' using detail = 'Asset not in society';
    end if;
    new.asset_name := a.name;
  end if;

  select weight into hw from public.hazard_weights where society_id = new.society_id and type = new.type;
  new.hazard_weight   := coalesce(hw, public.default_hazard_weight(new.type));
  new.people_affected := least(500, greatest(1, coalesce(new.people_affected, 1)));
  new.urgency_score   := public.compute_urgency(new.hazard_weight, new.zone_tier, new.people_affected, 0, new.vulnerable);
  return new;
end;
$$;
revoke execute on function public.incidents_before_insert() from public, anon, authenticated;

-- 3. A push endpoint can only be re-bound by its owner, or by someone holding the same encryption
--    keys (the same browser switching accounts). Stops silently hijacking another device's alerts.
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me  public.profiles%rowtype;
  sid uuid;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null then
    raise exception 'forbidden';
  end if;
  if p_endpoint is null or p_endpoint !~ '^https://' or length(p_endpoint) > 1000
     or p_p256dh is null or p_auth is null then
    raise exception 'invalid' using detail = 'Bad push endpoint';
  end if;
  insert into public.push_subscriptions as s (profile_id, society_id, endpoint, p256dh, auth, user_agent)
  values (me.id, me.society_id, p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
    set profile_id = excluded.profile_id, society_id = excluded.society_id,
        p256dh = excluded.p256dh, auth = excluded.auth, user_agent = excluded.user_agent
    where s.profile_id = excluded.profile_id
       or (s.p256dh = excluded.p256dh and s.auth = excluded.auth)
  returning id into sid;
  if sid is null then
    raise exception 'forbidden' using detail = 'Push endpoint belongs to another device';
  end if;
  return sid;
end;
$$;
revoke execute on function public.save_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;

-- 4. Views are read-only for clients.
revoke insert, update, delete, truncate on public.v_team, public.v_compliance from anon, authenticated;

-- 5. pg_net's queue holds the hook secret header until it is sent; clients must not read it.
revoke select on net.http_request_queue from anon, authenticated;
revoke select on net._http_response from anon, authenticated;
